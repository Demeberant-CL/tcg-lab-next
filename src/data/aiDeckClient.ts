import { AiDeckProposal, CatalogCard, CollectionCard, Deck, DeckCard, ENERGY_NAMES } from '../types';
import { Catalog, cardKey, fold } from './catalog';
import { DeckRules } from '../domain/deckRules';

const PREFS_KEY = 'tcg_lab_ai_key';
const PREFS_MODEL = 'tcg_lab_ai_model';
const PREFS_THEME = 'tcg_lab_dark_theme';
const DEFAULT_MODEL = 'grok-4.7';
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_CARDS_IN_PROMPT = 400;

const ELEMENT_TO_ENERGY: Record<string, number> = {
  grass: 1,
  fire: 2,
  water: 3,
  lightning: 4,
  psychic: 5,
  fighting: 6,
  darkness: 7,
  metal: 8,
};

// Palabras (sin tildes) con las que el usuario puede pedir un tipo en su objetivo.
const ELEMENT_KEYWORDS: Array<[string, string[]]> = [
  ['grass', ['grass', 'planta', 'hierba']],
  ['fire', ['fire', 'fuego']],
  ['water', ['water', 'agua']],
  ['lightning', ['lightning', 'electric', 'rayo', 'electrico']],
  ['psychic', ['psychic', 'psiquic']],
  ['fighting', ['fighting', 'lucha']],
  ['darkness', ['darkness', 'dark', 'oscur']],
  ['metal', ['metal', 'acero']],
];

interface PoolCard {
  catalogCard: CatalogCard;
  holding: CollectionCard;
  element: string;
  trainer: boolean;
  score: number;
}

function scoreCard(card: CatalogCard): number {
  let score = 10;
  if (/\bex$/i.test(card.name)) score += 50;
  if (['RR', 'SAR', 'SR', 'IM', 'UR', 'SSR'].includes(card.rarity)) score += 10;
  else if (card.rarity === 'R') score += 8;
  else if (card.rarity === 'U') score += 5;
  if (card.trainer) score += 20;
  return score;
}

function buildPool(holdings: CollectionCard[]): PoolCard[] {
  const pool: PoolCard[] = [];
  for (const holding of holdings) {
    if (holding.quantity <= 0) continue;
    const catalogCard = Catalog.find(holding.setCode, holding.number);
    if (!catalogCard) continue;
    pool.push({
      catalogCard,
      holding,
      element: catalogCard.element.toLowerCase(),
      trainer: catalogCard.trainer,
      score: scoreCard(catalogCard),
    });
  }
  return pool;
}

/** Copias realmente utilizables en un mazo: máx. 2 por nombre, limitado por lo que posees. */
function usableCopies(pool: PoolCard[]): number {
  const owned = new Map<string, number>();
  for (const p of pool) {
    const name = DeckRules.normalizeName(p.catalogCard.name);
    owned.set(name, (owned.get(name) || 0) + p.holding.quantity);
  }
  let total = 0;
  for (const qty of owned.values()) total += Math.min(qty, DeckRules.MAX_COPIES_PER_NAME);
  return total;
}

function toDeckCard(card: CatalogCard, quantity: number): DeckCard {
  return {
    setCode: card.set,
    number: String(card.number),
    name: card.name,
    category: card.trainer ? 'Entrenadores' : 'Pokémon',
    quantity,
    imageUrl: Catalog.imageUrl(card),
    entityId: card.entityId,
  };
}

interface RawProposal {
  name?: unknown;
  energies?: unknown;
  cards?: unknown;
  explanation?: unknown;
}

export const AiDeckClient = {
  currentKey(): string {
    return localStorage.getItem(PREFS_KEY) || '';
  },

  hasKey(): boolean {
    return Boolean(this.currentKey().trim());
  },

  saveKey(key: string): void {
    if (!key.trim()) {
      localStorage.removeItem(PREFS_KEY);
    } else {
      localStorage.setItem(PREFS_KEY, key.trim());
    }
  },

  clearKey(): void {
    localStorage.removeItem(PREFS_KEY);
  },

  currentModel(): string {
    return localStorage.getItem(PREFS_MODEL) || DEFAULT_MODEL;
  },

  saveModel(model: string): void {
    localStorage.setItem(PREFS_MODEL, model.trim() || DEFAULT_MODEL);
  },

  isDarkTheme(): boolean {
    const saved = localStorage.getItem(PREFS_THEME);
    return saved === null ? true : saved === 'true';
  },

  saveDarkTheme(dark: boolean): void {
    localStorage.setItem(PREFS_THEME, dark ? 'true' : 'false');
  },

  async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new Error('xAI tardó demasiado en responder.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  },

  async testConnection(): Promise<{ success: boolean; models?: string[]; error?: string }> {
    const key = this.currentKey().trim();
    if (!key) {
      return { success: false, error: 'Configura primero una clave de xAI.' };
    }

    try {
      const res = await this.fetchWithTimeout('https://api.x.ai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });

      if (!res.ok) {
        return { success: false, error: this.httpError(res.status) };
      }

      const data = await res.json();
      const list = Array.isArray(data?.data)
        ? data.data.map((m: { id: string }) => m.id).filter(Boolean)
        : [];
      return { success: true, models: list };
    } catch (err) {
      const message = (err as Error).message;
      return {
        success: false,
        error: message.startsWith('xAI')
          ? message
          : 'No se pudo conectar directamente con xAI (comprueba conexión o CORS del navegador).',
      };
    }
  },

  async generate(holdings: CollectionCard[], goal: string): Promise<AiDeckProposal> {
    const pool = buildPool(holdings);

    if (pool.length < 10) {
      throw new Error('Se necesitan al menos 10 cartas distintas con copias registradas.');
    }
    const usable = usableCopies(pool);
    if (usable < DeckRules.DECK_SIZE) {
      throw new Error(
        `Con tu colección solo se pueden reunir ${usable} copias utilizables (máx. 2 por nombre); se necesitan 20. Registra más copias.`
      );
    }

    const key = this.currentKey().trim();
    if (key) {
      try {
        return await this.callXaiApi(key, pool, goal);
      } catch (err) {
        console.warn('Fallo xAI directo (posible CORS o clave), usando el motor táctico local:', err);
        const tactical = this.generateTacticalProposal(pool, goal);
        return {
          ...tactical,
          explanation: `[Modo híbrido: falló la llamada a xAI (${(err as Error).message}); mazo construido por el motor táctico local de TCG LAB] ${tactical.explanation}`,
        };
      }
    }

    return this.generateTacticalProposal(pool, goal);
  },

  async callXaiApi(key: string, pool: PoolCard[], goal: string): Promise<AiDeckProposal> {
    // Limita el prompt a las mejores cartas para reducir tokens, latencia y consumo de datos.
    const owned = [...pool]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CARDS_IN_PROMPT)
      .map(
        (p) =>
          `${p.catalogCard.set}#${p.catalogCard.number} | ${p.catalogCard.name} | ${
            p.trainer ? 'Entrenador' : 'Pokémon'
          } | tipo=${p.catalogCard.element || 'n/d'} | copias=${p.holding.quantity}`
      );

    const userGoal = goal.trim() || 'mazo equilibrado y competitivo con lo disponible';
    const prompt = `
Eres el constructor estratégico de TCG LAB para Pokémon TCG Pocket.
Crea UN mazo usando EXCLUSIVAMENTE las cartas disponibles.
Reglas: exactamente 20 cartas; máximo 2 copias por nombre (sumando todas las impresiones); cantidades 1 o 2; entre 1 y 3 energías distintas.
Energía 1=Planta, 2=Fuego, 3=Agua, 4=Rayo, 5=Psíquica, 6=Lucha, 7=Oscura, 8=Metal.
No inventes cartas, sets ni números.
Devuelve SOLO JSON estricto sin markdown:
{"name":"Nombre del mazo","energies":[1,3],"cards":[{"set":"A1","number":1,"quantity":2}],"explanation":"..."}
cards debe sumar exactamente 20 copias.
Objetivo: ${userGoal}
Cartas disponibles:
${owned.join('\n')}
    `.trim();

    const res = await this.fetchWithTimeout('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: this.currentModel(),
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente experto en Pokémon TCG Pocket. Responde únicamente en JSON válido.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      throw new Error(this.httpError(res.status));
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content || '';
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start < 0 || end <= start) {
      throw new Error('La IA no devolvió un JSON reconocible.');
    }

    let parsed: RawProposal;
    try {
      parsed = JSON.parse(content.slice(start, end + 1));
    } catch {
      throw new Error('La IA devolvió un JSON mal formado.');
    }
    return this.parseAndValidateProposal(parsed, pool);
  },

  parseAndValidateProposal(json: RawProposal, pool: PoolCard[]): AiDeckProposal {
    const rawEnergies = Array.isArray(json.energies) ? json.energies.map(Number) : [1];
    const energies = Array.from(new Set(rawEnergies.filter((e) => Number.isInteger(e) && e >= 1 && e <= 8)));

    if (energies.length < 1 || energies.length > 3) {
      throw new Error('La IA devolvió una configuración de energías inválida.');
    }

    const ownedByKey = new Map<string, number>();
    for (const p of pool) {
      ownedByKey.set(cardKey(p.catalogCard.set, p.catalogCard.number), p.holding.quantity);
    }

    // Une líneas repetidas de la misma carta antes de validar.
    const requested = new Map<string, { card: CatalogCard; quantity: number }>();
    const items = Array.isArray(json.cards) ? (json.cards as Array<Record<string, unknown>>) : [];
    for (const item of items) {
      const set = String(item?.set ?? '').trim();
      const num = Number(item?.number);
      const qty = Math.floor(Number(item?.quantity) || 1);
      const card = Catalog.find(set, num);
      if (!card) {
        throw new Error(`Carta inexistente en catálogo: ${set} #${num}`);
      }
      const key = cardKey(card.set, card.number);
      const prev = requested.get(key);
      requested.set(key, { card, quantity: (prev?.quantity || 0) + qty });
    }

    const deckCards: DeckCard[] = [];
    for (const [key, { card, quantity }] of requested) {
      const available = ownedByKey.get(key) || 0;
      if (quantity > available) {
        throw new Error(
          `La propuesta usa ${quantity} copias de ${card.name} pero solo tienes ${available}.`
        );
      }
      deckCards.push(toDeckCard(card, quantity));
    }

    const deck: Deck = {
      id: 0,
      name: typeof json.name === 'string' && json.name.trim() ? json.name.trim() : 'Mazo IA',
      cards: deckCards,
      energies,
    };

    const errors = DeckRules.validate(deck.cards, deck.energies);
    if (errors.length > 0) {
      throw new Error(`La propuesta no cumple las reglas: ${errors.join(' ')}`);
    }

    return {
      deck,
      explanation:
        typeof json.explanation === 'string' && json.explanation.trim()
          ? json.explanation
          : 'Mazo optimizado según las cartas disponibles en tu colección.',
    };
  },

  /**
   * Motor táctico local: siempre devuelve un mazo legal de 20 cartas
   * (máx. 2 por nombre, 1–3 energías) a partir de las cartas registradas.
   */
  generateTacticalProposal(pool: PoolCard[], goal: string): AiDeckProposal {
    const goalFolded = fold(goal);

    // 1. Elemento principal: el pedido en el objetivo o el de mayor potencial.
    let preferredElement = '';
    for (const [element, words] of ELEMENT_KEYWORDS) {
      if (words.some((w) => goalFolded.includes(w))) {
        preferredElement = element;
        break;
      }
    }
    if (!preferredElement) {
      const power: Record<string, number> = {};
      for (const p of pool) {
        if (!p.trainer && ELEMENT_TO_ENERGY[p.element]) {
          power[p.element] = (power[p.element] || 0) + p.score;
        }
      }
      preferredElement = Object.entries(power).sort((a, b) => b[1] - a[1])[0]?.[0] || 'water';
    }

    const primaryEnergy = ELEMENT_TO_ENERGY[preferredElement];
    const energies = [primaryEnergy];

    const byScore = (a: PoolCard, b: PoolCard) => b.score - a.score;
    const primaryPokemon = pool.filter((p) => !p.trainer && p.element === preferredElement).sort(byScore);
    const trainers = pool.filter((p) => p.trainer).sort(byScore);
    const otherPokemon = pool.filter((p) => !p.trainer && p.element !== preferredElement).sort(byScore);
    const everything = [...pool].sort(byScore);

    // 2. Selección respetando el límite de 2 copias por NOMBRE (no por impresión).
    const chosen = new Map<string, { card: CatalogCard; quantity: number }>();
    const copiesByName = new Map<string, number>();
    let total = 0;

    const addCard = (p: PoolCard): boolean => {
      if (total >= DeckRules.DECK_SIZE) return false;
      const key = cardKey(p.catalogCard.set, p.catalogCard.number);
      const nameKey = DeckRules.normalizeName(p.catalogCard.name);
      const current = chosen.get(key)?.quantity || 0;
      const canAdd = Math.min(
        DeckRules.MAX_COPIES_PER_NAME - (copiesByName.get(nameKey) || 0),
        p.holding.quantity - current,
        DeckRules.DECK_SIZE - total
      );
      if (canAdd <= 0) return false;
      chosen.set(key, { card: p.catalogCard, quantity: current + canAdd });
      copiesByName.set(nameKey, (copiesByName.get(nameKey) || 0) + canAdd);
      total += canAdd;
      return true;
    };

    const registerEnergy = (p: PoolCard) => {
      const id = ELEMENT_TO_ENERGY[p.element];
      if (!p.trainer && id && !energies.includes(id) && energies.length < 3) energies.push(id);
    };

    // a) Atacantes principales, b) Entrenadores, c) apoyo de otros tipos, d) relleno.
    for (const p of primaryPokemon) {
      if (total >= 12) break;
      addCard(p);
    }
    for (const p of trainers) {
      if (total >= 18) break;
      addCard(p);
    }
    for (const p of otherPokemon) {
      if (total >= DeckRules.DECK_SIZE) break;
      const id = ELEMENT_TO_ENERGY[p.element];
      // Solo tipos ya incluidos, sin energía asociada (incoloro) o con espacio para otra energía.
      if (id && !energies.includes(id) && energies.length >= 3) continue;
      if (addCard(p)) registerEnergy(p);
    }
    for (const p of everything) {
      if (total >= DeckRules.DECK_SIZE) break;
      if (addCard(p)) registerEnergy(p);
    }

    if (total < DeckRules.DECK_SIZE) {
      throw new Error('No se pudo completar un mazo legal de 20 cartas con tu colección actual.');
    }

    const cards = Array.from(chosen.values()).map(({ card, quantity }) => toDeckCard(card, quantity));
    const energyNames = energies.map((e) => ENERGY_NAMES[e]).join(', ');
    const deck: Deck = {
      id: 0,
      name: `${ENERGY_NAMES[primaryEnergy]} Lab Pro`,
      cards,
      energies,
    };

    return {
      deck,
      explanation: `Mazo estructurado para consistencia alrededor del tipo ${ENERGY_NAMES[primaryEnergy]} (energías: ${energyNames}). Combina atacantes principales con Entrenadores de apoyo, usando solo las cartas registradas en tu colección y respetando el máximo de 2 copias por nombre.`,
    };
  },

  httpError(code: number): string {
    switch (code) {
      case 401:
        return 'Clave xAI inválida o no autorizada.';
      case 402:
        return 'La cuenta de xAI no tiene créditos disponibles.';
      case 403:
        return 'xAI rechazó el acceso para esta clave.';
      case 404:
        return 'Modelo o endpoint de xAI no encontrado.';
      case 429:
        return 'xAI está limitando las solicitudes. Espera unos segundos y reintenta.';
      default:
        return code >= 500 && code <= 599
          ? 'xAI presenta un problema temporal. Reintenta más tarde.'
          : `xAI respondió con HTTP ${code}.`;
    }
  },
};

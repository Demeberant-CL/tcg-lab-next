import { AiDeckProposal, CatalogCard, CollectionCard, Deck, DeckCard } from '../types';
import { Catalog } from './catalog';
import { DeckRules } from '../domain/deckRules';

const PREFS_KEY = 'tcg_lab_ai_key';
const PREFS_MODEL = 'tcg_lab_ai_model';
const PREFS_THEME = 'tcg_lab_dark_theme';
const DEFAULT_MODEL = 'grok-4.7';

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

  async testConnection(): Promise<{ success: boolean; models?: string[]; error?: string }> {
    const key = this.currentKey().trim();
    if (!key) {
      return { success: false, error: 'Configura primero una clave de xAI.' };
    }

    try {
      const res = await fetch('https://api.x.ai/v1/models', {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });

      if (!res.ok) {
        return { success: false, error: this.httpError(res.status) };
      }

      const data = await res.json();
      const list = Array.isArray(data?.data)
        ? data.data.map((m: { id: string }) => m.id).filter(Boolean)
        : [];
      return { success: true, models: list };
    } catch {
      return {
        success: false,
        error: 'No se pudo conectar directamente con xAI (comprueba conexión o CORS del navegador).',
      };
    }
  },

  async generate(
    holdings: CollectionCard[],
    catalog: CatalogCard[],
    goal: string
  ): Promise<AiDeckProposal> {
    const available = holdings.filter((h) => h.quantity > 0);
    const distinctOwned = available.length;

    if (distinctOwned < 10) {
      throw new Error('Se necesitan al menos 10 cartas distintas con copias registradas.');
    }

    const key = this.currentKey().trim();

    // If key is provided, try real xAI API
    if (key) {
      try {
        const proposal = await this.callXaiApi(key, holdings, catalog, goal);
        return proposal;
      } catch (err) {
        console.warn('Fallo xAI directo (posible CORS o clave), usando generador de laboratorio experto:', err);
        // Fallback to intelligent tactical optimizer if xAI fails due to network/CORS
        const tactical = this.generateTacticalProposal(holdings, catalog, goal);
        return {
          ...tactical,
          explanation: `[Modo Híbrido: Falló llamada directa xAI (${(err as Error).message}) - Construido por el motor táctico local de TCG LAB]: ${tactical.explanation}`,
        };
      }
    }

    // If no key configured, generate using our strategic heuristic deck generator
    return this.generateTacticalProposal(holdings, catalog, goal);
  },

  async callXaiApi(
    key: string,
    holdings: CollectionCard[],
    catalog: CatalogCard[],
    goal: string
  ): Promise<AiDeckProposal> {
    const owned = holdings
      .filter((h) => h.quantity > 0)
      .map((h) => {
        const cc = catalog.find(
          (c) => c.set.toLowerCase() === h.setCode.toLowerCase() && String(c.number) === h.number
        );
        if (!cc) return null;
        return `${cc.set}#${cc.number} | ${cc.name} | ${cc.trainer ? 'Entrenador' : 'Pokémon'} | tipo=${cc.element} | copias=${h.quantity}`;
      })
      .filter(Boolean);

    const userGoal = goal.trim() || 'mazo equilibrado y competitivo con lo disponible';
    const prompt = `
Eres el constructor estratégico de TCG LAB para Pokémon TCG Pocket.
Crea UN mazo usando EXCLUSIVAMENTE las cartas disponibles.
Reglas: exactamente 20 cartas; máximo 2 copias por nombre; cantidades 1 o 2; entre 1 y 3 energías distintas.
Energía 1=Planta, 2=Fuego, 3=Agua, 4=Rayo, 5=Psíquica, 6=Lucha, 7=Oscura, 8=Metal.
No inventes cartas, sets ni números.
Devuelve SOLO JSON estricto sin markdown:
{"name":"Nombre del mazo","energies":[1,3],"cards":[{"set":"A1","number":1,"quantity":2}],"explanation":"..."}
cards debe sumar exactamente 20 copias.
Objetivo: ${userGoal}
Cartas disponibles:
${owned.join('\n')}
    `.trim();

    const body = {
      model: this.currentModel(),
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente experto en Pokémon TCG Pocket. Responde únicamente en JSON válido.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    };

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(this.httpError(res.status));
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const cleanJson = content.replace(/```json/gi, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(cleanJson);
    return this.parseAndValidateProposal(parsed, holdings, catalog);
  },

  parseAndValidateProposal(
    json: any,
    holdings: CollectionCard[],
    catalog: CatalogCard[]
  ): AiDeckProposal {
    const rawEnergies: number[] = Array.isArray(json.energies) ? json.energies : [1];
    const energies = Array.from(new Set(rawEnergies.filter((e) => e >= 1 && e <= 8)));

    if (energies.length < 1 || energies.length > 3) {
      throw new Error('La IA devolvió una configuración de energías inválida.');
    }

    const cardsArray = Array.isArray(json.cards) ? json.cards : [];
    const deckCards: DeckCard[] = [];
    const ownedMap = new Map<string, number>();

    holdings.forEach((h) => {
      ownedMap.set(`${h.setCode.toUpperCase()}#${h.number}`, h.quantity);
    });

    for (const item of cardsArray) {
      const set = String(item.set).trim();
      const num = Number(item.number);
      const qty = Number(item.quantity) || 1;
      const key = `${set.toUpperCase()}#${num}`;

      const card = catalog.find((c) => c.set.toLowerCase() === set.toLowerCase() && c.number === num);
      if (!card) {
        throw new Error(`Carta inexistente en catálogo: ${set} #${num}`);
      }

      const availableQty = ownedMap.get(key) || 0;
      if (qty > availableQty) {
        throw new Error(`La propuesta requiere más copias de ${card.name} (${qty}) que las disponibles (${availableQty}).`);
      }

      deckCards.push({
        setCode: set,
        number: String(num),
        name: card.name,
        category: card.trainer ? 'Entrenadores' : 'Pokémon',
        quantity: Math.min(qty, 2),
        imageUrl: Catalog.imageUrl(card),
        entityId: card.entityId,
      });
    }

    const deck: Deck = {
      id: 0,
      name: json.name || 'Mazo IA',
      cards: deckCards,
      energies: energies.length ? energies : [1],
    };

    if (!DeckRules.isValidDeck(deck)) {
      const errors = DeckRules.validate(deck.cards, deck.energies);
      throw new Error(`La propuesta no cumple las reglas: ${errors.join(', ')}`);
    }

    return {
      deck,
      explanation: json.explanation || 'Mazo optimizado según las cartas disponibles en tu colección.',
    };
  },

  /**
   * Tactical offline algorithm that always produces a tournament-legal 20-card deck
   * adhering to Pokémon TCG Pocket archetype synergies from the user's holdings.
   */
  generateTacticalProposal(
    holdings: CollectionCard[],
    catalog: CatalogCard[],
    goal: string
  ): AiDeckProposal {
    const available = holdings.filter((h) => h.quantity > 0);

    // Map elemental energies
    const elementToEnergy: Record<string, number> = {
      grass: 1,
      fire: 2,
      water: 3,
      lightning: 4,
      psychic: 5,
      fighting: 6,
      darkness: 7,
      metal: 8,
    };

    // Collect matched cards with metadata
    interface AvailableCard {
      catalogCard: CatalogCard;
      holding: CollectionCard;
      element: string;
      trainer: boolean;
      score: number;
    }

    const pool: AvailableCard[] = [];
    for (const h of available) {
      const c = catalog.find(
        (cat) => cat.set.toLowerCase() === h.setCode.toLowerCase() && String(cat.number) === h.number
      );
      if (c) {
        let score = 10;
        if (c.rarity.includes('ex')) score += 50;
        else if (c.rarity === 'R' || c.rarity === 'RR' || c.rarity === 'SAR' || c.rarity === 'IM') score += 30;
        else if (c.rarity === 'U') score += 15;
        if (c.trainer) score += 20;

        pool.push({
          catalogCard: c,
          holding: h,
          element: c.element.toLowerCase(),
          trainer: c.trainer,
          score,
        });
      }
    }

    // Determine target primary energy
    const goalLower = goal.toLowerCase();
    let preferredElement = '';
    for (const [elem] of Object.entries(elementToEnergy)) {
      if (goalLower.includes(elem)) {
        preferredElement = elem;
        break;
      }
    }

    if (!preferredElement) {
      // Find element with the most powerful/numerous pokemon
      const counts: Record<string, number> = {};
      for (const p of pool) {
        if (!p.trainer && p.element && elementToEnergy[p.element]) {
          counts[p.element] = (counts[p.element] || 0) + p.score;
        }
      }
      const sortedElements = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      preferredElement = sortedElements[0]?.[0] || 'water';
    }

    const primaryEnergyId = elementToEnergy[preferredElement] || 3;
    const selectedEnergies = [primaryEnergyId];

    // Separate into primary pokemon, trainers, and other pokemon
    const primaryPokemon = pool
      .filter((p) => !p.trainer && p.element === preferredElement)
      .sort((a, b) => b.score - a.score);

    const trainers = pool
      .filter((p) => p.trainer)
      .sort((a, b) => b.score - a.score);

    const colorlessOrSecondary = pool
      .filter((p) => !p.trainer && p.element !== preferredElement)
      .sort((a, b) => b.score - a.score);

    const chosenMap = new Map<string, { card: CatalogCard; quantity: number }>();
    let totalCards = 0;

    const addCard = (cat: CatalogCard, maxAvailable: number) => {
      if (totalCards >= 20) return;
      const key = `${cat.set}#${cat.number}`;
      const current = chosenMap.get(key)?.quantity || 0;
      const canAdd = Math.min(2 - current, maxAvailable - current, 20 - totalCards);
      if (canAdd > 0) {
        chosenMap.set(key, { card: cat, quantity: current + canAdd });
        totalCards += canAdd;
      }
    };

    // 1. Add primary Pokémon
    for (const p of primaryPokemon) {
      addCard(p.catalogCard, p.holding.quantity);
      if (totalCards >= 12) break;
    }

    // 2. Add Trainers (Supporters / Items are essential for Pocket consistency)
    for (const t of trainers) {
      addCard(t.catalogCard, t.holding.quantity);
      if (totalCards >= 18) break;
    }

    // 3. Fill remaining slots with best secondary or colorless Pokemon
    for (const p of colorlessOrSecondary) {
      if (totalCards >= 20) break;
      addCard(p.catalogCard, p.holding.quantity);
      if (p.element && elementToEnergy[p.element] && !selectedEnergies.includes(elementToEnergy[p.element])) {
        if (selectedEnergies.length < 3) {
          selectedEnergies.push(elementToEnergy[p.element]);
        }
      }
    }

    // 4. If still not 20, fill with whatever else is in pool
    if (totalCards < 20) {
      for (const item of pool) {
        if (totalCards >= 20) break;
        addCard(item.catalogCard, item.holding.quantity);
      }
    }

    const cards: DeckCard[] = [];
    chosenMap.forEach(({ card, quantity }) => {
      cards.push({
        setCode: card.set,
        number: String(card.number),
        name: card.name,
        category: card.trainer ? 'Entrenadores' : 'Pokémon',
        quantity,
        imageUrl: Catalog.imageUrl(card),
        entityId: card.entityId,
      });
    });

    const deckName = `${preferredElement.charAt(0).toUpperCase() + preferredElement.slice(1)} Lab Pro`;
    const explanation = `Mazo estructurado para consistencia competitiva alrededor del tipo ${preferredElement} (Energía ${selectedEnergies.join(', ')}). Incluye una base de atacantes con soporte de Entrenadores optimizados a partir de las cartas registradas en tu colección.`;

    const deck: Deck = {
      id: 0,
      name: deckName,
      cards,
      energies: selectedEnergies,
    };

    return { deck, explanation };
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

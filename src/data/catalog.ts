import { CatalogCard, CatalogSet } from '../types';
import { CardImages } from './cardImages';

let loaded = false;
let sets: CatalogSet[] = [];
let cards: CatalogCard[] = [];
let byKey = new Map<string, CatalogCard>();
let loadPromise: Promise<void> | null = null;

export function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export function cardKey(set: string, number: number | string): string {
  return `${set}#${number}`;
}

/**
 * Las ilustraciones alternativas (AR) vienen sin elemento en los datos.
 * Se completa con el elemento de otra impresión del mismo Pokémon.
 */
function fillMissingElements(list: CatalogCard[]): void {
  const elementByName = new Map<string, string>();
  for (const c of list) {
    if (!c.trainer && c.element) elementByName.set(c.name, c.element);
  }
  for (const c of list) {
    if (!c.trainer && !c.element) {
      const inferred = elementByName.get(c.name);
      if (inferred) c.element = inferred;
    }
  }
}

async function fetchJson<T>(file: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}${file}`);
  if (!res.ok) throw new Error('No se pudieron cargar los datos de cartas.');
  return (await res.json()) as T;
}

export const Catalog = {
  async load(): Promise<void> {
    if (loaded) return;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      try {
        const [setsData, cardsData] = await Promise.all([
          fetchJson<CatalogSet[]>('sets.json'),
          fetchJson<CatalogCard[]>('cards.json'),
        ]);
        fillMissingElements(cardsData);
        sets = setsData;
        cards = cardsData;
        byKey = new Map(cards.map((c) => [cardKey(c.set, c.number), c]));
        loaded = true;
      } catch (err) {
        console.error('Error cargando catálogo:', err);
        // Permite reintentar sin recargar la página.
        loadPromise = null;
        throw err;
      }
    })();

    return loadPromise;
  },

  isLoaded(): boolean {
    return loaded;
  },

  allCards(): CatalogCard[] {
    return cards;
  },

  allSets(): CatalogSet[] {
    return sets;
  },

  find(set: string, number: number | string): CatalogCard | undefined {
    const direct = byKey.get(cardKey(set, Number(number)));
    if (direct) return direct;
    // Los códigos de set podrían llegar con otra capitalización.
    const lower = set.toLowerCase();
    return cards.find((c) => c.set.toLowerCase() === lower && c.number === Number(number));
  },

  imageUrl(card: { set: string; number: number | string }): string {
    return CardImages.primaryUrl(card.set, card.number);
  },
};

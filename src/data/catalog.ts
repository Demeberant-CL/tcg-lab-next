import { CatalogCard, CatalogSet } from '../types';
import { CardImages } from './cardImages';

let loaded = false;
let sets: CatalogSet[] = [];
let cards: CatalogCard[] = [];
let loadPromise: Promise<void> | null = null;

function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export const Catalog = {
  async load(): Promise<void> {
    if (loaded) return;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      try {
        const [setsRes, cardsRes] = await Promise.all([
          fetch('/sets.json'),
          fetch('/cards.json'),
        ]);

        if (!setsRes.ok || !cardsRes.ok) {
          throw new Error('No se pudieron cargar los datos de cartas.');
        }

        sets = await setsRes.json();
        cards = await cardsRes.json();
        loaded = true;
      } catch (err) {
        console.error('Error cargando catálogo:', err);
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

  imageUrl(card: { set: string; number: number | string }): string {
    return CardImages.primaryUrl(card.set, card.number);
  },

  search(query: string, set?: string | null, limit = 80): CatalogCard[] {
    const q = fold(query);
    if (!q) return [];

    const scored = cards
      .filter((card) => !set || card.set.toLowerCase() === set.toLowerCase())
      .map((card) => {
        const name = fold(card.name);
        const id = fold(`${card.set} ${card.number}`);
        let score = 0;
        if (name === q) score = 100;
        else if (name.startsWith(q)) score = 80;
        else if (name.includes(q)) score = 50;
        else if (id.includes(q)) score = 40;
        return { card, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.card);

    return scored;
  },
};

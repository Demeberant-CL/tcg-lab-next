export interface CatalogCard {
  set: string;
  number: number;
  name: string;
  rarity: string;
  entityId: number;
  trainer: boolean;
  element: string;
}

export interface CatalogSet {
  code: string;
  es: string;
  en: string;
  count: number;
}

export interface CollectionCard {
  key: string;
  name: string;
  setCode: string;
  number: string;
  quantity: number;
  imageUrl: string;
  category: string;
}

export interface DeckCard {
  setCode: string;
  number: string;
  name: string;
  category: string;
  quantity: number;
  imageUrl: string;
  entityId?: number;
}

export interface Deck {
  id: number;
  name: string;
  cards: DeckCard[];
  energies: number[];
  updatedAt?: number;
}

export interface DeckSummary {
  id: number;
  name: string;
  cardCount: number;
  energyCount: number;
  valid: boolean;
}

export interface AiDeckProposal {
  deck: Deck;
  explanation: string;
}

export const ENERGY_NAMES: Record<number, string> = {
  1: 'Planta',
  2: 'Fuego',
  3: 'Agua',
  4: 'Rayo',
  5: 'Psíquica',
  6: 'Lucha',
  7: 'Oscura',
  8: 'Metal',
};

export const ENERGY_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-emerald-950/70', text: 'text-emerald-400', border: 'border-emerald-600/40' },
  2: { bg: 'bg-orange-950/70', text: 'text-orange-400', border: 'border-orange-600/40' },
  3: { bg: 'bg-blue-950/70', text: 'text-blue-400', border: 'border-blue-600/40' },
  4: { bg: 'bg-amber-950/70', text: 'text-amber-400', border: 'border-amber-500/40' },
  5: { bg: 'bg-purple-950/70', text: 'text-purple-400', border: 'border-purple-600/40' },
  6: { bg: 'bg-amber-950/80', text: 'text-amber-600', border: 'border-amber-700/40' },
  7: { bg: 'bg-slate-900', text: 'text-indigo-300', border: 'border-indigo-800/40' },
  8: { bg: 'bg-zinc-800/90', text: 'text-zinc-300', border: 'border-zinc-500/40' },
};

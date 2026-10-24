import { CollectionCard, Deck, DeckSummary } from '../types';
import { DeckRules } from '../domain/deckRules';

const STORAGE_KEYS = {
  COLLECTION: 'tcg_lab_collection',
  DECKS: 'tcg_lab_decks',
  WISHLIST: 'tcg_lab_wishlist',
};

class LocalTcgDatabase {
  private getStorageItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setStorageItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }
  }

  // --- Collection Cards ---
  getCards(): CollectionCard[] {
    const cards = this.getStorageItem<CollectionCard[]>(STORAGE_KEYS.COLLECTION, []);
    return cards.sort((a, b) => a.name.localeCompare(b.name));
  }

  saveCard(card: CollectionCard): void {
    const cards = this.getCards();
    const index = cards.findIndex((c) => c.key === card.key);

    if (card.quantity <= 0) {
      if (index >= 0) {
        cards.splice(index, 1);
        this.setStorageItem(STORAGE_KEYS.COLLECTION, cards);
      }
      return;
    }

    if (index >= 0) {
      cards[index] = card;
    } else {
      cards.push(card);
    }
    this.setStorageItem(STORAGE_KEYS.COLLECTION, cards);
  }

  deleteCard(key: string): void {
    const cards = this.getCards().filter((c) => c.key !== key);
    this.setStorageItem(STORAGE_KEYS.COLLECTION, cards);
  }

  adjustCardQuantity(card: CollectionCard, delta: 1 | -1): number {
    const cards = this.getCards();
    const index = cards.findIndex((c) => c.key === card.key);

    let newQuantity = 0;
    if (delta > 0) {
      if (index >= 0) {
        newQuantity = Math.min(cards[index].quantity + 1, 99);
        cards[index].quantity = newQuantity;
      } else {
        newQuantity = 1;
        cards.push({ ...card, quantity: 1 });
      }
    } else {
      if (index >= 0) {
        newQuantity = Math.max(cards[index].quantity - 1, 0);
        if (newQuantity <= 0) {
          cards.splice(index, 1);
        } else {
          cards[index].quantity = newQuantity;
        }
      }
    }

    this.setStorageItem(STORAGE_KEYS.COLLECTION, cards);
    return newQuantity;
  }

  // --- Decks ---
  getDecks(): DeckSummary[] {
    const decks = this.getStorageItem<Deck[]>(STORAGE_KEYS.DECKS, []);
    // Sort descending by updatedAt
    const sorted = decks.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    return sorted.map((deck) => {
      const cardCount = deck.cards.reduce((sum, c) => sum + c.quantity, 0);
      const valid = DeckRules.isValidDeck(deck);
      return {
        id: deck.id,
        name: deck.name,
        cardCount,
        energyCount: deck.energies.length,
        valid,
      };
    });
  }

  getDeck(id: number): Deck | null {
    const decks = this.getStorageItem<Deck[]>(STORAGE_KEYS.DECKS, []);
    return decks.find((d) => d.id === id) || null;
  }

  saveDeck(deck: Deck): number {
    if (!deck.name.trim()) {
      throw new Error('El mazo necesita un nombre.');
    }
    if (!DeckRules.isValidDeck(deck)) {
      throw new Error('El mazo debe tener 20 cartas, 1 a 3 energías válidas y máximo 2 copias por carta.');
    }

    const decks = this.getStorageItem<Deck[]>(STORAGE_KEYS.DECKS, []);
    let targetId = deck.id;

    if (!targetId || targetId === 0) {
      targetId = Date.now();
      const newDeck: Deck = {
        ...deck,
        id: targetId,
        name: deck.name.trim(),
        updatedAt: Date.now(),
      };
      decks.push(newDeck);
    } else {
      const idx = decks.findIndex((d) => d.id === targetId);
      const updatedDeck: Deck = {
        ...deck,
        id: targetId,
        name: deck.name.trim(),
        updatedAt: Date.now(),
      };
      if (idx >= 0) {
        decks[idx] = updatedDeck;
      } else {
        decks.push(updatedDeck);
      }
    }

    this.setStorageItem(STORAGE_KEYS.DECKS, decks);
    return targetId;
  }

  deleteDeck(id: number): void {
    const decks = this.getStorageItem<Deck[]>(STORAGE_KEYS.DECKS, []).filter((d) => d.id !== id);
    this.setStorageItem(STORAGE_KEYS.DECKS, decks);
  }

  // --- Wishlist ---
  getWishlist(): Set<string> {
    const keys = this.getStorageItem<string[]>(STORAGE_KEYS.WISHLIST, []);
    return new Set(keys);
  }

  toggleWishlist(key: string): Set<string> {
    const current = this.getWishlist();
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.setStorageItem(STORAGE_KEYS.WISHLIST, Array.from(current));
    return current;
  }

  // --- Import / Export ---
  exportCollectionJson(): string {
    const cards = this.getCards();
    return JSON.stringify(cards, null, 2);
  }

  importCollectionJson(jsonStr: string, mode: 'merge' | 'replace' = 'merge'): number {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      throw new Error('El formato debe ser un array JSON de cartas.');
    }

    let existingCards = mode === 'replace' ? [] : this.getCards();
    const map = new Map<string, CollectionCard>();

    for (const c of existingCards) {
      map.set(c.key, c);
    }

    let importedCount = 0;
    for (const item of parsed) {
      if (item && item.key && item.name && item.setCode && item.number) {
        const qty = Number(item.quantity) || 0;
        if (qty > 0) {
          const card: CollectionCard = {
            key: String(item.key),
            name: String(item.name),
            setCode: String(item.setCode),
            number: String(item.number),
            quantity: Math.min(qty, 99),
            imageUrl: String(item.imageUrl || ''),
            category: String(item.category || 'Pokémon'),
          };

          if (mode === 'merge' && map.has(card.key)) {
            const prev = map.get(card.key)!;
            card.quantity = Math.min(prev.quantity + card.quantity, 99);
          }
          map.set(card.key, card);
          importedCount++;
        }
      }
    }

    this.setStorageItem(STORAGE_KEYS.COLLECTION, Array.from(map.values()));
    return importedCount;
  }
}

export const db = new LocalTcgDatabase();

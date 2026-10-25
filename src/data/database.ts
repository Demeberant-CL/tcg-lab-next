import { CollectionCard, Deck, DeckSummary } from '../types';
import { DeckRules } from '../domain/deckRules';
import { CardImages } from './cardImages';

const STORAGE_KEYS = {
  COLLECTION: 'tcg_lab_collection',
  DECKS: 'tcg_lab_decks',
  WISHLIST: 'tcg_lab_wishlist',
};

const MAX_COPIES_OWNED = 99;
const collator = new Intl.Collator('es', { sensitivity: 'base' });

class LocalTcgDatabase {
  // Caché en memoria: evita parsear y ordenar ~4.000 cartas en cada toque de +/-.
  private collectionCache: CollectionCard[] | null = null;

  private getStorageItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setStorageItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn('LocalStorage error:', err);
      throw new Error('No se pudo guardar: el almacenamiento del navegador está lleno o bloqueado.');
    }
  }

  private sorted(cards: CollectionCard[]): CollectionCard[] {
    return cards.sort((a, b) => collator.compare(a.name, b.name) || a.key.localeCompare(b.key));
  }

  private writeCollection(cards: CollectionCard[]): void {
    this.setStorageItem(STORAGE_KEYS.COLLECTION, cards);
    this.collectionCache = cards;
  }

  // --- Collection Cards ---
  getCards(): CollectionCard[] {
    if (!this.collectionCache) {
      const raw = this.getStorageItem<CollectionCard[]>(STORAGE_KEYS.COLLECTION, []);
      this.collectionCache = this.sorted(Array.isArray(raw) ? raw : []);
    }
    // Copia superficial para que React detecte el cambio de referencia.
    return [...this.collectionCache];
  }

  saveCard(card: CollectionCard): void {
    const cards = this.getCards();
    const index = cards.findIndex((c) => c.key === card.key);

    if (card.quantity <= 0) {
      if (index >= 0) {
        cards.splice(index, 1);
        this.writeCollection(cards);
      }
      return;
    }

    const clamped = { ...card, quantity: Math.min(card.quantity, MAX_COPIES_OWNED) };
    if (index >= 0) {
      cards[index] = clamped;
    } else {
      cards.push(clamped);
    }
    this.writeCollection(this.sorted(cards));
  }

  deleteCard(key: string): void {
    this.writeCollection(this.getCards().filter((c) => c.key !== key));
  }

  adjustCardQuantity(card: CollectionCard, delta: 1 | -1): number {
    const cards = this.getCards();
    const index = cards.findIndex((c) => c.key === card.key);

    let newQuantity = 0;
    if (delta > 0) {
      if (index >= 0) {
        newQuantity = Math.min(cards[index].quantity + 1, MAX_COPIES_OWNED);
        cards[index] = { ...cards[index], quantity: newQuantity };
      } else {
        newQuantity = 1;
        cards.push({ ...card, quantity: 1 });
      }
    } else if (index >= 0) {
      newQuantity = Math.max(cards[index].quantity - 1, 0);
      if (newQuantity <= 0) {
        cards.splice(index, 1);
      } else {
        cards[index] = { ...cards[index], quantity: newQuantity };
      }
    }

    this.writeCollection(this.sorted(cards));
    return newQuantity;
  }

  // --- Decks ---
  private readDecks(): Deck[] {
    const raw = this.getStorageItem<Deck[]>(STORAGE_KEYS.DECKS, []);
    return Array.isArray(raw) ? raw : [];
  }

  getDecks(): DeckSummary[] {
    const sorted = this.readDecks().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    return sorted.map((deck) => ({
      id: deck.id,
      name: deck.name,
      cardCount: deck.cards.reduce((sum, c) => sum + c.quantity, 0),
      energyCount: deck.energies.length,
      valid: DeckRules.isValidDeck(deck),
    }));
  }

  getDeck(id: number): Deck | null {
    return this.readDecks().find((d) => d.id === id) || null;
  }

  saveDeck(deck: Deck): number {
    if (!deck.name.trim()) {
      throw new Error('El mazo necesita un nombre.');
    }
    const errors = DeckRules.validate(deck.cards, deck.energies);
    if (errors.length > 0) {
      throw new Error(errors.join(' '));
    }

    const decks = this.readDecks();
    const now = Date.now();
    const existingIdx = deck.id ? decks.findIndex((d) => d.id === deck.id) : -1;
    const targetId = existingIdx >= 0 ? deck.id : now;
    const saved: Deck = { ...deck, id: targetId, name: deck.name.trim(), updatedAt: now };

    if (existingIdx >= 0) {
      decks[existingIdx] = saved;
    } else {
      decks.push(saved);
    }

    this.setStorageItem(STORAGE_KEYS.DECKS, decks);
    return targetId;
  }

  deleteDeck(id: number): void {
    this.setStorageItem(
      STORAGE_KEYS.DECKS,
      this.readDecks().filter((d) => d.id !== id)
    );
  }

  // --- Wishlist ---
  getWishlist(): Set<string> {
    const keys = this.getStorageItem<string[]>(STORAGE_KEYS.WISHLIST, []);
    return new Set(Array.isArray(keys) ? keys : []);
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
    return JSON.stringify(this.getCards(), null, 2);
  }

  importCollectionJson(jsonStr: string, mode: 'merge' | 'replace' = 'merge'): number {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error('El texto no es un JSON válido. Revisa que esté completo.');
    }
    if (!Array.isArray(parsed)) {
      throw new Error('El formato debe ser un array JSON de cartas.');
    }

    const map = new Map<string, CollectionCard>();
    if (mode === 'merge') {
      for (const c of this.getCards()) map.set(c.key, c);
    }

    let importedCount = 0;
    for (const item of parsed as Array<Record<string, unknown>>) {
      if (!item || !item.name || !item.setCode || !item.number) continue;
      const qty = Math.floor(Number(item.quantity));
      if (!Number.isFinite(qty) || qty <= 0) continue;

      const setCode = String(item.setCode).trim();
      const rawNumber = String(item.number).trim();
      const parsedNumber = parseInt(rawNumber, 10);
      // Normaliza "001" -> "1" para que coincida con el catálogo.
      const number = Number.isNaN(parsedNumber) ? rawNumber : String(parsedNumber);
      // La clave siempre se deriva de set + número, no se confía en la del archivo.
      const key = `${setCode}#${number}`;

      const card: CollectionCard = {
        key,
        name: String(item.name),
        setCode,
        number,
        quantity: Math.min(qty, MAX_COPIES_OWNED),
        imageUrl: String(item.imageUrl || '') || CardImages.primaryUrl(setCode, number),
        category: String(item.category || 'Pokémon'),
      };

      const prev = mode === 'merge' ? map.get(key) : undefined;
      if (prev) card.quantity = Math.min(prev.quantity + card.quantity, MAX_COPIES_OWNED);
      map.set(key, card);
      importedCount++;
    }

    // Evita vaciar la colección con un archivo sin cartas válidas.
    if (importedCount === 0) {
      throw new Error('El archivo no contiene cartas válidas (se requiere name, setCode, number y quantity).');
    }

    this.writeCollection(this.sorted(Array.from(map.values())));
    return importedCount;
  }
}

export const db = new LocalTcgDatabase();

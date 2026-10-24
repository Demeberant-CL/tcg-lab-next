import { Deck, DeckCard } from '../types';

export const DeckRules = {
  MIN_ENERGIES: 1,
  MAX_ENERGIES: 3,
  MAX_COPIES_PER_NAME: 2,
  DECK_SIZE: 20,

  normalize(name: string): string {
    return this.normalizeName(name);
  },

  normalizeName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  },

  validate(cards: DeckCard[], energies: number[], basicCardNames: Set<string> = new Set()): string[] {
    const errors: string[] = [];
    const totalCards = cards.reduce((acc, c) => acc + c.quantity, 0);

    if (totalCards !== this.DECK_SIZE) {
      errors.push('El mazo debe tener exactamente 20 cartas.');
    }
    if (cards.some((c) => c.quantity <= 0)) {
      errors.push('Todas las cartas deben tener una cantidad positiva.');
    }

    const copiesByName = new Map<string, number>();
    for (const card of cards) {
      const norm = this.normalizeName(card.name);
      copiesByName.set(norm, (copiesByName.get(norm) || 0) + card.quantity);
    }

    for (const count of copiesByName.values()) {
      if (count > this.MAX_COPIES_PER_NAME) {
        errors.push('No puedes usar más de 2 copias del mismo nombre.');
        break;
      }
    }

    if (energies.length < this.MIN_ENERGIES || energies.length > this.MAX_ENERGIES) {
      errors.push('El mazo debe usar entre 1 y 3 energías distintas.');
    }

    const uniqueEnergies = new Set(energies);
    if (uniqueEnergies.size !== energies.length || energies.some((e) => e < 1 || e > 8)) {
      errors.push('Las energías deben ser distintas y estar entre 1 y 8.');
    }

    if (basicCardNames.size > 0) {
      const hasBasic = cards.some(
        (c) =>
          c.category.toLowerCase() !== 'entrenadores' &&
          basicCardNames.has(this.normalizeName(c.name)) &&
          c.quantity > 0
      );
      if (!hasBasic) {
        errors.push('El mazo debe contener al menos 1 Pokémon Básico.');
      }
    }

    return Array.from(new Set(errors));
  },

  isValidDeck(deck: Pick<Deck, 'cards' | 'energies'>): boolean {
    return this.isValid(deck.cards, deck.energies);
  },

  isValid(cards: DeckCard[], energies: number[], basicCardNames: Set<string> = new Set()): boolean {
    return this.validate(cards, energies, basicCardNames).length === 0;
  },
};

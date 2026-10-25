import React, { useMemo, useState } from 'react';
import { ArrowLeft, Plus, Minus, CheckCircle, Search } from 'lucide-react';
import { CollectionCard, Deck, DeckCard, ENERGY_NAMES, ENERGY_COLORS } from '../types';
import { DeckRules } from '../domain/deckRules';
import { fold } from '../data/catalog';
import { db } from '../data/database';
import { CardImage } from './CardImage';

interface DeckBuilderScreenProps {
  holdings: CollectionCard[];
  onSaved: () => void;
  onCancel: () => void;
}

export const DeckBuilderScreen: React.FC<DeckBuilderScreenProps> = ({
  holdings,
  onSaved,
  onCancel,
}) => {
  const [name, setName] = useState('Mi mazo');
  const [selectedCards, setSelectedCards] = useState<Record<string, number>>({});
  const [energies, setEnergies] = useState<number[]>([1]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const availableHoldings = useMemo(() => holdings.filter((h) => h.quantity > 0), [holdings]);

  const visibleHoldings = useMemo(() => {
    const q = fold(search);
    if (!q) return availableHoldings;
    return availableHoldings.filter(
      (h) => fold(h.name).includes(q) || fold(`${h.setCode} ${h.number}`).includes(q)
    );
  }, [availableHoldings, search]);

  const totalCount = Object.values(selectedCards).reduce((sum, q) => sum + q, 0);

  // La regla de 2 copias se aplica por NOMBRE: dos impresiones distintas de la misma carta suman juntas.
  const selectedByName = useMemo(() => {
    const picked = availableHoldings
      .filter((h) => selectedCards[h.key])
      .map((h) => ({ name: h.name, quantity: selectedCards[h.key] }));
    return DeckRules.copiesByName(picked);
  }, [availableHoldings, selectedCards]);

  const handleToggleEnergy = (id: number) => {
    if (energies.includes(id)) {
      if (energies.length > 1) setEnergies(energies.filter((e) => e !== id));
    } else if (energies.length < DeckRules.MAX_ENERGIES) {
      setEnergies([...energies, id].sort((a, b) => a - b));
    }
  };

  const canAddCard = (card: CollectionCard): boolean => {
    const current = selectedCards[card.key] || 0;
    const nameCount = selectedByName.get(DeckRules.normalizeName(card.name)) || 0;
    return (
      current < card.quantity &&
      nameCount < DeckRules.MAX_COPIES_PER_NAME &&
      totalCount < DeckRules.DECK_SIZE
    );
  };

  const handleAdjustCount = (card: CollectionCard, delta: 1 | -1) => {
    const current = selectedCards[card.key] || 0;

    if (delta > 0) {
      if (canAddCard(card)) setSelectedCards({ ...selectedCards, [card.key]: current + 1 });
    } else if (current > 0) {
      const copy = { ...selectedCards };
      if (current === 1) delete copy[card.key];
      else copy[card.key] = current - 1;
      setSelectedCards(copy);
    }
  };

  const handleSave = () => {
    setError(null);
    try {
      const cards: DeckCard[] = availableHoldings
        .filter((h) => selectedCards[h.key] > 0)
        .map((h) => ({
          setCode: h.setCode,
          number: h.number,
          name: h.name,
          category: h.category,
          quantity: selectedCards[h.key],
          imageUrl: h.imageUrl,
        }));

      const deck: Deck = { id: 0, name: name.trim() || 'Mi mazo', cards, energies };
      db.saveDeck(deck);
      onSaved();
    } catch (err) {
      setError((err as Error).message || 'No se pudo guardar el mazo.');
    }
  };

  const isComplete =
    totalCount === DeckRules.DECK_SIZE &&
    energies.length >= DeckRules.MIN_ENERGIES &&
    energies.length <= DeckRules.MAX_ENERGIES;

  return (
    <div className="flex flex-col gap-4 p-5 pb-24 max-w-2xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          aria-label="Volver"
          className="p-2 rounded-xl bg-[color:var(--surface-raised)] text-[color:var(--muted-color)] hover:text-[color:var(--fg-color)] cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[color:var(--fg-color)]">Nuevo mazo</h1>
          <p className="text-xs text-[color:var(--muted-color)]">
            Regla: exactamente 20 cartas, máx. 2 por nombre y 1-3 tipos de energía
          </p>
        </div>
      </div>

      {/* Name Input */}
      <div>
        <label htmlFor="deck-name" className="text-xs font-semibold text-[color:var(--muted-color)] mb-1.5 block">
          Nombre del mazo
        </label>
        <input
          id="deck-name"
          type="text"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej.: Charizard Agresivo"
          className="w-full px-4 py-2.5 rounded-2xl bg-[color:var(--surface-color)] border border-[color:var(--border-color)] text-[color:var(--fg-color)] text-sm focus:outline-none focus:border-[color:var(--accent-color)]"
        />
      </div>

      {/* Counter bar */}
      <div className="p-4 rounded-2xl bg-[color:var(--surface-color)] border border-[color:var(--border-color)] flex items-center justify-between">
        <div>
          <p className="text-xs text-[color:var(--muted-color)]">Progreso del mazo</p>
          <p className="text-base font-bold text-[color:var(--fg-color)]">
            <span className={totalCount === 20 ? 'text-[color:var(--accent-color)]' : 'text-amber-400'}>
              {totalCount}
            </span>{' '}
            / 20 cartas
          </p>
        </div>
        {totalCount === 20 && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-800/40">
            <CheckCircle className="w-4 h-4" />
            20/20 Completo
          </div>
        )}
      </div>

      {/* Energies Selector */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-[color:var(--muted-color)]">
          Tipos de Energía ({energies.length}/3)
        </span>
        <div className="flex flex-wrap gap-2">
          {([1, 2, 3, 4, 5, 6, 7, 8] as const).map((eId) => {
            const isSelected = energies.includes(eId);
            const style = ENERGY_COLORS[eId];
            return (
              <button
                key={eId}
                onClick={() => handleToggleEnergy(eId)}
                aria-pressed={isSelected}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  isSelected
                    ? `${style.bg} ${style.text} border ${style.border} font-bold shadow-sm`
                    : 'bg-[color:var(--surface-color)] text-[color:var(--muted-color)] border border-[color:var(--border-color)] hover:bg-[color:var(--surface-raised)]'
                }`}
              >
                <span>{ENERGY_NAMES[eId]}</span>
                <span className="text-[10px] opacity-70">#{eId}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Available Holdings Card Picker */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-[color:var(--muted-color)]">
          Cartas disponibles en colección ({availableHoldings.length})
        </span>

        {availableHoldings.length === 0 ? (
          <p className="text-xs text-[color:var(--muted-color)] p-4 bg-[color:var(--surface-color)] rounded-xl border border-[color:var(--border-color)]">
            No tienes cartas registradas en tu colección. Añade cartas en la pestaña Colección primero.
          </p>
        ) : (
          <>
            <div className="relative">
              <Search className="w-4 h-4 text-[color:var(--muted-color)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar por nombre o ID..."
                aria-label="Filtrar cartas disponibles"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[color:var(--surface-color)] border border-[color:var(--border-color)] text-[color:var(--fg-color)] text-xs placeholder:text-[color:var(--muted-color)] focus:outline-none focus:border-[color:var(--accent-color)]"
              />
            </div>

            <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {visibleHoldings.length === 0 && (
                <p className="text-xs text-[color:var(--muted-color)] p-3">Sin coincidencias.</p>
              )}
              {visibleHoldings.map((card) => {
                const qty = selectedCards[card.key] || 0;
                return (
                  <div
                    key={card.key}
                    className="p-3 rounded-xl bg-[color:var(--surface-color)] border border-[color:var(--border-color)] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <CardImage
                        set={card.setCode}
                        number={card.number}
                        alt={card.name}
                        className="w-10 h-14 shrink-0 object-contain rounded bg-[color:var(--image-bg)]"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[color:var(--fg-color)] truncate">{card.name}</p>
                        <p className="text-[11px] text-[color:var(--muted-color)]">
                          {card.setCode} #{card.number} · posees {card.quantity} (máx 2 por nombre)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAdjustCount(card, -1)}
                        disabled={qty <= 0}
                        aria-label={`Quitar ${card.name} del mazo`}
                        className="p-1.5 rounded-lg bg-[color:var(--surface-raised)] text-[color:var(--muted-color)] hover:text-[color:var(--fg-color)] disabled:opacity-20 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-bold text-[color:var(--fg-color)] w-5 text-center">{qty}</span>
                      <button
                        onClick={() => handleAdjustCount(card, 1)}
                        disabled={!canAddCard(card)}
                        aria-label={`Añadir ${card.name} al mazo`}
                        className="p-1.5 rounded-lg bg-[color:var(--surface-raised)] text-[color:var(--accent-color)] hover:bg-[color:var(--accent-color)] hover:text-[color:var(--on-accent)] disabled:opacity-20 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 p-3 rounded-xl">{error}</p>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!isComplete}
        className="w-full py-3.5 rounded-2xl bg-[color:var(--accent-color)] hover:bg-[color:var(--accent-hover)] text-[color:var(--on-accent)] font-bold text-sm shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer mt-2"
      >
        Guardar mazo
      </button>
    </div>
  );
};

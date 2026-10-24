import React, { useState } from 'react';
import { ArrowLeft, Plus, Minus, CheckCircle } from 'lucide-react';
import { CollectionCard, Deck, DeckCard, ENERGY_NAMES, ENERGY_COLORS } from '../types';
import { db } from '../data/database';

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
  const [error, setError] = useState<string | null>(null);

  const availableHoldings = holdings.filter((h) => h.quantity > 0);
  const totalCount = Object.values(selectedCards).reduce((sum, q) => sum + q, 0);

  const handleToggleEnergy = (id: number) => {
    if (energies.includes(id)) {
      if (energies.length > 1) {
        setEnergies(energies.filter((e) => e !== id));
      }
    } else {
      if (energies.length < 3) {
        setEnergies([...energies, id].sort((a, b) => a - b));
      }
    }
  };

  const handleAdjustCount = (key: string, delta: 1 | -1, maxAvailable: number) => {
    const current = selectedCards[key] || 0;
    const maxAllowed = Math.min(2, maxAvailable);

    if (delta > 0) {
      if (current < maxAllowed && totalCount < 20) {
        setSelectedCards({ ...selectedCards, [key]: current + 1 });
      }
    } else {
      if (current > 0) {
        const next = current - 1;
        const copy = { ...selectedCards };
        if (next === 0) {
          delete copy[key];
        } else {
          copy[key] = next;
        }
        setSelectedCards(copy);
      }
    }
  };

  const handleSave = () => {
    setError(null);
    try {
      const cards: DeckCard[] = [];
      availableHoldings.forEach((h) => {
        const qty = selectedCards[h.key] || 0;
        if (qty > 0) {
          cards.push({
            setCode: h.setCode,
            number: h.number,
            name: h.name,
            category: h.category,
            quantity: qty,
            imageUrl: h.imageUrl,
          });
        }
      });

      const deck: Deck = {
        id: 0,
        name: name.trim() || 'Mi mazo',
        cards,
        energies,
      };

      db.saveDeck(deck);
      onSaved();
    } catch (err) {
      setError((err as Error).message || 'No se pudo guardar el mazo.');
    }
  };

  const isComplete = totalCount === 20 && energies.length >= 1 && energies.length <= 3;

  return (
    <div className="flex flex-col gap-4 p-5 pb-24 max-w-2xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="p-2 rounded-xl bg-[#162335] text-[#9BA8B8] hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Nuevo mazo</h1>
          <p className="text-xs text-[#9BA8B8]">Regla: exactamente 20 cartas y 1-3 tipos de energía</p>
        </div>
      </div>

      {/* Name Input */}
      <div>
        <label className="text-xs font-semibold text-[#9BA8B8] mb-1.5 block">
          Nombre del mazo
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej.: Charizard Agresivo"
          className="w-full px-4 py-2.5 rounded-2xl bg-[#101722] border border-[#263446] text-white text-sm focus:outline-none focus:border-[#62A9FF]"
        />
      </div>

      {/* Counter bar */}
      <div className="p-4 rounded-2xl bg-[#101722] border border-[#263446] flex items-center justify-between">
        <div>
          <p className="text-xs text-[#9BA8B8]">Progreso del mazo</p>
          <p className="text-base font-bold text-white">
            <span className={totalCount === 20 ? 'text-[#62A9FF]' : 'text-amber-400'}>
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
        <label className="text-xs font-semibold text-[#9BA8B8]">
          Tipos de Energía ({energies.length}/3)
        </label>
        <div className="flex flex-wrap gap-2">
          {([1, 2, 3, 4, 5, 6, 7, 8] as const).map((eId) => {
            const isSelected = energies.includes(eId);
            const style = ENERGY_COLORS[eId];
            return (
              <button
                key={eId}
                onClick={() => handleToggleEnergy(eId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  isSelected
                    ? `${style.bg} ${style.text} border ${style.border} font-bold shadow-sm`
                    : 'bg-[#101722] text-[#9BA8B8] border border-[#263446] hover:bg-[#162335]'
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
        <label className="text-xs font-semibold text-[#9BA8B8]">
          Cartas disponibles en colección ({availableHoldings.length})
        </label>

        {availableHoldings.length === 0 ? (
          <p className="text-xs text-[#9BA8B8] p-4 bg-[#101722] rounded-xl border border-[#263446]">
            No tienes cartas registradas en tu colección. Añade cartas en la pestaña Colección primero.
          </p>
        ) : (
          <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
            {availableHoldings.map((card) => {
              const qty = selectedCards[card.key] || 0;
              const maxAllowed = Math.min(2, card.quantity);
              const canAdd = qty < maxAllowed && totalCount < 20;

              return (
                <div
                  key={card.key}
                  className="p-3 rounded-xl bg-[#101722] border border-[#263446] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      className="w-10 h-14 object-contain rounded bg-[#0B111A]"
                    />
                    <div className="truncate">
                      <p className="text-sm font-semibold text-white truncate">{card.name}</p>
                      <p className="text-[11px] text-[#9BA8B8]">
                        {card.setCode} #{card.number} · posees {card.quantity} (máx 2 en mazo)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAdjustCount(card.key, -1, card.quantity)}
                      disabled={qty <= 0}
                      className="p-1.5 rounded-lg bg-[#162335] text-[#9BA8B8] hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-bold text-white w-5 text-center">
                      {qty}
                    </span>
                    <button
                      onClick={() => handleAdjustCount(card.key, 1, card.quantity)}
                      disabled={!canAdd}
                      className="p-1.5 rounded-lg bg-[#162335] text-[#62A9FF] hover:bg-[#62A9FF] hover:text-slate-950 disabled:opacity-20 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 p-3 rounded-xl">
          {error}
        </p>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!isComplete}
        className="w-full py-3.5 rounded-2xl bg-[#62A9FF] hover:bg-[#72b3ff] text-slate-950 font-bold text-sm shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer mt-2"
      >
        Guardar mazo
      </button>
    </div>
  );
};

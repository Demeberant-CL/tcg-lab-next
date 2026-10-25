import React from 'react';
import { Plus, Sparkles, Grid } from 'lucide-react';
import { DeckSummary } from '../types';

interface DecksScreenProps {
  decks: DeckSummary[];
  onOpenDeck: (id: number) => void;
  onNewDeck: () => void;
  onStrategy: () => void;
}

export const DecksScreen: React.FC<DecksScreenProps> = ({
  decks,
  onOpenDeck,
  onNewDeck,
  onStrategy,
}) => {
  return (
    <div className="flex flex-col gap-4 p-5 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fg-color)]">Mazos</h1>
          <p className="text-sm text-[color:var(--muted-color)]">{decks.length} mazos guardados</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewDeck}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[color:var(--surface-raised)] text-[color:var(--accent-soft)] hover:bg-[color:var(--raised-hover)] text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
          <button
            onClick={onStrategy}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[color:var(--accent-color)]/20 text-[color:var(--accent-color)] border border-[color:var(--accent-color)]/30 hover:bg-[color:var(--accent-color)]/30 text-xs font-bold transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            IA
          </button>
        </div>
      </div>

      {/* Decks List or Empty State */}
      {decks.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[color:var(--surface-color)] border border-[color:var(--border-color)] text-center my-6 flex flex-col items-center justify-center gap-2">
          <div className="p-3.5 rounded-2xl bg-[color:var(--surface-raised)] text-[color:var(--accent-color)] mb-1">
            <Grid className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[color:var(--fg-color)]">Sin mazos</h3>
          <p className="text-xs text-[color:var(--muted-color)]">
            Los mazos creados manualmente o generados con IA aparecerán aquí.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={onNewDeck}
              className="px-4 py-2 rounded-xl bg-[color:var(--surface-raised)] text-xs font-semibold text-[color:var(--fg-color)] hover:bg-[color:var(--raised-hover)]"
            >
              Crear mazo
            </button>
            <button
              onClick={onStrategy}
              className="px-4 py-2 rounded-xl bg-[color:var(--accent-color)] text-xs font-bold text-[color:var(--on-accent)] hover:bg-[color:var(--accent-hover)]"
            >
              Generar con IA
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {decks.map((deck) => (
            <div
              key={deck.id}
              onClick={() => onOpenDeck(deck.id)}
              className="p-4 rounded-2xl bg-[color:var(--surface-color)] border border-[color:var(--border-color)] hover:border-[color:var(--accent-color)]/50 transition flex items-center justify-between cursor-pointer group shadow-sm"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-[color:var(--surface-raised)] text-[color:var(--accent-color)] group-hover:scale-105 transition">
                  <Grid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[color:var(--fg-color)] group-hover:text-[color:var(--accent-color)] transition">
                    {deck.name}
                  </h3>
                  <p className="text-xs text-[color:var(--muted-color)] mt-0.5">
                    {deck.cardCount}/20 cartas · {deck.energyCount} energías
                  </p>
                </div>
              </div>

              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                  deck.valid
                    ? 'bg-blue-950/80 text-[color:var(--accent-color)] border border-blue-700/40'
                    : 'bg-amber-950/80 text-amber-400 border border-amber-700/40'
                }`}
              >
                {deck.valid ? 'VÁLIDO' : 'REVISAR'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

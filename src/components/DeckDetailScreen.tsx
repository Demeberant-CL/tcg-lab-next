import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Trash2, QrCode, CheckCircle, AlertTriangle } from 'lucide-react';
import { Deck, DeckCard, ENERGY_NAMES, ENERGY_COLORS } from '../types';
import { DeckRules } from '../domain/deckRules';
import { db } from '../data/database';
import { CardImage } from './CardImage';

interface DeckDetailScreenProps {
  deck: Deck;
  onBack: () => void;
  onDeleted: () => void;
}

const DeckCardList: React.FC<{ title: string; cards: DeckCard[] }> = ({ title, cards }) => {
  if (cards.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-bold tracking-wider uppercase text-[color:var(--accent-color)]">
        {title} ({cards.reduce((sum, c) => sum + c.quantity, 0)})
      </h3>
      <div className="flex flex-col gap-2">
        {cards.map((c) => (
          <div
            key={`${c.setCode}#${c.number}`}
            className="p-3 rounded-2xl bg-[color:var(--surface-color)] border border-[color:var(--border-color)] flex items-center justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <CardImage
                set={c.setCode}
                number={c.number}
                alt={c.name}
                className="w-11 h-14 shrink-0 object-contain rounded bg-[color:var(--image-bg)]"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-[color:var(--fg-color)] truncate">{c.name}</p>
                <p className="text-xs text-[color:var(--muted-color)]">
                  {c.setCode} · #{c.number}
                </p>
              </div>
            </div>
            <span className="text-base font-black text-[color:var(--accent-color)] px-3 py-1 bg-[color:var(--surface-raised)] rounded-xl border border-[color:var(--border-color)]">
              ×{c.quantity}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DeckDetailScreen: React.FC<DeckDetailScreenProps> = ({ deck, onBack, onDeleted }) => {
  const [showQr, setShowQr] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const totalCards = deck.cards.reduce((sum, c) => sum + c.quantity, 0);
  const isValid = DeckRules.isValidDeck(deck);

  useEffect(() => {
    if (!showQr) return;
    let cancelled = false;
    setQrError(null);

    // La librería de QR solo se descarga cuando el usuario pide ver el código.
    import('qrcode')
      .then(({ default: QRCode }) => {
        if (cancelled || !canvasRef.current) return;
        const payload = JSON.stringify({
          name: deck.name,
          energies: deck.energies,
          cards: deck.cards.map((c) => ({ set: c.setCode, number: c.number, quantity: c.quantity })),
        });
        return QRCode.toCanvas(canvasRef.current, payload, {
          width: 280,
          margin: 2,
          errorCorrectionLevel: 'L',
          color: { dark: '#000000', light: '#ffffff' },
        });
      })
      .catch((err) => {
        console.error('Error generando QR:', err);
        if (!cancelled) setQrError('No se pudo generar el código QR.');
      });

    return () => {
      cancelled = true;
    };
  }, [showQr, deck]);

  useEffect(() => {
    if (!confirmDelete) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setConfirmDelete(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmDelete]);

  const handleDelete = () => {
    db.deleteDeck(deck.id);
    setConfirmDelete(false);
    onDeleted();
  };

  const pokemonCards = deck.cards.filter((c) => c.category.toLowerCase() !== 'entrenadores');
  const trainerCards = deck.cards.filter((c) => c.category.toLowerCase() === 'entrenadores');

  return (
    <div className="flex flex-col gap-4 p-5 pb-24 max-w-2xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            aria-label="Volver"
            className="p-2 rounded-xl bg-[color:var(--surface-raised)] text-[color:var(--muted-color)] hover:text-[color:var(--fg-color)] cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[color:var(--fg-color)] truncate">{deck.name}</h1>
            <p className="text-xs text-[color:var(--muted-color)]">
              {totalCards}/20 cartas · {deck.energies.length} energías
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${
            isValid
              ? 'bg-blue-950/80 text-[color:var(--accent-color)] border border-blue-700/40'
              : 'bg-amber-950/80 text-amber-400 border border-amber-700/40'
          }`}
        >
          {isValid ? (
            <>
              <CheckCircle className="w-3.5 h-3.5" /> VÁLIDO
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5" /> REVISAR
            </>
          )}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowQr(!showQr)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[color:var(--surface-raised)] text-[color:var(--accent-soft)] hover:bg-[color:var(--raised-hover)] text-xs font-bold transition cursor-pointer"
        >
          <QrCode className="w-4 h-4" />
          {showQr ? 'Ocultar QR' : 'Mostrar QR'}
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/40 text-rose-400 border border-rose-800/40 hover:bg-rose-900/50 text-xs font-bold transition cursor-pointer ml-auto"
        >
          <Trash2 className="w-4 h-4" />
          Eliminar
        </button>
      </div>

      {/* QR Code Container */}
      {showQr && (
        <div className="p-6 rounded-3xl bg-[color:var(--surface-color)] border border-[color:var(--border-color)] flex flex-col items-center justify-center gap-3 shadow-xl">
          <div className="p-3 bg-white rounded-2xl shadow-md">
            <canvas ref={canvasRef} />
          </div>
          {qrError && <p className="text-xs text-rose-400">{qrError}</p>}
          <p className="text-xs font-semibold text-[color:var(--accent-soft)]">Código QR del mazo</p>
          <p className="text-[11px] text-[color:var(--muted-color)] max-w-xs text-center">
            Contiene el nombre, las energías y la lista de cartas (set, número y cantidad) del mazo en
            formato JSON.
          </p>
        </div>
      )}

      {/* Energies Section */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-bold text-[color:var(--fg-color)]">Energías</h3>
        <div className="flex flex-wrap gap-2">
          {deck.energies.map((eId) => {
            const style = ENERGY_COLORS[eId];
            return (
              <span
                key={eId}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${style.bg} ${style.text} border ${style.border}`}
              >
                {ENERGY_NAMES[eId]} #{eId}
              </span>
            );
          })}
        </div>
      </div>

      {/* Cards List Grouped */}
      <div className="flex flex-col gap-4 mt-1">
        <DeckCardList title="Pokémon" cards={pokemonCards} />
        <DeckCardList title="Entrenadores" cards={trainerCards} />
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Eliminar mazo"
          onClick={() => setConfirmDelete(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[color:var(--surface-color)] border border-[color:var(--border-color)] rounded-3xl max-w-sm w-full p-5 flex flex-col gap-3 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-[color:var(--fg-color)]">Eliminar mazo</h3>
            <p className="text-xs text-[color:var(--muted-color)]">
              ¿Seguro que quieres eliminar «{deck.name}» de forma permanente?
            </p>
            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-xl bg-[color:var(--surface-raised)] text-xs font-semibold text-[color:var(--fg-color)] hover:bg-[color:var(--raised-hover)] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

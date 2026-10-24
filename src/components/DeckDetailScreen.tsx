import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Trash2, QrCode, CheckCircle, AlertTriangle } from 'lucide-react';
import QRCode from 'qrcode';
import { Deck, ENERGY_NAMES, ENERGY_COLORS } from '../types';
import { db } from '../data/database';

interface DeckDetailScreenProps {
  deck: Deck;
  onBack: () => void;
  onDeleted: () => void;
}

export const DeckDetailScreen: React.FC<DeckDetailScreenProps> = ({
  deck,
  onBack,
  onDeleted,
}) => {
  const [showQr, setShowQr] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const totalCards = deck.cards.reduce((sum, c) => sum + c.quantity, 0);
  const isValid = totalCards === 20 && deck.energies.length >= 1 && deck.energies.length <= 3;

  useEffect(() => {
    if (showQr && canvasRef.current) {
      const payload = JSON.stringify({
        name: deck.name,
        energies: deck.energies,
        cards: deck.cards.map((c) => ({
          set: c.setCode,
          number: c.number,
          quantity: c.quantity,
        })),
      });

      QRCode.toCanvas(
        canvasRef.current,
        payload,
        {
          width: 260,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('Error generando QR:', error);
        }
      );
    }
  }, [showQr, deck]);

  const handleDelete = () => {
    db.deleteDeck(deck.id);
    setConfirmDelete(false);
    onDeleted();
  };

  const pokemonCards = deck.cards.filter(
    (c) => c.category.toLowerCase() !== 'entrenadores'
  );
  const trainerCards = deck.cards.filter(
    (c) => c.category.toLowerCase() === 'entrenadores'
  );

  return (
    <div className="flex flex-col gap-4 p-5 pb-24 max-w-2xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-[#162335] text-[#9BA8B8] hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{deck.name}</h1>
            <p className="text-xs text-[#9BA8B8]">
              {totalCards}/20 cartas · {deck.energies.length} energías
            </p>
          </div>
        </div>

        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${
            isValid
              ? 'bg-blue-950/80 text-[#62A9FF] border border-blue-700/40'
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
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#162335] text-[#9CC9FF] hover:bg-[#20314a] text-xs font-bold transition cursor-pointer"
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
        <div className="p-6 rounded-3xl bg-[#111823] border border-[#263446] flex flex-col items-center justify-center gap-3 shadow-xl">
          <div className="p-3 bg-white rounded-2xl shadow-md">
            <canvas ref={canvasRef} />
          </div>
          <p className="text-xs font-semibold text-[#9CC9FF]">
            Código QR de importación / exportación del mazo
          </p>
          <p className="text-[11px] text-[#9BA8B8] max-w-xs text-center">
            Escanea este código con la app para replicar este mazo de 20 cartas instantáneamente.
          </p>
        </div>
      )}

      {/* Energies Section */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-bold text-white">Energías</h3>
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
        {pokemonCards.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold tracking-wider uppercase text-[#62A9FF]">
              Pokémon ({pokemonCards.reduce((sum, c) => sum + c.quantity, 0)})
            </h3>
            <div className="flex flex-col gap-2">
              {pokemonCards.map((c) => (
                <div
                  key={`${c.setCode}#${c.number}`}
                  className="p-3 rounded-2xl bg-[#111823] border border-[#263446] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={c.imageUrl}
                      alt={c.name}
                      className="w-11 h-14 object-contain rounded bg-[#0B111A]"
                    />
                    <div>
                      <p className="text-sm font-bold text-white">{c.name}</p>
                      <p className="text-xs text-[#8E9AAA]">
                        {c.setCode} · #{c.number}
                      </p>
                    </div>
                  </div>
                  <span className="text-base font-black text-[#62A9FF] px-3 py-1 bg-[#162335] rounded-xl border border-[#263446]">
                    ×{c.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {trainerCards.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold tracking-wider uppercase text-[#62A9FF]">
              Entrenadores ({trainerCards.reduce((sum, c) => sum + c.quantity, 0)})
            </h3>
            <div className="flex flex-col gap-2">
              {trainerCards.map((c) => (
                <div
                  key={`${c.setCode}#${c.number}`}
                  className="p-3 rounded-2xl bg-[#111823] border border-[#263446] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={c.imageUrl}
                      alt={c.name}
                      className="w-11 h-14 object-contain rounded bg-[#0B111A]"
                    />
                    <div>
                      <p className="text-sm font-bold text-white">{c.name}</p>
                      <p className="text-xs text-[#8E9AAA]">
                        {c.setCode} · #{c.number}
                      </p>
                    </div>
                  </div>
                  <span className="text-base font-black text-[#62A9FF] px-3 py-1 bg-[#162335] rounded-xl border border-[#263446]">
                    ×{c.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#101722] border border-[#263446] rounded-3xl max-w-sm w-full p-5 flex flex-col gap-3 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Eliminar mazo</h3>
            <p className="text-xs text-[#9BA8B8]">
              ¿Estás seguro de que deseas eliminar este mazo de forma permanente?
            </p>
            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-xl bg-[#162335] text-xs font-semibold text-white hover:bg-[#20314a] cursor-pointer"
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

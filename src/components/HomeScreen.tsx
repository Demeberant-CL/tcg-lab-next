import React from 'react';
import { Settings, Sparkles, Bookmark, Grid, Activity } from 'lucide-react';
import { DeckSummary } from '../types';

interface HomeScreenProps {
  cardCount: number;
  deckCount: number;
  decks: DeckSummary[];
  onCollection: () => void;
  onStrategy: () => void;
  onDecks: () => void;
  onSettings: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  cardCount,
  deckCount,
  decks,
  onCollection,
  onStrategy,
  onDecks,
  onSettings,
}) => {
  return (
    <div className="flex flex-col gap-5 p-5 pb-24 max-w-2xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            TCG LAB
          </h1>
          <p className="text-sm text-[#9BA8B8] font-medium">Laboratorio de estrategia</p>
        </div>
        <button
          onClick={onSettings}
          title="Ajustes"
          className="p-3 rounded-2xl bg-[#162335] text-[#9CC9FF] hover:bg-[#20314a] transition cursor-pointer"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Main AI Feature Card */}
      <div className="rounded-[28px] overflow-hidden border border-[#263446]/60 shadow-xl bg-gradient-to-br from-[#173A60] via-[#12263D] to-[#101722] p-6 text-white flex flex-col gap-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#62A9FF]/20 text-[#62A9FF] border border-[#62A9FF]/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#9CC9FF]">
              ESTRATEGIA IA
            </span>
            <p className="text-xs text-[#9BA8B8]">Laboratorio de decisiones</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-white">
          Construye tu próximo mazo
        </h2>

        <p className="text-sm text-[#D0D8E3] leading-relaxed">
          Analiza las cartas disponibles y recibe una propuesta de 20 cartas con criterio estratégico.
        </p>

        <div>
          <button
            onClick={onStrategy}
            className="mt-1 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#62A9FF] hover:bg-[#72b3ff] text-slate-950 font-bold text-sm shadow-md transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Analizar colección
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onCollection}
          className="p-4 rounded-2xl bg-[#101722] border border-[#263446] hover:border-[#62A9FF]/50 transition text-left flex flex-col gap-2 cursor-pointer shadow-sm"
        >
          <Bookmark className="w-6 h-6 text-[#62A9FF]" />
          <span className="text-xs font-bold uppercase text-[#9BA8B8]">CARTAS</span>
          <span className="text-2xl font-black text-white">{cardCount}</span>
          <span className="text-xs text-[#9BA8B8]">registradas</span>
        </button>

        <button
          onClick={onDecks}
          className="p-4 rounded-2xl bg-[#101722] border border-[#263446] hover:border-[#62A9FF]/50 transition text-left flex flex-col gap-2 cursor-pointer shadow-sm"
        >
          <Grid className="w-6 h-6 text-[#62A9FF]" />
          <span className="text-xs font-bold uppercase text-[#9BA8B8]">MAZOS</span>
          <span className="text-2xl font-black text-white">{deckCount}</span>
          <span className="text-xs text-[#9BA8B8]">guardados</span>
        </button>
      </div>

      {/* Recent Activity */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Actividad reciente</h3>
          <span className="text-xs text-[#9BA8B8]">Laboratorio</span>
        </div>

        {decks.length === 0 ? (
          <div className="p-4 rounded-2xl bg-[#101722] border border-[#263446] flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-[#162335] text-[#62A9FF]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Sin actividad todavía</p>
              <p className="text-xs text-[#9BA8B8] mt-0.5">
                Registra cartas o crea un mazo con IA para comenzar.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {decks.slice(0, 3).map((deck) => (
              <button
                key={deck.id}
                onClick={onDecks}
                className="p-3.5 rounded-2xl bg-[#101722] border border-[#263446] hover:border-[#62A9FF]/40 transition flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#162335] text-[#62A9FF]">
                    <Grid className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{deck.name}</p>
                    <p className="text-xs text-[#9BA8B8]">
                      {deck.cardCount}/20 cartas · {deck.energyCount} energías
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    deck.valid
                      ? 'bg-blue-950 text-[#62A9FF] border border-blue-800/40'
                      : 'bg-amber-950 text-amber-400 border border-amber-800/40'
                  }`}
                >
                  {deck.valid ? 'VÁLIDO' : 'REVISAR'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

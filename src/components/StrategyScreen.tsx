import React, { useState } from 'react';
import { Sparkles, Eye, EyeOff, Info, CheckCircle, Save, AlertCircle } from 'lucide-react';
import { AiDeckProposal, CatalogCard, CollectionCard, ENERGY_NAMES } from '../types';
import { AiDeckClient } from '../data/aiDeckClient';
import { db } from '../data/database';

interface StrategyScreenProps {
  holdings: CollectionCard[];
  catalog: CatalogCard[];
  onDeckSaved: () => void;
}

export const StrategyScreen: React.FC<StrategyScreenProps> = ({
  holdings,
  catalog,
  onDeckSaved,
}) => {
  const [apiKey, setApiKey] = useState(AiDeckClient.currentKey());
  const [showKey, setShowKey] = useState(false);
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<AiDeckProposal | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const distinctHoldings = holdings.filter((h) => h.quantity > 0).length;

  const handleKeyChange = (val: string) => {
    setApiKey(val);
    AiDeckClient.saveKey(val);
  };

  const handleGenerate = async () => {
    if (busy || distinctHoldings < 10) return;
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const result = await AiDeckClient.generate(holdings, catalog, goal);
      setProposal(result);
      setMessage('Propuesta lista para revisar.');
    } catch (err) {
      setError((err as Error).message || 'No se pudo generar la propuesta.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProposal = () => {
    if (!proposal) return;
    try {
      db.saveDeck(proposal.deck);
      setMessage(`Mazo guardado: ${proposal.deck.name}`);
      setProposal(null);
      onDeckSaved();
    } catch (err) {
      setError((err as Error).message || 'No se pudo guardar el mazo.');
    }
  };

  return (
    <div className="flex flex-col gap-5 p-5 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Estrategia IA
        </h1>
        <p className="text-sm text-[#9BA8B8]">
          Convierte tu colección en una propuesta de juego óptima.
        </p>
      </div>

      {/* Main Container Card */}
      <div className="p-6 rounded-3xl bg-[#101722] border border-[#263446] flex flex-col gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#62A9FF]/20 text-[#62A9FF] border border-[#62A9FF]/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Constructor estratégico</h3>
            <p className="text-xs text-[#9CC9FF]">20 cartas · 1–3 energías</p>
          </div>
        </div>

        <p className="text-xs text-[#9BA8B8] leading-relaxed">
          Grok analiza únicamente las cartas registradas en tu colección y propone un mazo válido
          según las reglas oficiales de Pokémon TCG Pocket.
        </p>

        {/* API Key Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#9BA8B8]">
            Clave API de xAI (Grok) - Opcional
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder="xai-..."
              className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-[#070B12] border border-[#263446] text-white text-xs placeholder-[#9BA8B8] focus:outline-none focus:border-[#62A9FF]"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9BA8B8] hover:text-white cursor-pointer"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <span className="text-[11px] text-[#9BA8B8]">
            {apiKey
              ? 'Clave guardada localmente. Se usará para llamar al modelo xAI.'
              : 'Si no configuras clave, se usará el motor táctico integrado de TCG LAB.'}
          </span>
        </div>

        {/* Warning if insufficient cards */}
        {distinctHoldings < 10 && (
          <div className="p-3.5 rounded-2xl bg-[#162335] border border-[#263446] flex items-center gap-3">
            <Info className="w-5 h-5 text-[#62A9FF] shrink-0" />
            <div>
              <p className="text-xs font-bold text-white">Colección insuficiente</p>
              <p className="text-[11px] text-[#9BA8B8]">
                Tienes {distinctHoldings} cartas distintas. Registra al menos 10 en la pestaña
                Colección para habilitar el análisis de mazo.
              </p>
            </div>
          </div>
        )}

        {/* Goal Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#9BA8B8]">
            Objetivo o estilo de juego (opcional)
          </label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={2}
            placeholder="Ej.: consistencia, agresividad, control, mazo de agua con Gyarados..."
            className="w-full p-3 rounded-xl bg-[#070B12] border border-[#263446] text-white text-xs placeholder-[#9BA8B8] focus:outline-none focus:border-[#62A9FF] resize-none"
          />
        </div>

        {/* Action Button */}
        <button
          onClick={handleGenerate}
          disabled={busy || distinctHoldings < 10}
          className="w-full py-3.5 rounded-2xl bg-[#62A9FF] hover:bg-[#72b3ff] text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          {busy ? 'Analizando colección...' : 'Generar propuesta'}
        </button>

        {message && (
          <p className="text-xs font-semibold text-[#9CC9FF] bg-[#162335] p-3 rounded-xl border border-[#263446] flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            {message}
          </p>
        )}

        {error && (
          <p className="text-xs font-semibold text-rose-400 bg-rose-950/40 p-3 rounded-xl border border-rose-800/40 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            {error}
          </p>
        )}

        {/* Generated Proposal Display */}
        {proposal && (
          <div className="flex flex-col gap-3.5 pt-4 border-t border-[#263446]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9CC9FF]">
                Propuesta de Mazo
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#162335] text-white">
                  {proposal.deck.cards.reduce((sum, c) => sum + c.quantity, 0)}/20 cartas
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#162335] text-white">
                  {proposal.deck.energies.length} energías
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-950 text-[#62A9FF]">
                  Válido
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-black text-white">{proposal.deck.name}</h2>
              <p className="text-xs text-[#9CC9FF] font-medium mt-0.5">
                Energías:{' '}
                {proposal.deck.energies.map((e) => ENERGY_NAMES[e] || `#${e}`).join(' · ')}
              </p>
              <p className="text-xs text-[#9BA8B8] mt-0.5">
                {proposal.deck.cards.length} cartas distintas · 20 copias en total
              </p>
            </div>

            {/* Proposal Cards List */}
            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
              {proposal.deck.cards.map((card) => (
                <div
                  key={`${card.setCode}#${card.number}`}
                  className="p-2.5 rounded-xl bg-[#070B12] border border-[#263446] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      className="w-8 h-11 object-contain rounded bg-[#0B111A]"
                    />
                    <div className="truncate">
                      <p className="text-xs font-bold text-white truncate">{card.name}</p>
                      <p className="text-[10px] text-[#9BA8B8]">
                        {card.setCode} · #{card.number} · {card.category}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#62A9FF] px-2.5 py-1 rounded-lg bg-[#162335] border border-[#263446]">
                    ×{card.quantity}
                  </span>
                </div>
              ))}
            </div>

            {/* AI Explanation / Criterion */}
            <div className="p-3.5 rounded-2xl bg-[#162335]/60 border border-[#263446] flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase text-[#9CC9FF]">
                Criterio de la IA
              </span>
              <p className="text-xs text-[#D0D8E3] leading-relaxed">{proposal.explanation}</p>
            </div>

            {/* Save Deck Button */}
            <button
              onClick={handleSaveProposal}
              className="w-full py-3 rounded-2xl bg-[#62A9FF] hover:bg-[#72b3ff] text-slate-950 font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Guardar mazo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

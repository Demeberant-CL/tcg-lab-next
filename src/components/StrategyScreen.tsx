import React, { useState } from 'react';
import { Sparkles, Eye, EyeOff, Info, CheckCircle, Save, AlertCircle } from 'lucide-react';
import { AiDeckProposal, CollectionCard, ENERGY_NAMES } from '../types';
import { AiDeckClient } from '../data/aiDeckClient';
import { db } from '../data/database';
import { CardImage } from './CardImage';

interface StrategyScreenProps {
  holdings: CollectionCard[];
  onDeckSaved: () => void;
}

export const StrategyScreen: React.FC<StrategyScreenProps> = ({
  holdings,
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
      const result = await AiDeckClient.generate(holdings, goal);
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
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fg-color)] flex items-center gap-2">
          Estrategia IA
        </h1>
        <p className="text-sm text-[color:var(--muted-color)]">
          Convierte tu colección en una propuesta de juego óptima.
        </p>
      </div>

      {/* Main Container Card */}
      <div className="p-6 rounded-3xl bg-[color:var(--surface-color)] border border-[color:var(--border-color)] flex flex-col gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[color:var(--accent-color)]/20 text-[color:var(--accent-color)] border border-[color:var(--accent-color)]/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[color:var(--fg-color)]">Constructor estratégico</h3>
            <p className="text-xs text-[color:var(--accent-soft)]">20 cartas · 1–3 energías</p>
          </div>
        </div>

        <p className="text-xs text-[color:var(--muted-color)] leading-relaxed">
          Grok analiza únicamente las cartas registradas en tu colección y propone un mazo válido
          según las reglas oficiales de Pokémon TCG Pocket.
        </p>

        {/* API Key Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[color:var(--muted-color)]">
            Clave API de xAI (Grok) - Opcional
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder="xai-..."
              className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-[color:var(--bg-color)] border border-[color:var(--border-color)] text-[color:var(--fg-color)] text-xs placeholder:text-[color:var(--muted-color)] focus:outline-none focus:border-[color:var(--accent-color)]"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted-color)] hover:text-[color:var(--fg-color)] cursor-pointer"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <span className="text-[11px] text-[color:var(--muted-color)]">
            {apiKey
              ? 'Clave guardada localmente. Se usará para llamar al modelo xAI.'
              : 'Si no configuras clave, se usará el motor táctico integrado de TCG LAB.'}
          </span>
        </div>

        {/* Warning if insufficient cards */}
        {distinctHoldings < 10 && (
          <div className="p-3.5 rounded-2xl bg-[color:var(--surface-raised)] border border-[color:var(--border-color)] flex items-center gap-3">
            <Info className="w-5 h-5 text-[color:var(--accent-color)] shrink-0" />
            <div>
              <p className="text-xs font-bold text-[color:var(--fg-color)]">Colección insuficiente</p>
              <p className="text-[11px] text-[color:var(--muted-color)]">
                Tienes {distinctHoldings} cartas distintas. Registra al menos 10 en la pestaña
                Colección para habilitar el análisis de mazo.
              </p>
            </div>
          </div>
        )}

        {/* Goal Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[color:var(--muted-color)]">
            Objetivo o estilo de juego (opcional)
          </label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={2}
            placeholder="Ej.: consistencia, agresividad, control, mazo de agua con Gyarados..."
            className="w-full p-3 rounded-xl bg-[color:var(--bg-color)] border border-[color:var(--border-color)] text-[color:var(--fg-color)] text-xs placeholder:text-[color:var(--muted-color)] focus:outline-none focus:border-[color:var(--accent-color)] resize-none"
          />
        </div>

        {/* Action Button */}
        <button
          onClick={handleGenerate}
          disabled={busy || distinctHoldings < 10}
          className="w-full py-3.5 rounded-2xl bg-[color:var(--accent-color)] hover:bg-[color:var(--accent-hover)] text-[color:var(--on-accent)] font-bold text-xs shadow-md transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          {busy ? 'Analizando colección...' : 'Generar propuesta'}
        </button>

        {message && (
          <p className="text-xs font-semibold text-[color:var(--accent-soft)] bg-[color:var(--surface-raised)] p-3 rounded-xl border border-[color:var(--border-color)] flex items-center gap-2">
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
          <div className="flex flex-col gap-3.5 pt-4 border-t border-[color:var(--border-color)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--accent-soft)]">
                Propuesta de Mazo
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[color:var(--surface-raised)] text-[color:var(--fg-color)]">
                  {proposal.deck.cards.reduce((sum, c) => sum + c.quantity, 0)}/20 cartas
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[color:var(--surface-raised)] text-[color:var(--fg-color)]">
                  {proposal.deck.energies.length} energías
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-950 text-[color:var(--accent-color)]">
                  Válido
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-black text-[color:var(--fg-color)]">{proposal.deck.name}</h2>
              <p className="text-xs text-[color:var(--accent-soft)] font-medium mt-0.5">
                Energías:{' '}
                {proposal.deck.energies.map((e) => ENERGY_NAMES[e] || `#${e}`).join(' · ')}
              </p>
              <p className="text-xs text-[color:var(--muted-color)] mt-0.5">
                {proposal.deck.cards.length} cartas distintas · 20 copias en total
              </p>
            </div>

            {/* Proposal Cards List */}
            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
              {proposal.deck.cards.map((card) => (
                <div
                  key={`${card.setCode}#${card.number}`}
                  className="p-2.5 rounded-xl bg-[color:var(--bg-color)] border border-[color:var(--border-color)] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <CardImage
                      set={card.setCode}
                      number={card.number}
                      alt={card.name}
                      className="w-8 h-11 object-contain rounded bg-[color:var(--image-bg)]"
                    />
                    <div className="truncate">
                      <p className="text-xs font-bold text-[color:var(--fg-color)] truncate">{card.name}</p>
                      <p className="text-[10px] text-[color:var(--muted-color)]">
                        {card.setCode} · #{card.number} · {card.category}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[color:var(--accent-color)] px-2.5 py-1 rounded-lg bg-[color:var(--surface-raised)] border border-[color:var(--border-color)]">
                    ×{card.quantity}
                  </span>
                </div>
              ))}
            </div>

            {/* AI Explanation / Criterion */}
            <div className="p-3.5 rounded-2xl bg-[color:var(--surface-raised)]/60 border border-[color:var(--border-color)] flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase text-[color:var(--accent-soft)]">
                Criterio de la IA
              </span>
              <p className="text-xs text-[color:var(--text-soft)] leading-relaxed">{proposal.explanation}</p>
            </div>

            {/* Save Deck Button */}
            <button
              onClick={handleSaveProposal}
              className="w-full py-3 rounded-2xl bg-[color:var(--accent-color)] hover:bg-[color:var(--accent-hover)] text-[color:var(--on-accent)] font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
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

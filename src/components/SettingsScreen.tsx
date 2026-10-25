import React, { useRef, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Check, Moon, Sun, Download, Upload, Info } from 'lucide-react';
import { AiDeckClient } from '../data/aiDeckClient';
import { db } from '../data/database';

interface SettingsScreenProps {
  isDarkTheme: boolean;
  onThemeChanged: (dark: boolean) => void;
  onCollectionChanged: () => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  isDarkTheme,
  onThemeChanged,
  onCollectionChanged,
  onBack,
}) => {
  const [apiKey, setApiKey] = useState(AiDeckClient.currentKey());
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(AiDeckClient.currentModel());
  const [message, setMessage] = useState<string | null>(null);
  const [testingKey, setTestingKey] = useState(false);
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveKey = () => {
    AiDeckClient.saveKey(apiKey.trim());
    setMessage(AiDeckClient.hasKey() ? 'Clave guardada' : 'Clave vacía');
  };

  const handleClearKey = () => {
    AiDeckClient.saveKey('');
    setApiKey('');
    setMessage('Clave eliminada');
  };

  const handleTestConnection = async () => {
    setTestingKey(true);
    setMessage('Probando clave...');
    const res = await AiDeckClient.testConnection();
    setTestingKey(false);
    if (res.success && res.models) {
      setMessage(`Conexión correcta · ${res.models.length} modelos disponibles.`);
    } else {
      setMessage(res.error || 'No se pudo validar la clave.');
    }
  };

  const handleSaveModel = () => {
    AiDeckClient.saveModel(model.trim());
    setMessage(`Modelo guardado: ${AiDeckClient.currentModel()}`);
  };

  const handleExport = () => {
    const json = db.exportCollectionJson();
    setExportText(json);
    setMessage('Colección exportada');
  };

  const handleDownload = () => {
    const blob = new Blob([db.exportCollectionJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tcg-lab-coleccion-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage('Copia de seguridad descargada');
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setImportText(await file.text());
      setMessage(`Archivo cargado: ${file.name}. Elige cómo importarlo.`);
    } catch {
      setMessage('No se pudo leer el archivo.');
    }
  };

  const handleImport = (mode: 'merge' | 'replace') => {
    if (!importText.trim()) return;
    if (
      mode === 'replace' &&
      !window.confirm('Esto reemplazará TODA tu colección actual por el contenido importado. ¿Continuar?')
    ) {
      return;
    }
    try {
      const count = db.importCollectionJson(importText.trim(), mode);
      setMessage(
        mode === 'merge'
          ? `Importadas ${count} cartas (modo sumar)`
          : `Importadas ${count} cartas (reemplazó todo)`
      );
      setImportText('');
      onCollectionChanged();
    } catch (err) {
      setMessage(`Error al importar: ${(err as Error).message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-5 pb-24 max-w-2xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Volver"
          className="p-2 rounded-xl bg-[color:var(--surface-raised)] text-[color:var(--muted-color)] hover:text-[color:var(--fg-color)] cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-[color:var(--fg-color)]">Ajustes</h1>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-[color:var(--surface-raised)] text-xs font-semibold text-[color:var(--accent-soft)] border border-[color:var(--border-color)] flex items-center gap-2">
          <Check className="w-4 h-4 text-[color:var(--accent-color)]" />
          {message}
        </div>
      )}

      {/* xAI API Key Section */}
      <div className="flex flex-col gap-3 p-5 rounded-3xl bg-[color:var(--surface-color)] border border-[color:var(--border-color)]">
        <h3 className="text-sm font-bold text-[color:var(--fg-color)]">Clave de xAI (Grok)</h3>

        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="xai-..."
            className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-[color:var(--bg-color)] border border-[color:var(--border-color)] text-[color:var(--fg-color)] text-xs placeholder:text-[color:var(--muted-color)] focus:outline-none focus:border-[color:var(--accent-color)]"
          />
          <button
            type="button"
            aria-label={showKey ? 'Ocultar clave' : 'Mostrar clave'}
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted-color)] hover:text-[color:var(--fg-color)] cursor-pointer"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={handleSaveKey}
            className="px-4 py-2 rounded-xl bg-[color:var(--accent-color)] hover:bg-[color:var(--accent-hover)] text-[color:var(--on-accent)] font-bold text-xs transition cursor-pointer"
          >
            Guardar
          </button>
          <button
            onClick={handleClearKey}
            className="px-4 py-2 rounded-xl bg-[color:var(--surface-raised)] text-[color:var(--muted-color)] hover:text-[color:var(--fg-color)] font-medium text-xs border border-[color:var(--border-color)] transition cursor-pointer"
          >
            Borrar
          </button>
          <button
            onClick={handleTestConnection}
            disabled={!apiKey.trim() || testingKey}
            className="px-4 py-2 rounded-xl bg-[color:var(--surface-raised)] text-[color:var(--accent-soft)] hover:bg-[color:var(--raised-hover)] font-medium text-xs border border-[color:var(--border-color)] transition disabled:opacity-40 cursor-pointer"
          >
            {testingKey ? 'Probando...' : 'Probar clave'}
          </button>
        </div>

        <p className="text-[11px] text-[color:var(--muted-color)]">
          La clave se guarda solo en este dispositivo y se envía únicamente a xAI al generar mazos con IA.
        </p>
      </div>

      {/* Model Selection Section */}
      <div className="flex flex-col gap-3 p-5 rounded-3xl bg-[color:var(--surface-color)] border border-[color:var(--border-color)]">
        <h3 className="text-sm font-bold text-[color:var(--fg-color)]">Modelo de IA</h3>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="grok-4.7"
          className="w-full px-3.5 py-2.5 rounded-xl bg-[color:var(--bg-color)] border border-[color:var(--border-color)] text-[color:var(--fg-color)] text-xs placeholder:text-[color:var(--muted-color)] focus:outline-none focus:border-[color:var(--accent-color)]"
        />
        <div>
          <button
            onClick={handleSaveModel}
            className="px-4 py-2 rounded-xl bg-[color:var(--surface-raised)] text-[color:var(--accent-color)] hover:bg-[color:var(--raised-hover)] font-bold text-xs border border-[color:var(--border-color)] transition cursor-pointer"
          >
            Guardar modelo
          </button>
        </div>
      </div>

      {/* Appearance / Theme Switch */}
      <div className="flex items-center justify-between p-5 rounded-3xl bg-[color:var(--surface-color)] border border-[color:var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[color:var(--surface-raised)] text-[color:var(--accent-color)]">
            {isDarkTheme ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[color:var(--fg-color)]">Tema oscuro</h3>
            <p className="text-xs text-[color:var(--muted-color)]">Ajusta la paleta visual de la interfaz</p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isDarkTheme}
            onChange={(e) => onThemeChanged(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-[color:var(--surface-raised)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[color:var(--accent-color)]" />
        </label>
      </div>

      {/* Collection JSON Backup & Restore */}
      <div className="flex flex-col gap-3.5 p-5 rounded-3xl bg-[color:var(--surface-color)] border border-[color:var(--border-color)]">
        <h3 className="text-sm font-bold text-[color:var(--fg-color)]">Gestión de Colección (Copia de seguridad)</h3>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[color:var(--accent-color)] text-[color:var(--on-accent)] hover:bg-[color:var(--accent-hover)] text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Descargar copia
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[color:var(--surface-raised)] text-[color:var(--accent-color)] hover:bg-[color:var(--raised-hover)] text-xs font-bold border border-[color:var(--border-color)] transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Ver JSON
          </button>
        </div>

        {exportText && (
          <textarea
            readOnly
            value={exportText}
            rows={4}
            className="w-full p-3 rounded-xl bg-[color:var(--bg-color)] border border-[color:var(--border-color)] text-[color:var(--muted-color)] font-mono text-[11px] focus:outline-none resize-none"
          />
        )}

        <div className="flex flex-col gap-2 pt-2">
          <label className="text-xs font-semibold text-[color:var(--muted-color)]">
            Pegar JSON para importar
          </label>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={3}
            placeholder='[{"key": "A1#1", "name": "Bulbasaur", "setCode": "A1", "number": "1", "quantity": 2}]'
            className="w-full p-3 rounded-xl bg-[color:var(--bg-color)] border border-[color:var(--border-color)] text-[color:var(--fg-color)] font-mono text-[11px] placeholder:text-[color:var(--muted-color)] focus:outline-none focus:border-[color:var(--accent-color)] resize-none"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFilePicked}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="self-start flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[color:var(--surface-raised)] text-[color:var(--accent-color)] border border-[color:var(--border-color)] hover:bg-[color:var(--raised-hover)] text-xs font-bold cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Elegir archivo .json
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleImport('merge')}
              disabled={!importText.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[color:var(--accent-color)] hover:bg-[color:var(--accent-hover)] text-[color:var(--on-accent)] font-bold text-xs disabled:opacity-30 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Importar (sumar)
            </button>
            <button
              onClick={() => handleImport('replace')}
              disabled={!importText.trim()}
              className="px-4 py-2 rounded-xl bg-rose-950/40 text-rose-400 border border-rose-800/40 hover:bg-rose-900/50 text-xs font-bold disabled:opacity-30 cursor-pointer"
            >
              Reemplazar todo
            </button>
          </div>
        </div>
      </div>

      {/* Version & Disclaimer Footer */}
      <div className="p-4 rounded-2xl bg-[color:var(--surface-color)]/60 border border-[color:var(--border-color)]/60 flex flex-col gap-1 text-xs text-[color:var(--muted-color)]">
        <div className="flex items-center gap-2 text-[color:var(--fg-color)] font-semibold">
          <Info className="w-4 h-4 text-[color:var(--accent-color)]" />
          TCG LAB NEXT · v0.2.0
        </div>
        <p className="text-[11px] mt-0.5">
          App fan no oficial. Pokémon es marca registrada de Nintendo / Creatures Inc. / GAME FREAK inc.
        </p>
      </div>
    </div>
  );
};

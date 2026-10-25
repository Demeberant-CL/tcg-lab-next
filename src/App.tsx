import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CatalogCard, CatalogSet, CollectionCard, DeckSummary } from './types';
import { Catalog } from './data/catalog';
import { db } from './data/database';
import { AiDeckClient } from './data/aiDeckClient';
import { Navbar } from './components/Navbar';
import { HomeScreen } from './components/HomeScreen';
import { CollectionScreen } from './components/CollectionScreen';
import { DecksScreen } from './components/DecksScreen';
import { DeckBuilderScreen } from './components/DeckBuilderScreen';
import { DeckDetailScreen } from './components/DeckDetailScreen';
import { StrategyScreen } from './components/StrategyScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogCard[]>([]);
  const [sets, setSets] = useState<CatalogSet[]>([]);
  const [collection, setCollection] = useState<CollectionCard[]>([]);
  const [decks, setDecks] = useState<DeckSummary[]>([]);

  // Navigation states
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [buildingDeck, setBuildingDeck] = useState<boolean>(false);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);

  // Theme state
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => AiDeckClient.isDarkTheme());

  // El mazo abierto se deriva del id, sin estado duplicado. `decks` cambia al
  // guardar o borrar, por lo que también refresca el detalle.
  const selectedDeck = useMemo(
    () => (selectedDeckId !== null ? db.getDeck(selectedDeckId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedDeckId, decks]
  );

  // Si el mazo ya no existe, no se queda una pantalla vacía sin barra de navegación.
  const inSubScreen = showSettings || buildingDeck || selectedDeck !== null;

  // Synchronize HTML dark/light class and the browser UI color
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDarkTheme);
    root.classList.toggle('light', !isDarkTheme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', isDarkTheme ? '#070B12' : '#F3F6FB');
  }, [isDarkTheme]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Catalog.load();
      setCatalog(Catalog.allCards());
      setSets(Catalog.allSets());
      setCollection(db.getCards());
      setDecks(db.getDecks());
    } catch (err) {
      setError((err as Error).message || 'Error cargando datos del laboratorio.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Navegación con el botón "Atrás" del dispositivo ---
  // Cada subpantalla añade una entrada al historial; "Atrás" la cierra en vez de salir de la app.
  const resetSubScreens = useCallback(() => {
    setShowSettings(false);
    setBuildingDeck(false);
    setSelectedDeckId(null);
  }, []);

  useEffect(() => {
    window.addEventListener('popstate', resetSubScreens);
    return () => window.removeEventListener('popstate', resetSubScreens);
  }, [resetSubScreens]);

  const openSubScreen = (open: () => void) => {
    window.history.pushState({ sub: true }, '');
    open();
  };

  const closeSubScreen = () => {
    if (window.history.state?.sub) {
      window.history.back(); // dispara popstate -> resetSubScreens
    } else {
      resetSubScreens();
    }
  };

  const refreshDecks = () => setDecks(db.getDecks());

  const refreshCollection = () => {
    setCollection(db.getCards());
    refreshDecks();
  };

  const handleThemeChange = (dark: boolean) => {
    setIsDarkTheme(dark);
    AiDeckClient.saveDarkTheme(dark);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--bg-color)] flex flex-col items-center justify-center gap-3 text-[color:var(--fg-color)]">
        <div className="p-3.5 rounded-2xl bg-[color:var(--surface-raised)] text-[color:var(--accent-color)] animate-pulse">
          <Sparkles className="w-8 h-8" />
        </div>
        <p className="text-sm font-bold text-[color:var(--accent-soft)]">Cargando TCG LAB...</p>
        <p className="text-xs text-[color:var(--muted-color)]">Inicializando catálogo de Pokémon TCG Pocket</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[color:var(--bg-color)] flex flex-col items-center justify-center p-6 text-center text-[color:var(--fg-color)]">
        <p className="text-sm font-bold text-rose-400 mb-2">Error de inicialización</p>
        <p className="text-xs text-[color:var(--muted-color)] max-w-sm mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-xl bg-[color:var(--accent-color)] text-[color:var(--on-accent)] font-bold text-xs"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--bg-color)] text-[color:var(--fg-color)] flex flex-col">
      <main className="flex-1">
        {showSettings ? (
          <SettingsScreen
            isDarkTheme={isDarkTheme}
            onThemeChanged={handleThemeChange}
            onCollectionChanged={refreshCollection}
            onBack={closeSubScreen}
          />
        ) : buildingDeck ? (
          <DeckBuilderScreen
            holdings={collection}
            onSaved={() => {
              closeSubScreen();
              refreshDecks();
            }}
            onCancel={closeSubScreen}
          />
        ) : selectedDeck ? (
          <DeckDetailScreen
            deck={selectedDeck}
            onBack={closeSubScreen}
            onDeleted={() => {
              closeSubScreen();
              refreshDecks();
            }}
          />
        ) : (
          <>
            {currentTab === 0 && (
              <HomeScreen
                cardCount={collection.reduce((sum, c) => sum + c.quantity, 0)}
                deckCount={decks.length}
                decks={decks}
                onCollection={() => setCurrentTab(1)}
                onStrategy={() => setCurrentTab(3)}
                onDecks={() => setCurrentTab(2)}
                onSettings={() => openSubScreen(() => setShowSettings(true))}
              />
            )}

            {currentTab === 1 && (
              <CollectionScreen
                catalog={catalog}
                sets={sets}
                holdings={collection}
                onHoldingsChanged={setCollection}
              />
            )}

            {currentTab === 2 && (
              <DecksScreen
                decks={decks}
                onOpenDeck={(id) => openSubScreen(() => setSelectedDeckId(id))}
                onNewDeck={() => openSubScreen(() => setBuildingDeck(true))}
                onStrategy={() => setCurrentTab(3)}
              />
            )}

            {currentTab === 3 && (
              <StrategyScreen
                holdings={collection}
                onDeckSaved={() => {
                  refreshDecks();
                  setCurrentTab(2);
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Persistent Bottom Bar (hidden in full-screen sub-screens) */}
      {!inSubScreen && <Navbar currentTab={currentTab} onTabChange={setCurrentTab} />}
    </div>
  );
};

export default App;

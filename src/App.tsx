import React, { useState, useEffect } from 'react';
import { CatalogCard, CatalogSet, CollectionCard, Deck, DeckSummary } from './types';
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
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);

  // Theme state
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => AiDeckClient.isDarkTheme());

  // Synchronize HTML dark/light class
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkTheme) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [isDarkTheme]);

  // Load catalog and initial database state
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        await Catalog.load();
        setCatalog(Catalog.allCards());
        setSets(Catalog.allSets());

        // Load collection & decks from db
        const cards = db.getCards();
        setCollection(cards);
        const deckSummaries = db.getDecks();
        setDecks(deckSummaries);
      } catch (err) {
        setError((err as Error).message || 'Error cargando datos del laboratorio.');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Sync selected deck when ID changes
  useEffect(() => {
    if (selectedDeckId) {
      const d = db.getDeck(selectedDeckId);
      setSelectedDeck(d);
    } else {
      setSelectedDeck(null);
    }
  }, [selectedDeckId]);

  const refreshDecks = () => {
    setDecks(db.getDecks());
  };

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
      <div className="min-h-screen bg-[#070B12] flex flex-col items-center justify-center gap-3 text-white">
        <div className="p-3.5 rounded-2xl bg-[#162335] text-[#62A9FF] animate-pulse">
          <Sparkles className="w-8 h-8" />
        </div>
        <p className="text-sm font-bold text-[#9CC9FF]">Cargando TCG LAB...</p>
        <p className="text-xs text-[#9BA8B8]">Inicializando catálogo de Pokémon TCG Pocket</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#070B12] flex flex-col items-center justify-center p-6 text-center text-white">
        <p className="text-sm font-bold text-rose-400 mb-2">Error de inicialización</p>
        <p className="text-xs text-[#9BA8B8] max-w-sm mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-[#62A9FF] text-slate-950 font-bold text-xs"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B12] text-white flex flex-col">
      {/* Top Main View Routing */}
      <main className="flex-1">
        {showSettings ? (
          <SettingsScreen
            isDarkTheme={isDarkTheme}
            onThemeChanged={handleThemeChange}
            onCollectionChanged={refreshCollection}
            onBack={() => setShowSettings(false)}
          />
        ) : buildingDeck ? (
          <DeckBuilderScreen
            holdings={collection}
            onSaved={() => {
              setBuildingDeck(false);
              refreshDecks();
            }}
            onCancel={() => setBuildingDeck(false)}
          />
        ) : selectedDeckId && selectedDeck ? (
          <DeckDetailScreen
            deck={selectedDeck}
            onBack={() => {
              setSelectedDeckId(null);
              setSelectedDeck(null);
            }}
            onDeleted={() => {
              setSelectedDeckId(null);
              setSelectedDeck(null);
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
                onSettings={() => setShowSettings(true)}
              />
            )}

            {currentTab === 1 && (
              <CollectionScreen
                catalog={catalog}
                sets={sets}
                holdings={collection}
                onHoldingsChanged={(updated) => {
                  setCollection(updated);
                  refreshDecks();
                }}
              />
            )}

            {currentTab === 2 && (
              <DecksScreen
                decks={decks}
                onOpenDeck={(id) => setSelectedDeckId(id)}
                onNewDeck={() => setBuildingDeck(true)}
                onStrategy={() => setCurrentTab(3)}
              />
            )}

            {currentTab === 3 && (
              <StrategyScreen
                holdings={collection}
                catalog={catalog}
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
      {!showSettings && !buildingDeck && !selectedDeckId && (
        <Navbar
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            setSelectedDeckId(null);
            setSelectedDeck(null);
            setBuildingDeck(false);
            setShowSettings(false);
          }}
        />
      )}
    </div>
  );
};

export default App;

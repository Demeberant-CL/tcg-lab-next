import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, Heart, X, Sparkles } from 'lucide-react';
import { CatalogCard, CatalogSet, CollectionCard } from '../types';
import { Catalog } from '../data/catalog';
import { CardImages } from '../data/cardImages';
import { db } from '../data/database';

interface CollectionScreenProps {
  catalog: CatalogCard[];
  sets: CatalogSet[];
  holdings: CollectionCard[];
  onHoldingsChanged: (updated: CollectionCard[]) => void;
}

export const CollectionScreen: React.FC<CollectionScreenProps> = ({
  catalog,
  sets,
  holdings,
  onHoldingsChanged,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'Todas' | 'Pokémon' | 'Entrenadores'>('Todas');
  const [ownership, setOwnership] = useState<'Todas' | 'Tengo' | 'Me faltan'>('Todas');
  const [selectedSet, setSelectedSet] = useState('Todos');
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);
  const [wishlist, setWishlist] = useState<Set<string>>(() => db.getWishlist());
  const [selectedCard, setSelectedCard] = useState<CatalogCard | null>(null);

  // Map holdings by key for O(1) lookup
  const holdingByKey = useMemo(() => {
    const map = new Map<string, CollectionCard>();
    holdings.forEach((h) => map.set(h.key, h));
    return map;
  }, [holdings]);

  const ownedKeys = useMemo(() => new Set(holdings.map((h) => h.key)), [holdings]);

  // Filter cards
  const visibleCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((card) => {
      // Category filter
      if (filter === 'Entrenadores' && !card.trainer) return false;
      if (filter === 'Pokémon' && card.trainer) return false;

      // Set filter
      if (selectedSet !== 'Todos' && card.set !== selectedSet) return false;

      // Search query
      if (q) {
        const nameMatch = card.name.toLowerCase().includes(q);
        const setNumMatch = `${card.set} ${card.number}`.toLowerCase().includes(q) ||
          `${card.set}-${card.number}`.toLowerCase().includes(q);
        if (!nameMatch && !setNumMatch) return false;
      }

      // Ownership filter
      const key = `${card.set}#${card.number}`;
      if (ownership === 'Tengo' && !ownedKeys.has(key)) return false;
      if (ownership === 'Me faltan' && ownedKeys.has(key)) return false;

      // Wishlist filter
      if (showWishlistOnly && !wishlist.has(key)) return false;

      return true;
    });
  }, [catalog, query, filter, ownership, selectedSet, showWishlistOnly, ownedKeys, wishlist]);

  const filteredCatalog = useMemo(() => {
    return selectedSet === 'Todos' ? catalog : catalog.filter((c) => c.set === selectedSet);
  }, [catalog, selectedSet]);

  const uniqueOwned = useMemo(() => {
    return holdings.filter((h) => selectedSet === 'Todos' || h.setCode === selectedSet).length;
  }, [holdings, selectedSet]);

  const totalRegisteredCards = useMemo(() => {
    return holdings.reduce((sum, c) => sum + c.quantity, 0);
  }, [holdings]);

  const progress = filteredCatalog.length > 0 ? (uniqueOwned / filteredCatalog.length) * 100 : 0;

  const handleAdjustQuantity = (card: CatalogCard, delta: 1 | -1, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const key = `${card.set}#${card.number}`;
    const prev = holdingByKey.get(key);
    const prevQty = prev?.quantity || 0;

    if (delta < 0 && prevQty <= 0) return;

    const collectionCard: CollectionCard = {
      key,
      name: card.name,
      setCode: card.set,
      number: String(card.number),
      quantity: prevQty,
      imageUrl: Catalog.imageUrl(card),
      category: card.trainer ? 'Entrenadores' : 'Pokémon',
    };

    db.adjustCardQuantity(collectionCard, delta);
    const updatedCards = db.getCards();
    onHoldingsChanged(updatedCards);
  };

  const handleToggleWishlist = (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = db.toggleWishlist(key);
    setWishlist(new Set(updated));
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 max-w-4xl mx-auto">
      {/* Header & Stats */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-white">Colección</h1>
        <p className="text-sm text-[#9BA8B8]">
          {totalRegisteredCards} cartas · {uniqueOwned} / {filteredCatalog.length} únicas
          {selectedSet !== 'Todos' ? ` (${selectedSet})` : ''}
        </p>

        {/* Progress bar */}
        <div className="w-full bg-[#162335] h-2 rounded-full overflow-hidden mt-1">
          <div
            className="bg-[#62A9FF] h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#9BA8B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar carta, nombre o ID..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#101722] border border-[#263446] text-white text-sm placeholder-[#9BA8B8] focus:outline-none focus:border-[#62A9FF] transition"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9BA8B8] hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(['Todas', 'Pokémon', 'Entrenadores'] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => setFilter(opt)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              filter === opt
                ? 'bg-[#62A9FF] text-slate-950 font-bold shadow-sm'
                : 'bg-[#101722] text-[#9BA8B8] border border-[#263446] hover:bg-[#162335]'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Ownership Filters & Wishlist */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(['Todas', 'Tengo', 'Me faltan'] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => setOwnership(opt)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              ownership === opt
                ? 'bg-[#62A9FF] text-slate-950 font-bold shadow-sm'
                : 'bg-[#101722] text-[#9BA8B8] border border-[#263446] hover:bg-[#162335]'
            }`}
          >
            {opt}
          </button>
        ))}
        <button
          onClick={() => setShowWishlistOnly(!showWishlistOnly)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer ${
            showWishlistOnly
              ? 'bg-rose-500 text-white font-bold'
              : 'bg-[#101722] text-[#9BA8B8] border border-[#263446] hover:bg-[#162335]'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${showWishlistOnly ? 'fill-current' : ''}`} />
          {showWishlistOnly ? 'Solo deseadas' : 'Mostrar deseadas'}
        </button>
      </div>

      {/* Sets Horizontal Slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
        <button
          onClick={() => setSelectedSet('Todos')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            selectedSet === 'Todos'
              ? 'bg-[#162335] text-[#62A9FF] border border-[#62A9FF]/40 font-bold'
              : 'bg-[#101722] text-[#9BA8B8] border border-[#263446] hover:bg-[#162335]'
          }`}
        >
          Todos los sets
        </button>
        {sets.map((s) => (
          <button
            key={s.code}
            onClick={() => setSelectedSet(s.code)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedSet === s.code
                ? 'bg-[#162335] text-[#62A9FF] border border-[#62A9FF]/40 font-bold'
                : 'bg-[#101722] text-[#9BA8B8] border border-[#263446] hover:bg-[#162335]'
            }`}
          >
            {s.es}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {visibleCards.length === 0 && (
        <div className="p-8 rounded-2xl bg-[#101722] border border-[#263446] text-center my-6 flex flex-col items-center justify-center gap-2">
          <Sparkles className="w-8 h-8 text-[#9BA8B8]" />
          <h3 className="text-base font-semibold text-white">Sin resultados</h3>
          <p className="text-xs text-[#9BA8B8]">Prueba con otro nombre, ID o cambia los filtros.</p>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {visibleCards.map((card) => {
          const key = `${card.set}#${card.number}`;
          const qty = holdingByKey.get(key)?.quantity || 0;
          const isWished = wishlist.has(key);

          return (
            <div
              key={key}
              onClick={() => setSelectedCard(card)}
              className="group rounded-2xl bg-[#101722] border border-[#263446] hover:border-[#62A9FF]/40 transition overflow-hidden flex flex-col cursor-pointer shadow-sm relative"
            >
              {/* Image Box */}
              <div className="relative w-full aspect-[3/4.2] bg-[#0B111A] p-2 flex items-center justify-center overflow-hidden">
                <img
                  src={CardImages.primaryUrl(card.set, card.number)}
                  alt={card.name}
                  loading="lazy"
                  onError={(e) => {
                    const fallbacks = CardImages.fallbackUrls(card.set, card.number);
                    const currentSrc = e.currentTarget.src;
                    const nextIdx = fallbacks.indexOf(currentSrc) + 1;
                    if (nextIdx > 0 && nextIdx < fallbacks.length) {
                      e.currentTarget.src = fallbacks[nextIdx];
                    }
                  }}
                  className="max-h-full max-w-full object-contain drop-shadow transition-transform duration-200 group-hover:scale-105"
                />

                {/* Quantity badge */}
                {qty > 0 && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-[#62A9FF] text-slate-950 font-black text-xs shadow-md">
                    ×{qty}
                  </div>
                )}

                {/* Wishlist indicator badge */}
                {isWished && (
                  <div className="absolute top-2 left-2 p-1 rounded-full bg-rose-600/90 text-white shadow-md">
                    <Heart className="w-3 h-3 fill-current" />
                  </div>
                )}
              </div>

              {/* Card Meta & Interactive Controls */}
              <div className="p-2.5 flex flex-col justify-between flex-1 gap-2">
                <div>
                  <h4 className="text-xs font-bold text-white line-clamp-1 leading-snug">
                    {card.name}
                  </h4>
                  <p className="text-[10px] text-[#9BA8B8] mt-0.5">
                    {card.set} · #{card.number} · {card.rarity}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#263446]/50">
                  <button
                    onClick={(e) => handleAdjustQuantity(card, -1, e)}
                    disabled={qty <= 0}
                    title="Restar"
                    className="p-1.5 rounded-lg bg-[#162335] text-[#9BA8B8] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <span
                    className={`text-[10px] font-semibold ${
                      qty > 0 ? 'text-[#9CC9FF]' : 'text-[#9BA8B8]'
                    }`}
                  >
                    {qty > 0 ? `${qty} en mazo` : '0'}
                  </span>

                  <button
                    onClick={(e) => handleAdjustQuantity(card, 1, e)}
                    title="Agregar"
                    className="p-1.5 rounded-lg bg-[#162335] text-[#62A9FF] hover:bg-[#62A9FF] hover:text-slate-950 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Card Details Modal Dialog */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#101722] border border-[#263446] rounded-3xl max-w-sm w-full p-5 flex flex-col gap-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedCard(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#162335] text-[#9BA8B8] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white">{selectedCard.name}</h3>

            <div className="w-full flex justify-center py-2 bg-[#070B12]/80 rounded-2xl border border-[#263446]/40">
              <img
                src={CardImages.primaryUrl(selectedCard.set, selectedCard.number)}
                alt={selectedCard.name}
                className="h-64 object-contain drop-shadow-xl"
              />
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <p className="text-[#9BA8B8]">
                Set y Número:{' '}
                <span className="text-white font-medium">
                  {selectedCard.set} · #{selectedCard.number} · {selectedCard.rarity}
                </span>
              </p>
              <p className="text-[#9BA8B8]">
                Tipo:{' '}
                <span className="text-[#9CC9FF] font-medium">
                  {selectedCard.trainer
                    ? 'Entrenador'
                    : `Pokémon · ${selectedCard.element || 'Incoloro'}`}
                </span>
              </p>
              <p className="text-[#9BA8B8]">
                Cantidad en posesión:{' '}
                <span className="text-white font-bold">
                  ×{holdingByKey.get(`${selectedCard.set}#${selectedCard.number}`)?.quantity || 0}
                </span>
              </p>
            </div>

            {/* Actions in Dialog */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#263446]">
              <button
                onClick={() =>
                  handleToggleWishlist(`${selectedCard.set}#${selectedCard.number}`)
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#162335] text-xs font-semibold text-[#9CC9FF] hover:bg-[#20314a] transition cursor-pointer"
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    wishlist.has(`${selectedCard.set}#${selectedCard.number}`)
                      ? 'fill-rose-500 text-rose-500'
                      : ''
                  }`}
                />
                {wishlist.has(`${selectedCard.set}#${selectedCard.number}`)
                  ? 'Quitar de deseados'
                  : 'Añadir a deseados'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAdjustQuantity(selectedCard, -1)}
                  disabled={
                    (holdingByKey.get(`${selectedCard.set}#${selectedCard.number}`)?.quantity ||
                      0) <= 0
                  }
                  className="p-2 rounded-xl bg-[#162335] text-white disabled:opacity-30 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleAdjustQuantity(selectedCard, 1)}
                  className="p-2 rounded-xl bg-[#62A9FF] text-slate-950 font-bold hover:bg-[#72b3ff] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              onClick={() => setSelectedCard(null)}
              className="w-full py-2.5 rounded-xl bg-[#162335] hover:bg-[#20314a] text-white text-xs font-semibold transition cursor-pointer mt-1"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Search, Plus, Minus, Heart, X, Sparkles } from 'lucide-react';
import { CatalogCard, CatalogSet, CollectionCard } from '../types';
import { Catalog, cardKey, fold } from '../data/catalog';
import { db } from '../data/database';
import { CardImage } from './CardImage';

interface CollectionScreenProps {
  catalog: CatalogCard[];
  sets: CatalogSet[];
  holdings: CollectionCard[];
  onHoldingsChanged: (updated: CollectionCard[]) => void;
}

// Renderizar las ~4.300 cartas a la vez es lo que más pesa en el móvil: se pagina.
const PAGE_SIZE = 60;

const chipClass = (active: boolean) =>
  `px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
    active
      ? 'bg-[color:var(--accent-color)] text-[color:var(--on-accent)] font-bold shadow-sm'
      : 'bg-[color:var(--surface-color)] text-[color:var(--muted-color)] border border-[color:var(--border-color)] hover:bg-[color:var(--surface-raised)]'
  }`;

const setChipClass = (active: boolean) =>
  `px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
    active
      ? 'bg-[color:var(--surface-raised)] text-[color:var(--accent-color)] border border-[color:var(--accent-color)]/40 font-bold'
      : 'bg-[color:var(--surface-color)] text-[color:var(--muted-color)] border border-[color:var(--border-color)] hover:bg-[color:var(--surface-raised)]'
  }`;

interface CardTileProps {
  card: CatalogCard;
  qty: number;
  isWished: boolean;
  onSelect: (card: CatalogCard) => void;
  onAdjust: (card: CatalogCard, delta: 1 | -1) => void;
}

const CardTile = memo(({ card, qty, isWished, onSelect, onAdjust }: CardTileProps) => (
  <div
    onClick={() => onSelect(card)}
    className="group rounded-2xl bg-[color:var(--surface-color)] border border-[color:var(--border-color)] hover:border-[color:var(--accent-color)]/40 transition overflow-hidden flex flex-col cursor-pointer shadow-sm relative"
  >
    <div className="relative w-full aspect-[3/4.2] bg-[color:var(--image-bg)] p-2 flex items-center justify-center overflow-hidden">
      <CardImage
        set={card.set}
        number={card.number}
        alt={card.name}
        className="max-h-full max-w-full object-contain drop-shadow transition-transform duration-200 group-hover:scale-105"
      />

      {qty > 0 && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-[color:var(--accent-color)] text-[color:var(--on-accent)] font-black text-xs shadow-md">
          ×{qty}
        </div>
      )}

      {isWished && (
        <div className="absolute top-2 left-2 p-1 rounded-full bg-rose-600/90 text-white shadow-md">
          <Heart className="w-3 h-3 fill-current" />
        </div>
      )}
    </div>

    <div className="p-2.5 flex flex-col justify-between flex-1 gap-2">
      <div>
        <h4 className="text-xs font-bold text-[color:var(--fg-color)] line-clamp-1 leading-snug">
          {card.name}
        </h4>
        <p className="text-[10px] text-[color:var(--muted-color)] mt-0.5">
          {card.set} · #{card.number} · {card.rarity}
        </p>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-[color:var(--border-color)]/50">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdjust(card, -1);
          }}
          disabled={qty <= 0}
          aria-label={`Restar una copia de ${card.name}`}
          className="p-1.5 rounded-lg bg-[color:var(--surface-raised)] text-[color:var(--muted-color)] hover:text-[color:var(--fg-color)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <span
          className={`text-[10px] font-semibold ${
            qty > 0 ? 'text-[color:var(--accent-soft)]' : 'text-[color:var(--muted-color)]'
          }`}
        >
          {qty > 0 ? `${qty} ${qty === 1 ? 'copia' : 'copias'}` : 'Sin copias'}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdjust(card, 1);
          }}
          aria-label={`Agregar una copia de ${card.name}`}
          className="p-1.5 rounded-lg bg-[color:var(--surface-raised)] text-[color:var(--accent-color)] hover:bg-[color:var(--accent-color)] hover:text-[color:var(--on-accent)] transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
));
CardTile.displayName = 'CardTile';

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
  const [limit, setLimit] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // La búsqueda no bloquea el teclado mientras se filtran miles de cartas.
  const deferredQuery = useDeferredValue(query);

  // Mapa por clave para búsquedas O(1).
  const holdingByKey = useMemo(() => {
    const map = new Map<string, CollectionCard>();
    holdings.forEach((h) => map.set(h.key, h));
    return map;
  }, [holdings]);
  const holdingByKeyRef = useRef(holdingByKey);
  holdingByKeyRef.current = holdingByKey;

  // Texto normalizado (sin tildes/mayúsculas) precalculado una sola vez.
  const searchIndex = useMemo(
    () =>
      catalog.map((card) => ({
        card,
        key: cardKey(card.set, card.number),
        name: fold(card.name),
        id: fold(`${card.set} ${card.number}`),
        idDash: fold(`${card.set}-${card.number}`),
      })),
    [catalog]
  );

  const catalogKeys = useMemo(() => new Set(searchIndex.map((i) => i.key)), [searchIndex]);

  const visibleCards = useMemo(() => {
    const q = fold(deferredQuery);
    const result: CatalogCard[] = [];
    for (const item of searchIndex) {
      const { card, key } = item;
      if (filter === 'Entrenadores' && !card.trainer) continue;
      if (filter === 'Pokémon' && card.trainer) continue;
      if (selectedSet !== 'Todos' && card.set !== selectedSet) continue;
      if (q && !item.name.includes(q) && !item.id.includes(q) && !item.idDash.includes(q)) continue;

      const owned = holdingByKey.has(key);
      if (ownership === 'Tengo' && !owned) continue;
      if (ownership === 'Me faltan' && owned) continue;
      if (showWishlistOnly && !wishlist.has(key)) continue;

      result.push(card);
    }
    return result;
  }, [searchIndex, deferredQuery, filter, ownership, selectedSet, showWishlistOnly, holdingByKey, wishlist]);

  // Al cambiar los filtros se vuelve a la primera página.
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [deferredQuery, filter, ownership, selectedSet, showWishlistOnly]);

  // Scroll infinito: carga más tarjetas al acercarse al final.
  const hasMore = limit < visibleCards.length;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setLimit((n) => n + PAGE_SIZE);
      },
      { rootMargin: '800px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, limit]);

  const pageCards = useMemo(() => visibleCards.slice(0, limit), [visibleCards, limit]);

  const totalInSet = useMemo(
    () => (selectedSet === 'Todos' ? catalog.length : catalog.filter((c) => c.set === selectedSet).length),
    [catalog, selectedSet]
  );

  // Solo cuenta cartas que existen en el catálogo (una importación podría traer claves ajenas).
  const uniqueOwned = useMemo(
    () =>
      holdings.filter(
        (h) => catalogKeys.has(h.key) && (selectedSet === 'Todos' || h.setCode === selectedSet)
      ).length,
    [holdings, catalogKeys, selectedSet]
  );

  const totalRegisteredCards = useMemo(
    () => holdings.reduce((sum, c) => sum + c.quantity, 0),
    [holdings]
  );

  const progress = totalInSet > 0 ? (uniqueOwned / totalInSet) * 100 : 0;

  // Callbacks estables: no invalidan el memo de las tarjetas.
  const handleAdjustQuantity = useCallback(
    (card: CatalogCard, delta: 1 | -1) => {
      const key = cardKey(card.set, card.number);
      const prevQty = holdingByKeyRef.current.get(key)?.quantity || 0;
      if (delta < 0 && prevQty <= 0) return;

      db.adjustCardQuantity(
        {
          key,
          name: card.name,
          setCode: card.set,
          number: String(card.number),
          quantity: prevQty,
          imageUrl: Catalog.imageUrl(card),
          category: card.trainer ? 'Entrenadores' : 'Pokémon',
        },
        delta
      );
      onHoldingsChanged(db.getCards());
    },
    [onHoldingsChanged]
  );

  const handleToggleWishlist = useCallback((key: string) => {
    setWishlist(new Set(db.toggleWishlist(key)));
  }, []);

  const closeModal = useCallback(() => setSelectedCard(null), []);

  useEffect(() => {
    if (!selectedCard) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeModal();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedCard, closeModal]);

  const selectedKey = selectedCard ? cardKey(selectedCard.set, selectedCard.number) : '';
  const selectedQty = holdingByKey.get(selectedKey)?.quantity || 0;

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 max-w-4xl mx-auto">
      {/* Header & Stats */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fg-color)]">Colección</h1>
        <p className="text-sm text-[color:var(--muted-color)]">
          {totalRegisteredCards} cartas · {uniqueOwned} / {totalInSet} únicas
          {selectedSet !== 'Todos' ? ` (${selectedSet})` : ''}
        </p>

        <div className="w-full bg-[color:var(--surface-raised)] h-2 rounded-full overflow-hidden mt-1">
          <div
            className="bg-[color:var(--accent-color)] h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[color:var(--muted-color)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar carta, nombre o ID..."
          aria-label="Buscar carta"
          className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[color:var(--surface-color)] border border-[color:var(--border-color)] text-[color:var(--fg-color)] text-sm placeholder:text-[color:var(--muted-color)] focus:outline-none focus:border-[color:var(--accent-color)] transition"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Borrar búsqueda"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted-color)] hover:text-[color:var(--fg-color)] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(['Todas', 'Pokémon', 'Entrenadores'] as const).map((opt) => (
          <button key={opt} onClick={() => setFilter(opt)} className={chipClass(filter === opt)}>
            {opt}
          </button>
        ))}
      </div>

      {/* Ownership Filters & Wishlist */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(['Todas', 'Tengo', 'Me faltan'] as const).map((opt) => (
          <button key={opt} onClick={() => setOwnership(opt)} className={chipClass(ownership === opt)}>
            {opt}
          </button>
        ))}
        <button
          onClick={() => setShowWishlistOnly(!showWishlistOnly)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer ${
            showWishlistOnly
              ? 'bg-rose-500 text-white font-bold'
              : 'bg-[color:var(--surface-color)] text-[color:var(--muted-color)] border border-[color:var(--border-color)] hover:bg-[color:var(--surface-raised)]'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${showWishlistOnly ? 'fill-current' : ''}`} />
          {showWishlistOnly ? 'Solo deseadas' : 'Mostrar deseadas'}
        </button>
      </div>

      {/* Sets Horizontal Slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
        <button onClick={() => setSelectedSet('Todos')} className={setChipClass(selectedSet === 'Todos')}>
          Todos los sets
        </button>
        {sets.map((s) => (
          <button key={s.code} onClick={() => setSelectedSet(s.code)} className={setChipClass(selectedSet === s.code)}>
            {s.es}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-[color:var(--muted-color)] -mt-1">
        {visibleCards.length} {visibleCards.length === 1 ? 'resultado' : 'resultados'}
      </p>

      {/* Empty State */}
      {visibleCards.length === 0 && (
        <div className="p-8 rounded-2xl bg-[color:var(--surface-color)] border border-[color:var(--border-color)] text-center my-6 flex flex-col items-center justify-center gap-2">
          <Sparkles className="w-8 h-8 text-[color:var(--muted-color)]" />
          <h3 className="text-base font-semibold text-[color:var(--fg-color)]">Sin resultados</h3>
          <p className="text-xs text-[color:var(--muted-color)]">Prueba con otro nombre, ID o cambia los filtros.</p>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {pageCards.map((card) => {
          const key = cardKey(card.set, card.number);
          return (
            <CardTile
              key={key}
              card={card}
              qty={holdingByKey.get(key)?.quantity || 0}
              isWished={wishlist.has(key)}
              onSelect={setSelectedCard}
              onAdjust={handleAdjustQuantity}
            />
          );
        })}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="py-6 text-center text-xs text-[color:var(--muted-color)]">
          Cargando más cartas...
        </div>
      )}

      {/* Card Details Modal Dialog */}
      {selectedCard && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedCard.name}
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[color:var(--surface-color)] border border-[color:var(--border-color)] rounded-3xl max-w-sm w-full p-5 flex flex-col gap-4 shadow-2xl relative max-h-[95vh] overflow-y-auto"
          >
            <button
              onClick={closeModal}
              aria-label="Cerrar"
              className="absolute top-4 right-4 p-2 rounded-full bg-[color:var(--surface-raised)] text-[color:var(--muted-color)] hover:text-[color:var(--fg-color)]"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-[color:var(--fg-color)] pr-10">{selectedCard.name}</h3>

            <div className="w-full flex justify-center py-2 bg-[color:var(--bg-color)]/80 rounded-2xl border border-[color:var(--border-color)]/40">
              <CardImage
                set={selectedCard.set}
                number={selectedCard.number}
                alt={selectedCard.name}
                eager
                className="h-64 object-contain drop-shadow-xl"
              />
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <p className="text-[color:var(--muted-color)]">
                Set y Número:{' '}
                <span className="text-[color:var(--fg-color)] font-medium">
                  {selectedCard.set} · #{selectedCard.number} · {selectedCard.rarity}
                </span>
              </p>
              <p className="text-[color:var(--muted-color)]">
                Tipo:{' '}
                <span className="text-[color:var(--accent-soft)] font-medium">
                  {selectedCard.trainer
                    ? 'Entrenador'
                    : `Pokémon · ${selectedCard.element || 'Incoloro'}`}
                </span>
              </p>
              <p className="text-[color:var(--muted-color)]">
                Cantidad en posesión:{' '}
                <span className="text-[color:var(--fg-color)] font-bold">×{selectedQty}</span>
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[color:var(--border-color)]">
              <button
                onClick={() => handleToggleWishlist(selectedKey)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[color:var(--surface-raised)] text-xs font-semibold text-[color:var(--accent-soft)] hover:bg-[color:var(--raised-hover)] transition cursor-pointer"
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    wishlist.has(selectedKey) ? 'fill-rose-500 text-rose-500' : ''
                  }`}
                />
                {wishlist.has(selectedKey) ? 'Quitar de deseados' : 'Añadir a deseados'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAdjustQuantity(selectedCard, -1)}
                  disabled={selectedQty <= 0}
                  aria-label="Restar una copia"
                  className="p-2 rounded-xl bg-[color:var(--surface-raised)] text-[color:var(--fg-color)] disabled:opacity-30 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleAdjustQuantity(selectedCard, 1)}
                  aria-label="Agregar una copia"
                  className="p-2 rounded-xl bg-[color:var(--accent-color)] text-[color:var(--on-accent)] font-bold hover:bg-[color:var(--accent-hover)] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              onClick={closeModal}
              className="w-full py-2.5 rounded-xl bg-[color:var(--surface-raised)] hover:bg-[color:var(--raised-hover)] text-[color:var(--fg-color)] text-xs font-semibold transition cursor-pointer mt-1"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

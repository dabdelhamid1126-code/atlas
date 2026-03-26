import React, { useState, useRef, useMemo } from 'react';
import { X, Gift } from 'lucide-react';

/**
 * GiftCardPicker
 *
 * Props:
 *   giftCards     — array of GiftCard entities from base44
 *   selectedIds   — array of selected gift card IDs (form.gift_card_ids)
 *   onChange      — (newIds: string[]) => void
 *   retailer      — current vendor name to pre-filter (optional)
 */
export default function GiftCardPicker({ giftCards = [], selectedIds = [], onChange, retailer = '' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const inputRef          = useRef(null);

  const available = useMemo(() =>
    giftCards.filter(gc => gc.status === 'available' || selectedIds.includes(gc.id)),
    [giftCards, selectedIds]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return available.filter(gc => {
      const notSelected = !selectedIds.includes(gc.id);
      const matchQuery  = !q || gc.brand?.toLowerCase().includes(q) || String(gc.value).includes(q);
      return notSelected && matchQuery;
    });
  }, [available, selectedIds, query]);

  const selectedCards = useMemo(() =>
    selectedIds.map(id => giftCards.find(gc => gc.id === id)).filter(Boolean),
    [selectedIds, giftCards]
  );

  const totalDeducted = useMemo(() =>
    selectedCards.reduce((s, gc) => s + (parseFloat(gc.value) || 0), 0),
    [selectedCards]
  );

  const select = (gc) => {
    onChange([...selectedIds, gc.id]);
    setQuery('');
    inputRef.current?.focus();
  };

  const remove = (id) => {
    onChange(selectedIds.filter(i => i !== id));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' && !query && selectedIds.length > 0) {
      remove(selectedIds[selectedIds.length - 1]);
    }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="relative">
      <label className="block text-xs text-slate-600 mb-1 font-medium">Gift Cards</label>

      <div
        className="flex flex-wrap gap-1.5 p-2 min-h-[40px] bg-white border border-slate-200 rounded-xl cursor-text focus-within:ring-2 focus-within:ring-violet-300 focus-within:border-violet-300 transition-all"
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        {selectedCards.map(gc => (
          <span
            key={gc.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700"
          >
            <Gift style={{ width: 11, height: 11 }} />
            {gc.brand} {gc.code ? `••${String(gc.code).slice(-4)}` : ''} ${parseFloat(gc.value).toFixed(2)}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); remove(gc.id); }}
              className="w-3.5 h-3.5 rounded-full bg-amber-200 hover:bg-amber-300 flex items-center justify-center transition-colors ml-0.5"
            >
              <X style={{ width: 8, height: 8 }} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={selectedCards.length === 0 ? 'Search gift cards...' : ''}
          className="flex-1 min-w-[120px] text-xs text-slate-600 outline-none bg-transparent placeholder-slate-400"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {filtered.slice(0, 20).map(gc => (
            <button
              key={gc.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); select(gc); }}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-amber-50 transition-colors border-b border-slate-50 last:border-0"
            >
              <div className="flex items-center gap-2">
                <Gift className="text-amber-500 flex-shrink-0" style={{ width: 13, height: 13 }} />
                <span className="text-sm font-medium text-slate-700">{gc.brand}</span>
                {gc.code && <span className="text-xs text-slate-400">••{String(gc.code).slice(-4)}</span>}
              </div>
              <span className="text-sm font-semibold text-amber-600">${parseFloat(gc.value).toFixed(2)}</span>
            </button>
          ))}
          {filtered.length === 0 && query && (
            <div className="px-3 py-3 text-xs text-slate-400 text-center">No matching gift cards</div>
          )}
        </div>
      )}

      {available.length === 0 && (
        <p className="text-xs text-slate-400 mt-1">
          {retailer ? `No available gift cards for ${retailer}` : 'No available gift cards'}
        </p>
      )}

      {selectedCards.length > 0 && (
        <div className="flex items-center justify-between mt-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
          <span className="text-xs text-amber-700 font-medium">
            {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''} selected
          </span>
          <span className="text-sm font-bold text-amber-700">
            −${totalDeducted.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
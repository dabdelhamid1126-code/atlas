import React, { useState, useRef, useMemo } from 'react';
import { X, Gift } from 'lucide-react';

export default function GiftCardPicker({ giftCards = [], selectedIds = [], onChange, retailer = '' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

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

  // Hide entirely if no gift cards exist
  if (available.length === 0 && selectedIds.length === 0) return null;

  const select = (gc) => {
    onChange([...selectedIds, gc.id]);
    setQuery('');
    inputRef.current?.focus();
  };

  const remove = (id) => onChange(selectedIds.filter(i => i !== id));

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' && !query && selectedIds.length > 0) remove(selectedIds[selectedIds.length - 1]);
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="relative">
      <label className="block text-xs text-slate-400 mb-1.5 font-medium">Gift Cards</label>

      {/* Input area */}
      <div
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, padding: '7px 10px', minHeight: 40,
          background: '#0d1117',
          border: `1px solid ${focused ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 8, cursor: 'text', transition: 'border-color 0.15s',
        }}
      >
        {selectedCards.map(gc => (
          <span key={gc.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '2px 10px 2px 8px',
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 20, color: '#fbbf24', fontSize: 11, fontWeight: 600,
          }}>
            <Gift style={{ width: 10, height: 10 }} />
            {gc.brand} {gc.code ? `••${String(gc.code).slice(-4)}` : ''} ${parseFloat(gc.value).toFixed(2)}
            <button type="button" onMouseDown={e => { e.stopPropagation(); remove(gc.id); }}
              style={{ color: '#f59e0b', lineHeight: 1, marginLeft: 2, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <X style={{ width: 9, height: 9 }} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 150); }}
          onKeyDown={handleKeyDown}
          placeholder={selectedCards.length === 0 ? 'Search gift cards...' : ''}
          style={{
            flex: 1, minWidth: 100, fontSize: 12, color: 'white',
            background: 'transparent', border: 'none', outline: 'none',
          }}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', zIndex: 50, left: 0, right: 0, marginTop: 4,
          background: '#1a2234',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          maxHeight: 192, overflowY: 'auto',
        }}>
          {filtered.length > 0 ? filtered.slice(0, 20).map(gc => (
            <button key={gc.id} type="button"
              onMouseDown={e => { e.preventDefault(); select(gc); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Gift style={{ width: 13, height: 13, color: '#f59e0b', flexShrink: 0 }} />
                <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>{gc.brand}</span>
                {gc.code && <span style={{ color: '#64748b', fontSize: 11 }}>••{String(gc.code).slice(-4)}</span>}
              </div>
              <span style={{ color: '#fbbf24', fontSize: 13, fontWeight: 600 }}>${parseFloat(gc.value).toFixed(2)}</span>
            </button>
          )) : (
            <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
              No gift cards found
            </div>
          )}
        </div>
      )}

      {/* Selected summary */}
      {selectedCards.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 8, padding: '8px 12px',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10,
        }}>
          <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 500 }}>
            {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''} selected
          </span>
          <span style={{ color: '#fbbf24', fontSize: 13, fontWeight: 700 }}>
            −${totalDeducted.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
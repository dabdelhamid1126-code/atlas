import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';

export default function ProductAutocomplete({
  products = [],
  nameValue,
  upcValue,
  searchField, // 'name' or 'upc'
  onSelect,
  onChangeName,
  onChangeUpc,
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  const inputValue = searchField === 'name' ? nameValue : upcValue;
  const handleChange = searchField === 'name' ? onChangeName : onChangeUpc;

  const filtered = (inputValue?.length >= 1
    ? products.filter(p => {
        const q = inputValue.toLowerCase();
        return p.name?.toLowerCase().includes(q) || p.upc?.toLowerCase().includes(q);
      })
    : []
  ).slice(0, 8);

  const updatePos = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  const openDropdown = () => {
    updatePos();
    setOpen(true);
    setActiveIdx(-1);
  };

  const closeDropdown = () => {
    setOpen(false);
    setActiveIdx(-1);
  };

  const handleSelect = (p) => {
    onSelect(p);
    closeDropdown();
  };

  // Outside click
  useEffect(() => {
    const onMouseDown = (e) => {
      if (!inputRef.current?.contains(e.target)) closeDropdown();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, updatePos]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx >= 0 && itemRefs.current[activeIdx]) {
      itemRefs.current[activeIdx].scrollIntoView({ block: 'nearest' });
    }
  }, [activeIdx]);

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' && inputValue?.length >= 1) { openDropdown(); return; }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && filtered[activeIdx]) handleSelect(filtered[activeIdx]);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      closeDropdown();
    }
  };

  const dropdown = open && (
    <div
      style={{
        position: 'fixed',
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        zIndex: 9999,
        background: '#1a2234',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        maxHeight: 240,
        overflowY: 'auto',
      }}
      ref={listRef}
    >
      {filtered.length > 0 ? (
        filtered.map((p, i) => (
          <div
            key={p.id}
            ref={el => itemRefs.current[i] = el}
            onMouseDown={(e) => { e.preventDefault(); handleSelect(p); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              cursor: 'pointer',
              background: activeIdx === i ? 'rgba(16,185,129,0.12)' : 'transparent',
              borderLeft: activeIdx === i ? '2px solid #10b981' : '2px solid transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={() => setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(-1)}
          >
            {p.image ? (
              <img src={p.image} alt={p.name}
                style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }} />
            ) : (
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#94a3b8', fontSize: 13, fontWeight: 600,
              }}>
                {p.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ color: '#f1f5f9', fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
              {p.upc && <p style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>{p.upc}</p>}
            </div>
          </div>
        ))
      ) : (
        <div style={{ textAlign: 'center', padding: '12px 16px' }}>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 6 }}>No products found</p>
          <p style={{ color: '#10b981', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Plus size={12} /> Add as new product
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#64748b', pointerEvents: 'none' }} />
        <Input
          ref={inputRef}
          className="pl-8"
          style={{ background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}
          value={inputValue}
          onChange={(e) => {
            handleChange(e.target.value);
            if (e.target.value.length >= 1) openDropdown();
            else closeDropdown();
          }}
          onFocus={() => { if (inputValue?.length >= 1) openDropdown(); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
      </div>
      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  );
}
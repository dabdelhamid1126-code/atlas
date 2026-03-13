import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

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
  const containerRef = useRef(null);

  const inputValue = searchField === 'name' ? nameValue : upcValue;
  const handleChange = searchField === 'name' ? onChangeName : onChangeUpc;

  const filtered = inputValue?.length >= 1
    ? products.filter(p => {
        if (searchField === 'name') return p.name?.toLowerCase().includes(inputValue.toLowerCase());
        return p.upc?.toLowerCase().includes(inputValue.toLowerCase());
      })
    : [];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (p) => {
    onSelect(p);
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <Input
          className="bg-white pl-8"
          value={inputValue}
          onChange={(e) => {
            handleChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => inputValue?.length >= 1 && setOpen(true)}
          placeholder={placeholder}
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-purple-50 transition text-left border-b border-slate-100 last:border-b-0"
            >
              {p.image ? (
                <img src={p.image} alt={p.name} className="h-9 w-9 rounded object-cover shrink-0 border border-slate-100" />
              ) : (
                <div className="h-9 w-9 rounded bg-slate-100 shrink-0 flex items-center justify-center text-slate-400 text-xs">?</div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                {p.upc && <p className="text-xs text-slate-400">{p.upc}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
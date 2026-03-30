import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, LayoutDashboard, BarChart3, Package, CirclePlus, ArrowLeftRight, Hash, Receipt, FileText, TrendingUp, Zap, ShoppingBag, CreditCard, X } from 'lucide-react';
import { createPageUrl } from '@/utils';

const NAV_ITEMS = [
  { name: 'Dashboard',              page: 'Dashboard',      icon: LayoutDashboard },
  { name: 'Analytics',              page: 'Analytics',      icon: BarChart3 },
  { name: 'Forecast',               page: 'Forecast',       icon: TrendingUp },
  { name: 'Inventory On Hand',      page: 'Inventory',      icon: Package },
  { name: 'Add Transaction',        page: 'NewOrders',      icon: CirclePlus },
  { name: 'Import Orders',          page: 'ImportOrders',   icon: ArrowLeftRight },
  { name: 'Deals Dashboard',        page: 'Deals',          icon: Zap },
  { name: 'Transactions',           page: 'Transactions',   icon: Hash },
  { name: 'Expenses',               page: 'PaymentMethods', icon: Receipt },
  { name: 'Receipts',               page: 'Invoices',       icon: FileText },
];

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  const { data: orders = [] } = useQuery({
    queryKey: ['cmdOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-order_date', 50),
    enabled: open,
    staleTime: 30000,
  });
  const { data: creditCards = [] } = useQuery({
    queryKey: ['cmdCards'],
    queryFn: () => base44.entities.CreditCard.list(),
    enabled: open,
    staleTime: 60000,
  });

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    const pages = NAV_ITEMS.filter(i =>
      !q || i.name.toLowerCase().includes(q)
    ).map(i => ({ type: 'page', label: i.name, page: i.page, icon: i.icon }));

    const recentOrders = orders
      .filter(o => {
        if (!q) return true;
        const name = o.items?.[0]?.product_name || o.product_name || o.order_number || '';
        return name.toLowerCase().includes(q) || o.order_number?.toLowerCase().includes(q) || o.retailer?.toLowerCase().includes(q);
      })
      .slice(0, 10)
      .map(o => ({
        type: 'order',
        label: o.items?.[0]?.product_name || o.product_name || `Order #${o.order_number}`,
        sub: `${o.retailer || ''} · #${o.order_number || ''}`,
        page: 'Transactions',
      }));

    const cards = creditCards
      .filter(c => !q || c.card_name?.toLowerCase().includes(q))
      .map(c => ({
        type: 'card',
        label: c.card_name,
        sub: c.issuer || '',
        page: 'PaymentMethods',
      }));

    const groups = [];
    if (pages.length) groups.push({ group: '📄 Pages', items: pages });
    if (recentOrders.length) groups.push({ group: '📦 Recent Orders', items: recentOrders });
    if (cards.length) groups.push({ group: '💳 Cards', items: cards });
    return groups;
  }, [query, orders, creditCards]);

  // Flat list for keyboard nav
  const flatItems = useMemo(() => results.flatMap(g => g.items), [results]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  const goTo = (item) => {
    navigate(createPageUrl(item.page));
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx(i => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatItems[activeIdx]) goTo(flatItems[activeIdx]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flatItems, activeIdx]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  let globalIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh]"
      style={{ background: 'rgba(15,15,30,0.45)', backdropFilter: 'blur(3px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[560px] mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        style={{ maxHeight: '65vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, orders, cards..."
            className="flex-1 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 transition">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto flex-1 py-1">
          {results.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-10">No results for "{query}"</p>
          )}
          {results.map((group) => (
            <div key={group.group}>
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{group.group}</p>
              {group.items.map((item) => {
                const idx = globalIdx++;
                const isActive = idx === activeIdx;
                const Icon = item.icon;
                return (
                  <button
                    key={`${item.type}-${item.label}-${idx}`}
                    data-idx={idx}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => goTo(item)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isActive ? 'bg-violet-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-violet-100' : 'bg-slate-100'}`}>
                      {item.type === 'order' && <ShoppingBag className={`w-3.5 h-3.5 ${isActive ? 'text-violet-600' : 'text-slate-500'}`} />}
                      {item.type === 'card' && <CreditCard className={`w-3.5 h-3.5 ${isActive ? 'text-violet-600' : 'text-slate-500'}`} />}
                      {item.type === 'page' && Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-violet-600' : 'text-slate-500'}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? 'text-violet-800' : 'text-slate-700'}`}>{item.label}</p>
                      {item.sub && <p className="text-[11px] text-slate-400 truncate">{item.sub}</p>}
                    </div>
                    {isActive && (
                      <kbd className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-500 border border-violet-200 font-medium">↵</kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-2 flex items-center gap-4 text-[10px] text-slate-400">
          <span><kbd className="font-mono bg-slate-100 px-1 rounded border border-slate-200">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono bg-slate-100 px-1 rounded border border-slate-200">↵</kbd> open</span>
          <span><kbd className="font-mono bg-slate-100 px-1 rounded border border-slate-200">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
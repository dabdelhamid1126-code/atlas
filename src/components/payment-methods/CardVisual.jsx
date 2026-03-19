import React, { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp, Plus, X, Check } from 'lucide-react';

const ISSUER_DOMAIN = {
  'Chase': 'chase.com',
  'American Express': 'americanexpress.com',
  'Citi': 'citi.com',
  'Capital One': 'capitalone.com',
  'Discover': 'discover.com',
  'Bank of America': 'bankofamerica.com',
  'US Bank': 'usbank.com',
  'Wells Fargo': 'wellsfargo.com',
  'PayPal': 'paypal.com',
  'Amazon': 'amazon.com',
  'Target': 'target.com',
};

const ISSUER_GRADIENT = {
  'Chase': 'from-[#1a56db] to-[#1e3a8a]',
  'American Express': 'from-[#047857] to-[#065f46]',
  'Citi': 'from-[#1e40af] to-[#1e3a8a]',
  'Capital One': 'from-[#b91c1c] to-[#7f1d1d]',
  'Discover': 'from-[#b45309] to-[#78350f]',
  'default': 'from-[#374151] to-[#1f2937]',
};

function getGradient(issuer) {
  return ISSUER_GRADIENT[issuer] || ISSUER_GRADIENT['default'];
}

function getLogoUrl(issuer) {
  const domain = ISSUER_DOMAIN[issuer];
  if (!domain) return null;
  return `https://arbitrageplatform-production-6eb2.up.railway.app/api/logos/${domain}?fallbackName=${encodeURIComponent(issuer)}`;
}

function IssuerLogo({ issuer, size = 'sm' }) {
  const [err, setErr] = useState(false);
  const url = getLogoUrl(issuer);
  const initials = (issuer || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const cls = size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  if (err || !url) {
    return (
      <div className={`${cls} rounded-lg bg-white/20 flex items-center justify-center shrink-0`}>
        <span className="text-white font-bold text-xs">{initials}</span>
      </div>
    );
  }
  return (
    <div className={`${cls} rounded-lg overflow-hidden bg-white/10 shrink-0 flex items-center justify-center`}>
      <img src={url} alt={issuer} className={`${cls} object-contain p-0.5`} onError={(e) => e.target.style.display='none'} />
    </div>
  );
}

const STORE_OPTIONS = ['Amazon', 'Walmart', 'Target', 'eBay', 'Costco', 'PayPal', 'Grocery', 'Gas', 'Dining', 'Travel', 'Pharmacy', 'Office Supply', 'Electronics', 'Streaming', 'Other'];

export default function CardVisual({ card, orders = [], onEdit, onDelete, onUpdate }) {
  const [showRates, setShowRates] = useState(false);
  const [addingRate, setAddingRate] = useState(false);
  const [newStore, setNewStore] = useState('');
  const [newRate, setNewRate] = useState('');

  const totalSpent = orders.filter(o => o.credit_card_id === card.id).reduce((s, o) => s + (o.final_cost || o.total_cost || 0), 0);
  const txnCount = orders.filter(o => o.credit_card_id === card.id).length;
  const storeRates = card.store_rates || [];
  const isActive = card.active !== false;
  const gradient = getGradient(card.issuer);

  const handleDeleteRate = (idx) => {
    const updated = storeRates.filter((_, i) => i !== idx);
    onUpdate(card.id, { store_rates: updated });
  };

  const handleAddRate = () => {
    if (!newStore || !newRate) return;
    const updated = [...storeRates, { store: newStore, rate: parseFloat(newRate) }];
    onUpdate(card.id, { store_rates: updated });
    setNewStore('');
    setNewRate('');
    setAddingRate(false);
  };

  const topRates = storeRates.slice(0, 3);

  return (
    <div className={`group rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-lg ${!isActive ? 'opacity-60' : ''}`}>
      {/* Visual Card Face */}
      <div className={`relative bg-gradient-to-br ${gradient} p-5 min-h-[160px] flex flex-col justify-between`}>
        {/* Hover actions */}
        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(card)} className="h-7 w-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
            <Pencil className="h-3.5 w-3.5 text-white" />
          </button>
          <button onClick={() => onDelete(card)} className="h-7 w-7 rounded-lg bg-white/20 hover:bg-red-400/50 flex items-center justify-center transition">
            <Trash2 className="h-3.5 w-3.5 text-white" />
          </button>
        </div>

        {/* Top row */}
        <div className="flex items-start justify-between">
          <IssuerLogo issuer={card.issuer} size="lg" />
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-green-400/30 text-green-200' : 'bg-white/20 text-white/70'}`}>
            {isActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>

        {/* Card number */}
        <div>
          <p className="text-white/60 font-mono text-sm tracking-widest mb-1">
            •••• •••• •••• {card.last_4_digits || '••••'}
          </p>
          <p className="text-white font-bold text-base leading-tight">{card.card_name}</p>
          <p className="text-white/60 text-xs mt-0.5">{card.issuer || '—'}</p>
        </div>

        {/* Bottom stats */}
        <div className="flex items-end justify-between mt-3">
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-wider">Base Rate</p>
            <p className="text-white font-bold text-2xl leading-none">
              {card.cashback_rate || card.points_rate || 0}
              <span className="text-sm font-normal ml-0.5">{card.reward_type === 'points' ? 'x pts' : '%'}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-[10px] uppercase tracking-wider">Total Spent</p>
            <p className="text-white font-semibold text-sm">${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            <p className="text-white/50 text-xs">{txnCount} orders</p>
          </div>
        </div>
      </div>

      {/* Store Rate Tags */}
      {topRates.length > 0 && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-1.5">
          {topRates.map((r, i) => (
            <span key={i} className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
              {r.rate}% {r.store}
            </span>
          ))}
          {storeRates.length > 3 && (
            <span className="text-xs text-slate-400 font-medium px-1 py-0.5">+{storeRates.length - 3} more</span>
          )}
        </div>
      )}

      {/* Expandable Store Rates */}
      <div className="border-t border-slate-100">
        <button
          onClick={() => setShowRates(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition text-xs font-semibold text-slate-500 uppercase tracking-wider"
        >
          Store Rates ({storeRates.length})
          {showRates ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showRates && (
          <div className="px-4 pb-4 space-y-1">
            {/* Fallback rate */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-xs text-slate-400 italic">* All Other Stores</span>
              <span className="text-xs font-bold text-slate-600">{card.cashback_rate || 0}%</span>
            </div>

            {storeRates.map((r, idx) => (
              <div key={idx} className="group/rate flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="text-sm text-slate-700 font-medium">{r.store}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-purple-600">{r.rate}%</span>
                  <button
                    onClick={() => handleDeleteRate(idx)}
                    className="opacity-0 group-hover/rate:opacity-100 h-5 w-5 rounded flex items-center justify-center hover:bg-red-100 transition"
                  >
                    <X className="h-3 w-3 text-red-500" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add new rate */}
            {addingRate ? (
              <div className="flex items-center gap-2 pt-1">
                <select
                  value={newStore}
                  onChange={e => setNewStore(e.target.value)}
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-purple-400"
                >
                  <option value="">Store...</option>
                  {STORE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                  type="number"
                  value={newRate}
                  onChange={e => setNewRate(e.target.value)}
                  placeholder="%"
                  className="w-16 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
                <button onClick={handleAddRate} className="h-7 w-7 rounded-lg bg-green-500 flex items-center justify-center hover:bg-green-600 transition">
                  <Check className="h-3.5 w-3.5 text-white" />
                </button>
                <button onClick={() => setAddingRate(false)} className="h-7 w-7 rounded-lg bg-slate-200 flex items-center justify-center hover:bg-slate-300 transition">
                  <X className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingRate(true)}
                className="w-full flex items-center gap-1.5 pt-1 text-xs text-purple-600 hover:text-purple-700 font-medium transition"
              >
                <Plus className="h-3.5 w-3.5" /> Add store rate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
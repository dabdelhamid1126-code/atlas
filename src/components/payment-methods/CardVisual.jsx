import React, { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp, Plus, X, Check, AlertTriangle, Star, BarChart2 } from 'lucide-react';
import { CardLogo } from '@/components/shared/BrandLogo';

const ISSUER_DOMAIN = {
  'Chase': 'chase.com',
  'American Express': 'americanexpress.com',
  'Amex': 'americanexpress.com',
  'Citi': 'citi.com',
  'Capital One': 'capitalone.com',
  'Discover': 'discover.com',
  'Bank of America': 'bankofamerica.com',
  'Barclays': 'barclays.com',
  'Credit One Bank': 'creditonebank.com',
  'US Bank': 'usbank.com',
  'Wells Fargo': 'wellsfargo.com',
  'PayPal': 'paypal.com',
  'Amazon': 'amazon.com',
  'Target': 'target.com',
  'Apple': 'apple.com',
  'Robinhood': 'robinhood.com',
  'Synchrony': 'synchronybank.com',
  'Navy Federal': 'navyfederal.org',
  'PNC': 'pnc.com',
  'TD Bank': 'td.com',
  'HSBC': 'hsbc.com',
  'Goldman Sachs': 'goldmansachs.com',
};

const ISSUER_COLOR = {
  'Chase': '#1d4ed8',
  'American Express': '#059669',
  'Amex': '#059669',
  'Discover': '#d97706',
  'Capital One': '#dc2626',
  'Citi': '#7c3aed',
  'Bank of America': '#b91c1c',
  'Barclays': '#0284c7',
  'Wells Fargo': '#b45309',
  'Goldman Sachs': '#0f172a',
  'default': '#6366f1',
};

function getIssuerColor(issuer) {
  if (!issuer) return ISSUER_COLOR['default'];
  const match = Object.keys(ISSUER_COLOR).find(k => k.toLowerCase() === issuer.toLowerCase());
  return match ? ISSUER_COLOR[match] : ISSUER_COLOR['default'];
}

function getLogoUrl(issuer) {
  if (!issuer) return null;
  const domain = ISSUER_DOMAIN[issuer] || `${issuer.toLowerCase().replace(/\s+/g, '')}.com`;
  return `https://logo.clearbit.com/${domain}`;
}



function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  );
}

const STORE_OPTIONS = ['Amazon', 'Walmart', 'Target', 'eBay', 'Costco', 'PayPal', 'Grocery', 'Gas', 'Dining', 'Travel', 'Pharmacy', 'Office Supply', 'Electronics', 'Streaming', 'Other'];

export default function CardVisual({ card, orders = [], onEdit, onDelete, onUpdate, isDuplicate = false }) {
  const [showRates, setShowRates] = useState(false);
  const [showPerks, setShowPerks] = useState(false);
  const [addingRate, setAddingRate] = useState(false);
  const [newStore, setNewStore] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newPerk, setNewPerk] = useState('');
  const [addingPerk, setAddingPerk] = useState(false);

  const totalSpent = orders.filter(o => o.credit_card_id === card.id).reduce((s, o) => s + (o.final_cost || o.total_cost || 0), 0);
  const txnCount = orders.filter(o => o.credit_card_id === card.id).length;
  const storeRates = card.store_rates || [];
  const perks = card.benefits ? card.benefits.split(',').map(p => p.trim()).filter(Boolean) : [];
  const isActive = card.active !== false;
  const accentColor = getIssuerColor(card.issuer);

  const handleDeleteRate = (idx) => {
    const updated = storeRates.filter((_, i) => i !== idx);
    onUpdate(card.id, { store_rates: updated });
  };

  const handleAddRate = () => {
    if (!newStore || !newRate) return;
    const updated = [...storeRates, { store: newStore, rate: parseFloat(newRate) }];
    onUpdate(card.id, { store_rates: updated });
    setNewStore(''); setNewRate(''); setAddingRate(false);
  };

  const handleAddPerk = () => {
    if (!newPerk.trim()) return;
    const updated = [...perks, newPerk.trim()];
    onUpdate(card.id, { benefits: updated.join(', ') });
    setNewPerk(''); setAddingPerk(false);
  };

  const handleDeletePerk = (idx) => {
    const updated = perks.filter((_, i) => i !== idx);
    onUpdate(card.id, { benefits: updated.join(', ') });
  };

  const handleToggleActive = () => {
    onUpdate(card.id, { active: !isActive });
  };

  const baseRate = card.cashback_rate || card.points_rate || 0;
  const rateLabel = card.reward_type === 'points' ? `${baseRate}x pts` : `${baseRate}%`;

  return (
    <div className="group bg-white rounded-[14px] border border-slate-200 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-0.5">
      <div style={{ height: '3px', background: accentColor, borderRadius: '14px 14px 0 0' }} />

      {isDuplicate && (
        <div className="flex items-center gap-2 px-5 py-2 bg-amber-50 border-b border-amber-100">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="text-xs text-amber-700 font-medium">Possible duplicate</span>
          <button onClick={() => onDelete(card)} className="ml-auto text-xs text-red-500 hover:text-red-700 font-semibold transition">Remove</button>
        </div>
      )}

      {/* Card Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <CardLogo cardName={card.issuer} size={44} />
            <div>
              <p className="font-bold text-slate-900 leading-tight" style={{ fontSize: 16 }}>{card.card_name}</p>
              <p className="text-sm text-slate-400 mt-0.5">{card.issuer || '—'}{card.last_4_digits ? ` ••${card.last_4_digits}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Toggle checked={isActive} onChange={handleToggleActive} />
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(card)} className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition">
                <Pencil className="h-3.5 w-3.5 text-slate-400" />
              </button>
              <button onClick={() => onDelete(card)} className="h-7 w-7 rounded-lg hover:bg-red-50 flex items-center justify-center transition">
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
              </button>
            </div>
          </div>
        </div>

        {/* KPI metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-3 overflow-hidden" style={{ backgroundColor: `${accentColor}10` }}>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Base Rate</p>
            <p className="font-bold break-words" style={{ fontSize: 20, color: accentColor }}>{rateLabel}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 overflow-hidden">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Total Spent</p>
            <p className="font-bold text-slate-800 break-words" style={{ fontSize: 20 }}>
              ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 overflow-hidden">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Annual Fee</p>
            <p className="text-base font-bold text-slate-800">${card.annual_fee || 0}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 overflow-hidden">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Orders</p>
            <p className="text-base font-bold text-slate-800">{txnCount}</p>
          </div>
        </div>
      </div>

      {/* Store rate pills preview */}
      {storeRates.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-1.5">
          {storeRates.slice(0, 3).map((r, i) => (
            <span key={i} className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
              {r.rate}% {r.store}
            </span>
          ))}
          {storeRates.length > 3 && (
            <span className="text-xs text-slate-400 font-medium px-1 py-0.5">+{storeRates.length - 3} more</span>
          )}
        </div>
      )}

      {/* Store Rates Expandable */}
      <div className="border-t border-slate-100">
        <button
          onClick={() => setShowRates(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-2">
            <BarChart2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Store Rates</span>
            <span className="h-5 min-w-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center text-white"
              style={{ backgroundColor: accentColor }}>
              {storeRates.length}
            </span>
          </div>
          {showRates ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
        </button>

        {showRates && (
          <div className="px-5 pb-4 space-y-0.5">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 mb-1">
              <span className="text-xs text-slate-400 italic">* All Other Stores</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{card.cashback_rate || 0}%</span>
            </div>
            {storeRates.map((r, idx) => (
              <div key={idx} className="group/rate flex items-center justify-between py-1.5">
                <span className="text-sm text-slate-700 font-medium">{r.store}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: accentColor }}>{r.rate}%</span>
                  <button onClick={() => handleDeleteRate(idx)}
                    className="opacity-0 group-hover/rate:opacity-100 h-5 w-5 rounded flex items-center justify-center hover:bg-red-100 transition">
                    <X className="h-3 w-3 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
            {addingRate ? (
              <div className="flex items-center gap-2 pt-2">
                <select value={newStore} onChange={e => setNewStore(e.target.value)}
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-purple-400">
                  <option value="">Store...</option>
                  {STORE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="number" value={newRate} onChange={e => setNewRate(e.target.value)} placeholder="%"
                  className="w-16 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-purple-400" />
                <button onClick={handleAddRate} className="h-7 w-7 rounded-lg bg-green-500 flex items-center justify-center hover:bg-green-600 transition">
                  <Check className="h-3.5 w-3.5 text-white" />
                </button>
                <button onClick={() => setAddingRate(false)} className="h-7 w-7 rounded-lg bg-slate-200 flex items-center justify-center hover:bg-slate-300 transition">
                  <X className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </div>
            ) : (
              <button onClick={() => setAddingRate(true)}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-200 text-xs font-semibold text-slate-500 hover:border-purple-400 hover:text-purple-600 transition">
                <Plus className="h-3.5 w-3.5" /> Add Store Rate
              </button>
            )}
          </div>
        )}
      </div>

      {/* Perks Expandable */}
      <div className="border-t border-slate-100">
        <button
          onClick={() => setShowPerks(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Card Perks</span>
            <span className="h-5 min-w-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center bg-amber-100 text-amber-700">
              {perks.length}
            </span>
          </div>
          {showPerks ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
        </button>

        {showPerks && (
          <div className="px-5 pb-4">
            {perks.length === 0 && !addingPerk && (
              <p className="text-xs text-slate-400 italic mb-2">No perks saved yet (e.g. lounge access, travel credits)</p>
            )}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {perks.map((perk, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  {perk}
                  <button onClick={() => handleDeletePerk(idx)} className="text-amber-400 hover:text-red-500 transition ml-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            {addingPerk ? (
              <div className="flex items-center gap-2">
                <input
                  value={newPerk}
                  onChange={e => setNewPerk(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddPerk()}
                  placeholder="e.g. Airport lounge access"
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                  autoFocus
                />
                <button onClick={handleAddPerk} className="h-7 w-7 rounded-lg bg-amber-500 flex items-center justify-center hover:bg-amber-600 transition">
                  <Check className="h-3.5 w-3.5 text-white" />
                </button>
                <button onClick={() => setAddingPerk(false)} className="h-7 w-7 rounded-lg bg-slate-200 flex items-center justify-center hover:bg-slate-300 transition">
                  <X className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </div>
            ) : (
              <button onClick={() => setAddingPerk(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-amber-200 text-xs font-semibold text-amber-600 hover:border-amber-400 hover:bg-amber-50 transition">
                <Plus className="h-3.5 w-3.5" /> Add Perk
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
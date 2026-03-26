import React, { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp, Plus, X, Check, AlertTriangle, Star, BarChart2 } from 'lucide-react';

// ── Brandfetch client ID ──────────────────────────────────────────────────────
const BRANDFETCH_CLIENT_ID = '1idzVIG0BYPKsFIDJDI';

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
  'Chase': { from: '#003087', to: '#0066cc' },
  'American Express': { from: '#016FD0', to: '#003d7a' },
  'Amex': { from: '#016FD0', to: '#003d7a' },
  'Discover': { from: '#FF6600', to: '#cc4400' },
  'Capital One': { from: '#D03027', to: '#8b0000' },
  'Citi': { from: '#003B8E', to: '#0066cc' },
  'Bank of America': { from: '#E31837', to: '#8b0000' },
  'Barclays': { from: '#00AEEF', to: '#005580' },
  'Wells Fargo': { from: '#D71E28', to: '#8b0000' },
  'Goldman Sachs': { from: '#0f172a', to: '#1e293b' },
  'Robinhood': { from: '#00C805', to: '#006600' },
  'Apple': { from: '#555555', to: '#1a1a1a' },
  'default': { from: '#4f46e5', to: '#312e81' },
};

function getIssuerGradient(issuer) {
  if (!issuer) return ISSUER_COLOR['default'];
  const match = Object.keys(ISSUER_COLOR).find(k =>
    k.toLowerCase() === issuer.toLowerCase() ||
    issuer.toLowerCase().includes(k.toLowerCase())
  );
  return match ? ISSUER_COLOR[match] : ISSUER_COLOR['default'];
}

function getLogoUrl(issuer) {
  if (!issuer) return null;
  const domain = ISSUER_DOMAIN[issuer];
  if (!domain) {
    const fuzzy = Object.keys(ISSUER_DOMAIN).find(k =>
      issuer.toLowerCase().includes(k.toLowerCase())
    );
    if (fuzzy) return `https://cdn.brandfetch.io/domain/${ISSUER_DOMAIN[fuzzy]}?c=${BRANDFETCH_CLIENT_ID}`;
    return null;
  }
  return `https://cdn.brandfetch.io/domain/${domain}?c=${BRANDFETCH_CLIENT_ID}`;
}

function Chip() {
  return (
    <svg width="28" height="22" viewBox="0 0 28 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" width="27" height="21" rx="3.5" fill="url(#chip)" stroke="rgba(255,255,255,0.2)" />
      <line x1="9" y1="0.5" x2="9" y2="21.5" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
      <line x1="19" y1="0.5" x2="19" y2="21.5" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
      <line x1="0.5" y1="7" x2="27.5" y2="7" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
      <line x1="0.5" y1="15" x2="27.5" y2="15" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
      <defs>
        <linearGradient id="chip" x1="0" y1="0" x2="28" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D4A843" />
          <stop offset="0.5" stopColor="#F0C040" />
          <stop offset="1" stopColor="#B8860B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function NetworkBadge({ issuer }) {
  const lower = (issuer || '').toLowerCase();
  if (lower.includes('amex') || lower.includes('american express')) {
    return <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.9)', letterSpacing: 1 }}>AMEX</span>;
  }
  if (lower.includes('discover')) {
    return <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>DISCOVER</span>;
  }
  return <span style={{ fontSize: 16, fontWeight: 900, fontStyle: 'italic', color: '#fff', letterSpacing: -1 }}>VISA</span>;
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

const STORE_OPTIONS = ['Amazon', 'Walmart', 'Target', 'Best Buy', 'eBay', 'Costco', 'PayPal', 'Grocery', 'Gas', 'Dining', 'Travel', 'Pharmacy', 'Office Supply', 'Electronics', 'Streaming', 'Other'];

export default function CardVisual({ card, orders = [], onEdit, onDelete, onUpdate, isDuplicate = false }) {
  const [showRates, setShowRates] = useState(false);
  const [showPerks, setShowPerks] = useState(false);
  const [addingRate, setAddingRate] = useState(false);
  const [newStore, setNewStore] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newPerk, setNewPerk] = useState('');
  const [addingPerk, setAddingPerk] = useState(false);
  const [logoErr, setLogoErr] = useState(false);

  const totalSpent = orders.filter(o => o.credit_card_id === card.id).reduce((s, o) => s + (o.final_cost || o.total_cost || 0), 0);
  const txnCount = orders.filter(o => o.credit_card_id === card.id).length;
  const storeRates = card.store_rates || [];
  const perks = card.benefits ? card.benefits.split(',').map(p => p.trim()).filter(Boolean) : [];
  const isActive = card.active !== false;
  const gradient = getIssuerGradient(card.issuer);
  const logoUrl = getLogoUrl(card.issuer);

  const baseRate = card.cashback_rate || card.points_rate || 0;
  const rateLabel = card.reward_type === 'points' ? `${baseRate}x pts` : `${baseRate}%`;
  const accentColor = gradient.from;

  const initials = (card.issuer || card.card_name || '??')
    .replace(/[^A-Za-z\s]/g, '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleDeleteRate = (idx) => {
    onUpdate(card.id, { store_rates: storeRates.filter((_, i) => i !== idx) });
  };

  const handleAddRate = () => {
    if (!newStore || !newRate) return;
    onUpdate(card.id, { store_rates: [...storeRates, { store: newStore, rate: parseFloat(newRate) }] });
    setNewStore(''); setNewRate(''); setAddingRate(false);
  };

  const handleAddPerk = () => {
    if (!newPerk.trim()) return;
    onUpdate(card.id, { benefits: [...perks, newPerk.trim()].join(', ') });
    setNewPerk(''); setAddingPerk(false);
  };

  const handleDeletePerk = (idx) => {
    onUpdate(card.id, { benefits: perks.filter((_, i) => i !== idx).join(', ') });
  };

  return (
    <div className="group bg-white rounded-[14px] border border-slate-200 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-0.5">

      {isDuplicate && (
        <div className="flex items-center gap-2 px-5 py-2 bg-amber-50 border-b border-amber-100">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="text-xs text-amber-700 font-medium">Possible duplicate</span>
          <button onClick={() => onDelete(card)} className="ml-auto text-xs text-red-500 hover:text-red-700 font-semibold transition">Remove</button>
        </div>
      )}

      {/* ── Card Art Header ─────────────────────────────────────────────── */}
      <div style={{ position: 'relative', height: 148, background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />

        {/* Issuer logo — top left */}
        <div style={{ position: 'absolute', top: 14, left: 14, width: 44, height: 44, borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', background: 'rgba(255,255,255,0.1)' }}>
          {logoUrl && !logoErr ? (
            <img src={logoUrl} alt={card.issuer} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setLogoErr(true)} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{initials}</span>
            </div>
          )}
        </div>

        {/* Chip */}
        <div style={{ position: 'absolute', top: 18, left: 66 }}>
          <Chip />
        </div>

        {/* Network badge — top right */}
        <div style={{ position: 'absolute', top: 16, right: 14 }}>
          <NetworkBadge issuer={card.issuer} />
        </div>

        {/* Active toggle — bottom right */}
        <div style={{ position: 'absolute', bottom: 14, right: 14 }}>
          <Toggle checked={isActive} onChange={() => onUpdate(card.id, { active: !isActive })} />
        </div>

        {/* Edit/delete — hover */}
        <div style={{ position: 'absolute', top: 36, right: 14, display: 'flex', gap: 4 }} className="opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(card)} style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pencil style={{ width: 12, height: 12, color: '#fff' }} />
          </button>
          <button onClick={() => onDelete(card)} style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(239,68,68,0.3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 style={{ width: 12, height: 12, color: '#fca5a5' }} />
          </button>
        </div>

        {/* Bottom gradient overlay */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%)', pointerEvents: 'none' }} />

        {/* Card number dots */}
        <div style={{ position: 'absolute', bottom: 36, left: 14, fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: 3 }}>
          •••• •••• •••• {card.last_4_digits || '••••'}
        </div>

        {/* Card name + issuer */}
        <div style={{ position: 'absolute', bottom: 12, left: 14, right: 60 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2, textShadow: '0 1px 4px rgba(0,0,0,0.3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {card.card_name}
          </p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>{card.issuer || '—'}</p>
        </div>
      </div>

      {/* ── KPI Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-0.5 bg-slate-100">
        <div className="bg-white px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Base Rate</p>
          <p className="font-bold text-xl" style={{ color: accentColor }}>{rateLabel}</p>
        </div>
        <div className="bg-white px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Total Spent</p>
          <p className="font-bold text-xl text-slate-800">${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Annual Fee</p>
          <p className="font-bold text-base text-slate-800">${card.annual_fee || 0}</p>
        </div>
        <div className="bg-white px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Orders</p>
          <p className="font-bold text-base text-slate-800">{txnCount}</p>
        </div>
      </div>

      {/* Store rate pills preview */}
      {storeRates.length > 0 && (
        <div className="px-4 pt-3 pb-1 flex flex-wrap gap-1.5">
          {storeRates.slice(0, 3).map((r, i) => (
            <span key={i} className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accentColor}18`, color: accentColor }}>
              {r.rate}% {r.store}
            </span>
          ))}
          {storeRates.length > 3 && (
            <span className="text-xs text-slate-400 font-medium px-1 py-0.5">+{storeRates.length - 3} more</span>
          )}
        </div>
      )}

      {/* ── Store Rates ─────────────────────────────────────────────────── */}
      <div className="border-t border-slate-100">
        <button onClick={() => setShowRates(v => !v)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Store Rates</span>
            <span className="h-5 min-w-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: accentColor }}>
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
                  <button onClick={() => handleDeleteRate(idx)} className="opacity-0 group-hover/rate:opacity-100 h-5 w-5 rounded flex items-center justify-center hover:bg-red-100 transition">
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

      {/* ── Perks / Benefits ───────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-100">
        <button onClick={() => setShowPerks(v => !v)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition">
          <div className="flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Card Benefits</span>
            {card.benefits && <span className="h-5 min-w-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center bg-amber-100 text-amber-700">
              {perks.length}
            </span>}
          </div>
          {showPerks ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
        </button>

        {showPerks && (
          <div className="px-5 pb-4">
            {perks.length === 0 && !addingPerk && (
              <p className="text-xs text-slate-400 italic mb-2">No benefits saved yet (e.g. lounge access, travel credits, sign-up bonus)</p>
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
                <input value={newPerk} onChange={e => setNewPerk(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddPerk()}
                  placeholder="e.g. $300 annual travel credit"
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                  autoFocus />
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
                <Plus className="h-3.5 w-3.5" /> Add Benefit
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const CATEGORY_EMOJI = {
  Travel: '✈️',
  Dining: '🍽️',
  'Ride-share': '🚗',
  Shopping: '🛍️',
  Entertainment: '🎭',
  Other: '⭐',
};

const ISSUER_LOGOS = {
  chase: 'https://www.google.com/s2/favicons?domain=chase.com&sz=128',
  amex: 'https://www.google.com/s2/favicons?domain=americanexpress.com&sz=128',
  'american express': 'https://www.google.com/s2/favicons?domain=americanexpress.com&sz=128',
  citi: 'https://www.google.com/s2/favicons?domain=citi.com&sz=128',
  citibank: 'https://www.google.com/s2/favicons?domain=citi.com&sz=128',
  'bank of america': 'https://www.google.com/s2/favicons?domain=bankofamerica.com&sz=128',
  'capital one': 'https://www.google.com/s2/favicons?domain=capitalone.com&sz=128',
  discover: 'https://www.google.com/s2/favicons?domain=discover.com&sz=128',
  'wells fargo': 'https://www.google.com/s2/favicons?domain=wellsfargo.com&sz=128',
  barclays: 'https://www.google.com/s2/favicons?domain=barclays.com&sz=128',
  usaa: 'https://www.google.com/s2/favicons?domain=usaa.com&sz=128',
  pnc: 'https://www.google.com/s2/favicons?domain=pnc.com&sz=128',
  'us bank': 'https://www.google.com/s2/favicons?domain=usbank.com&sz=128',
  'u.s. bank': 'https://www.google.com/s2/favicons?domain=usbank.com&sz=128',
  synchrony: 'https://www.google.com/s2/favicons?domain=synchronybank.com&sz=128',
  'td bank': 'https://www.google.com/s2/favicons?domain=td.com&sz=128',
  apple: 'https://www.google.com/s2/favicons?domain=apple.com&sz=128',
  amazon: 'https://www.google.com/s2/favicons?domain=amazon.com&sz=128',
  jetblue: 'https://www.google.com/s2/favicons?domain=jetblue.com&sz=128',
  southwest: 'https://www.google.com/s2/favicons?domain=southwest.com&sz=128',
  marriott: 'https://www.google.com/s2/favicons?domain=marriott.com&sz=128',
  hilton: 'https://www.google.com/s2/favicons?domain=hilton.com&sz=128',
};

function getIssuerLogo(issuer, cardName) {
  const key = (issuer || cardName || '').toLowerCase();
  return Object.entries(ISSUER_LOGOS).find(([k]) => key.includes(k))?.[1] || null;
}

const CATEGORY_ICONS = {
  Dining: '🍽️',
  Travel: '✈️',
  Groceries: '🛒',
  Gas: '⛽',
  Streaming: '📺',
};

function IssuerLogo({ issuer, cardName }) {
  const [imgError, setImgError] = useState(false);
  const logo = getIssuerLogo(issuer, cardName);

  if (!logo || imgError) {
    return (
      <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
        {(issuer || cardName || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 2)}
      </div>
    );
  }

  return (
    <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow overflow-hidden shrink-0">
      <img
        src={logo}
        alt={issuer}
        className="h-8 w-8 object-contain"
        onError={() => setImgError(true)}
      />
    </div>
  );
}

function getAbbreviation(name) {
  if (!name) return '?';
  const words = name.split(' ').filter(Boolean);
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function calcAnnualValue(benefit) {
  const amt = parseFloat(benefit.credit_amount) || 0;
  const mult = benefit.reset_frequency === 'Monthly' ? 12 : benefit.reset_frequency === 'Quarterly' ? 4 : 1;
  return amt * mult;
}

function getBestUseCase(card, categoryRates) {
  if (!categoryRates.length) return null;
  const best = categoryRates.reduce((best, r) => {
    const rateVal = r.cashback || r.pts || 0;
    const bestVal = best.cashback || best.pts || 0;
    return rateVal > bestVal ? r : best;
  }, categoryRates[0]);
  return `Best for ${best.label}`;
}

export default function CreditCardCard({ card, orders = [], rewards = [], onEdit, onDelete }) {
  const [showOptimization, setShowOptimization] = useState(false);

  const totalSpend = orders.filter(o => o.credit_card_id === card.id).reduce((s, o) => s + (o.total_cost || 0), 0);
  const txnCount = orders.filter(o => o.credit_card_id === card.id).length;
  const defaultRate = card.reward_type === 'cashback' ? `${card.cashback_rate || 0}%`
    : card.reward_type === 'points' ? `${card.points_rate || 0}x pts`
    : `${card.cashback_rate || 0}%`;

  const categoryRates = [
    { label: 'Dining', cashback: card.dining_cashback_rate, pts: card.dining_points_rate },
    { label: 'Travel', cashback: card.travel_cashback_rate, pts: card.travel_points_rate },
    { label: 'Groceries', cashback: card.groceries_cashback_rate, pts: card.groceries_points_rate },
    { label: 'Gas', cashback: card.gas_cashback_rate, pts: card.gas_points_rate },
    { label: 'Streaming', cashback: card.streaming_cashback_rate, pts: card.streaming_points_rate },
  ].filter(r => r.cashback || r.pts);

  const annualCredits = card.annual_credits || [];
  const totalAnnualCredits = annualCredits.reduce((s, b) => s + calcAnnualValue(b), 0);
  const grouped = annualCredits.reduce((acc, b) => {
    const cat = b.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(b);
    return acc;
  }, {});

  const bestUseCase = getBestUseCase(card, categoryRates);
  const hasOptimizationData = categoryRates.length > 0 || annualCredits.length > 0 || card.benefits;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <IssuerLogo issuer={card.issuer} cardName={card.card_name} />
            <div>
              <p className="font-bold text-slate-900 text-sm">{card.card_name}</p>
              <p className="text-xs text-slate-500">{card.issuer || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(card)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => onDelete(card)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Default Rate</p>
            <p className="text-base font-bold text-green-600">{defaultRate}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Total Spend</p>
            <p className="text-base font-bold text-slate-900">${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Annual Fee</p>
            <p className="text-sm font-semibold text-slate-700">${card.annual_fee || '0.00'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Transactions</p>
            <p className="text-sm font-semibold text-slate-700">{txnCount}</p>
          </div>
        </div>
      </div>

      {/* Optimization Section */}
      <div className="border-t border-slate-100">
        <button
          onClick={() => setShowOptimization(!showOptimization)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-600">⚡ Optimization</span>
            {bestUseCase && !showOptimization && (
              <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold">{bestUseCase}</span>
            )}
          </div>
          {showOptimization ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>

        {showOptimization && (
          <div className="px-5 pb-4 space-y-4">

            {/* Suggested Use Cases */}
            {bestUseCase && (
              <div className="flex flex-wrap gap-1.5">
                {categoryRates.map(r => {
                  const val = r.cashback || r.pts || 0;
                  const baseVal = card.cashback_rate || card.points_rate || 0;
                  if (val <= baseVal) return null;
                  return (
                    <span key={r.label} className="text-[11px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold">
                      {CATEGORY_ICONS[r.label]} Best for {r.label}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Category Reward Multipliers */}
            {categoryRates.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Reward Multipliers</p>
                <div className="space-y-1.5">
                  {categoryRates.map(r => (
                    <div key={r.label} className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">
                        {CATEGORY_ICONS[r.label]} {r.label}
                      </span>
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full">
                        {r.cashback ? `${r.cashback}%` : ''}{r.cashback && r.pts ? ' / ' : ''}{r.pts ? `${r.pts}x` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Statement Credits / Benefits */}
            {annualCredits.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Statement Credits</p>
                <div className="space-y-2">
                  {Object.entries(grouped).map(([cat, items]) => (
                    <div key={cat}>
                      <p className="text-[10px] text-slate-400 font-semibold mb-1">{CATEGORY_EMOJI[cat] || '⭐'} {cat}</p>
                      {items.map((b, i) => (
                        <div key={i} className="flex items-center justify-between text-xs mb-1 pl-3">
                          <div className="text-slate-600">
                            {b.benefit_name || 'Unnamed'}
                            <span className="text-slate-400 ml-1 text-[10px]">({b.reset_frequency})</span>
                          </div>
                          <span className="font-bold text-emerald-600">${parseFloat(b.credit_amount || 0).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="border-t border-slate-100 pt-1.5 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Total Annual Credits</span>
                    <span className="text-xs font-bold text-emerald-700">${totalAnnualCredits.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Free-text Benefits */}
            {card.benefits && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Key Benefits</p>
                <p className="text-xs text-slate-600 leading-relaxed">{card.benefits}</p>
              </div>
            )}

            {!hasOptimizationData && (
              <p className="text-xs text-slate-400">No optimization data set — edit this card to add category rates and benefits.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
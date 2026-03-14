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
  'capital one': 'data:image/png;base64,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',
  'credit one': 'https://www.google.com/s2/favicons?domain=creditonebank.com&sz=128',
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
  paypal: 'https://www.google.com/s2/favicons?domain=paypal.com&sz=128',
  robinhood: 'https://www.google.com/s2/favicons?domain=robinhood.com&sz=128',
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
    <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm overflow-hidden shrink-0">
      <img
        src={logo}
        alt={issuer}
        className="h-9 w-9 object-contain"
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
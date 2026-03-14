import React, { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CATEGORY_EMOJI = {
  Travel: '✈️',
  Dining: '🍽️',
  'Ride-share': '🚗',
  Shopping: '🛍️',
  Entertainment: '🎭',
  Other: '⭐',
};

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

export default function CreditCardCard({ card, orders = [], rewards = [], onEdit, onDelete }) {
  const [showRates, setShowRates] = useState(false);
  const [showBenefits, setShowBenefits] = useState(false);

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

  // Group by category
  const grouped = annualCredits.reduce((acc, b) => {
    const cat = b.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(b);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow">
              {getAbbreviation(card.issuer || card.card_name)}
            </div>
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

      {/* Store Rates Section */}
      <div className="border-t border-slate-100">
        <button
          onClick={() => setShowRates(!showRates)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">🏪 Store Rates</span>
            {categoryRates.length > 0 && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">{categoryRates.length}</span>
            )}
          </div>
          {showRates ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
        {showRates && (
          <div className="px-5 pb-4 space-y-1.5">
            {categoryRates.length === 0 ? (
              <p className="text-xs text-slate-400">No category rates set</p>
            ) : categoryRates.map(r => (
              <div key={r.label} className="flex items-center justify-between text-xs">
                <span className="text-slate-600">{r.label}</span>
                <span className="font-semibold text-slate-800">
                  {r.cashback ? `${r.cashback}%` : ''}{r.cashback && r.pts ? ' / ' : ''}{r.pts ? `${r.pts}x` : ''}
                </span>
              </div>
            ))}
            {card.active !== false && (
              <p className="text-xs text-green-500 font-medium mt-2">Active — click to toggle</p>
            )}
          </div>
        )}
      </div>

      {/* Benefits Section */}
      {annualCredits.length > 0 && (
        <div className="border-t border-slate-100">
          <button
            onClick={() => setShowBenefits(!showBenefits)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">⭐ Benefits</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">{annualCredits.length}</span>
            </div>
            {showBenefits ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {showBenefits && (
            <div className="px-5 pb-4 space-y-3">
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {CATEGORY_EMOJI[cat] || '⭐'} {cat}
                  </p>
                  {items.map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-xs mb-1">
                      <div>
                        <span className="text-slate-700 font-medium">{b.benefit_name || 'Unnamed'}</span>
                        <span className="text-slate-400 ml-1">({b.reset_frequency})</span>
                      </div>
                      <span className="font-bold text-emerald-600">${parseFloat(b.credit_amount || 0).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Total Annual Credits</span>
                <span className="text-sm font-bold text-emerald-700">${totalAnnualCredits.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
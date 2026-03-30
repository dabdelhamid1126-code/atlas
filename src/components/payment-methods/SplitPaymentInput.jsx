import React from 'react';
import { Plus, Trash2, CreditCard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * SplitPaymentInput
 * Props:
 *   splits: [{card_id, card_name, amount}]
 *   onChange: (splits) => void
 *   creditCards: CreditCard[]
 *   totalRequired: number  (the amount that must be covered)
 */
export default function SplitPaymentInput({ splits = [], onChange, creditCards = [], totalRequired = 0 }) {
  const activeSplits = splits.length > 0 ? splits : [{ card_id: '', card_name: '', amount: '' }];

  const splitsTotal = activeSplits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0);
  const remaining = totalRequired - splitsTotal;
  const isBalanced = Math.abs(remaining) < 0.01;
  const hasMultiple = activeSplits.length > 1;

  const update = (idx, field, val) => {
    const next = activeSplits.map((sp, i) => {
      if (i !== idx) return sp;
      if (field === 'card_id') {
        const card = creditCards.find(c => c.id === val);
        return { ...sp, card_id: val, card_name: card?.card_name || '' };
      }
      return { ...sp, [field]: val };
    });
    onChange(next);
  };

  const addSplit = () => onChange([...activeSplits, { card_id: '', card_name: '', amount: '' }]);

  const removeSplit = (idx) => {
    const next = activeSplits.filter((_, i) => i !== idx);
    onChange(next.length > 0 ? next : [{ card_id: '', card_name: '', amount: '' }]);
  };

  return (
    <div className="space-y-2">
      {activeSplits.map((sp, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Select value={sp.card_id || ''} onValueChange={v => update(idx, 'card_id', v)}>
            <SelectTrigger className="bg-white flex-1">
              {sp.card_id
                ? <span className="text-sm">{sp.card_name}</span>
                : <span className="text-slate-400 text-sm">Select card...</span>}
            </SelectTrigger>
            <SelectContent>
              {creditCards.filter(c => c.active !== false).map(c =>
                <SelectItem key={c.id} value={c.id}>{c.card_name}</SelectItem>
              )}
            </SelectContent>
          </Select>
          <div className="relative w-32 flex-shrink-0">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <Input
              className="bg-white pl-6 h-9"
              type="number" step="0.01" min="0"
              value={sp.amount}
              onChange={e => update(idx, 'amount', e.target.value)}
              placeholder="0.00"
            />
          </div>
          {hasMultiple && (
            <button type="button" onClick={() => removeSplit(idx)}
              className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition flex-shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}

      <div className="flex items-center justify-between">
        <button type="button" onClick={addSplit}
          className="flex items-center gap-1.5 text-xs text-pink-600 hover:text-pink-700 font-medium transition">
          <Plus className="h-3 w-3" /> Add another card
        </button>

        {totalRequired > 0 && (
          <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            isBalanced
              ? 'bg-green-50 text-green-700 border border-green-200'
              : remaining > 0
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-red-50 text-red-600 border border-red-200'
          }`}>
            {isBalanced
              ? '✓ Balanced'
              : remaining > 0
                ? `$${remaining.toFixed(2)} remaining`
                : `$${Math.abs(remaining).toFixed(2)} over`}
          </div>
        )}
      </div>

      {hasMultiple && !isBalanced && totalRequired > 0 && (
        <p className="text-xs text-amber-600 flex items-center gap-1.5">
          <CreditCard className="h-3 w-3" />
          Split amounts must total ${totalRequired.toFixed(2)} (currently ${splitsTotal.toFixed(2)})
        </p>
      )}
    </div>
  );
}
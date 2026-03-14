import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

const BENEFIT_CATEGORIES = ['Travel', 'Dining', 'Ride-share', 'Shopping', 'Entertainment', 'Other'];
const RESET_FREQUENCIES = ['Monthly', 'Quarterly', 'Annually'];

const emptyBenefit = () => ({ category: 'Travel', benefit_name: '', credit_amount: 0, reset_frequency: 'Annually', notes: '' });

export default function CardBenefitsEditor({ benefits = [], onChange }) {
  const updateBenefit = (idx, field, value) => {
    const updated = benefits.map((b, i) => i === idx ? { ...b, [field]: value } : b);
    onChange(updated);
  };

  const addBenefit = () => onChange([...benefits, emptyBenefit()]);
  const removeBenefit = (idx) => onChange(benefits.filter((_, i) => i !== idx));

  return (
    <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Annual Credits & Benefits</p>
        {benefits.length > 0 && (
          <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
            Total: ${benefits.reduce((s, b) => {
              const amt = parseFloat(b.credit_amount) || 0;
              const mult = b.reset_frequency === 'Monthly' ? 12 : b.reset_frequency === 'Quarterly' ? 4 : 1;
              return s + amt * mult;
            }, 0).toLocaleString()}/yr
          </span>
        )}
      </div>

      {benefits.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-2">No benefits added yet</p>
      )}

      <div className="space-y-2">
        {benefits.map((benefit, idx) => (
          <div key={idx} className="bg-white rounded-lg border border-emerald-100 p-3 relative">
            <button type="button" onClick={() => removeBenefit(idx)}
              className="absolute top-2 right-2 text-slate-300 hover:text-red-400 transition">
              <X className="h-4 w-4" />
            </button>
            <div className="grid grid-cols-2 gap-2 mb-2 pr-6">
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Category</Label>
                <Select value={benefit.category} onValueChange={v => updateBenefit(idx, 'category', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BENEFIT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Reset Frequency</Label>
                <Select value={benefit.reset_frequency} onValueChange={v => updateBenefit(idx, 'reset_frequency', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RESET_FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Benefit Name</Label>
                <Input className="h-8 text-xs" value={benefit.benefit_name}
                  onChange={e => updateBenefit(idx, 'benefit_name', e.target.value)}
                  placeholder="e.g. Airline Fee Credit" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Credit $</Label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <Input className="h-8 text-xs pl-5" type="number" step="0.01" min="0"
                    value={benefit.credit_amount || ''}
                    onChange={e => updateBenefit(idx, 'credit_amount', e.target.value)}
                    placeholder="0" />
                </div>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Notes (optional)</Label>
              <Input className="h-8 text-xs" value={benefit.notes || ''}
                onChange={e => updateBenefit(idx, 'notes', e.target.value)}
                placeholder="e.g. Applies to airline incidental fees" />
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={addBenefit}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border-2 border-dashed border-emerald-200 text-emerald-600 text-xs font-semibold hover:border-emerald-400 hover:bg-emerald-50 transition">
        <Plus className="h-3.5 w-3.5" /> Add Benefit
      </button>
    </div>
  );
}
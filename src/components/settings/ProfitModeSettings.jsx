import React, { useState } from 'react';
import { Calculator, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const MODES = [
  {
    id: 'accounting',
    label: 'Accounting Mode',
    description: 'Revenue minus (card spend minus cashback earned)',
    formula: 'Profit = Revenue − (Card Spend − Cashback)',
    color: 'border-blue-200 bg-blue-50',
    activeColor: 'border-blue-500 ring-2 ring-blue-300',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'cashback_wallet',
    label: 'Cashback Wallet Mode',
    description: 'Accounting Profit minus YA (Young Adult) cashback used — reflects actual out-of-pocket cost',
    formula: 'Profit = Accounting Profit − YA Used',
    color: 'border-violet-200 bg-violet-50',
    activeColor: 'border-violet-500 ring-2 ring-violet-300',
    badge: 'bg-violet-100 text-violet-700',
  },
];

export default function ProfitModeSettings({ user, onSave }) {
  const [selected, setSelected] = useState(user?.profit_mode || 'accounting');
  const [showExplainer, setShowExplainer] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selected);
      toast.success('Profit mode saved!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-8 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="h-5 w-5 text-violet-600" />
          <h2 className="text-xl font-bold text-slate-900">Profit Calculation Mode</h2>
        </div>
        <p className="text-slate-500 text-sm">Choose how profit is calculated across your Dashboard and Analytics.</p>
      </div>

      {/* Mode Cards */}
      <div className="space-y-3">
        {MODES.map(mode => (
          <button
            key={mode.id}
            onClick={() => setSelected(mode.id)}
            className={`w-full text-left rounded-xl border-2 p-4 transition-all ${selected === mode.id ? mode.activeColor : mode.color} hover:opacity-90`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected === mode.id ? 'border-current bg-current' : 'border-slate-300'}`}>
                {selected === mode.id && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-slate-800">{mode.label}</p>
                  {user?.profit_mode === mode.id && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${mode.badge}`}>Current</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-2">{mode.description}</p>
                <code className={`text-[11px] font-mono px-2 py-1 rounded-md ${mode.badge}`}>{mode.formula}</code>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Explainer */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
        <button
          onClick={() => setShowExplainer(p => !p)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-amber-700"
        >
          <span>📘 When does the mode matter?</span>
          {showExplainer ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showExplainer && (
          <div className="px-4 pb-4 text-xs text-amber-800 space-y-2">
            <p><strong>Accounting Mode</strong> is best for standard bookkeeping. It shows profit <em>after</em> considering cashback as income that offsets your card spend.</p>
            <p><strong>Cashback Wallet Mode</strong> is best if you think of YA cashback as a separate wallet of funds you've already spent. It subtracts YA used from your profit, giving you a more conservative "true out-of-pocket" view.</p>
            <p className="text-amber-600 font-medium">This setting affects the Profit card on Dashboard and Analytics KPIs.</p>
          </div>
        )}
      </div>

      <Button onClick={handleSave} disabled={saving || selected === user?.profit_mode} className="bg-violet-600 hover:bg-violet-700 text-white">
        {saving ? 'Saving...' : 'Save Preference'}
      </Button>
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check } from 'lucide-react';

const CARD_PRESETS = {
  "Chase Freedom Flex": { issuer:"Chase", reward_type:"cashback", cashback_rate:1, annual_fee:0 },
  "Chase Freedom Unlimited": { issuer:"Chase", reward_type:"cashback", cashback_rate:1.5, annual_fee:0 },
  "Chase Amazon Prime Visa": { issuer:"Chase", reward_type:"cashback", cashback_rate:1, annual_fee:0 },
  "Chase Ink Business Cash": { issuer:"Chase", reward_type:"cashback", cashback_rate:1, annual_fee:0 },
  "Chase Ink Business Unlimited": { issuer:"Chase", reward_type:"cashback", cashback_rate:1.5, annual_fee:0 },
  "Chase Ink Business Preferred": { issuer:"Chase", reward_type:"points", cashback_rate:1, annual_fee:95 },
  "Chase Sapphire Reserve": { issuer:"Chase", reward_type:"points", cashback_rate:1, annual_fee:550 },
  "Amex Blue Cash Everyday": { issuer:"American Express", reward_type:"cashback", cashback_rate:1, annual_fee:0 },
  "Amex Blue Cash Preferred": { issuer:"American Express", reward_type:"cashback", cashback_rate:1, annual_fee:95 },
  "Amex Business Gold": { issuer:"American Express", reward_type:"points", cashback_rate:1, annual_fee:375 },
  "Amex Blue Business Plus": { issuer:"American Express", reward_type:"points", cashback_rate:2, annual_fee:0 },
  "Amex Platinum Card": { issuer:"American Express", reward_type:"points", cashback_rate:1, annual_fee:695 },
  "Amazon Business Prime Amex": { issuer:"American Express", reward_type:"cashback", cashback_rate:1, annual_fee:0 },
  "Citi Double Cash": { issuer:"Citi", reward_type:"cashback", cashback_rate:2, annual_fee:0 },
  "Citi Custom Cash": { issuer:"Citi", reward_type:"cashback", cashback_rate:1, annual_fee:0 },
  "Costco Anywhere Visa": { issuer:"Citi", reward_type:"cashback", cashback_rate:1, annual_fee:0 },
  "Capital One Spark Cash Plus": { issuer:"Capital One", reward_type:"cashback", cashback_rate:2, annual_fee:150 },
  "Discover it Cash Back": { issuer:"Discover", reward_type:"cashback", cashback_rate:1, annual_fee:0 },
  "Bank of America Customized Cash": { issuer:"Bank of America", reward_type:"cashback", cashback_rate:1.5, annual_fee:0 },
  "US Bank Cash+": { issuer:"US Bank", reward_type:"cashback", cashback_rate:1, annual_fee:0 },
  "PayPal Cashback Mastercard": { issuer:"PayPal", reward_type:"cashback", cashback_rate:1.5, annual_fee:0 },
  "Target RedCard": { issuer:"Target", reward_type:"cashback", cashback_rate:1, annual_fee:0 },
  "Sam's Club Mastercard": { issuer:"Synchrony", reward_type:"cashback", cashback_rate:1, annual_fee:0 },
};

const emptyForm = {
  card_name: '', issuer: '', last_4_digits: '', reward_type: 'cashback',
  cashback_rate: '', annual_fee: '', notes: '', active: true,
};

export default function CustomCardModal({ open, onClose, onSave, editCard = null }) {
  const [form, setForm] = useState(emptyForm);
  const [autoFilled, setAutoFilled] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    if (editCard) {
      setForm({
        card_name: editCard.card_name || '',
        issuer: editCard.issuer || '',
        last_4_digits: editCard.last_4_digits || '',
        reward_type: editCard.reward_type || 'cashback',
        cashback_rate: editCard.cashback_rate ?? '',
        annual_fee: editCard.annual_fee ?? '',
        notes: editCard.notes || '',
        active: editCard.active !== false,
      });
    } else {
      setForm(emptyForm);
    }
    setAutoFilled(false);
    setSuggestions([]);
    setShowSuggestions(false);
  }, [editCard, open]);

  useEffect(() => {
    const handleClick = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleCardNameChange = (value) => {
    set('card_name', value);
    setAutoFilled(false);
    if (value.length >= 2) {
      const matches = Object.keys(CARD_PRESETS).filter(name =>
        name.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(matches.slice(0, 6));
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const applyPreset = (name) => {
    const preset = CARD_PRESETS[name];
    setForm(p => ({
      ...p,
      card_name: name,
      issuer: preset.issuer,
      reward_type: preset.reward_type,
      cashback_rate: preset.cashback_rate,
      annual_fee: preset.annual_fee,
    }));
    setAutoFilled(true);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      cashback_rate: form.cashback_rate !== '' ? parseFloat(form.cashback_rate) : null,
      annual_fee: form.annual_fee !== '' ? parseFloat(form.annual_fee) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editCard ? 'Edit Card' : 'Add Custom Card'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Card Name *</Label>
              {autoFilled && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                  <Check className="h-3 w-3" /> Auto-filled from preset
                </span>
              )}
            </div>
            <div className="relative" ref={suggestionsRef}>
              <Input
                value={form.card_name}
                onChange={e => handleCardNameChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                required
                placeholder="e.g. Chase Freedom Flex"
                autoComplete="off"
              />
              {showSuggestions && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  {suggestions.map(name => (
                    <button
                      key={name}
                      type="button"
                      onMouseDown={() => applyPreset(name)}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-purple-50 hover:text-purple-700 transition flex items-center justify-between group"
                    >
                      <span className="font-medium">{name}</span>
                      <span className="text-xs text-slate-400 group-hover:text-purple-500">
                        {CARD_PRESETS[name].issuer} · {CARD_PRESETS[name].cashback_rate}{CARD_PRESETS[name].reward_type === 'points' ? 'x' : '%'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Issuer</Label>
              <Input value={form.issuer} onChange={e => set('issuer', e.target.value)} placeholder="e.g. Chase" />
            </div>
            <div className="space-y-1.5">
              <Label>Last 4 Digits</Label>
              <Input value={form.last_4_digits} onChange={e => set('last_4_digits', e.target.value.slice(0, 4))} placeholder="1234" maxLength={4} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Reward Type</Label>
              <Select value={form.reward_type} onValueChange={v => set('reward_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashback">Cashback</SelectItem>
                  <SelectItem value="points">Points</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{form.reward_type === 'points' ? 'Points Rate (x)' : 'Cashback Rate (%)'}</Label>
              <Input type="number" step="0.01" value={form.cashback_rate} onChange={e => set('cashback_rate', e.target.value)} placeholder={form.reward_type === 'points' ? '1.5' : '2'} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Annual Fee ($)</Label>
            <Input type="number" step="0.01" value={form.annual_fee} onChange={e => set('annual_fee', e.target.value)} placeholder="0" />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="active-chk" checked={form.active} onChange={e => set('active', e.target.checked)} className="rounded" />
            <Label htmlFor="active-chk" className="cursor-pointer font-normal">Card is active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
              {editCard ? 'Save Changes' : 'Add Card'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
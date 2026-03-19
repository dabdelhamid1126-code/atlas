import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const emptyForm = {
  card_name: '', issuer: '', last_4_digits: '', reward_type: 'cashback',
  cashback_rate: '', annual_fee: '', notes: '', active: true,
};

export default function CustomCardModal({ open, onClose, onSave, editCard = null }) {
  const [form, setForm] = useState(editCard ? {
    card_name: editCard.card_name || '',
    issuer: editCard.issuer || '',
    last_4_digits: editCard.last_4_digits || '',
    reward_type: editCard.reward_type || 'cashback',
    cashback_rate: editCard.cashback_rate ?? '',
    annual_fee: editCard.annual_fee ?? '',
    notes: editCard.notes || '',
    active: editCard.active !== false,
  } : emptyForm);

  React.useEffect(() => {
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
  }, [editCard, open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

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
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Card Name *</Label>
              <Input value={form.card_name} onChange={e => set('card_name', e.target.value)} required placeholder="e.g. Amex Blue Cash" />
            </div>
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
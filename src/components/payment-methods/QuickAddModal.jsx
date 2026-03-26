import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Check, CreditCard, X } from 'lucide-react';
import { CardLogo } from '@/components/shared/BrandLogo';
import cardPresets from '@/data/creditCardPresets.json';

const PRESET_CARDS = cardPresets.creditCards.map(card => ({
  name: card.name,
  issuer: card.issuer,
  domain: card.issuer === 'Chase' ? 'chase.com' :
          card.issuer === 'American Express' ? 'americanexpress.com' :
          card.issuer === 'Citi' ? 'citi.com' :
          card.issuer === 'Capital One' ? 'capitalone.com' :
          card.issuer === 'Discover' ? 'discover.com' :
          card.issuer === 'Bank of America' ? 'bankofamerica.com' :
          card.issuer === 'Wells Fargo' ? 'wellsfargo.com' :
          card.issuer === 'Barclays' ? 'barclays.com' :
          card.issuer === 'US Bank' ? 'usbank.com' :
          card.issuer === 'PayPal' ? 'paypal.com' :
          card.issuer === 'Target' ? 'target.com' :
          card.issuer === 'Amazon' ? 'amazon.com' :
          card.issuer === 'Apple' ? 'apple.com' :
          card.issuer === 'Robinhood' ? 'robinhood.com' :
          card.issuer === 'Goldman Sachs' ? 'goldmansachs.com' :
          'biltrewards.com',
  reward_type: card.reward_type,
  cashback_rate: card.cashback_rate || 0,
  points_rate: card.points_rate || 0,
  annual_fee: card.annual_fee || 0,
  store_rates: card.store_rates || [],
  benefits: card.benefits || '',
}));



export default function QuickAddModal({ open, onClose, existingCards = [], onCreate }) {
  const [search, setSearch] = useState('');
  const [issuerFilter, setIssuerFilter] = useState('all');
  const [selected, setSelected] = useState([]);
  const [applyPresets, setApplyPresets] = useState(true);
  const [loading, setLoading] = useState(false);

  const existingNames = new Set(existingCards.map(c => c.card_name?.toLowerCase()));

  const filtered = PRESET_CARDS.filter(c => {
    if (existingNames.has(c.name.toLowerCase())) return false;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.issuer.toLowerCase().includes(search.toLowerCase());
    const matchIssuer = issuerFilter === 'all' || c.issuer === issuerFilter;
    return matchSearch && matchIssuer;
  });

  const issuers = [...new Set(PRESET_CARDS.map(c => c.issuer))];

  const toggle = (name) => {
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const handleAdd = async () => {
    const toAdd = cardPresets.creditCards.filter(c => selected.includes(c.name));
    setLoading(true);
    for (const card of toAdd) {
      await onCreate({
        card_name: card.name,
        issuer: card.issuer,
        reward_type: card.reward_type,
        cashback_rate: card.cashback_rate || 0,
        points_rate: card.points_rate || 0,
        annual_fee: card.annual_fee || 0,
        active: true,
        store_rates: applyPresets ? card.store_rates : [],
        benefits: card.benefits || '',
        image_url: card.image_url || null,
      });
    }
    setLoading(false);
    setSelected([]);
    setSearch('');
    setIssuerFilter('all');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
          <DialogTitle className="text-lg font-bold">Quick Add Cards</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-3 space-y-3 border-b border-slate-100">
          {/* Search + filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search cards..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={issuerFilter} onValueChange={setIssuerFilter}>
              <SelectTrigger className="w-36 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Issuers</SelectItem>
                {issuers.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Selected bar */}
          {selected.length > 0 && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <span className="text-sm font-semibold text-green-700">✓ {selected.length} card(s) selected</span>
              <button onClick={() => setSelected([])} className="text-xs text-green-600 hover:text-green-800 font-medium">Clear</button>
            </div>
          )}

          {/* Apply preset rates toggle */}
          <button
            type="button"
            onClick={() => setApplyPresets(p => !p)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition ${applyPresets ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}
          >
            <div className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border-2 transition ${applyPresets ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
              {applyPresets && <Check className="h-2.5 w-2.5 text-white" />}
            </div>
            <CreditCard className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="text-sm font-medium text-blue-700">Apply Preset Store Rates</span>
          </button>
        </div>

        {/* Card list */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {filtered.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No cards match your search</p>
          )}
          {filtered.map(card => {
            const isSelected = selected.includes(card.name);
            return (
              <button
                key={card.name}
                type="button"
                onClick={() => toggle(card.name)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition ${isSelected ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'}`}
              >
                <CardLogo cardName={card.issuer} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 truncate leading-tight">{card.name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {card.issuer}
                    <span className="text-green-600 font-semibold"> · {card.cashback_rate}{card.reward_type === 'points' ? 'x pts' : '% base'}</span>
                    {card.store_rates.length > 0 && <span className="text-blue-500"> · {card.store_rates.length} rates</span>}
                    {card.annual_fee > 0 && <span className="text-slate-400"> · ${card.annual_fee}/yr</span>}
                  </p>
                </div>
                <div className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition ${isSelected ? 'border-green-500 bg-green-500' : 'border-slate-300'}`}>
                  {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-sm text-slate-500">{selected.length} card{selected.length !== 1 ? 's' : ''} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleAdd}
              disabled={selected.length === 0 || loading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? 'Adding...' : `Add ${selected.length || ''} Card${selected.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
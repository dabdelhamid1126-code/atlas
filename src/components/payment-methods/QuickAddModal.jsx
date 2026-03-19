import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Check, CreditCard, X } from 'lucide-react';

const PRESET_CARDS = [
  { name:'Chase Freedom Flex', issuer:'Chase', domain:'chase.com', reward_type:'cashback', cashback_rate:1, annual_fee:0, store_rates:[{store:'Amazon',rate:5},{store:'PayPal',rate:5},{store:'Walmart',rate:5},{store:'Target',rate:5}]},
  { name:'Chase Freedom Unlimited', issuer:'Chase', domain:'chase.com', reward_type:'cashback', cashback_rate:1.5, annual_fee:0, store_rates:[{store:'Amazon',rate:3},{store:'Pharmacy',rate:3}]},
  { name:'Chase Ink Business Cash', issuer:'Chase', domain:'chase.com', reward_type:'cashback', cashback_rate:1, annual_fee:0, store_rates:[{store:'Office Supply',rate:5},{store:'Staples',rate:5}]},
  { name:'Chase Ink Business Unlimited', issuer:'Chase', domain:'chase.com', reward_type:'cashback', cashback_rate:1.5, annual_fee:0, store_rates:[]},
  { name:'Chase Ink Business Preferred', issuer:'Chase', domain:'chase.com', reward_type:'points', cashback_rate:1, annual_fee:95, store_rates:[{store:'Shipping',rate:3},{store:'Advertising',rate:3}]},
  { name:'Chase Amazon Prime Visa', issuer:'Chase', domain:'chase.com', reward_type:'cashback', cashback_rate:1, annual_fee:0, store_rates:[{store:'Amazon',rate:5},{store:'Whole Foods',rate:5},{store:'Gas',rate:2},{store:'Dining',rate:2}]},
  { name:'Amex Blue Cash Everyday', issuer:'American Express', domain:'americanexpress.com', reward_type:'cashback', cashback_rate:1, annual_fee:0, store_rates:[{store:'Amazon',rate:3},{store:'Grocery',rate:3},{store:'Gas',rate:3}]},
  { name:'Amex Blue Cash Preferred', issuer:'American Express', domain:'americanexpress.com', reward_type:'cashback', cashback_rate:1, annual_fee:95, store_rates:[{store:'Grocery',rate:6},{store:'Streaming',rate:6},{store:'Gas',rate:3},{store:'Transit',rate:3}]},
  { name:'Amex Business Gold', issuer:'American Express', domain:'americanexpress.com', reward_type:'points', cashback_rate:1, annual_fee:375, store_rates:[{store:'Online Retail',rate:4},{store:'Shipping',rate:4},{store:'Advertising',rate:4}]},
  { name:'Amex Blue Business Plus', issuer:'American Express', domain:'americanexpress.com', reward_type:'points', cashback_rate:2, annual_fee:0, store_rates:[]},
  { name:'Citi Double Cash', issuer:'Citi', domain:'citi.com', reward_type:'cashback', cashback_rate:2, annual_fee:0, store_rates:[]},
  { name:'Citi Custom Cash', issuer:'Citi', domain:'citi.com', reward_type:'cashback', cashback_rate:1, annual_fee:0, store_rates:[{store:'Top Category',rate:5}]},
  { name:'Capital One Spark Cash Plus', issuer:'Capital One', domain:'capitalone.com', reward_type:'cashback', cashback_rate:2, annual_fee:150, store_rates:[]},
  { name:'Discover it Cash Back', issuer:'Discover', domain:'discover.com', reward_type:'cashback', cashback_rate:1, annual_fee:0, store_rates:[{store:'Amazon',rate:5},{store:'Walmart',rate:5},{store:'PayPal',rate:5}]},
  { name:'Bank of America Customized Cash', issuer:'Bank of America', domain:'bankofamerica.com', reward_type:'cashback', cashback_rate:1.5, annual_fee:0, store_rates:[{store:'Online Shopping',rate:3},{store:'Wholesale',rate:2}]},
  { name:'US Bank Cash+', issuer:'US Bank', domain:'usbank.com', reward_type:'cashback', cashback_rate:1, annual_fee:0, store_rates:[{store:'Electronics',rate:5},{store:'Department Stores',rate:5}]},
  { name:'PayPal Cashback Mastercard', issuer:'PayPal', domain:'paypal.com', reward_type:'cashback', cashback_rate:1.5, annual_fee:0, store_rates:[{store:'PayPal',rate:3}]},
  { name:'Target RedCard', issuer:'Target', domain:'target.com', reward_type:'cashback', cashback_rate:1, annual_fee:0, store_rates:[{store:'Target',rate:5},{store:'Target.com',rate:5}]},
  { name:'Amazon Business Prime Amex', issuer:'American Express', domain:'americanexpress.com', reward_type:'cashback', cashback_rate:1, annual_fee:0, store_rates:[{store:'Amazon Business',rate:5},{store:'Amazon',rate:5}]},
  { name:'Costco Anywhere Visa', issuer:'Citi', domain:'citi.com', reward_type:'cashback', cashback_rate:1, annual_fee:0, store_rates:[{store:'Costco',rate:2},{store:'Gas',rate:4}]},
];

const ISSUER_COLOR = {
  'Chase': '#1d4ed8', 'American Express': '#059669', 'Discover': '#d97706',
  'Capital One': '#dc2626', 'Citi': '#7c3aed', 'Bank of America': '#b91c1c',
  'US Bank': '#0284c7', 'PayPal': '#003087', 'Target': '#cc0000',
  'default': '#6366f1',
};

function PresetLogo({ domain, issuer }) {
  const [err, setErr] = useState(false);
  const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  const initials = (issuer || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const color = ISSUER_COLOR[issuer] || ISSUER_COLOR['default'];
  if (err) {
    return (
      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs"
        style={{ backgroundColor: color }}>{initials}</div>
    );
  }
  return (
    <div className="h-8 w-8 rounded-lg overflow-hidden bg-white border border-slate-100 shrink-0 flex items-center justify-center">
      <img src={url} alt={issuer} className="h-6 w-6 object-contain" onError={() => setErr(true)} />
    </div>
  );
}

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
    const toAdd = PRESET_CARDS.filter(c => selected.includes(c.name));
    setLoading(true);
    for (const card of toAdd) {
      await onCreate({
        card_name: card.name,
        issuer: card.issuer,
        reward_type: card.reward_type,
        cashback_rate: card.cashback_rate,
        annual_fee: card.annual_fee,
        active: true,
        store_rates: applyPresets ? card.store_rates : [],
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
                <PresetLogo domain={card.domain} issuer={card.issuer} />
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
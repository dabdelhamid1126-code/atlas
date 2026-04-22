import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Check, CreditCard, X } from 'lucide-react';
import { CardLogo } from '@/components/shared/BrandLogo';
import cardPresets from '@/data/creditCardPresets.json';

const PRESET_CARDS = cardPresets.creditCards.map(card => ({
  name: card.name,
  issuer: card.issuer,
  domain: card.issuer==='Chase' ? 'chase.com' :
          card.issuer==='American Express' ? 'americanexpress.com' :
          card.issuer==='Citi' ? 'citi.com' :
          card.issuer==='Capital One' ? 'capitalone.com' :
          card.issuer==='Discover' ? 'discover.com' :
          card.issuer==='Bank of America' ? 'bankofamerica.com' :
          card.issuer==='Wells Fargo' ? 'wellsfargo.com' :
          card.issuer==='Barclays' ? 'barclays.com' :
          card.issuer==='US Bank' ? 'usbank.com' :
          card.issuer==='PayPal' ? 'paypal.com' :
          card.issuer==='Target' ? 'target.com' :
          card.issuer==='Amazon' ? 'amazon.com' :
          card.issuer==='Apple' ? 'apple.com' :
          card.issuer==='Robinhood' ? 'robinhood.com' :
          card.issuer==='Goldman Sachs' ? 'goldmansachs.com' :
          'biltrewards.com',
  reward_type: card.reward_type,
  cashback_rate: card.cashback_rate||0,
  points_rate: card.points_rate||0,
  annual_fee: card.annual_fee||0,
  store_rates: card.store_rates||[],
  benefits: card.benefits||'',
}));

const inp = { background:'var(--parch-warm)', border:'1px solid var(--parch-line)', color:'var(--ink)' };

export default function QuickAddModal({ open, onClose, existingCards=[], onCreate }) {
  const [search, setSearch]           = useState('');
  const [issuerFilter, setIssuerFilter] = useState('all');
  const [selected, setSelected]       = useState([]);
  const [applyPresets, setApplyPresets] = useState(true);
  const [loading, setLoading]         = useState(false);

  const existingNames = new Set(existingCards.map(c => c.card_name?.toLowerCase()));

  const filtered = PRESET_CARDS.filter(c => {
    if (existingNames.has(c.name.toLowerCase())) return false;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.issuer.toLowerCase().includes(search.toLowerCase());
    const matchIssuer = issuerFilter==='all' || c.issuer===issuerFilter;
    return matchSearch && matchIssuer;
  });

  const issuers = [...new Set(PRESET_CARDS.map(c => c.issuer))];
  const toggle = (name) => setSelected(prev => prev.includes(name) ? prev.filter(n=>n!==name) : [...prev, name]);

  const handleAdd = async () => {
    const toAdd = cardPresets.creditCards.filter(c => selected.includes(c.name));
    setLoading(true);
    for (const card of toAdd) {
      await onCreate({
        card_name: card.name, issuer: card.issuer, reward_type: card.reward_type,
        cashback_rate: card.cashback_rate||0, points_rate: card.points_rate||0,
        annual_fee: card.annual_fee||0, active: true,
        store_rates: applyPresets ? card.store_rates : [],
        benefits: card.benefits||'',
      });
    }
    setLoading(false); setSelected([]); setSearch(''); setIssuerFilter('all'); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)', maxWidth:520, maxHeight:'90vh', display:'flex', flexDirection:'column', padding:0, gap:0 }}>

        {/* Header */}
        <DialogHeader style={{ padding:'18px 20px 14px', borderBottom:'1px solid var(--parch-line)', background:'var(--parch-warm)', flexShrink:0 }}>
          <DialogTitle style={{ fontFamily:"var(--font-serif)", fontSize:17, fontWeight:700, color:'var(--ink)' }}>Quick Add Cards</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--parch-line)', background:'var(--parch-card)', flexShrink:0, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ position:'relative', flex:1 }}>
              <Search style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:'var(--ink-ghost)', pointerEvents:'none' }} />
              <Input placeholder="Search cards..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{ ...inp, paddingLeft:34 }} />
            </div>
            <Select value={issuerFilter} onValueChange={setIssuerFilter}>
              <SelectTrigger style={{ ...inp, width:140, fontSize:13 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)' }}>
                <SelectItem value="all" style={{ color:'var(--ink)' }}>All Issuers</SelectItem>
                {issuers.map(i => <SelectItem key={i} value={i} style={{ color:'var(--ink)' }}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Selected count */}
          {selected.length>0 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--terrain-bg)', border:'1px solid var(--terrain-bdr)', borderRadius:10, padding:'8px 12px' }}>
              <span style={{ fontSize:12, fontWeight:600, color:'var(--terrain)' }}>✓ {selected.length} card{selected.length!==1?'s':''} selected</span>
              <button onClick={()=>setSelected([])} style={{ fontSize:11, color:'var(--terrain)', background:'none', border:'none', cursor:'pointer', fontWeight:500 }}>Clear</button>
            </div>
          )}

          {/* Apply preset toggle */}
          <button type="button" onClick={()=>setApplyPresets(p=>!p)}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:8, border:'1px solid', textAlign:'left', transition:'all 0.15s', cursor:'pointer',
              ...(applyPresets
                ? { borderColor:'var(--ocean-bdr)', background:'var(--ocean-bg)' }
                : { borderColor:'var(--parch-line)', background:'var(--parch-warm)' }) }}>
            <div style={{ width:16, height:16, borderRadius:4, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', border:`2px solid ${applyPresets?'var(--ocean)':'var(--parch-line)'}`, background:applyPresets?'var(--ocean)':'transparent', transition:'all 0.15s' }}>
              {applyPresets && <Check style={{ width:10, height:10, color:'white' }} />}
            </div>
            <CreditCard style={{ width:14, height:14, color:'var(--ocean)', flexShrink:0 }} />
            <span style={{ fontSize:12, fontWeight:500, color:'var(--ocean)' }}>Apply Preset Store Rates</span>
          </button>
        </div>

        {/* Card list */}
        <div style={{ flex:1, overflowY:'auto', padding:'8px 12px' }}>
          {filtered.length===0 && (
            <p style={{ fontSize:13, color:'var(--ink-ghost)', textAlign:'center', padding:'32px 0' }}>No cards match your search</p>
          )}
          {filtered.map(card => {
            const isSelected = selected.includes(card.name);
            return (
              <button key={card.name} type="button" onClick={()=>toggle(card.name)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, border:'1px solid', textAlign:'left', marginBottom:4, cursor:'pointer', transition:'all 0.12s', background:'transparent',
                  ...(isSelected
                    ? { borderColor:'var(--terrain-bdr)', background:'var(--terrain-bg)' }
                    : { borderColor:'var(--parch-line)', background:'var(--parch-warm)' }) }}>
                <CardLogo cardName={card.issuer} size={32} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:600, fontSize:12, color:'var(--ink)', margin:0, lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.name}</p>
                  <p style={{ fontSize:10, color:'var(--ink-ghost)', margin:0, marginTop:1 }}>
                    {card.issuer}
                    <span style={{ color:'var(--terrain)', fontWeight:600 }}> · {card.cashback_rate}{card.reward_type==='points'?'x pts':'% base'}</span>
                    {card.store_rates.length>0 && <span style={{ color:'var(--ocean)' }}> · {card.store_rates.length} rates</span>}
                    {card.annual_fee>0 && <span style={{ color:'var(--ink-ghost)' }}> · ${card.annual_fee}/yr</span>}
                  </p>
                </div>
                <div style={{ width:16, height:16, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', border:`2px solid ${isSelected?'var(--terrain)':'var(--parch-line)'}`, background:isSelected?'var(--terrain)':'transparent', transition:'all 0.15s' }}>
                  {isSelected && <Check style={{ width:10, height:10, color:'white' }} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 20px', borderTop:'1px solid var(--parch-line)', background:'var(--parch-warm)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <span style={{ fontSize:12, color:'var(--ink-ghost)' }}>{selected.length} card{selected.length!==1?'s':''} selected</span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose}
              style={{ padding:'8px 16px', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer', background:'var(--parch-warm)', border:'1px solid var(--parch-line)', color:'var(--ink-faded)' }}>
              Cancel
            </button>
            <button onClick={handleAdd} disabled={selected.length===0||loading}
              style={{ padding:'8px 20px', borderRadius:8, fontSize:12, fontWeight:700, cursor:selected.length===0?'not-allowed':'pointer', background:'var(--ink)', border:'none', color:'var(--ne-cream)', opacity:selected.length===0?0.5:1, transition:'opacity 0.15s' }}>
              {loading ? 'Adding...' : `Add ${selected.length||''} Card${selected.length!==1?'s':''}`}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
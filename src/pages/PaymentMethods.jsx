import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Search, Eye, EyeOff, Pencil, Trash2, Barcode, CreditCard, Gift, Star,
  Zap, Check, X, BarChart2, ChevronRight, AlertTriangle, TrendingUp, DollarSign,
  Settings, Wifi
} from 'lucide-react';
import CardVisual from '@/components/payment-methods/CardVisual';
import RetailerLogo, { CardLogo } from '@/components/shared/BrandLogo';
import YACashbackTab from '@/components/payment-methods/YACashbackTab';
import QuickAddModal from '@/components/payment-methods/QuickAddModal';
import CustomCardModal from '@/components/payment-methods/CustomCardModal';
import CardAnalyticsView from '@/components/payment-methods/CardAnalyticsView';
import StatusBadge from '@/components/shared/StatusBadge';
import DataTable from '@/components/shared/DataTable';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import ReactBarcode from 'react-barcode';

const GC_BRANDS = ['Amazon','Apple','Google Play','Target','Walmart','Best Buy','eBay','Visa','Mastercard','Other'];

const ISSUER_COLOR = {
  'Chase':            '#003087',
  'American Express': '#016FD0',
  'Amex':             '#016FD0',
  'Discover':         '#FF6600',
  'Capital One':      '#D03027',
  'Citi':             '#003B8E',
  'Bank of America':  '#E31837',
  'Barclays':         '#00AEEF',
  'Wells Fargo':      '#D71E28',
  'Goldman Sachs':    '#1a1a1a',
  'Apple':            '#555555',
  'Robinhood':        '#00C805',
};

function getCardColor(card) {
  if (!card?.issuer) return 'var(--ocean2)';
  const match = Object.keys(ISSUER_COLOR).find(k =>
    k.toLowerCase() === (card.issuer||'').toLowerCase() ||
    (card.issuer||'').toLowerCase().includes(k.toLowerCase())
  );
  return match ? ISSUER_COLOR[match] : 'var(--ocean2)';
}

const fmt$ = v => `$${(v||0).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`;

export default function PaymentMethods() {
  const [tab, setTab] = useState('credit-cards');
  const queryClient = useQueryClient();

  return (
    <div>
      <style>{`
        .pm-sidebar { width:220px; flex-shrink:0; border-right:1px solid var(--parch-line); display:flex; flex-direction:column; overflow:hidden; }
        .pm-card-item { display:flex; align-items:center; gap:10px; padding:10px 14px; cursor:pointer; border-bottom:1px solid var(--parch-line); transition:background 0.15s; }
        .pm-card-item:hover { background:var(--parch-warm); }
        .pm-card-item.active { background:var(--gold-bg); border-left:3px solid var(--gold); }
        .pm-card-item.active .pm-card-name { color:var(--gold2); }
        .pm-dot { width:10px; height:10px; border-radius:3px; flex-shrink:0; }
        .pm-card-name { font-size:12px; font-weight:600; color:var(--ink); font-family:var(--font-serif); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .pm-card-rate { font-size:10px; color:var(--ink-ghost); font-family:var(--font-mono); margin-top:1px; }
        .pm-detail { flex:1; overflow:auto; padding:20px; }
        .pm-stat-box { flex:1; padding:10px 14px; borderRadius:10px; background:var(--parch-warm); border:1px solid var(--parch-line); }
        .pm-stat-val { font-size:18px; font-weight:700; color:var(--ink); font-family:var(--font-mono); }
        .pm-stat-lbl { font-size:9px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:var(--ink-faded); margin-top:2px; font-family:var(--font-serif); }
        .pm-rate-row { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--parch-line); }
        .pm-rate-row:last-child { border-bottom:none; }
        .pm-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:300px; gap:10px; text-align:center; padding:24px; }
        @media (max-width: 768px) {
          .pm-split-panel { flex-direction: column !important; }
          .pm-sidebar { width: 100% !important; border-right: none !important; border-bottom: 1px solid var(--parch-line) !important; max-height: 240px !important; }
          .pm-detail { padding: 14px !important; }
        }
      `}</style>
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Payment Methods</h1>
        <p className="page-subtitle">Manage cards, cashback rates, and per-store rate overrides</p>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', alignItems:'center', gap:2, padding:3, borderRadius:10, marginBottom:20, width:'fit-content', background:'var(--parch-card)', border:'1px solid var(--parch-line)' }}>
        {[
          { key:'credit-cards', label:'Credit Cards', icon:CreditCard },
          { key:'gift-cards',   label:'Gift Cards',   icon:Gift       },
          { key:'ya-cashback',  label:'YA Cashback',  icon:Star       },
        ].map(({ key, label, icon:Icon }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
            borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
            background: tab===key ? 'var(--ink)' : 'transparent',
            color:       tab===key ? 'var(--ne-cream)' : 'var(--ink-dim)',
            border:      tab===key ? 'none' : '1px solid transparent',
            transition:  'all 0.15s',
          }}>
            <Icon style={{ width:13, height:13 }}/> {label}
          </button>
        ))}
      </div>

      {tab === 'credit-cards' && <CreditCardsTab queryClient={queryClient}/>}
      {tab === 'gift-cards'   && <GiftCardsTab   queryClient={queryClient}/>}
      {tab === 'ya-cashback'  && <YACashbackTab/>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CREDIT CARDS — SPLIT PANEL
═══════════════════════════════════════════════════════════ */
function CreditCardsTab({ queryClient }) {
  const [selectedId, setSelectedId]   = useState(null);
  const [search, setSearch]           = useState('');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [customCardOpen, setCustomCardOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const [userEmail, setUserEmail] = useState(null);
  useEffect(() => { base44.auth.me().then(u => setUserEmail(u?.email)).catch(()=>{}); }, []);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['creditCards', userEmail],
    queryFn: () => userEmail ? base44.entities.CreditCard.filter({ created_by: userEmail }) : [],
    enabled: userEmail !== null,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['purchaseOrders', userEmail],
    queryFn: () => userEmail ? base44.entities.PurchaseOrder.filter({ created_by: userEmail }) : [],
    enabled: userEmail !== null,
  });

  const createMutation = useMutation({
    mutationFn: d => base44.entities.CreditCard.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey:['creditCards'] }); toast.success('Card added!'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CreditCard.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey:['creditCards'] }); toast.success('Card updated!'); setCustomCardOpen(false); setEditingCard(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.CreditCard.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey:['creditCards'] });
      if (selectedId === id) setSelectedId(null);
      toast.success('Card deleted');
    },
  });

  const handleCreate    = async d => { const c = await createMutation.mutateAsync(d); setSelectedId(c.id); };
  const handleEdit      = card => { setEditingCard(card); setCustomCardOpen(true); };
  const handleSaveCustom = d => {
    if (editingCard) updateMutation.mutate({ id: editingCard.id, data: d });
    else createMutation.mutate(d);
    setCustomCardOpen(false);
  };
  const handleInlineUpdate = (id, d) => updateMutation.mutate({ id, data: d });
  const handleDelete    = card => { if (confirm(`Delete "${card.card_name}"?`)) deleteMutation.mutate(card.id); };

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd   = endOfMonth(now);
  const activeCards = cards.filter(c => c.active !== false);
  const monthOrders = orders.filter(o => { const d = o.order_date ? parseISO(o.order_date) : null; return d && d >= monthStart && d <= monthEnd; });
  const monthSpent  = monthOrders.reduce((s,o) => s + (o.final_cost||o.total_cost||0), 0);
  const cardsWithRate = activeCards.filter(c => c.cashback_rate);
  const avgCashback = cardsWithRate.length ? cardsWithRate.reduce((s,c) => s+(c.cashback_rate||0),0)/cardsWithRate.length : 0;
  const estEarned   = monthSpent * (avgCashback/100);

  const filteredCards = useMemo(() => cards.filter(c =>
    !search || c.card_name?.toLowerCase().includes(search.toLowerCase()) || c.issuer?.toLowerCase().includes(search.toLowerCase())
  ), [cards, search]);

  // Auto-select first card
  useEffect(() => {
    if (!selectedId && filteredCards.length > 0) setSelectedId(filteredCards[0].id);
  }, [filteredCards]);

  const selectedCard = cards.find(c => c.id === selectedId) || null;

  const nameCounts = cards.reduce((acc,c) => { const k=(c.card_name||'').toLowerCase().trim(); acc[k]=(acc[k]||0)+1; return acc; },{});
  const duplicateNames = new Set(Object.keys(nameCounts).filter(k=>nameCounts[k]>1));

  return (
    <>

      {/* ── KPI row ── */}
      <div className="grid-kpi" style={{ marginBottom:16 }}>
        <div className="kpi-card fade-up" style={{ borderTopColor:'var(--ocean2)' }}>
          <div className="kpi-label">Active Cards</div>
          <div className="kpi-value" style={{ color:'var(--ocean2)' }}>{activeCards.length}</div>
          <div className="kpi-sub">{cards.length} total</div>
        </div>
        <div className="kpi-card fade-up" style={{ borderTopColor:'var(--gold)' }}>
          <div className="kpi-label">Spent This Month</div>
          <div className="kpi-value" style={{ color:'var(--gold)' }}>{fmt$(monthSpent)}</div>
          <div className="kpi-sub">{monthOrders.length} orders</div>
        </div>
        <div className="kpi-card fade-up" style={{ borderTopColor:'var(--terrain2)' }}>
          <div className="kpi-label">Avg Cashback</div>
          <div className="kpi-value" style={{ color:'var(--terrain2)' }}>{avgCashback.toFixed(1)}%</div>
          <div className="kpi-sub">across active cards</div>
        </div>
        <div className="kpi-card fade-up" style={{ borderTopColor:'var(--violet2)' }}>
          <div className="kpi-label">Est. Earned</div>
          <div className="kpi-value" style={{ color:'var(--violet2)' }}>{fmt$(estEarned)}</div>
          <div className="kpi-sub">this month</div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:160 }}>
          <Search style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:13, height:13, color:'var(--ink-faded)' }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search cards..."
            style={{ width:'100%', height:34, paddingLeft:30, paddingRight:10, borderRadius:8, fontSize:12, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', color:'var(--ink)', outline:'none', fontFamily:'var(--font-serif)' }}/>
        </div>
        <button onClick={()=>setShowAnalytics(v=>!v)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.15s',
            background: showAnalytics ? 'var(--ocean-bg)' : 'var(--parch-warm)',
            border: `1px solid ${showAnalytics ? 'var(--ocean-bdr)' : 'var(--parch-line)'}`,
            color: showAnalytics ? 'var(--ocean2)' : 'var(--ink-dim)',
          }}>
          <BarChart2 style={{ width:13, height:13 }}/> Analytics
        </button>
        <button onClick={()=>setQuickAddOpen(true)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', background:'var(--gold-bg)', border:'1px solid var(--gold-border)', color:'var(--gold2)' }}>
          <Zap style={{ width:13, height:13 }}/> Quick Add
        </button>
        <button onClick={()=>{ setEditingCard(null); setCustomCardOpen(true); }}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', background:'var(--ink)', border:'none', color:'var(--ne-cream)' }}>
          <Plus style={{ width:13, height:13 }}/> Add Card
        </button>
      </div>

      {/* ── Analytics View ── */}
      {showAnalytics && (
        <div style={{ marginBottom:16 }}>
          <CardAnalyticsView cards={cards} orders={orders}/>
        </div>
      )}

      {/* ── Split Panel ── */}
      {!showAnalytics && (
        <div style={{ display:'flex', flexDirection:'row', background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:14, overflow:'hidden', minHeight:480 }} className="pm-split-panel">

          {/* Left sidebar — card list */}
          <div className="pm-sidebar">
            {/* Sidebar header */}
            <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--parch-line)', background:'var(--parch-warm)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-faded)', fontFamily:'var(--font-serif)' }}>
                Cards ({filteredCards.length})
              </span>
              <button onClick={()=>{ setEditingCard(null); setCustomCardOpen(true); }}
                style={{ width:22, height:22, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--ink)', border:'none', cursor:'pointer', color:'var(--ne-cream)' }}>
                <Plus style={{ width:11, height:11 }}/>
              </button>
            </div>

            {/* Card list */}
            <div style={{ flex:1, overflowY:'auto' }}>
              {isLoading ? (
                [...Array(4)].map((_,i) => (
                  <div key={i} style={{ padding:'10px 14px', borderBottom:'1px solid var(--parch-line)', display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:10, height:10, borderRadius:3, background:'var(--parch-deep)' }}/>
                    <div style={{ flex:1, height:10, borderRadius:4, background:'var(--parch-deep)' }}/>
                  </div>
                ))
              ) : filteredCards.length === 0 ? (
                <div style={{ padding:'24px 14px', textAlign:'center' }}>
                  <p style={{ fontSize:11, color:'var(--ink-ghost)', fontFamily:'var(--font-serif)' }}>No cards found</p>
                </div>
              ) : filteredCards.map(card => {
                const color = getCardColor(card);
                const rate  = card.reward_type==='points' ? `${card.points_rate||0}x pts` : `${card.cashback_rate||0}%`;
                const isActive = card.active !== false;
                return (
                  <div key={card.id} className={`pm-card-item ${selectedId===card.id?'active':''}`}
                    onClick={() => setSelectedId(card.id)}
                    style={{ borderLeft: selectedId===card.id ? `3px solid ${color}` : '3px solid transparent' }}>
                    <CardLogo cardName={card.issuer || card.card_name} size={26} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="pm-card-name">{card.card_name}</div>
                      <div className="pm-card-rate">{card.issuer || '—'} · {rate}</div>
                    </div>
                    {!isActive && <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--parch-deep)', flexShrink:0 }}/>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right detail panel */}
          <div className="pm-detail">
            {!selectedCard ? (
              <div className="pm-empty">
                <div style={{ width:48, height:48, borderRadius:12, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <CreditCard style={{ width:22, height:22, color:'var(--ink-faded)' }}/>
                </div>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--ink)', fontFamily:'var(--font-serif)', margin:0 }}>Select a card</p>
                <p style={{ fontSize:12, color:'var(--ink-dim)', fontFamily:'var(--font-serif)', margin:0 }}>Choose a card from the left to view its details</p>
                <button onClick={()=>setQuickAddOpen(true)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 18px', borderRadius:8, fontSize:12, fontWeight:700, background:'var(--ink)', border:'none', color:'var(--ne-cream)', cursor:'pointer', marginTop:8 }}>
                  <Plus style={{ width:13, height:13 }}/> Add your first card
                </button>
              </div>
            ) : (
              <CardDetailPanel
                card={selectedCard}
                orders={orders}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onUpdate={handleInlineUpdate}
                isDuplicate={duplicateNames.has((selectedCard.card_name||'').toLowerCase().trim())}
              />
            )}
          </div>
        </div>
      )}

      <QuickAddModal open={quickAddOpen} onClose={()=>setQuickAddOpen(false)} existingCards={cards} onCreate={handleCreate}/>
      <CustomCardModal open={customCardOpen} onClose={()=>{ setCustomCardOpen(false); setEditingCard(null); }} editCard={editingCard} onSave={handleSaveCustom}/>
    </>
  );
}

/* ── Card Detail Panel ── */
function CardDetailPanel({ card, orders, onEdit, onDelete, onUpdate, isDuplicate }) {
  const [addingRate, setAddingRate] = useState(false);
  const [newStore, setNewStore]     = useState('');
  const [newRate, setNewRate]       = useState('');
  const [addingPerk, setAddingPerk] = useState(false);
  const [newPerk, setNewPerk]       = useState('');

  const color      = getCardColor(card);
  const isActive   = card.active !== false;
  const storeRates = card.store_rates || [];
  const perks      = card.benefits ? card.benefits.split(',').map(p=>p.trim()).filter(Boolean) : [];
  const baseRate   = card.reward_type==='points' ? `${card.points_rate||0}x pts` : `${card.cashback_rate||0}%`;

  const allOrders   = orders.filter(o => o.credit_card_id === card.id);
  const totalSpent  = allOrders.reduce((s,o) => s+(o.final_cost||o.total_cost||0), 0);
  const txnCount    = allOrders.length;
  const now         = new Date();
  const monthOrders = allOrders.filter(o => { const d = o.order_date ? parseISO(o.order_date) : null; return d && d >= startOfMonth(now) && d <= endOfMonth(now); });
  const monthSpent  = monthOrders.reduce((s,o) => s+(o.final_cost||o.total_cost||0), 0);
  const estCashback = totalSpent * ((card.cashback_rate||0)/100);

  const STORE_OPTIONS = ['Amazon','Walmart','Target','Best Buy','eBay','Costco','PayPal','Grocery','Gas','Dining','Travel','Pharmacy','Office Supply','Electronics','Streaming','Other'];

  const handleAddRate = () => {
    if (!newStore || !newRate) return;
    onUpdate(card.id, { store_rates:[...storeRates, { store:newStore, rate:parseFloat(newRate) }] });
    setNewStore(''); setNewRate(''); setAddingRate(false);
  };
  const handleDeleteRate = idx => onUpdate(card.id, { store_rates:storeRates.filter((_,i)=>i!==idx) });

  const handleAddPerk = () => {
    if (!newPerk.trim()) return;
    onUpdate(card.id, { benefits:[...perks, newPerk.trim()].join(', ') });
    setNewPerk(''); setAddingPerk(false);
  };
  const handleDeletePerk = idx => onUpdate(card.id, { benefits:perks.filter((_,i)=>i!==idx).join(', ') });

  return (
    <div>
      {isDuplicate && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', marginBottom:16, borderRadius:8, background:'var(--gold-bg)', border:'1px solid var(--gold-bdr)' }}>
          <AlertTriangle style={{ width:13, height:13, color:'var(--gold)' }}/>
          <span style={{ fontSize:11, color:'var(--gold2)', fontFamily:'var(--font-serif)' }}>Possible duplicate card name</span>
        </div>
      )}

      {/* ── Card visual ── */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:20, marginBottom:20, flexWrap:'wrap' }}>
        {/* Mini card */}
        <div style={{ width:220, height:130, borderRadius:14, background:`linear-gradient(135deg, ${color} 0%, ${color}99 100%)`, padding:'14px 16px', flexShrink:0, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }}/>
          <div style={{ position:'absolute', bottom:-30, left:-10, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }}/>
          <div style={{ position:'relative', display:'flex', alignItems:'center', gap:8 }}>
            <CardLogo cardName={card.issuer || card.card_name} size={28} />
            <div>
              <p style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.9)', margin:0, marginBottom:2 }}>{card.card_name}</p>
              <p style={{ fontSize:10, color:'rgba(255,255,255,0.5)', margin:0 }}>{card.issuer || '—'}</p>
            </div>
          </div>
          <div style={{ position:'absolute', bottom:14, left:16, right:16, display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:9, color:'rgba(255,255,255,0.4)', margin:0, textTransform:'uppercase', letterSpacing:'0.1em' }}>Base Rate</p>
              <p style={{ fontSize:20, fontWeight:800, color:'#fff', margin:0, fontFamily:'var(--font-mono)' }}>{baseRate}</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99,
                background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
              }}>{isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))', gap:8, marginBottom:12 }}>
            {[
              { label:'Total Spent',    value:fmt$(totalSpent),              color:color },
              { label:'This Month',     value:fmt$(monthSpent),              color:'var(--gold)' },
              { label:'Est. Cashback',  value:fmt$(estCashback),             color:'var(--terrain2)' },
              { label:'Orders',         value:txnCount.toString(),           color:'var(--ocean2)' },
            ].map(s => (
              <div key={s.label} style={{ padding:'10px 12px', borderRadius:10, background:'var(--parch-warm)', border:'1px solid var(--parch-line)' }}>
                <p style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-faded)', fontFamily:'var(--font-serif)', margin:'0 0 4px' }}>{s.label}</p>
                <p style={{ fontSize:17, fontWeight:700, color:s.color, fontFamily:'var(--font-mono)', margin:0 }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>onEdit(card)}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:8, fontSize:11, fontWeight:700, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', color:'var(--ink-dim)', cursor:'pointer' }}>
              <Pencil style={{ width:11, height:11 }}/> Edit Card
            </button>
            <button onClick={()=>onUpdate(card.id, { active:!isActive })}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer',
                background: isActive ? 'var(--crimson-bg)' : 'var(--terrain-bg)',
                border: `1px solid ${isActive ? 'var(--crimson-bdr)' : 'var(--terrain-bdr)'}`,
                color: isActive ? 'var(--crimson2)' : 'var(--terrain2)',
              }}>
              {isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={()=>onDelete(card)}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:8, fontSize:11, fontWeight:700, background:'var(--crimson-bg)', border:'1px solid var(--crimson-bdr)', color:'var(--crimson2)', cursor:'pointer' }}>
              <Trash2 style={{ width:11, height:11 }}/>
            </button>
          </div>
        </div>
      </div>

      {/* ── Store Rate Overrides ── */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:color }}/>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-faded)', fontFamily:'var(--font-serif)' }}>
              Store Rate Overrides ({storeRates.length})
            </span>
          </div>
          <button onClick={()=>setAddingRate(true)}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', color:'var(--ink-dim)', cursor:'pointer' }}>
            <Plus style={{ width:10, height:10 }}/> Add Rate
          </button>
        </div>

        <div style={{ borderRadius:10, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', overflow:'hidden' }}>
          {/* Base rate row */}
          <div className="pm-rate-row" style={{ padding:'8px 14px' }}>
            <span style={{ fontSize:12, color:'var(--ink-faded)', fontStyle:'italic', fontFamily:'var(--font-serif)' }}>All other stores</span>
            <span style={{ fontSize:12, fontWeight:700, padding:'2px 10px', borderRadius:99, background:color+'22', color:color, fontFamily:'var(--font-mono)' }}>
              {card.cashback_rate||0}%
            </span>
          </div>

          {storeRates.length === 0 && !addingRate ? (
            <div style={{ padding:'12px 14px', textAlign:'center' }}>
              <p style={{ fontSize:11, color:'var(--ink-ghost)', fontFamily:'var(--font-serif)' }}>No store overrides yet — click Add Rate to set category-specific rates</p>
            </div>
          ) : storeRates.map((r, idx) => (
            <div key={idx} className="pm-rate-row" style={{ padding:'8px 14px' }}>
              <span style={{ fontSize:12, fontWeight:500, color:'var(--ink)', fontFamily:'var(--font-serif)' }}>{r.store}</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, fontWeight:700, padding:'2px 10px', borderRadius:99, background:color+'22', color:color, fontFamily:'var(--font-mono)' }}>{r.rate}%</span>
                <button onClick={()=>handleDeleteRate(idx)}
                  style={{ width:20, height:20, borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--crimson-bg)', border:'1px solid var(--crimson-bdr)', cursor:'pointer', color:'var(--crimson)' }}>
                  <X style={{ width:9, height:9 }}/>
                </button>
              </div>
            </div>
          ))}

          {addingRate && (
            <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:8, borderTop:'1px solid var(--parch-line)' }}>
              <select value={newStore} onChange={e=>setNewStore(e.target.value)}
                style={{ flex:1, height:30, borderRadius:6, fontSize:11, background:'var(--parch-card)', border:'1px solid var(--parch-line)', color:'var(--ink)', paddingLeft:8 }}>
                <option value="">Store...</option>
                {STORE_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <input type="number" value={newRate} onChange={e=>setNewRate(e.target.value)} placeholder="%"
                style={{ width:52, height:30, borderRadius:6, fontSize:12, background:'var(--parch-card)', border:'1px solid var(--parch-line)', color:'var(--ink)', textAlign:'center', outline:'none', fontFamily:'var(--font-mono)' }}/>
              <button onClick={handleAddRate}
                style={{ width:28, height:28, borderRadius:7, background:'var(--terrain-bg)', border:'1px solid var(--terrain-bdr)', color:'var(--terrain2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Check style={{ width:12, height:12 }}/>
              </button>
              <button onClick={()=>setAddingRate(false)}
                style={{ width:28, height:28, borderRadius:7, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', color:'var(--ink-dim)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X style={{ width:12, height:12 }}/>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Card Benefits ── */}
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--gold)' }}/>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-faded)', fontFamily:'var(--font-serif)' }}>
              Card Benefits ({perks.length})
            </span>
          </div>
          <button onClick={()=>setAddingPerk(true)}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', color:'var(--ink-dim)', cursor:'pointer' }}>
            <Plus style={{ width:10, height:10 }}/> Add Benefit
          </button>
        </div>

        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom: addingPerk ? 10 : 0 }}>
          {perks.length === 0 && !addingPerk && (
            <p style={{ fontSize:11, color:'var(--ink-ghost)', fontFamily:'var(--font-serif)' }}>No benefits saved — add perks like lounge access, travel credits, sign-up bonus</p>
          )}
          {perks.map((perk, idx) => (
            <span key={idx} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:99, background:'var(--gold-bg)', border:'1px solid var(--gold-bdr)', color:'var(--gold2)', fontFamily:'var(--font-serif)' }}>
              {perk}
              <button onClick={()=>handleDeletePerk(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--gold)', lineHeight:1, padding:0 }}>
                <X style={{ width:9, height:9 }}/>
              </button>
            </span>
          ))}
        </div>

        {addingPerk && (
          <div style={{ display:'flex', gap:8 }}>
            <input value={newPerk} onChange={e=>setNewPerk(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleAddPerk()}
              placeholder="e.g. $300 travel credit"
              autoFocus
              style={{ flex:1, height:32, borderRadius:8, fontSize:12, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', color:'var(--ink)', outline:'none', paddingLeft:10, fontFamily:'var(--font-serif)' }}/>
            <button onClick={handleAddPerk}
              style={{ width:32, height:32, borderRadius:8, background:'var(--terrain-bg)', border:'1px solid var(--terrain-bdr)', color:'var(--terrain2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Check style={{ width:13, height:13 }}/>
            </button>
            <button onClick={()=>setAddingPerk(false)}
              style={{ width:32, height:32, borderRadius:8, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', color:'var(--ink-dim)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X style={{ width:13, height:13 }}/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   GIFT CARDS — SPLIT PANEL
═══════════════════════════════════════════════════════════ */
function GiftCardsTab({ queryClient }) {
  const [selectedId, setSelectedId]           = useState(null);
  const [search, setSearch]                   = useState('');
  const [statusFilter, setStatusFilter]       = useState('all');
  const [dialogOpen, setDialogOpen]           = useState(false);
  const [editingCard, setEditingCard]         = useState(null);
  const [showCode, setShowCode]               = useState({});
  const [bulkDialogOpen, setBulkDialogOpen]   = useState(false);
  const [bulkInput, setBulkInput]             = useState('');
  const [barcodeOpen, setBarcodeOpen]         = useState(false);
  const [page, setPage]                       = useState(0);
  const PAGE_SIZE = 8;

  const emptyForm = { brand:'', retailer:'', category:'other', value:'', code:'', pin:'', purchase_cost:'', purchase_date:format(new Date(),'yyyy-MM-dd'), credit_card_id:'', status:'available', used_order_number:'', notes:'' };
  const [formData, setFormData] = useState(emptyForm);

  const [userEmail, setUserEmail] = useState(null);
  useEffect(() => { base44.auth.me().then(u => setUserEmail(u?.email)).catch(() => {}); }, []);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['giftCards', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      const data = await base44.entities.GiftCard.filter({ created_by: userEmail }, '-created_date');
      return data.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''));
    },
    enabled: userEmail !== null,
  });

  const { data: creditCards = [] } = useQuery({
    queryKey: ['creditCards', userEmail],
    queryFn: () => userEmail ? base44.entities.CreditCard.filter({ created_by: userEmail }) : [],
    enabled: userEmail !== null,
  });

  const createMutation = useMutation({
    mutationFn: async d => {
      const newCard = await base44.entities.GiftCard.create(d);
      if (d.credit_card_id && d.purchase_cost) await createRewardForGiftCard(newCard, d.credit_card_id, d.purchase_cost, creditCards);
      return newCard;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['giftCards'] }); queryClient.invalidateQueries({ queryKey: ['rewards'] }); toast.success('Gift card added'); setDialogOpen(false); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GiftCard.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['giftCards'] }); toast.success('Updated'); setDialogOpen(false); }
  });
  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.GiftCard.delete(id),
    onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ['giftCards'] }); if (selectedId === id) setSelectedId(null); toast.success('Deleted'); }
  });

  const createRewardForGiftCard = async (giftCard, creditCardId, purchaseAmount, allCards) => {
    const card = allCards.find(c => c.id === creditCardId); if (!card) return;
    let rewardAmount = 0, rewardType = 'cashback', currency = 'USD';
    if (card.reward_type === 'cashback' && card.cashback_rate) { rewardAmount = (purchaseAmount * card.cashback_rate / 100).toFixed(2); }
    else if (card.reward_type === 'points' && card.points_rate) { rewardAmount = Math.round(purchaseAmount * card.points_rate); rewardType = 'points'; currency = 'points'; }
    if (rewardAmount > 0) {
      await base44.entities.Reward.create({ credit_card_id: creditCardId, card_name: card.card_name, source: `${card.card_name} (Gift Card)`, type: rewardType, purchase_amount: purchaseAmount, amount: parseFloat(rewardAmount), currency, date_earned: format(new Date(), 'yyyy-MM-dd'), status: 'earned', notes: `Gift card purchase: ${giftCard.brand} $${giftCard.value}` });
      toast.success(`Reward tracked: ${currency === 'USD' ? `$${rewardAmount}` : `${rewardAmount} pts`}`);
    }
  };

  const openDialog = (card = null) => {
    if (card) { setEditingCard(card); setFormData({ brand: card.brand || '', retailer: card.retailer || '', category: card.category || 'other', value: card.value || '', code: card.code || '', pin: card.pin || '', purchase_cost: card.purchase_cost || '', purchase_date: card.purchase_date || '', credit_card_id: card.credit_card_id || '', status: card.status || 'available', used_order_number: card.used_order_number || '', notes: card.notes || '' }); }
    else { setEditingCard(null); setFormData(emptyForm); }
    setDialogOpen(true);
  };

  const handleSubmit = e => {
    e.preventDefault();
    const ccCard = creditCards.find(c => c.id === formData.credit_card_id);
    const data = { ...formData, value: parseFloat(formData.value), purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : null, card_name: ccCard?.card_name || null };
    if (editingCard) updateMutation.mutate({ id: editingCard.id, data }); else createMutation.mutate(data);
  };

  const handleBulkAdd = async () => {
    const lines = bulkInput.trim().split('\n').filter(l => l.trim());
    const newCards = lines.map(line => { const parts = line.split(',').map(p => p.trim()); if (parts.length < 3) throw new Error('Invalid format'); return { brand: parts[0], retailer: parts[1], value: parseFloat(parts[2]), code: parts[3] || '', pin: parts[4] || '', purchase_cost: parts[5] ? parseFloat(parts[5]) : null, status: 'available' }; });
    await base44.entities.GiftCard.bulkCreate(newCards);
    queryClient.invalidateQueries({ queryKey: ['giftCards'] });
    toast.success(`Added ${newCards.length} gift cards`);
    setBulkDialogOpen(false); setBulkInput('');
  };

  const filteredCards = useMemo(() => {
    setPage(0);
    return cards.filter(c => {
      const matchSearch = !search || c.brand?.toLowerCase().includes(search.toLowerCase()) || c.retailer?.toLowerCase().includes(search.toLowerCase()) || c.code?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [cards, search, statusFilter]);

  const totalValue  = cards.filter(c => c.status === 'available').reduce((s, c) => s + (c.value || 0), 0);
  const totalProfit = cards.filter(c => c.purchase_cost).reduce((s, c) => s + (c.value - c.purchase_cost), 0);
  const availableCount = cards.filter(c => c.status === 'available').length;

  const maskCode = code => !code ? '—' : code.slice(0, 4) + '••••' + code.slice(-4);

  // Auto-select first
  useEffect(() => { if (!selectedId && filteredCards.length > 0) setSelectedId(filteredCards[0].id); }, [filteredCards]);
  const selectedCard = cards.find(c => c.id === selectedId) || null;

  const STATUS_COLORS = {
    available: { bg:'var(--terrain-bg)', color:'var(--terrain2)', border:'var(--terrain-bdr)' },
    reserved:  { bg:'var(--gold-bg)',    color:'var(--gold2)',    border:'var(--gold-bdr)'    },
    exported:  { bg:'var(--ocean-bg)',   color:'var(--ocean2)',   border:'var(--ocean-bdr)'   },
    used:      { bg:'var(--parch-warm)', color:'var(--ink-dim)',  border:'var(--parch-line)'  },
    invalid:   { bg:'var(--crimson-bg)', color:'var(--crimson2)', border:'var(--crimson-bdr)' },
  };

  return (
    <>
      {/* KPI row */}
      <div className="grid-kpi" style={{ marginBottom: 16 }}>
        {[
          { label:'Total Cards',     value: cards.length,        accent:'var(--gold)',    valColor:'var(--ink)',       sub:'in inventory'   },
          { label:'Available',       value: availableCount,      accent:'var(--terrain2)',valColor:'var(--terrain2)',  sub:'ready to use'   },
          { label:'Available Value', value:`$${totalValue.toLocaleString()}`, accent:'var(--ocean2)', valColor:'var(--ocean2)', sub:'total balance' },
          { label:'Total Profit',    value:`$${totalProfit.toFixed(2)}`,      accent:'var(--terrain2)',valColor:'var(--terrain2)', sub:'value minus cost' },
        ].map(s => (
          <div key={s.label} className="kpi-card fade-up" style={{ borderTopColor: s.accent }}>
            <div className="kpi-label">{s.label}</div>
            <div className="kpi-value" style={{ color: s.valColor }}>{s.value}</div>
            <div className="kpi-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:160 }}>
          <Search style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:13, height:13, color:'var(--ink-faded)' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search gift cards..."
            style={{ width:'100%', height:34, paddingLeft:30, paddingRight:10, borderRadius:8, fontSize:12, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', color:'var(--ink)', outline:'none' }}/>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ height:34, padding:'0 10px', borderRadius:8, fontSize:12, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', color:'var(--ink)' }}>
          {['all','available','reserved','exported','used','invalid'].map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <button onClick={() => setBulkDialogOpen(true)}
          style={{ padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', color:'var(--ink-dim)', cursor:'pointer' }}>
          Bulk Add
        </button>
        <button onClick={() => openDialog()}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:700, background:'var(--ink)', border:'none', color:'var(--ne-cream)', cursor:'pointer' }}>
          <Plus style={{ width:13, height:13 }}/> Add Card
        </button>
      </div>

      {/* Split panel */}
      <div style={{ display:'flex', flexDirection:'row', background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:14, overflow:'hidden', minHeight:480 }} className="pm-split-panel">

        {/* Left sidebar */}
        <div className="pm-sidebar">
          <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--parch-line)', background:'var(--parch-warm)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-faded)', fontFamily:'var(--font-serif)' }}>
              Cards ({filteredCards.length})
            </span>
            <button onClick={() => openDialog()}
              style={{ width:22, height:22, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--ink)', border:'none', cursor:'pointer', color:'var(--ne-cream)' }}>
              <Plus style={{ width:11, height:11 }}/>
            </button>
          </div>
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ flex:1, overflowY:'auto' }}>
              {isLoading ? [...Array(4)].map((_,i) => (
                <div key={i} style={{ padding:'10px 14px', borderBottom:'1px solid var(--parch-line)', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:26, height:26, borderRadius:6, background:'var(--parch-deep)' }}/>
                  <div style={{ flex:1, height:10, borderRadius:4, background:'var(--parch-deep)' }}/>
                </div>
              )) : filteredCards.length === 0 ? (
                <div style={{ padding:'24px 14px', textAlign:'center' }}>
                  <p style={{ fontSize:11, color:'var(--ink-ghost)', fontFamily:'var(--font-serif)' }}>No cards found</p>
                </div>
              ) : filteredCards.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(card => {
                const sc = STATUS_COLORS[card.status] || STATUS_COLORS.available;
                const profit = card.purchase_cost ? card.value - card.purchase_cost : null;
                return (
                  <div key={card.id}
                    className={`pm-card-item ${selectedId === card.id ? 'active' : ''}`}
                    onClick={() => setSelectedId(card.id)}
                    style={{ borderLeft: selectedId === card.id ? `3px solid var(--gold)` : '3px solid transparent' }}>
                    <RetailerLogo retailer={card.brand} size={26} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="pm-card-name">{card.brand}</div>
                      <div className="pm-card-rate">
                        ${(card.value || 0).toFixed(0)} · {profit != null ? `+$${profit.toFixed(0)} profit` : card.retailer || '—'}
                      </div>
                    </div>
                    <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:99, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`, flexShrink:0, fontFamily:'var(--font-serif)' }}>
                      {card.status}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Pagination */}
            {filteredCards.length > PAGE_SIZE && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderTop:'1px solid var(--parch-line)', background:'var(--parch-warm)', flexShrink:0 }}>
                <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0}
                  style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:6, border:'1px solid var(--parch-line)', background:'none', color: page===0 ? 'var(--ink-ghost)' : 'var(--ink-dim)', cursor: page===0 ? 'not-allowed' : 'pointer' }}>
                  ← Prev
                </button>
                <span style={{ fontSize:10, color:'var(--ink-ghost)', fontFamily:'var(--font-mono)' }}>
                  {page+1} / {Math.ceil(filteredCards.length / PAGE_SIZE)}
                </span>
                <button onClick={() => setPage(p => Math.min(Math.ceil(filteredCards.length/PAGE_SIZE)-1, p+1))} disabled={(page+1)*PAGE_SIZE >= filteredCards.length}
                  style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:6, border:'1px solid var(--parch-line)', background:'none', color: (page+1)*PAGE_SIZE>=filteredCards.length ? 'var(--ink-ghost)' : 'var(--ink-dim)', cursor: (page+1)*PAGE_SIZE>=filteredCards.length ? 'not-allowed' : 'pointer' }}>
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right detail */}
        <div className="pm-detail">
          {!selectedCard ? (
            <div className="pm-empty">
              <div style={{ width:48, height:48, borderRadius:12, background:'var(--gold-bg)', border:'1px solid var(--gold-bdr)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Gift style={{ width:22, height:22, color:'var(--gold)' }}/>
              </div>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--ink)', fontFamily:'var(--font-serif)', margin:0 }}>Select a gift card</p>
              <p style={{ fontSize:12, color:'var(--ink-dim)', fontFamily:'var(--font-serif)', margin:0 }}>Choose a card from the list to view its details</p>
              <button onClick={() => openDialog()}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 18px', borderRadius:8, fontSize:12, fontWeight:700, background:'var(--ink)', border:'none', color:'var(--ne-cream)', cursor:'pointer', marginTop:8 }}>
                <Plus style={{ width:13, height:13 }}/> Add your first card
              </button>
            </div>
          ) : (
            <GiftCardDetailPanel
              card={selectedCard}
              creditCards={creditCards}
              showCode={showCode[selectedCard.id]}
              onToggleCode={() => setShowCode(p => ({ ...p, [selectedCard.id]: !p[selectedCard.id] }))}
              onEdit={() => openDialog(selectedCard)}
              onDelete={() => { if (confirm(`Delete ${selectedCard.brand} $${selectedCard.value}?`)) deleteMutation.mutate(selectedCard.id); }}
              onBarcode={() => setBarcodeOpen(true)}
              onMarkUsed={async () => {
                const orderNumber = prompt('Enter order number where this card was used:');
                if (orderNumber) { await base44.entities.GiftCard.delete(selectedCard.id); queryClient.invalidateQueries({ queryKey: ['giftCards'] }); toast.success('Gift card marked as used'); }
              }}
              STATUS_COLORS={STATUS_COLORS}
              maskCode={maskCode}
            />
          )}
        </div>
      </div>

      {/* Barcode dialog */}
      <Dialog open={barcodeOpen} onOpenChange={setBarcodeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Gift Card Barcode</DialogTitle></DialogHeader>
          {selectedCard && (
            <div style={{ textAlign:'center', display:'flex', flexDirection:'column', gap:16 }}>
              <p style={{ fontSize:16, fontWeight:700, color:'var(--ink)', fontFamily:'var(--font-serif)' }}>{selectedCard.brand} — ${selectedCard.value}</p>
              <div style={{ background:'white', padding:24, borderRadius:12, border:'1px solid var(--parch-line)', display:'flex', justifyContent:'center' }}>
                <ReactBarcode value={selectedCard.code} format="CODE128" displayValue height={100} width={2.5} fontSize={14} margin={8}/>
              </div>
              <div style={{ padding:'12px 16px', borderRadius:10, background:'var(--parch-warm)', border:'1px solid var(--parch-line)' }}>
                <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-faded)', fontFamily:'var(--font-serif)', margin:'0 0 4px' }}>Card Code</p>
                <p style={{ fontSize:18, fontWeight:700, color:'var(--ink)', fontFamily:'var(--font-mono)', margin:0 }}>{selectedCard.code}</p>
              </div>
              {selectedCard.pin && (
                <div style={{ padding:'12px 16px', borderRadius:10, background:'var(--parch-warm)', border:'1px solid var(--parch-line)' }}>
                  <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-faded)', fontFamily:'var(--font-serif)', margin:'0 0 4px' }}>PIN</p>
                  <p style={{ fontSize:18, fontWeight:700, color:'var(--ink)', fontFamily:'var(--font-mono)', margin:0 }}>{selectedCard.pin}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>Print</Button>
            <Button onClick={() => setBarcodeOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCard ? 'Edit Gift Card' : 'Add Gift Card'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Brand *</Label>
                <Select value={formData.brand} onValueChange={v => setFormData(p => ({ ...p, brand: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select brand"/></SelectTrigger>
                  <SelectContent>{GC_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Retailer</Label><Input value={formData.retailer} onChange={e => setFormData(p => ({ ...p, retailer: e.target.value }))} placeholder="Where purchased"/></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Value ($) *</Label><Input type="number" step="0.01" value={formData.value} onChange={e => setFormData(p => ({ ...p, value: e.target.value }))} required/></div>
              <div className="space-y-2"><Label>Purchase Cost ($)</Label><Input type="number" step="0.01" value={formData.purchase_cost} onChange={e => setFormData(p => ({ ...p, purchase_cost: e.target.value }))}/></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Purchase Date</Label><Input type="date" value={formData.purchase_date} onChange={e => setFormData(p => ({ ...p, purchase_date: e.target.value }))}/></div>
              <div className="space-y-2">
                <Label>Credit Card Used</Label>
                <Select value={formData.credit_card_id || ''} onValueChange={v => setFormData(p => ({ ...p, credit_card_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select card"/></SelectTrigger>
                  <SelectContent>{creditCards.filter(c => c.active !== false).map(c => <SelectItem key={c.id} value={c.id}>{c.card_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Card Code *</Label><Input value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value }))} required/></div>
              <div className="space-y-2"><Label>PIN</Label><Input value={formData.pin} onChange={e => setFormData(p => ({ ...p, pin: e.target.value }))} placeholder="Optional"/></div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{['available','reserved','exported','used','invalid'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {formData.status === 'used' && <div className="space-y-2"><Label>Order Number Used</Label><Input value={formData.used_order_number} onChange={e => setFormData(p => ({ ...p, used_order_number: e.target.value }))}/></div>}
            <div className="space-y-2"><Label>Notes</Label><Input value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}/></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" style={{ background:'var(--terrain)', color:'#fff' }}>{editingCard ? 'Update' : 'Add'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Add dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Bulk Add Gift Cards</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div style={{ padding:'12px 16px', borderRadius:10, background:'var(--parch-warm)', border:'1px solid var(--parch-line)' }}>
              <p style={{ fontSize:12, fontWeight:600, color:'var(--ink-dim)', margin:'0 0 4px' }}>Format (one per line):</p>
              <code style={{ fontSize:11, color:'var(--ink-ghost)', fontFamily:'var(--font-mono)' }}>Brand, Retailer, Value, Code, PIN, PurchaseCost</code>
            </div>
            <Textarea value={bulkInput} onChange={e => setBulkInput(e.target.value)} rows={8} placeholder="Amazon, Target, 100, AMZN1234, 5678, 92" className="font-mono text-xs"/>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkAdd} style={{ background:'var(--terrain)', color:'#fff' }}>Add Cards</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Gift Card Detail Panel ── */
function GiftCardDetailPanel({ card, creditCards, showCode, onToggleCode, onEdit, onDelete, onBarcode, onMarkUsed, STATUS_COLORS, maskCode }) {
  const sc     = STATUS_COLORS[card.status] || STATUS_COLORS.available;
  const profit = card.purchase_cost ? (card.value - card.purchase_cost) : null;
  const creditCard = creditCards.find(c => c.id === card.credit_card_id);

  const BRAND_COLORS = {
    'Amazon':'#FF9900', 'Apple':'#555555', 'Google Play':'#4285F4', 'Target':'#CC0000',
    'Walmart':'#0071CE', 'Best Buy':'#003B8E', 'eBay':'#E53238', 'Visa':'#1A1F71',
    'Mastercard':'#EB001B', 'Other':'#4f46e5',
  };
  const brandColor = BRAND_COLORS[card.brand] || 'var(--gold)';

  return (
    <div>
      {/* Card visual */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:20, marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ width:220, height:130, borderRadius:14, background:`linear-gradient(135deg, ${brandColor} 0%, ${brandColor}99 100%)`, padding:'14px 16px', flexShrink:0, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.08)' }}/>
          <div style={{ position:'absolute', bottom:-30, left:-10, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }}/>
          <p style={{ fontSize:14, fontWeight:800, color:'#fff', margin:0, position:'relative' }}>{card.brand}</p>
          <p style={{ fontSize:10, color:'rgba(255,255,255,0.5)', margin:0, marginTop:2, position:'relative' }}>{card.retailer || 'Gift Card'}</p>
          <div style={{ position:'absolute', bottom:14, left:16, right:16, display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:9, color:'rgba(255,255,255,0.4)', margin:0, textTransform:'uppercase', letterSpacing:'0.1em' }}>Balance</p>
              <p style={{ fontSize:22, fontWeight:800, color:'#fff', margin:0, fontFamily:'var(--font-mono)' }}>${(card.value || 0).toFixed(0)}</p>
            </div>
            <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'rgba(255,255,255,0.2)', color:'#fff' }}>
              {card.status}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ flex:1, minWidth:180 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))', gap:8, marginBottom:12 }}>
            {[
              { label:'Card Value',    value:`$${(card.value||0).toFixed(2)}`,           color:'var(--ink)' },
              { label:'Purchase Cost', value:card.purchase_cost ? `$${card.purchase_cost.toFixed(2)}` : '—', color:'var(--ink-dim)' },
              { label:'Profit',        value:profit != null ? `$${profit.toFixed(2)}` : '—', color: profit > 0 ? 'var(--terrain2)' : profit < 0 ? 'var(--crimson2)' : 'var(--ink-dim)' },
              { label:'Added',         value:card.created_date ? format(new Date(card.created_date),'MMM d, yy') : '—', color:'var(--ink-dim)' },
            ].map(s => (
              <div key={s.label} style={{ padding:'10px 12px', borderRadius:10, background:'var(--parch-warm)', border:'1px solid var(--parch-line)' }}>
                <p style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-faded)', fontFamily:'var(--font-serif)', margin:'0 0 4px' }}>{s.label}</p>
                <p style={{ fontSize:15, fontWeight:700, color:s.color, fontFamily:'var(--font-mono)', margin:0 }}>{s.value}</p>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={onBarcode} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:600, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', color:'var(--ink-dim)', cursor:'pointer' }}>
              <Barcode style={{ width:11, height:11 }}/> Barcode
            </button>
            {card.status === 'available' && (
              <button onClick={onMarkUsed} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:600, background:'var(--ocean-bg)', border:'1px solid var(--ocean-bdr)', color:'var(--ocean2)', cursor:'pointer' }}>
                Mark Used
              </button>
            )}
            <button onClick={onEdit} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:600, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', color:'var(--ink-dim)', cursor:'pointer' }}>
              <Pencil style={{ width:11, height:11 }}/> Edit
            </button>
            <button onClick={onDelete} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:8, fontSize:11, background:'var(--crimson-bg)', border:'1px solid var(--crimson-bdr)', color:'var(--crimson2)', cursor:'pointer' }}>
              <Trash2 style={{ width:11, height:11 }}/>
            </button>
          </div>
        </div>
      </div>

      {/* Code & PIN */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--gold)' }}/>
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-faded)', fontFamily:'var(--font-serif)' }}>Card Details</span>
        </div>
        <div style={{ borderRadius:10, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid var(--parch-line)' }}>
            <span style={{ fontSize:12, color:'var(--ink-dim)', fontFamily:'var(--font-serif)' }}>Card Code</span>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--ink)', fontFamily:'var(--font-mono)' }}>{showCode ? card.code : maskCode(card.code)}</span>
              <button onClick={onToggleCode} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-ghost)', padding:0 }}>
                {showCode ? <EyeOff style={{ width:13, height:13 }}/> : <Eye style={{ width:13, height:13 }}/>}
              </button>
            </div>
          </div>
          {card.pin && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid var(--parch-line)' }}>
              <span style={{ fontSize:12, color:'var(--ink-dim)', fontFamily:'var(--font-serif)' }}>PIN</span>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--ink)', fontFamily:'var(--font-mono)' }}>{card.pin}</span>
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom: card.purchase_date ? '1px solid var(--parch-line)' : 'none' }}>
            <span style={{ fontSize:12, color:'var(--ink-dim)', fontFamily:'var(--font-serif)' }}>Status</span>
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 10px', borderRadius:99, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`, fontFamily:'var(--font-serif)' }}>
              {card.status}
            </span>
          </div>
          {card.purchase_date && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom: creditCard ? '1px solid var(--parch-line)' : 'none' }}>
              <span style={{ fontSize:12, color:'var(--ink-dim)', fontFamily:'var(--font-serif)' }}>Purchase Date</span>
              <span style={{ fontSize:12, color:'var(--ink)', fontFamily:'var(--font-serif)' }}>{card.purchase_date}</span>
            </div>
          )}
          {creditCard && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px' }}>
              <span style={{ fontSize:12, color:'var(--ink-dim)', fontFamily:'var(--font-serif)' }}>Purchased With</span>
              <span style={{ fontSize:12, fontWeight:600, color:'var(--ocean2)', fontFamily:'var(--font-serif)' }}>{creditCard.card_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {card.notes && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--violet2)' }}/>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-faded)', fontFamily:'var(--font-serif)' }}>Notes</span>
          </div>
          <p style={{ fontSize:12, color:'var(--ink-dim)', fontFamily:'var(--font-serif)', padding:'10px 14px', borderRadius:10, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', margin:0 }}>{card.notes}</p>
        </div>
      )}
    </div>
  );
}
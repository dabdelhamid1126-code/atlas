import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Package, Tag, Globe, Plus, Trash2, Copy, DollarSign, X, ClipboardList, Minus, ImageOff } from 'lucide-react';
import ProductAutocomplete from '@/components/purchase-orders/ProductAutocomplete';
import GiftCardPicker from '@/components/shared/GiftCardPicker';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ── Store logo ─────────────────────────────────────────────────────────────
function StoreLogo({ retailer, size = 32 }) {
  const [err, setErr] = React.useState(false);
  const BRANDFETCH_CLIENT_ID = '1idzVIG0BYPKsFIDJDI';
  const getStoreDomain = (v) => {
    const n = String(v || '').toLowerCase().replace(/[\s\-\_\.\']/g,'').replace(/[^a-z0-9]/g,'');
    if (n.includes('bestbuy')) return 'bestbuy.com';
    if (n.includes('amazon'))  return 'amazon.com';
    if (n.includes('walmart')) return 'walmart.com';
    if (n.includes('apple'))   return 'apple.com';
    if (n.includes('target'))  return 'target.com';
    if (n.includes('costco'))  return 'costco.com';
    if (n.includes('samsclub') || n.includes('sams')) return 'samsclub.com';
    if (n.includes('ebay'))    return 'ebay.com';
    return n + '.com';
  };
  const domain  = getStoreDomain(retailer);
  const logoUrl = domain ? `https://cdn.brandfetch.io/domain/${domain}?c=${BRANDFETCH_CLIENT_ID}` : null;
  const initials = (retailer || 'X').slice(0, 2).toUpperCase();
  if (!logoUrl || err) return (
    <div style={{ width:size, height:size, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#10b981,#06b6d4)', color:'white', fontWeight:800, fontSize:size*0.35, flexShrink:0 }}>{initials}</div>
  );
  return <img src={logoUrl} alt={retailer} onError={()=>setErr(true)} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'1px solid var(--parch-line)' }} />;
}

// ── Card logo ──────────────────────────────────────────────────────────────
const BRANDFETCH_CLIENT_ID = '1idzVIG0BYPKsFIDJDI';
const getCardDomain = (cardName) => {
  const n = String(cardName||'').toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'');
  if (n.includes('chase')) return 'chase.com';
  if (n.includes('amex')||n.includes('american')) return 'americanexpress.com';
  if (n.includes('citi')) return 'citi.com';
  if (n.includes('capital')) return 'capitalone.com';
  if (n.includes('discover')) return 'discover.com';
  if (n.includes('bofa')||n.includes('bankofamerica')) return 'bankofamerica.com';
  if (n.includes('usbank')) return 'usbank.com';
  if (n.includes('wells')) return 'wellsfargo.com';
  if (n.includes('barclays')) return 'barclays.com';
  if (n.includes('amazon')) return 'amazon.com';
  if (n.includes('apple')) return 'apple.com';
  if (n.includes('paypal')) return 'paypal.com';
  if (n.includes('target')) return 'target.com';
  if (n.includes('walmart')) return 'walmart.com';
  return null;
};

function CardLogo({ cardName, size = 20 }) {
  const [err, setErr] = useState(false);
  const domain = getCardDomain(cardName);
  const logoUrl = domain ? `https://cdn.brandfetch.io/domain/${domain}?c=${BRANDFETCH_CLIENT_ID}` : null;
  const initials = (cardName||'X').split(' ')[0].charAt(0).toUpperCase();
  if (!logoUrl||err) return (
    <div style={{ width:size, height:size, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--ocean-bg)', color:'var(--ocean)', fontWeight:700, fontSize:size*0.4, flexShrink:0, border:'1px solid var(--ocean-bdr)' }}>{initials}</div>
  );
  return <img src={logoUrl} alt={cardName} onError={()=>setErr(true)} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'1px solid var(--parch-line)' }} />;
}

// ── Item thumbnail ─────────────────────────────────────────────────────────
function ItemThumb({ src, name }) {
  const [err, setErr] = useState(false);
  if (!src||err) return (
    <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, background:'var(--terrain-bg)', border:'1px solid var(--terrain-bdr)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--terrain)', fontSize:13, fontWeight:700 }}>
      {name?.charAt(0)?.toUpperCase() || <ImageOff style={{width:13,height:13}} />}
    </div>
  );
  return <img src={src} alt={name} onError={()=>setErr(true)} style={{ width:36, height:36, borderRadius:8, objectFit:'cover', flexShrink:0, border:'1px solid var(--parch-line)' }} />;
}

// ── Fuzzy product matcher ──────────────────────────────────────────────────
const findMatchedProduct = (itemName, itemProductId, products) => {
  if (itemProductId) { const byId = products.find(p=>p.id===itemProductId); if (byId) return byId; }
  const exactName = (itemName||'').toLowerCase();
  const byExact = products.find(p=>p.name?.toLowerCase()===exactName);
  if (byExact) return byExact;
  const stopWords = new Set(['the','a','an','and','or','with','for','of','in','to','by','gb','free','live','tv','wi','fi','black','white','silver','pink','blue','streaming','device','cable','satellite','experience','out','w']);
  const keywords = (str) => str.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2&&!stopWords.has(w));
  const itemWords = new Set(keywords(itemName||''));
  let bestScore=0, bestProduct=null;
  products.forEach(p => {
    if (!p.name) return;
    const productWords = new Set(keywords(p.name));
    const shared = [...itemWords].filter(w=>productWords.has(w)).length;
    const score = shared/Math.max(itemWords.size,productWords.size);
    if (score>bestScore) { bestScore=score; bestProduct=p; }
  });
  return bestScore>=0.4 ? bestProduct : null;
};

const STATUSES = ['pending','ordered','shipped','partially_received','received','cancelled'];
const PRODUCT_CATEGORIES = ['Electronics','Home & Garden','Toys & Games','Health & Beauty','Sports','Clothing','Tools','Gift Cards','Grocery','Other'];
const RETAILERS = ['Amazon','Bestbuy','Walmart','Target','Costco',"Sam's Club",'eBay','Woot','Apple','Other'];
const TABS = [
  { id:'details',  label:'Details',  Icon:ClipboardList },
  { id:'items',    label:'Items',    Icon:Package       },
  { id:'payment',  label:'Payment',  Icon:CreditCard    },
  { id:'sales',    label:'Sales',    Icon:DollarSign    },
];

// ── Style tokens ───────────────────────────────────────────────────────────
const inp    = { background:'var(--parch-warm)', color:'var(--ink)', borderColor:'var(--parch-line)', borderRadius:8 };
const inpRo  = { background:'var(--parch-card)', color:'var(--ink-ghost)', borderColor:'var(--parch-line)', borderRadius:8 };
const LBL    = ({children}) => <label style={{ fontSize:10, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink-dim)', display:'block', marginBottom:4, fontFamily:"'Playfair Display', serif" }}>{children}</label>;

const defaultSaleEvent = () => ({ id:crypto.randomUUID(), buyer:'', sale_date:'', payout_date:'', items:[] });
const defaultItem = () => ({ product_id:'', product_name:'', upc:'', quantity_ordered:1, quantity_received:0, unit_cost:0, sale_price:0, product_image_url:'' });

export default function POFormModal({ open, onOpenChange, order, onSubmit, products, creditCards, giftCards, sellers, isPending, onDelete }) {
  const getInitialForm = (o) => {
    const items = o?.items?.length>0 ? o.items.map(i=>({...defaultItem(),...i,sale_price:i.sale_price||0})) : [defaultItem()];
    let fulfillment_type = o?.fulfillment_type||'ship_to_me';
    if (o?.is_dropship) fulfillment_type='direct_dropship';
    else if (o?.is_pickup) fulfillment_type='store_pickup';
    return o ? {
      order_type:o.order_type||'churning', order_number:o.order_number||'',
      tracking_numbers:o.tracking_numbers?.length>0?o.tracking_numbers:(o.tracking_number?[o.tracking_number]:['']),
      retailer:o.retailer||'', buyer:o.buyer||'', marketplace_platform:o.marketplace_platform||'',
      account:o.account||'', status:o.status||'pending', category:o.category||'other',
      product_category:o.product_category||'', credit_card_id:o.credit_card_id||'',
      payment_splits:o.payment_splits?.length>0?o.payment_splits:[],
      gift_card_ids:o.gift_card_ids||[], fulfillment_type,
      dropship_to:o.dropship_to||'', pickup_location:o.pickup_location||'',
      order_date:o.order_date||'', notes:o.notes||'', items,
      sale_events:o.sale_events||[], tax:o.tax??0, shipping_cost:o.shipping_cost??0, fees:o.fees??0,
      include_tax_in_cashback:o.include_tax_in_cashback!==false,
      include_shipping_in_cashback:o.include_shipping_in_cashback!==false,
      extra_cashback_percent:o.extra_cashback_percent||0, bonus_notes:o.bonus_notes||'',
      amazon_yacb:o.bonus_notes?.toLowerCase().includes('prime young adult')||false,
      cashback_rate_override:'',
    } : {
      order_type:'churning', order_number:'', tracking_numbers:[''],
      retailer:'', buyer:'', marketplace_platform:'', account:'',
      status:'pending', category:'other', product_category:'',
      credit_card_id:'', payment_splits:[], gift_card_ids:[],
      fulfillment_type:'ship_to_me', dropship_to:'', pickup_location:'',
      order_date:format(new Date(),'yyyy-MM-dd'), notes:'',
      items:[defaultItem()], sale_events:[],
      tax:0, shipping_cost:0, fees:0,
      include_tax_in_cashback:true, include_shipping_in_cashback:true,
      extra_cashback_percent:0, bonus_notes:'',
      amazon_yacb:false, cashback_rate_override:'',
    };
  };

  const [formData, setFormData] = useState(()=>getInitialForm(order));
  const [activeTab, setActiveTab] = useState('details');
  const [visible, setVisible] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) { setFormData(getInitialForm(order)); setActiveTab('details'); requestAnimationFrame(()=>setVisible(true)); }
    else setVisible(false);
  }, [open, order]);

  useEffect(() => {
    const handler = (e) => { if (e.key==='Escape'&&open) onOpenChange(false); };
    window.addEventListener('keydown', handler);
    return ()=>window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  const set = (field, value) => setFormData(prev=>({...prev,[field]:value}));
  const selectedCard = creditCards.find(c=>c.id===formData.credit_card_id);

  const addSplit    = () => setFormData(prev=>({...prev, payment_splits:[...(prev.payment_splits||[]),{card_id:'',card_name:'',cashback_rate:0,amount:''}]}));
  const removeSplit = (idx) => setFormData(prev=>({...prev, payment_splits:prev.payment_splits.filter((_,i)=>i!==idx)}));
  const updateSplit = (idx,field,value) => setFormData(prev=>{
    const splits = prev.payment_splits.map((sp,i)=>{
      if (i!==idx) return sp;
      if (field==='card_id') { const card=creditCards.find(c=>c.id===value); return {...sp,card_id:value,card_name:card?.card_name||'',cashback_rate:card?.cashback_rate||0}; }
      return {...sp,[field]:value};
    });
    return {...prev,payment_splits:splits};
  });

  const updateItem    = (idx,field,value) => setFormData(prev=>({...prev,items:prev.items.map((it,i)=>i===idx?{...it,[field]:value}:it)}));
  const addItem       = () => setFormData(prev=>({...prev,items:[...prev.items,defaultItem()]}));
  const removeItem    = (idx) => setFormData(prev=>({...prev,items:prev.items.length>1?prev.items.filter((_,i)=>i!==idx):prev.items}));
  const duplicateItem = (idx) => setFormData(prev=>({...prev,items:[...prev.items.slice(0,idx+1),{...prev.items[idx]},...prev.items.slice(idx+1)]}));

  const updateTracking = (idx,val) => setFormData(prev=>{const t=[...prev.tracking_numbers];t[idx]=val;return{...prev,tracking_numbers:t};});
  const addTracking    = () => setFormData(prev=>({...prev,tracking_numbers:[...prev.tracking_numbers,'']}));
  const removeTracking = (idx) => setFormData(prev=>({...prev,tracking_numbers:prev.tracking_numbers.length>1?prev.tracking_numbers.filter((_,i)=>i!==idx):['']}));

  const addSaleEvent = () => {
    const ev = defaultSaleEvent();
    ev.items = formData.items.filter(it=>it.product_name?.trim()).map(it=>({product_name:it.product_name,quantity:1,sale_price:it.sale_price||0}));
    setFormData(prev=>({...prev,sale_events:[...prev.sale_events,ev]}));
  };
  const removeSaleEvent    = (id) => setFormData(prev=>({...prev,sale_events:prev.sale_events.filter(e=>e.id!==id)}));
  const updateSaleEvent    = (id,field,value) => setFormData(prev=>({...prev,sale_events:prev.sale_events.map(e=>e.id!==id?e:{...e,[field]:value})}));
  const updateSaleEventItem = (eventId,itemIdx,field,value) => setFormData(prev=>({...prev,sale_events:prev.sale_events.map(e=>{if(e.id!==eventId)return e;return{...e,items:e.items.map((it,i)=>i===itemIdx?{...it,[field]:value}:it)};})}));

  const tax           = parseFloat(formData.tax)||0;
  const shippingCost  = parseFloat(formData.shipping_cost)||0;
  const fees          = parseFloat(formData.fees)||0;
  const itemsSubtotal = formData.items.reduce((s,it)=>s+(parseFloat(it.unit_cost)||0)*(parseInt(it.quantity_ordered)||1),0);
  const totalPrice    = itemsSubtotal+tax+shippingCost+fees;
  const giftCardTotal = formData.gift_card_ids.reduce((sum,id)=>{const gc=giftCards.find(g=>g.id===id);return sum+(gc?.value||0);},0);
  const cashbackBase  = (()=>{let b=totalPrice;if(!formData.include_tax_in_cashback)b-=tax;if(!formData.include_shipping_in_cashback)b-=shippingCost;return b;})();
  const cardRate      = parseFloat(formData.cashback_rate_override)||(selectedCard?.cashback_rate||0);
  const cashbackAmount= (cashbackBase*cardRate/100)+(formData.amazon_yacb?cashbackBase*0.05:0);
  const totalItemsOrdered = formData.items.reduce((s,it)=>s+(parseInt(it.quantity_ordered)||1),0);
  const totalSaleRevenue  = formData.sale_events.reduce((s,ev)=>s+ev.items.reduce((ss,it)=>ss+(parseFloat(it.sale_price)||0)*(parseInt(it.qty||it.quantity)||0),0),0);
  const isAmazon = formData.retailer==='Amazon';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.retailer?.trim()) { toast.error('Retailer is required'); return; }
    const items = formData.items.map(it=>({...it,quantity_ordered:parseInt(it.quantity_ordered)||1,quantity_received:parseInt(it.quantity_received)||0,unit_cost:parseFloat(it.unit_cost)||0,sale_price:parseFloat(it.sale_price)||0}));
    const hasSplits = (formData.payment_splits||[]).length>1;
    const splitsTotal = (formData.payment_splits||[]).reduce((s,sp)=>s+(parseFloat(sp.amount)||0),0);
    if (hasSplits&&Math.abs(splitsTotal-totalPrice)>0.01) { toast.error(`Split amounts ($${splitsTotal.toFixed(2)}) must equal order total ($${totalPrice.toFixed(2)})`); return; }
    const normalizedSaleEvents = formData.sale_events.map(ev=>({...ev,items:ev.items.map(it=>({product_name:it.product_name||'',quantity:parseInt(it.quantity??1)||1,sale_price:parseFloat(it.sale_price)||0}))}));
    const dataToSubmit = {
      ...formData, items, tracking_numbers:formData.tracking_numbers.filter(Boolean),
      sale_events:normalizedSaleEvents, tax, shipping_cost:shippingCost, fees, total_cost:totalPrice,
      gift_card_value:giftCardTotal, final_cost:totalPrice-giftCardTotal,
      credit_card_id:hasSplits?(formData.payment_splits[0]?.card_id||null):(formData.credit_card_id||null),
      payment_splits:hasSplits?formData.payment_splits.map(sp=>({card_id:sp.card_id,card_name:sp.card_name,cashback_rate:sp.cashback_rate||0,amount:parseFloat(sp.amount)||0})):[],
      extra_cashback_percent:formData.amazon_yacb?5:(parseFloat(formData.extra_cashback_percent)||0),
      bonus_notes:formData.amazon_yacb?'Prime Young Adult':formData.bonus_notes,
      is_dropship:formData.fulfillment_type==='direct_dropship', is_pickup:formData.fulfillment_type==='store_pickup',
    };
    delete dataToSubmit.amazon_yacb; delete dataToSubmit.cashback_rate_override;
    onSubmit(dataToSubmit);
    queryClient.invalidateQueries({queryKey:['purchaseOrders']});
  };

  if (!open&&!visible) return null;

  const subtitle = [formData.order_number&&`#${formData.order_number}`,formData.retailer,formData.order_date].filter(Boolean).join(' · ');

  // Section card style helpers
  const sectionCard = (accentColor, accentBg) => ({ borderRadius:12, padding:16, background:accentBg, border:`1px solid ${accentColor}` });
  const sectionTitle = (color) => ({ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color, marginBottom:12, paddingBottom:8, borderBottom:'1px solid var(--parch-line)' });

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', justifyContent:'flex-end' }}>
      <div onClick={()=>onOpenChange(false)} style={{ position:'absolute', inset:0, background:'rgba(26,22,18,0.5)', transition:'opacity 250ms ease-out', opacity:visible?1:0 }} />
      <div style={{ position:'relative', width:'100%', maxWidth:660, height:'100%', background:'var(--parch-card)', borderLeft:'1px solid var(--parch-line)', boxShadow:'-24px 0 60px rgba(0,0,0,0.15)', display:'flex', flexDirection:'column', transform:visible?'translateX(0)':'translateX(100%)', transition:'transform 250ms ease-out' }}>

        {/* ── Header ── */}
        <div style={{ padding:'18px 24px 0', borderBottom:'1px solid var(--parch-line)', flexShrink:0, background:'var(--parch-warm)' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0, flex:1 }}>
              <StoreLogo retailer={formData.retailer} size={32} />
              <div style={{ minWidth:0, flex:1 }}>
                <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:800, color:'var(--ink)', margin:0, lineHeight:1.2 }}>{order?'Edit Order':'New Order'}</h2>
                {subtitle && <p style={{ fontSize:12, color:'var(--ink-dim)', marginTop:4 }}>{subtitle}</p>}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {order && onDelete && (
                <button type="button" onClick={()=>{onDelete(order.id);onOpenChange(false);}}
                  style={{ padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600, color:'var(--crimson)', background:'var(--crimson-bg)', border:'1px solid var(--crimson-bdr)', cursor:'pointer' }}>
                  Delete
                </button>
              )}
              <button type="button" onClick={()=>onOpenChange(false)}
                style={{ width:32, height:32, borderRadius:8, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', color:'var(--ink-dim)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <X style={{width:16,height:16}} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:0 }}>
            {TABS.map(tab => (
              <button key={tab.id} type="button" onClick={()=>setActiveTab(tab.id)}
                style={{ padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:6, background:'transparent', border:'none', outline:'none', borderBottom:activeTab===tab.id?'2px solid var(--terrain)':'2px solid transparent', color:activeTab===tab.id?'var(--terrain)':'var(--ink-dim)', transition:'all 0.15s', marginBottom:-1 }}>
                <tab.Icon style={{width:14,height:14}} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          <form id="po-form" onSubmit={handleSubmit}>

            {/* ══ DETAILS ══ */}
            {activeTab==='details' && (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {/* Mode toggle */}
                <div style={{ display:'flex', gap:4, padding:4, borderRadius:12, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', width:'fit-content' }}>
                  {[{v:'churning',label:'Churning',icon:Tag,active:{background:'var(--gold-bg)',color:'var(--gold)',borderColor:'var(--gold-border)'}},
                    {v:'marketplace',label:'Marketplace',icon:Globe,active:{background:'var(--ocean-bg)',color:'var(--ocean)',borderColor:'var(--ocean-bdr)'}}
                  ].map(({v,label,icon:Icon,active})=>(
                    <button key={v} type="button" onClick={()=>set('order_type',v)}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'1px solid', transition:'all 0.15s',
                        ...(formData.order_type===v?active:{background:'transparent',color:'var(--ink-dim)',borderColor:'transparent'}) }}>
                      <Icon style={{width:13,height:13}} /> {label}
                    </button>
                  ))}
                </div>

                {/* Vendor section */}
                <div style={sectionCard('var(--gold-border)','var(--gold-bg)')}>
                  <div style={sectionTitle('var(--gold)')}>🏪 Vendor & Order</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
                    <div><LBL>Vendor *</LBL>
                      <Select value={formData.retailer} onValueChange={v=>set('retailer',v)}>
                        <SelectTrigger className="text-slate-200 h-9" style={inp}><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)' }}>{RETAILERS.map(r=><SelectItem key={r} value={r} style={{color:'var(--ink)'}}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><LBL>Status</LBL>
                      <Select value={formData.status} onValueChange={v=>{if(v==='received')setFormData(prev=>({...prev,status:v,items:prev.items.map(it=>({...it,quantity_received:it.quantity_ordered}))}));else set('status',v);}}>
                        <SelectTrigger className="text-slate-200 h-9" style={inp}><SelectValue /></SelectTrigger>
                        <SelectContent style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)' }}>{STATUSES.map(s=><SelectItem key={s} value={s} style={{color:'var(--ink)'}}>{s.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><LBL>Order Number</LBL><Input style={inp} value={formData.order_number} onChange={e=>set('order_number',e.target.value)} placeholder="112-3456789" /></div>
                    <div><LBL>Order Date</LBL><Input type="date" style={inp} value={formData.order_date} onChange={e=>set('order_date',e.target.value)} /></div>
                    <div><LBL>Account</LBL><Input style={inp} value={formData.account} onChange={e=>set('account',e.target.value)} placeholder="Account used" /></div>
                  </div>

                  <div><LBL>Tracking Number(s)</LBL>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {formData.tracking_numbers.map((tn,idx)=>(
                        <div key={idx} style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <Input style={{...inp,flex:1}} value={tn} onChange={e=>updateTracking(idx,e.target.value)} placeholder="1Z999AA1..." />
                          {formData.tracking_numbers.length>1 && <button type="button" onClick={()=>removeTracking(idx)} style={{color:'var(--crimson)',background:'none',border:'none',cursor:'pointer',padding:4}}><Minus style={{width:14,height:14}}/></button>}
                        </div>
                      ))}
                      <button type="button" onClick={addTracking} style={{ fontSize:12, color:'var(--terrain)', background:'none', border:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:4 }}>
                        <Plus style={{width:12,height:12}} /> Add tracking number
                      </button>
                    </div>
                  </div>

                  {/* Fulfillment */}
                  <div style={{ display:'flex', gap:6, marginTop:12, padding:4, borderRadius:12, background:'var(--parch-card)', border:'1px solid var(--parch-line)', width:'fit-content' }}>
                    {[
                      {v:'ship_to_me',label:'📦 Ship to Me',color:'var(--ocean)',bg:'var(--ocean-bg)',border:'var(--ocean-bdr)'},
                      {v:'store_pickup',label:'📍 Store Pickup',color:'var(--violet)',bg:'var(--violet-bg)',border:'var(--violet-bdr)'},
                      {v:'direct_dropship',label:'🚛 Dropship',color:'var(--gold)',bg:'var(--gold-bg)',border:'var(--gold-border)'},
                    ].map(({v,label,color,bg,border})=>(
                      <button key={v} type="button" onClick={()=>set('fulfillment_type',v)}
                        style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer', border:'1px solid', transition:'all 0.15s',
                          ...(formData.fulfillment_type===v?{background:bg,borderColor:border,color}:{background:'transparent',borderColor:'transparent',color:'var(--ink-dim)'}) }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {formData.fulfillment_type==='direct_dropship' && (
                    <div style={{marginTop:10}}><LBL>Ship To (Buyer)</LBL>
                      <Select value={formData.dropship_to} onValueChange={v=>set('dropship_to',v)}>
                        <SelectTrigger className="h-8 text-xs" style={inp}><SelectValue placeholder="Select buyer..." /></SelectTrigger>
                        <SelectContent style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)' }}>{sellers.map(s=><SelectItem key={s.id} value={s.name} style={{color:'var(--ink)'}}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  {formData.fulfillment_type==='store_pickup' && (
                    <div style={{marginTop:10}}><LBL>Pickup Location</LBL>
                      <Input style={inp} value={formData.pickup_location} onChange={e=>set('pickup_location',e.target.value)} placeholder="e.g. Downtown Store" />
                    </div>
                  )}
                </div>

                <div><LBL>Notes</LBL>
                  <Textarea value={formData.notes} onChange={e=>set('notes',e.target.value)} placeholder="Any notes..." rows={2}
                    style={{...inp, width:'100%', padding:'8px 12px', resize:'vertical', fontSize:13}} />
                </div>
              </div>
            )}

            {/* ══ ITEMS ══ */}
            {activeTab==='items' && (
              <div>
                <div style={sectionCard('var(--ocean-bdr)','var(--ocean-bg)')}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, paddingBottom:8, borderBottom:'1px solid var(--parch-line)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <Package style={{width:14,height:14,color:'var(--ocean)'}} />
                      <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--ocean)'}}>Order Items</span>
                      <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:'var(--parch-card)',color:'var(--ocean)',border:'1px solid var(--ocean-bdr)'}}>{formData.items.length}</span>
                    </div>
                    <Select value={formData.product_category} onValueChange={v=>set('product_category',v)}>
                      <SelectTrigger className="h-7 text-xs w-32" style={inp}><SelectValue placeholder="Category..." /></SelectTrigger>
                      <SelectContent style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)' }}>{PRODUCT_CATEGORIES.map(c=><SelectItem key={c} value={c} style={{color:'var(--ink)'}}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {formData.items.map((item,idx)=>(
                      <div key={idx} style={{ borderRadius:10, padding:12, background:'var(--parch-card)', border:'1px solid var(--parch-line)' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                          <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--ocean)',background:'var(--ocean-bg)',padding:'2px 8px',borderRadius:20,border:'1px solid var(--ocean-bdr)'}}>Item {idx+1}</span>
                          <div style={{display:'flex',gap:4}}>
                            <button type="button" onClick={()=>duplicateItem(idx)} style={{padding:4,borderRadius:6,color:'var(--ink-dim)',background:'none',border:'none',cursor:'pointer'}}><Copy style={{width:13,height:13}}/></button>
                            {formData.items.length>1&&<button type="button" onClick={()=>removeItem(idx)} style={{padding:4,borderRadius:6,color:'var(--crimson)',background:'none',border:'none',cursor:'pointer'}}><Trash2 style={{width:13,height:13}}/></button>}
                          </div>
                        </div>
                        <div style={{marginBottom:8}}><LBL>Product</LBL>
                          <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                            <ItemThumb src={item.product_image_url||findMatchedProduct(item.product_name,item.product_id,products)?.image} name={item.product_name} />
                            <div style={{flex:1}}>
                              <ProductAutocomplete products={products} nameValue={item.product_name||''} upcValue={item.upc||''} searchField="name"
                                onSelect={p=>{updateItem(idx,'product_id',p.id);updateItem(idx,'product_name',p.name);updateItem(idx,'upc',p.upc||'');updateItem(idx,'product_image_url',p.image||'');if(idx===0)set('product_category',p.category||formData.product_category);}}
                                onChangeName={val=>updateItem(idx,'product_name',val)} placeholder="e.g. iPad Air" />
                            </div>
                          </div>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                          <div><LBL>Unit Price</LBL>
                            <div style={{position:'relative'}}><span style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--ink-ghost)',fontSize:12}}>$</span>
                              <Input className="h-8 text-sm" style={{...inp,paddingLeft:22}} type="number" step="0.01" min="0" value={item.unit_cost||''} onChange={e=>updateItem(idx,'unit_cost',e.target.value)} placeholder="0.00" /></div>
                          </div>
                          <div><LBL>Qty</LBL><Input className="h-8 text-sm text-center" style={inp} type="number" min="1" value={item.quantity_ordered||1} onChange={e=>updateItem(idx,'quantity_ordered',e.target.value)} /></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button type="button" onClick={addItem}
                    style={{ marginTop:12, width:'100%', padding:'8px 0', borderRadius:8, fontSize:13, color:'var(--terrain)', background:'none', border:'1px dashed var(--terrain-bdr)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <Plus style={{width:14,height:14}} /> Add Item
                  </button>
                </div>
              </div>
            )}

            {/* ══ PAYMENT ══ */}
            {activeTab==='payment' && (
              <div style={sectionCard('var(--rose-bdr)','var(--rose-bg)')}>
                <div style={sectionTitle('var(--rose)')}>💳 Costs & Payment</div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:10,marginBottom:14}}>
                  {[['tax','Tax'],['shipping_cost','Shipping'],['fees','Fees']].map(([k,label])=>(
                    <div key={k}><LBL>{label}</LBL>
                      <div style={{position:'relative'}}><span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--ink-ghost)',fontSize:12}}>$</span>
                        <Input className="h-8 text-sm" style={{...inp,paddingLeft:22}} type="number" step="0.01" min="0" value={formData[k]} onChange={e=>set(k,e.target.value)} placeholder="0.00" /></div>
                    </div>
                  ))}
                  <div><LBL>Card</LBL>
                    {(formData.payment_splits||[]).length===0?(
                      <Select value={formData.credit_card_id||''} onValueChange={v=>{const card=creditCards.find(c=>c.id===v);set('credit_card_id',v);set('card_name',card?.card_name||'');}}>
                        <SelectTrigger className="h-8 text-xs" style={inp}>
                          {formData.credit_card_id?(
                            <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0,flex:1}}>
                              <CardLogo cardName={selectedCard?.card_name} size={16} />
                              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{selectedCard?.card_name}{selectedCard?.last_4_digits?` •${selectedCard.last_4_digits}`:''}</span>
                            </div>
                          ):<SelectValue placeholder="Select..." />}
                        </SelectTrigger>
                        <SelectContent style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)' }}>{creditCards.filter(c=>c.active!==false).map(c=>(
                          <SelectItem key={c.id} value={c.id} style={{color:'var(--ink)'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}><CardLogo cardName={c.card_name} size={20}/><span>{c.card_name}{c.last_4_digits?` •${c.last_4_digits}`:''}</span></div>
                          </SelectItem>
                        ))}</SelectContent>
                      </Select>
                    ):<span style={{fontSize:11,color:'var(--ink-dim)'}}>Split</span>}
                  </div>
                </div>

                {(formData.payment_splits||[]).length===0&&(
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,flexWrap:'wrap'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:500,
                      ...(cardRate>0?{background:'var(--terrain-bg)',border:'1px solid var(--terrain-bdr)',color:'var(--terrain)'}:{background:'var(--parch-warm)',border:'1px solid var(--parch-line)',color:'var(--ink-dim)'})}}>
                      {cardRate>0?<CardLogo cardName={selectedCard?.card_name} size={13}/>:<CreditCard style={{width:13,height:13}}/>}
                      {cardRate>0?`${cardRate}% → $${cashbackAmount.toFixed(2)} est.`:'Select a card for cashback'}
                    </div>
                    {cardRate>0&&(
                      <div style={{display:'flex',alignItems:'center',gap:4}}>
                        <Input className="h-7 w-14 text-xs text-center" style={inp} type="number" step="0.1" min="0" value={formData.cashback_rate_override||''} onChange={e=>set('cashback_rate_override',e.target.value)} placeholder={String(cardRate)} />
                        <span style={{fontSize:11,color:'var(--ink-dim)'}}>%</span>
                      </div>
                    )}
                  </div>
                )}

                {(formData.payment_splits||[]).length>0&&(
                  <div style={{marginBottom:12,display:'flex',flexDirection:'column',gap:8}}>
                    {formData.payment_splits.map((sp,idx)=>{
                      const spCard = creditCards.find(c=>c.id===sp.card_id);
                      const spCB   = ((parseFloat(sp.amount)||0)*(spCard?.cashback_rate||0)/100);
                      return (
                        <div key={idx} style={{display:'grid',gridTemplateColumns:'5fr 3fr 3fr 32px',gap:8,alignItems:'end',padding:'10px 12px',borderRadius:10,background:'var(--parch-card)',border:'1px solid var(--parch-line)'}}>
                          <div><LBL>Card</LBL>
                            <Select value={sp.card_id||''} onValueChange={v=>updateSplit(idx,'card_id',v)}>
                              <SelectTrigger className="h-8 text-xs" style={inp}>
                                {sp.card_id?(<div style={{display:'flex',alignItems:'center',gap:6}}><CardLogo cardName={spCard?.card_name} size={14}/><span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{spCard?.card_name}</span></div>):<SelectValue placeholder="Card..." />}
                              </SelectTrigger>
                              <SelectContent style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)' }}>{creditCards.filter(c=>c.active!==false).map(c=>(
                                <SelectItem key={c.id} value={c.id} style={{color:'var(--ink)'}}><div style={{display:'flex',alignItems:'center',gap:8}}><CardLogo cardName={c.card_name} size={18}/><span>{c.card_name}</span></div></SelectItem>
                              ))}</SelectContent>
                            </Select>
                          </div>
                          <div><LBL>Amount</LBL>
                            <div style={{position:'relative'}}><span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--ink-ghost)',fontSize:11}}>$</span>
                              <Input className="h-8 text-xs" style={{...inp,paddingLeft:20}} type="number" step="0.01" min="0" value={sp.amount} onChange={e=>updateSplit(idx,'amount',e.target.value)} placeholder="0.00" /></div>
                          </div>
                          <div><LBL>CB</LBL>
                            <div style={{position:'relative'}}><span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--ink-ghost)',fontSize:11}}>$</span>
                              <Input className="h-8 text-xs" style={{...inpRo,paddingLeft:20}} readOnly value={spCB.toFixed(2)} /></div>
                          </div>
                          <button type="button" onClick={()=>removeSplit(idx)} style={{color:'var(--crimson)',background:'none',border:'none',cursor:'pointer',padding:4,marginTop:16}}><Trash2 style={{width:13,height:13}}/></button>
                        </div>
                      );
                    })}
                    {(()=>{
                      const st=formData.payment_splits.reduce((s,sp)=>s+(parseFloat(sp.amount)||0),0);
                      const ok=Math.abs(st-totalPrice)<0.01;
                      return (
                        <div style={{padding:'8px 12px',borderRadius:8,fontSize:11,fontWeight:600,display:'flex',justifyContent:'space-between',
                          ...(ok?{background:'var(--terrain-bg)',border:'1px solid var(--terrain-bdr)',color:'var(--terrain)'}:{background:'var(--gold-bg)',border:'1px solid var(--gold-border)',color:'var(--gold)'})}}>
                          <span>Split: ${st.toFixed(2)} / Total: ${totalPrice.toFixed(2)}</span>
                          {ok&&<span>✓ Balanced</span>}
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div style={{display:'flex',gap:10,marginBottom:14}}>
                  <button type="button" onClick={addSplit}
                    style={{fontSize:12,fontWeight:600,color:'var(--violet)',padding:'6px 12px',borderRadius:8,background:'var(--violet-bg)',border:'1px solid var(--violet-bdr)',cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                    <Plus style={{width:12,height:12}}/> Split payment
                  </button>
                  {(formData.payment_splits||[]).length>0&&(
                    <button type="button" onClick={()=>set('payment_splits',[])} style={{fontSize:12,color:'var(--ink-dim)',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Single card</button>
                  )}
                </div>

                <GiftCardPicker giftCards={giftCards} selectedIds={formData.gift_card_ids} onChange={(ids)=>set('gift_card_ids',ids)} retailer={formData.retailer} />

                <div style={{display:'flex',flexWrap:'wrap',gap:16,marginTop:12}}>
                  <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'var(--ink-faded)',cursor:'pointer'}}>
                    <input type="checkbox" checked={formData.include_tax_in_cashback} onChange={e=>set('include_tax_in_cashback',e.target.checked)} /> Tax in cashback
                  </label>
                  <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'var(--ink-faded)',cursor:'pointer'}}>
                    <input type="checkbox" checked={formData.include_shipping_in_cashback} onChange={e=>set('include_shipping_in_cashback',e.target.checked)} /> Shipping in cashback
                  </label>
                  {isAmazon&&(
                    <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,cursor:'pointer',padding:'4px 10px',borderRadius:8,border:'1px solid',
                      ...(formData.amazon_yacb?{background:'var(--gold-bg)',borderColor:'var(--gold-border)',color:'var(--gold)'}:{background:'var(--parch-warm)',borderColor:'var(--parch-line)',color:'var(--ink-dim)'})}}>
                      <input type="checkbox" checked={formData.amazon_yacb} onChange={e=>set('amazon_yacb',e.target.checked)} /> ✨ Amazon YA 5%
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* ══ SALES ══ */}
            {activeTab==='sales' && (
              <div style={sectionCard('var(--terrain-bdr)','var(--terrain-bg)')}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,paddingBottom:8,borderBottom:'1px solid var(--parch-line)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <DollarSign style={{width:14,height:14,color:'var(--terrain)'}}/>
                    <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--terrain)'}}>Sale Events</span>
                  </div>
                  <button type="button" onClick={addSaleEvent}
                    style={{fontSize:12,fontWeight:600,color:'var(--terrain)',padding:'6px 12px',borderRadius:8,background:'var(--parch-card)',border:'1px solid var(--terrain-bdr)',cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                    <Plus style={{width:12,height:12}}/> Record Sale
                  </button>
                </div>

                {formData.sale_events.length===0?(
                  <div style={{textAlign:'center',padding:'32px 0'}}>
                    <DollarSign style={{width:32,height:32,color:'var(--terrain-bdr)',margin:'0 auto 8px'}}/>
                    <p style={{color:'var(--ink-dim)',fontSize:13,marginBottom:12}}>No sale events yet</p>
                    <button type="button" onClick={addSaleEvent}
                      style={{fontSize:13,fontWeight:600,color:'var(--terrain)',padding:'8px 20px',borderRadius:10,background:'var(--parch-card)',border:'1px solid var(--terrain-bdr)',cursor:'pointer'}}>
                      + Record First Sale
                    </button>
                  </div>
                ):(
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    {formData.sale_events.map((ev,evIdx)=>(
                      <div key={ev.id} style={{borderRadius:10,padding:12,background:'var(--parch-card)',border:'1px solid var(--terrain-bdr)'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                          <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--terrain)'}}>Sale {evIdx+1}</span>
                          <button type="button" onClick={()=>removeSaleEvent(ev.id)} style={{color:'var(--crimson)',background:'none',border:'none',cursor:'pointer',padding:4}}><Trash2 style={{width:13,height:13}}/></button>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:8,marginBottom:10}}>
                          <div><LBL>Buyer / Platform</LBL>
                            <Select value={ev.buyer||''} onValueChange={v=>updateSaleEvent(ev.id,'buyer',v)}>
                              <SelectTrigger className="h-8 text-xs" style={inp}><SelectValue placeholder="Select buyer..." /></SelectTrigger>
                              <SelectContent style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)' }}>
                                {sellers.map(s=><SelectItem key={s.id} value={s.name} style={{color:'var(--ink)'}}>{s.name}</SelectItem>)}
                                {['eBay','Amazon','Facebook Marketplace','Mercari','OfferUp'].map(p=><SelectItem key={p} value={p} style={{color:'var(--ink)'}}>{p}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><LBL>Sale Date</LBL><Input type="date" className="h-8 text-xs" style={inp} value={ev.sale_date||''} onChange={e=>updateSaleEvent(ev.id,'sale_date',e.target.value)} /></div>
                          <div><LBL>Payout Date</LBL><Input type="date" className="h-8 text-xs" style={inp} value={ev.payout_date||''} onChange={e=>updateSaleEvent(ev.id,'payout_date',e.target.value)} /></div>
                        </div>
                        <div><LBL>Items Sold</LBL>
                          <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:4}}>
                            {ev.items.map((it,itIdx)=>(
                              <div key={itIdx} style={{display:'grid',gridTemplateColumns:'5fr 2fr 3fr 28px',gap:6,alignItems:'center'}}>
                                <Input className="h-7 text-xs" style={inp} value={it.product_name||''} placeholder="Product" onChange={e=>updateSaleEventItem(ev.id,itIdx,'product_name',e.target.value)} />
                                <Input className="h-7 text-xs text-center" style={inp} type="number" min="1" value={it.quantity??1} placeholder="1" onChange={e=>updateSaleEventItem(ev.id,itIdx,'quantity',parseInt(e.target.value)||1)} />
                                <div style={{position:'relative'}}><span style={{position:'absolute',left:7,top:'50%',transform:'translateY(-50%)',color:'var(--ink-ghost)',fontSize:11}}>$</span>
                                  <Input className="h-7 text-xs" style={{...inp,paddingLeft:18}} type="number" step="0.01" min="0" value={it.sale_price||''} placeholder="Price/unit" onChange={e=>updateSaleEventItem(ev.id,itIdx,'sale_price',e.target.value)} />
                                </div>
                                <button type="button" onClick={()=>updateSaleEvent(ev.id,'items',ev.items.filter((_,i)=>i!==itIdx))} style={{color:'var(--ink-dim)',background:'none',border:'none',cursor:'pointer',padding:2}}><X style={{width:12,height:12}}/></button>
                              </div>
                            ))}
                            <button type="button" onClick={()=>{updateSaleEvent(ev.id,'items',[...ev.items,{product_name:'',quantity:1,sale_price:0}]);}}
                              style={{fontSize:11,color:'var(--terrain)',background:'none',border:'none',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:4}}>
                              <Plus style={{width:11,height:11}}/> Add item
                            </button>
                          </div>
                          {ev.items.length>0&&(
                            <div style={{marginTop:8,textAlign:'right',fontSize:11,color:'var(--terrain)',fontWeight:600}}>
                              Sale total: ${ev.items.reduce((s,it)=>s+(parseFloat(it.sale_price)||0)*(parseInt(it.quantity??1)||1),0).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {totalSaleRevenue>0&&(
                      <div style={{padding:'10px 14px',borderRadius:10,background:'var(--parch-card)',border:'1px solid var(--terrain-bdr)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:12,color:'var(--terrain)',fontWeight:500}}>{totalItemsOrdered} items ordered</span>
                        <span style={{fontSize:13,color:'var(--terrain)',fontWeight:700}}>${totalSaleRevenue.toFixed(2)} revenue</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </form>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--parch-line)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--parch-warm)' }}>
          <div style={{fontSize:12,color:'var(--ink-dim)',display:'flex',alignItems:'center',gap:0,flexWrap:'wrap',rowGap:2}}>
            <span style={{fontWeight:600,color:'var(--ink)'}}>Total: ${totalPrice.toFixed(2)}</span>
            {cashbackAmount>0&&<><span style={{margin:'0 6px'}}>·</span><div style={{display:'flex',alignItems:'center',gap:4,color:'var(--terrain)'}}><CardLogo cardName={selectedCard?.card_name} size={12}/>CB: ${cashbackAmount.toFixed(2)}</div></>}
            {giftCardTotal>0&&<><span style={{margin:'0 6px'}}>·</span><span style={{color:'var(--gold)',fontWeight:600}}>GC: ${giftCardTotal.toFixed(2)}</span></>}
          </div>
          <div style={{display:'flex',gap:10}}>
            <button type="button" onClick={()=>onOpenChange(false)}
              style={{padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:500,color:'var(--ink-faded)',background:'var(--parch-warm)',border:'1px solid var(--parch-line)',cursor:'pointer'}}>
              Cancel
            </button>
            <button type="submit" form="po-form" disabled={isPending}
              style={{padding:'8px 20px',borderRadius:8,fontSize:13,fontWeight:700,color:'white',background:'linear-gradient(135deg,#10b981,#06b6d4)',border:'none',cursor:'pointer',opacity:isPending?0.6:1}}>
              {isPending?'Saving...':(order?'Save Changes':'Create Order')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
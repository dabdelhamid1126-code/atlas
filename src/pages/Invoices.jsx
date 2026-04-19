import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Download, X, Check, FileText, Search, Eye, Upload, Trash2, Pencil, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// ── Design tokens (NE) ────────────────────────────────────────────────────
const C = {
  ink:        '#3D2B1A', inkDim: '#664930', inkFaded: '#8a6d56', inkGhost: '#b89e8a',
  gold:       '#A0722A', gold2: '#C4922E', goldBg: 'rgba(160,114,42,0.08)', goldBdr: 'rgba(160,114,42,0.22)',
  parchCard:  '#FFF8F0', parchWarm: '#F5EDE0', parchLine: 'rgba(153,126,103,0.18)',
  ocean:      '#2a5c7a', ocean2: '#336e90', oceanBg: 'rgba(42,92,122,0.08)', oceanBdr: 'rgba(42,92,122,0.2)',
  terrain:    '#4a7a35', terrain2: '#5a8c42', terrainBg: 'rgba(74,122,53,0.08)', terrainBdr: 'rgba(74,122,53,0.2)',
  crimson:    '#8b3a2a', crimson2: '#a34535', crimsonBg: 'rgba(139,58,42,0.08)', crimsonBdr: 'rgba(139,58,42,0.2)',
  violet:     '#5a3a6e', violet2: '#6e4a85', violetBg: 'rgba(90,58,110,0.08)', violetBdr: 'rgba(90,58,110,0.2)',
  neCream:    '#FFDBBB',
};
const FONT = "ui-sans-serif, system-ui, -apple-system, sans-serif";
const SERIF = "'Playfair Display', serif";
const MONO  = "ui-monospace, 'SF Mono', Consolas, monospace";

const INP = {
  background: C.parchWarm, border: `1px solid ${C.parchLine}`, borderRadius: 8,
  color: C.ink, padding: '8px 10px', fontSize: 13, outline: 'none', width: '100%', fontFamily: FONT,
};

const STATUS_META = {
  draft:     { label: 'Draft',     color: C.inkFaded,  bg: C.parchWarm,  bdr: C.parchLine  },
  sent:      { label: 'Sent',      color: C.ocean,     bg: C.oceanBg,    bdr: C.oceanBdr   },
  paid:      { label: 'Paid',      color: C.terrain,   bg: C.terrainBg,  bdr: C.terrainBdr },
  overdue:   { label: 'Overdue',   color: C.crimson,   bg: C.crimsonBg,  bdr: C.crimsonBdr },
  cancelled: { label: 'Cancelled', color: C.inkGhost,  bg: C.parchWarm,  bdr: C.parchLine  },
};
const STATUSES = ['draft','sent','paid','overdue','cancelled'];

// ── Helpers ───────────────────────────────────────────────────────────────
const fmt$ = (v) => `$${(parseFloat(v)||0).toFixed(2)}`;
const fmtDate = (d) => { try { return d ? format(new Date(d),'MMM d, yyyy') : '—'; } catch { return '—'; } };

function LBL({ children }) {
  return <label style={{ fontFamily:FONT, fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:C.inkFaded, display:'block', marginBottom:4 }}>{children}</label>;
}
function SectionDivider({ label, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background:color, flexShrink:0 }}/>
      <span style={{ fontFamily:SERIF, fontSize:9, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color, whiteSpace:'nowrap' }}>{label}</span>
      <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${color}40,${color}10,transparent)` }}/>
    </div>
  );
}
function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  return <span style={{ display:'inline-flex', alignItems:'center', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, fontFamily:SERIF, background:m.bg, color:m.color, border:`1px solid ${m.bdr}` }}>{m.label}</span>;
}

// ── Default form ──────────────────────────────────────────────────────────
const defaultForm = () => ({
  invoice_number:'', status:'draft',
  from_name:'', from_email:'', from_seller_id:'',
  buyer:'', buyer_email:'', buyer_address:'', buyer_seller_id:'',
  invoice_date: format(new Date(),'yyyy-MM-dd'), due_date:'',
  items:[{ product_id:'', description:'', quantity:1, unit_price:0, unit_cost:0, total:0 }],
  tax:0, notes:'',
});
const formFromInvoice = (inv) => ({
  invoice_number:  inv.invoice_number  || '',
  status:          inv.status          || 'draft',
  from_name:       inv.from_name       || '',
  from_email:      inv.from_email      || '',
  from_seller_id:  inv.from_seller_id  || '',
  buyer:           inv.buyer           || '',
  buyer_email:     inv.buyer_email     || '',
  buyer_address:   inv.buyer_address   || '',
  buyer_seller_id: inv.buyer_seller_id || '',
  invoice_date:    inv.invoice_date    || '',
  due_date:        inv.due_date        || '',
  items:           inv.items           || [],
  tax:             inv.tax             || 0,
  notes:           inv.notes           || '',
});

// ── Main component ────────────────────────────────────────────────────────
export default function Invoices() {
  const queryClient = useQueryClient();
  const [tab,           setTab]           = useState('all');
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [sortBy,        setSortBy]        = useState('date_desc');
  const [formOpen,      setFormOpen]      = useState(false);
  const [editingInv,    setEditingInv]    = useState(null);
  const [viewInv,       setViewInv]       = useState(null);
  const [formData,      setFormData]      = useState(defaultForm);
  const [productSearch, setProductSearch] = useState('');
  const [expandedIds,   setExpandedIds]   = useState(new Set());

  const { data: invoices = [], isLoading } = useQuery({ queryKey:['invoices'], queryFn:() => base44.entities.Invoice.list('-created_date') });
  const { data: products = [] }            = useQuery({ queryKey:['products'],  queryFn:() => base44.entities.Product.list() });
  const { data: inventory = [] }           = useQuery({ queryKey:['inventory'], queryFn:() => base44.entities.InventoryItem.list() });
  const { data: purchaseOrders = [] }      = useQuery({ queryKey:['purchaseOrders'], queryFn:() => base44.entities.PurchaseOrder.list() });
  const { data: sellers = [] }             = useQuery({ queryKey:['sellers'],   queryFn:() => base44.entities.Seller.list() });

  // ── Mutations ─────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Invoice.create(data),
    onSuccess: () => { queryClient.invalidateQueries({queryKey:['invoices']}); toast.success('Invoice created'); setFormOpen(false); },
    onError:   () => toast.error('Failed to create invoice'),
  });
  const updateMutation = useMutation({
    mutationFn: ({id, data}) => base44.entities.Invoice.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({queryKey:['invoices']}); toast.success('Invoice updated'); setFormOpen(false); },
    onError:   () => toast.error('Failed to update invoice'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Invoice.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({queryKey:['invoices']}); toast.success('Invoice deleted'); },
  });

  // ── Helpers ───────────────────────────────────────────────────────────
  const getAvailableStock = (productId) => {
    if (!productId) return null;
    return inventory.filter(inv => inv.product_id === productId && inv.status === 'in_stock').reduce((s,i) => s+(i.quantity||0), 0);
  };

  const getUnitCost = (productId) => {
    if (!productId) return 0;
    const orders = purchaseOrders.filter(po => po.items?.some(i => i.product_id === productId));
    let totalCost = 0, totalQty = 0;
    orders.forEach(po => {
      const item = po.items.find(i => i.product_id === productId);
      if (item?.unit_cost && item?.quantity_ordered) { totalCost += item.unit_cost * item.quantity_ordered; totalQty += item.quantity_ordered; }
    });
    return totalQty > 0 ? totalCost / totalQty : 0;
  };

  const calcProfit = useMemo(() => {
    const cache = {};
    return (invoice) => {
      if (cache[invoice.id]) return cache[invoice.id];
      let totalCost = 0;
      const items = (invoice.items||[]).map(item => {
        const unitCost = item.unit_cost || getUnitCost(item.product_id);
        const cost = unitCost * (item.quantity||1);
        totalCost += cost;
        const profit = (item.total||0) - cost;
        return { ...item, cost, profit, margin: item.total > 0 ? (profit/item.total)*100 : 0 };
      });
      const profit = (invoice.total||0) - totalCost;
      const result = { items, totalCost, profit, margin: invoice.total > 0 ? (profit/invoice.total)*100 : 0 };
      cache[invoice.id] = result;
      return result;
    };
  }, [invoices, purchaseOrders]);

  const deductInventory = async (items) => {
    for (const item of items) {
      if (!item.product_id) continue;
      const stock = inventory.filter(i => i.product_id === item.product_id && i.status === 'in_stock').sort((a,b) => new Date(a.created_date)-new Date(b.created_date));
      let rem = item.quantity;
      for (const s of stock) {
        if (rem <= 0) break;
        const deduct = Math.min(s.quantity, rem);
        const newQty = s.quantity - deduct;
        await base44.entities.InventoryItem.update(s.id, { quantity: newQty, status: newQty <= 0 ? 'exported' : 'in_stock' });
        rem -= deduct;
      }
    }
    queryClient.invalidateQueries({queryKey:['inventory']});
  };

  // ── Form helpers ──────────────────────────────────────────────────────
  const set = (f, v) => setFormData(p => ({...p, [f]:v}));

  const selectProduct = (idx, productId) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    const unitCost = getUnitCost(productId);
    setFormData(p => {
      const items = [...p.items];
      items[idx] = { ...items[idx], product_id: productId, description: prod.name, unit_price: prod.price||0, unit_cost: unitCost, total: (items[idx].quantity||1) * (prod.price||0) };
      return { ...p, items };
    });
  };

  const updateItem = (idx, f, v) => {
    setFormData(p => {
      const items = [...p.items];
      items[idx] = { ...items[idx], [f]: v };
      if (f==='quantity'||f==='unit_price') items[idx].total = (items[idx].quantity||0)*(items[idx].unit_price||0);
      return { ...p, items };
    });
  };

  const calcTotals = () => {
    const subtotal = formData.items.reduce((s,i) => s+(i.total||0), 0);
    return { subtotal, total: subtotal + (formData.tax||0) };
  };

  const openCreate = () => { setEditingInv(null); setFormData(defaultForm()); setFormOpen(true); };
  const openEdit   = (inv) => { setEditingInv(inv); setFormData(formFromInvoice(inv)); setFormOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.invoice_number.trim()) { toast.error('Invoice number is required'); return; }
    if (!formData.buyer.trim()) { toast.error('Buyer is required'); return; }
    const { subtotal, total } = calcTotals();
    const data = { ...formData, subtotal, total };

    if (editingInv) {
      const wasNotSold = !['sent','paid'].includes(editingInv.status);
      if (wasNotSold && ['sent','paid'].includes(data.status)) await deductInventory(data.items);
      updateMutation.mutate({ id: editingInv.id, data });
    } else {
      if (['sent','paid'].includes(data.status)) await deductInventory(data.items);
      createMutation.mutate(data);
    }
  };

  const handleMarkPaid = async (inv) => {
    const newStatus = inv.status === 'paid' ? 'sent' : 'paid';
    if (newStatus === 'paid' && !['sent','paid'].includes(inv.status)) await deductInventory(inv.items||[]);
    await base44.entities.Invoice.update(inv.id, { status: newStatus });
    queryClient.invalidateQueries({queryKey:['invoices','inventory']});
    toast.success(`Marked as ${newStatus}`);
  };

  const downloadPDF = async (inv) => {
    const el = document.createElement('div');
    el.style.cssText = 'width:800px;padding:40px;background:white;font-family:Arial,sans-serif;position:fixed;top:-9999px';
    const fromLine = inv.from_name ? `<p style="margin:2px 0;font-size:13px;color:#444">${inv.from_name}${inv.from_email?` &lt;${inv.from_email}&gt;`:''}</p>` : '';
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;border-bottom:2px solid #eee;padding-bottom:24px">
        <div><h1 style="font-size:28px;font-weight:900;margin:0">INVOICE</h1><p style="color:#888;margin:4px 0">#${inv.invoice_number}</p></div>
        <div style="text-align:right">${fromLine}<p style="font-size:12px;color:#888;margin:2px 0">Date: ${fmtDate(inv.invoice_date)}</p><p style="font-size:12px;color:#888;margin:2px 0">Due: ${fmtDate(inv.due_date)}</p></div>
      </div>
      <div style="margin-bottom:24px"><p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:6px">Bill To</p><p style="font-size:14px;font-weight:700;margin:0">${inv.buyer}</p>${inv.buyer_email?`<p style="color:#666;margin:2px 0">${inv.buyer_email}</p>`:''}</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px"><thead><tr style="background:#f8f8f8"><th style="padding:10px;text-align:left;border-bottom:2px solid #eee">Item</th><th style="padding:10px;text-align:center;border-bottom:2px solid #eee">Qty</th><th style="padding:10px;text-align:right;border-bottom:2px solid #eee">Price</th><th style="padding:10px;text-align:right;border-bottom:2px solid #eee">Total</th></tr></thead>
      <tbody>${(inv.items||[]).map(i=>`<tr><td style="padding:10px;border-bottom:1px solid #eee">${i.description}</td><td style="padding:10px;text-align:center;border-bottom:1px solid #eee">${i.quantity}</td><td style="padding:10px;text-align:right;border-bottom:1px solid #eee">$${(i.unit_price||0).toFixed(2)}</td><td style="padding:10px;text-align:right;border-bottom:1px solid #eee">$${(i.total||0).toFixed(2)}</td></tr>`).join('')}</tbody></table>
      <div style="text-align:right"><p style="margin:4px 0">Subtotal: <strong>$${(inv.subtotal||0).toFixed(2)}</strong></p><p style="margin:4px 0">Tax: <strong>$${(inv.tax||0).toFixed(2)}</strong></p><p style="font-size:20px;font-weight:900;margin:8px 0">Total: $${(inv.total||0).toFixed(2)}</p></div>
      ${inv.notes?`<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee"><p style="font-weight:700;margin-bottom:4px">Notes</p><p style="color:#666">${inv.notes}</p></div>`:''}
    `;
    document.body.appendChild(el);
    const canvas = await html2canvas(el);
    document.body.removeChild(el);
    const pdf = new jsPDF('p','mm','a4');
    pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,210,(canvas.height*210)/canvas.width);
    pdf.save(`invoice-${inv.invoice_number}.pdf`);
    toast.success('PDF downloaded');
  };

  // ── Filtering & sorting ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...invoices];
    if (tab === 'unpaid')  list = list.filter(i => !['paid','cancelled'].includes(i.status));
    if (tab === 'paid')    list = list.filter(i => i.status === 'paid');
    if (tab === 'overdue') list = list.filter(i => i.status === 'overdue');
    if (statusFilter !== 'all') list = list.filter(i => i.status === statusFilter);
    if (search) { const s = search.toLowerCase(); list = list.filter(i => i.invoice_number?.toLowerCase().includes(s)||i.buyer?.toLowerCase().includes(s)||i.from_name?.toLowerCase().includes(s)); }
    list.sort((a,b) => {
      if (sortBy==='date_desc') return new Date(b.invoice_date||b.created_date)-new Date(a.invoice_date||a.created_date);
      if (sortBy==='date_asc')  return new Date(a.invoice_date||a.created_date)-new Date(b.invoice_date||b.created_date);
      if (sortBy==='amount_desc') return (b.total||0)-(a.total||0);
      if (sortBy==='amount_asc')  return (a.total||0)-(b.total||0);
      return 0;
    });
    return list;
  }, [invoices, tab, search, statusFilter, sortBy]);

  // ── Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const paid    = invoices.filter(i => i.status==='paid');
    const unpaid  = invoices.filter(i => !['paid','cancelled'].includes(i.status));
    const overdue = invoices.filter(i => i.status==='overdue');
    const profit  = paid.reduce((s,i) => s+calcProfit(i).profit, 0);
    return {
      total:    invoices.length,
      paidAmt:  paid.reduce((s,i)=>s+(i.total||0),0),
      unpaidAmt:unpaid.reduce((s,i)=>s+(i.total||0),0),
      profit,
      overdue:  overdue.length,
    };
  }, [invoices]);

  const tabCounts = useMemo(() => ({
    all:     invoices.length,
    unpaid:  invoices.filter(i=>!['paid','cancelled'].includes(i.status)).length,
    paid:    invoices.filter(i=>i.status==='paid').length,
    overdue: invoices.filter(i=>i.status==='overdue').length,
  }), [invoices]);

  const TABS = [
    {id:'all',label:'All'},{id:'unpaid',label:'Unpaid'},{id:'paid',label:'Paid'},{id:'overdue',label:'Overdue'},
  ];

  const KPIS = [
    { label:'Invoices',  val:String(stats.total),                                       color:C.ocean,   bg:C.oceanBg,   bdr:C.oceanBdr   },
    { label:'Paid',      val:fmt$(stats.paidAmt),                                       color:C.terrain, bg:C.terrainBg, bdr:C.terrainBdr },
    { label:'Unpaid',    val:fmt$(stats.unpaidAmt),                                     color:C.gold,    bg:C.goldBg,    bdr:C.goldBdr    },
    { label:'Profit',    val:stats.profit!==0?`${stats.profit>=0?'':'-'}${fmt$(Math.abs(stats.profit))}`:'—', color:stats.profit>=0?C.terrain:C.crimson, bg:stats.profit>=0?C.terrainBg:C.crimsonBg, bdr:stats.profit>=0?C.terrainBdr:C.crimsonBdr },
    { label:'Overdue',   val:String(stats.overdue),                                     color:stats.overdue>0?C.crimson:C.inkGhost, bg:stats.overdue>0?C.crimsonBg:C.parchWarm, bdr:stats.overdue>0?C.crimsonBdr:C.parchLine },
  ];

  const toggleExpand = (id) => setExpandedIds(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });

  const filteredProducts = productSearch
    ? products.filter(p=>p.name?.toLowerCase().includes(productSearch.toLowerCase()))
    : products;

  // ── Seller/buyer select helper ────────────────────────────────────────
  function PartySelect({ label, nameField, emailField, sellerIdField }) {
    const [mode, setMode] = useState(formData[sellerIdField] ? 'select' : 'manual');
    return (
      <div style={{ background:C.parchCard, border:`1px solid ${C.parchLine}`, borderRadius:10, padding:14 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <span style={{ fontFamily:SERIF, fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:C.inkFaded }}>{label}</span>
          <div style={{ display:'flex', gap:4 }}>
            {['manual','select'].map(m=>(
              <button key={m} type="button" onClick={()=>{setMode(m);if(m==='manual'){set(sellerIdField,'');}else{set(nameField,'');set(emailField,'');}}}
                style={{ padding:'3px 10px', borderRadius:6, fontSize:11, fontWeight:700, border:`1px solid`, cursor:'pointer', fontFamily:SERIF,
                  ...(mode===m?{background:C.ink,color:C.neCream,borderColor:C.ink}:{background:'transparent',color:C.inkDim,borderColor:C.parchLine}) }}>
                {m==='manual'?'Manual':'From sellers'}
              </button>
            ))}
          </div>
        </div>
        {mode==='manual'?(
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div><LBL>Name</LBL><input style={INP} value={formData[nameField]||''} onChange={e=>set(nameField,e.target.value)} placeholder="Name or company"/></div>
            <div><LBL>Email</LBL><input style={INP} value={formData[emailField]||''} onChange={e=>set(emailField,e.target.value)} placeholder="email@example.com"/></div>
          </div>
        ):(
          <div>
            <LBL>Select seller</LBL>
            <select style={{...INP,cursor:'pointer'}} value={formData[sellerIdField]||''}
              onChange={e=>{
                const s=sellers.find(x=>x.id===e.target.value);
                set(sellerIdField,e.target.value);
                if(s){set(nameField,s.name||'');set(emailField,s.email||'');}
              }}>
              <option value="">Choose a seller...</option>
              {sellers.map(s=><option key={s.id} value={s.id}>{s.name}{s.email?` (${s.email})`:''}</option>)}
            </select>
            {formData[sellerIdField]&&(
              <div style={{ marginTop:6, fontSize:11, color:C.inkDim }}>
                {formData[nameField]} {formData[emailField]&&<span style={{color:C.inkGhost}}>· {formData[emailField]}</span>}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom:40 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:14 }}>
        <div>
          <h1 style={{ fontFamily:SERIF, fontSize:24, fontWeight:900, color:C.ink, letterSpacing:'-0.3px', margin:0 }}>Invoices</h1>
          <p style={{ fontSize:12, color:C.inkDim, marginTop:4 }}>Manage and track your invoices</p>
        </div>
        <button onClick={openCreate}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, fontSize:12, fontWeight:700, background:C.ink, color:C.neCream, border:'none', cursor:'pointer', fontFamily:SERIF }}>
          <Plus style={{width:14,height:14}}/> New Invoice
        </button>
      </div>

      {/* KPIs */}
      <SectionDivider label="Performance" color={C.gold}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20 }}>
        {KPIS.map(k=>(
          <div key={k.label} style={{ background:C.parchCard, borderTop:`3px solid ${k.color}`, borderRadius:12, padding:'14px 16px 12px', display:'flex', flexDirection:'column', boxShadow:'0 1px 4px rgba(61,43,26,0.06)' }}>
            <p style={{ fontFamily:SERIF, fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:C.inkDim, margin:'0 0 6px' }}>{k.label}</p>
            <p style={{ fontFamily:MONO, fontSize:22, fontWeight:900, color:k.color, margin:'0 0 4px', lineHeight:1 }}>{k.val}</p>
            <div style={{ flex:1 }}/>
            <div style={{ width:28, height:28, borderRadius:7, background:k.bg, border:`1px solid ${k.bdr}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <FileText style={{ width:13, height:13, color:k.color }}/>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <SectionDivider label="Filters" color={C.ocean}/>
      <div style={{ background:C.parchCard, border:`1px solid ${C.parchLine}`, borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ flex:1, minWidth:180, position:'relative', display:'flex', alignItems:'center' }}>
            <Search style={{ position:'absolute', left:10, color:C.inkGhost, pointerEvents:'none', width:14, height:14 }}/>
            <input style={{ width:'100%', padding:'7px 10px 7px 32px', borderRadius:8, fontSize:12, border:`1px solid ${C.parchLine}`, background:C.parchWarm, color:C.ink, outline:'none' }}
              placeholder="Search buyer, invoice #, sender..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select style={{ padding:'7px 10px', borderRadius:8, fontSize:12, border:`1px solid ${C.parchLine}`, background:C.parchWarm, color:C.inkDim, outline:'none' }}
            value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
          <select style={{ padding:'7px 10px', borderRadius:8, fontSize:12, border:`1px solid ${C.parchLine}`, background:C.parchWarm, color:C.inkDim, outline:'none' }}
            value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="amount_desc">Highest amount</option>
            <option value="amount_asc">Lowest amount</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, padding:3, borderRadius:10, width:'fit-content', background:C.parchCard, border:`1px solid ${C.parchLine}`, marginBottom:16 }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', border:'none', fontFamily:SERIF,
              background: tab===t.id?C.ink:'transparent', color: tab===t.id?C.neCream:C.inkDim }}>
            {t.label}
            <span style={{ fontSize:10, opacity:0.65, fontFamily:MONO }}>({tabCounts[t.id]})</span>
          </button>
        ))}
      </div>

      <div style={{ fontSize:11, color:C.inkDim, marginBottom:12 }}>
        Showing <strong style={{color:C.ink}}>{filtered.length}</strong> invoice{filtered.length!==1?'s':''}
      </div>

      {/* Invoice list */}
      {isLoading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:C.inkGhost }}>Loading invoices...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'56px 20px', background:C.parchCard, border:`1px solid ${C.parchLine}`, borderRadius:12 }}>
          <FileText style={{ width:36, height:36, color:C.inkGhost, margin:'0 auto 12px' }}/>
          <p style={{ fontSize:14, fontWeight:700, color:C.ink, marginBottom:6, fontFamily:SERIF }}>No invoices found</p>
          <p style={{ fontSize:12, color:C.inkFaded, marginBottom:16 }}>Create your first invoice to get started</p>
          <button onClick={openCreate}
            style={{ padding:'8px 16px', borderRadius:8, fontSize:12, fontWeight:700, background:C.ink, color:C.neCream, border:'none', cursor:'pointer', fontFamily:SERIF }}>
            + New Invoice
          </button>
        </div>
      ) : filtered.map(inv => {
        const expanded = expandedIds.has(inv.id);
        const { items: profitItems, profit, margin } = calcProfit(inv);
        const isPaid = inv.status === 'paid';
        const isOverdue = inv.status === 'overdue';
        return (
          <div key={inv.id} style={{ background:C.parchCard, border:`1px solid ${isOverdue?C.crimsonBdr:C.parchLine}`, borderRadius:12, marginBottom:10, overflow:'hidden' }}>

            {/* Card header */}
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom: expanded ? `1px solid ${C.parchLine}` : 'none' }}>

              {/* Left: invoice info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                  <span style={{ fontSize:14, fontWeight:700, color:C.ocean, fontFamily:SERIF }}>#{inv.invoice_number}</span>
                  <StatusBadge status={inv.status}/>
                  {isOverdue && (() => {
                    try {
                      const days = Math.floor((new Date()-new Date(inv.due_date))/(1000*60*60*24));
                      return <span style={{ fontSize:10, color:C.crimson, fontWeight:700 }}>{days}d overdue</span>;
                    } catch { return null; }
                  })()}
                  <span style={{ fontSize:10, padding:'2px 7px', borderRadius:99, background:C.parchWarm, color:C.inkGhost, border:`1px solid ${C.parchLine}` }}>
                    {(inv.items||[]).length} item{(inv.items||[]).length!==1?'s':''}
                  </span>
                </div>

                {/* From → To */}
                <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:C.inkDim, flexWrap:'wrap' }}>
                  {inv.from_name && (
                    <><span style={{ fontWeight:700, color:C.inkFaded }}>From:</span><span>{inv.from_name}</span><span style={{ color:C.parchLine }}>→</span></>
                  )}
                  <span style={{ fontWeight:700, color:C.inkFaded }}>To:</span>
                  <span style={{ fontWeight:600, color:C.ink }}>{inv.buyer || '—'}</span>
                  {inv.buyer_email && <span style={{ color:C.inkGhost }}>· {inv.buyer_email}</span>}
                  <span style={{ color:C.parchLine }}>·</span>
                  <span>{fmtDate(inv.invoice_date)}</span>
                  {inv.due_date && <><span style={{ color:C.parchLine }}>·</span><span style={{ color: isOverdue?C.crimson:C.inkFaded }}>Due {fmtDate(inv.due_date)}</span></>}
                </div>

                {isPaid && profit !== 0 && (
                  <div style={{ marginTop:3, fontSize:11, fontWeight:700, color: profit>=0?C.terrain:C.crimson }}>
                    {profit>=0?'+':''}{fmt$(profit)} profit ({margin.toFixed(1)}%)
                  </div>
                )}
              </div>

              {/* Right: amount + actions */}
              <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                <div style={{ textAlign:'right', marginRight:4 }}>
                  <div style={{ fontFamily:MONO, fontSize:18, fontWeight:900, color: isPaid?C.terrain:isOverdue?C.crimson:C.ink }}>
                    {fmt$(inv.total)}
                  </div>
                </div>

                <button onClick={()=>downloadPDF(inv)}
                  style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:`1px solid ${C.oceanBdr}`, background:C.oceanBg, color:C.ocean, cursor:'pointer', fontFamily:SERIF }}>
                  <Download style={{width:11,height:11}}/> PDF
                </button>
                <button onClick={()=>openEdit(inv)}
                  style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:`1px solid ${C.parchLine}`, background:'transparent', color:C.inkFaded, cursor:'pointer', fontFamily:SERIF }}>
                  <Pencil style={{width:11,height:11}}/> Edit
                </button>
                {!['paid','cancelled'].includes(inv.status) && (
                  <button onClick={()=>handleMarkPaid(inv)}
                    style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:`1px solid ${C.terrainBdr}`, background:C.terrainBg, color:C.terrain, cursor:'pointer', fontFamily:SERIF }}>
                    <Check style={{width:11,height:11}}/> Mark paid
                  </button>
                )}
                {inv.status==='paid'&&(
                  <button onClick={()=>handleMarkPaid(inv)}
                    style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:`1px solid ${C.parchLine}`, background:'transparent', color:C.inkFaded, cursor:'pointer', fontFamily:SERIF }}>
                    Mark unpaid
                  </button>
                )}
                <button onClick={()=>{ if(confirm(`Delete invoice #${inv.invoice_number}?`)) deleteMutation.mutate(inv.id); }}
                  style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:`1px solid ${C.crimsonBdr}`, background:C.crimsonBg, color:C.crimson, cursor:'pointer', fontFamily:SERIF }}>
                  <Trash2 style={{width:11,height:11}}/> Delete
                </button>
                <button onClick={()=>toggleExpand(inv.id)}
                  style={{ padding:4, borderRadius:6, border:'none', background:'transparent', color:C.inkGhost, cursor:'pointer' }}>
                  {expanded ? <ChevronUp style={{width:15,height:15}}/> : <ChevronDown style={{width:15,height:15}}/>}
                </button>
              </div>
            </div>

            {/* Expanded items */}
            {expanded && (
              <>
                {/* Column headers */}
                <div style={{ display:'grid', gridTemplateColumns:`1fr 50px 80px 80px${isPaid?' 80px 80px':''}`, gap:6, padding:'6px 16px', borderBottom:`1px solid ${C.parchLine}` }}>
                  {['Product','Qty','Unit price','Total',...(isPaid?['Cost','Profit']:[])].map((h,i)=>(
                    <div key={h} style={{ fontSize:9, fontWeight:700, color:C.inkGhost, textAlign:i===0?'left':'right', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:SERIF }}>{h}</div>
                  ))}
                </div>

                {/* Item rows */}
                <div style={{ padding:'0 16px' }}>
                  {profitItems.map((item,idx)=>(
                    <div key={idx} style={{ display:'grid', gridTemplateColumns:`1fr 50px 80px 80px${isPaid?' 80px 80px':''}`, gap:6, padding:'9px 0', borderBottom: idx<profitItems.length-1?`1px solid ${C.parchLine}`:'none', alignItems:'center', fontSize:12 }}>
                      <div>
                        <div style={{ fontWeight:600, color:C.ink }}>{item.description||'—'}</div>
                        {item.product_id && getAvailableStock(item.product_id)!==null && (
                          <div style={{ fontSize:10, color:C.inkGhost, marginTop:1 }}>Stock: {getAvailableStock(item.product_id)}</div>
                        )}
                      </div>
                      <div style={{ textAlign:'right', color:C.inkDim }}>{item.quantity}</div>
                      <div style={{ textAlign:'right', color:C.inkDim }}>{fmt$(item.unit_price)}</div>
                      <div style={{ textAlign:'right', fontWeight:600, color:C.ink }}>{fmt$(item.total)}</div>
                      {isPaid&&<div style={{ textAlign:'right', color:C.inkFaded }}>{fmt$(item.cost)}</div>}
                      {isPaid&&<div style={{ textAlign:'right', fontWeight:700, color:item.profit>=0?C.terrain:C.crimson }}>{item.profit>=0?'+':''}{fmt$(item.profit)}</div>}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', background:C.parchWarm, borderTop:`1px solid ${C.parchLine}`, flexWrap:'wrap' }}>
                  <span style={{ fontSize:12, color:C.inkFaded }}>Subtotal: <strong style={{color:C.ink,fontFamily:SERIF}}>{fmt$(inv.subtotal)}</strong></span>
                  {(inv.tax||0)>0 && <><span style={{width:1,height:12,background:C.parchLine,display:'inline-block'}}/><span style={{fontSize:11,color:C.inkFaded}}>Tax: {fmt$(inv.tax)}</span></>}
                  <span style={{width:1,height:12,background:C.parchLine,display:'inline-block'}}/>
                  <span style={{ fontSize:12, fontWeight:700, color:C.ink, fontFamily:SERIF }}>Total: {fmt$(inv.total)}</span>
                  {isPaid && profit!==0 && (
                    <><span style={{width:1,height:12,background:C.parchLine,display:'inline-block'}}/>
                    <span style={{ fontSize:11, fontWeight:700, color:profit>=0?C.terrain:C.crimson, fontFamily:SERIF }}>{profit>=0?'+':''}{fmt$(profit)} profit</span></>
                  )}
                  {inv.notes && (
                    <><span style={{width:1,height:12,background:C.parchLine,display:'inline-block'}}/>
                    <span style={{ fontSize:11, color:C.inkGhost, fontStyle:'italic' }}>{inv.notes}</span></>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* ── Create/Edit modal ── */}
      {formOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', justifyContent:'flex-end' }}>
          <div onClick={()=>setFormOpen(false)} style={{ position:'absolute', inset:0, background:'rgba(26,18,10,0.55)' }}/>
          <div style={{ position:'relative', width:'100%', maxWidth:680, height:'100%', background:C.parchCard, borderLeft:`1px solid ${C.parchLine}`, boxShadow:'-24px 0 60px rgba(0,0,0,0.15)', display:'flex', flexDirection:'column', overflowY:'auto' }}>

            {/* Modal header */}
            <div style={{ padding:'18px 24px 14px', borderBottom:`1px solid ${C.parchLine}`, background:C.parchWarm, flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <h2 style={{ fontFamily:SERIF, fontSize:18, fontWeight:800, color:C.ink, margin:0 }}>{editingInv?'Edit Invoice':'New Invoice'}</h2>
                <button onClick={()=>setFormOpen(false)} style={{ width:32, height:32, borderRadius:8, background:C.parchWarm, border:`1px solid ${C.parchLine}`, color:C.inkDim, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                  <X style={{width:16,height:16}}/>
                </button>
              </div>
            </div>

            <form id="inv-form" onSubmit={handleSubmit} style={{ flex:1, padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>

              {/* Invoice # + status + date */}
              <div style={{ background:C.parchCard, border:`1px solid ${C.parchLine}`, borderRadius:12, padding:16 }}>
                <div style={{ fontFamily:SERIF, fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:C.inkFaded, marginBottom:12 }}>Invoice details</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
                  <div><LBL>Invoice # *</LBL><input style={INP} value={formData.invoice_number} onChange={e=>set('invoice_number',e.target.value)} placeholder="INV-001" required/></div>
                  <div>
                    <LBL>Status</LBL>
                    <select style={{...INP,cursor:'pointer'}} value={formData.status} onChange={e=>set('status',e.target.value)}>
                      {STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                    </select>
                  </div>
                  <div><LBL>Invoice date</LBL><input type="date" style={INP} value={formData.invoice_date} onChange={e=>set('invoice_date',e.target.value)}/></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div><LBL>Due date</LBL><input type="date" style={INP} value={formData.due_date} onChange={e=>set('due_date',e.target.value)}/></div>
                </div>
              </div>

              {/* From (sender) */}
              <PartySelect label="From (sender)" nameField="from_name" emailField="from_email" sellerIdField="from_seller_id"/>

              {/* To (buyer) */}
              <div style={{ background:C.parchCard, border:`1px solid ${C.parchLine}`, borderRadius:10, padding:14 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <span style={{ fontFamily:SERIF, fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:C.inkFaded }}>To (buyer)</span>
                  {sellers.length > 0 && (
                    <select style={{ ...INP, width:'auto', fontSize:11, cursor:'pointer' }}
                      value={formData.buyer_seller_id||''}
                      onChange={e=>{
                        const s=sellers.find(x=>x.id===e.target.value);
                        set('buyer_seller_id',e.target.value);
                        if(s){set('buyer',s.name||'');set('buyer_email',s.email||'');set('buyer_address',s.address||'');}
                      }}>
                      <option value="">Select from sellers...</option>
                      {sellers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <div><LBL>Name *</LBL><input style={INP} value={formData.buyer} onChange={e=>set('buyer',e.target.value)} placeholder="Buyer name" required/></div>
                  <div><LBL>Email</LBL><input style={INP} value={formData.buyer_email} onChange={e=>set('buyer_email',e.target.value)} placeholder="buyer@email.com"/></div>
                  <div style={{ gridColumn:'1/-1' }}><LBL>Address</LBL><input style={INP} value={formData.buyer_address} onChange={e=>set('buyer_address',e.target.value)} placeholder="123 Main St, City, State"/></div>
                </div>
              </div>

              {/* Items */}
              <div style={{ background:C.parchCard, border:`1px solid ${C.parchLine}`, borderRadius:12, padding:16 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, paddingBottom:8, borderBottom:`1px solid ${C.parchLine}` }}>
                  <span style={{ fontFamily:SERIF, fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:C.ocean }}>Line items</span>
                  <button type="button" onClick={()=>setFormData(p=>({...p,items:[...p.items,{product_id:'',description:'',quantity:1,unit_price:0,unit_cost:0,total:0}]}))}
                    style={{ fontSize:11, fontWeight:700, color:C.terrain, padding:'4px 10px', borderRadius:7, background:C.terrainBg, border:`1px solid ${C.terrainBdr}`, cursor:'pointer', fontFamily:SERIF }}>
                    <Plus style={{width:11,height:11,display:'inline',marginRight:3}}/> Add item
                  </button>
                </div>

                {/* Product search */}
                <div style={{ position:'relative', marginBottom:10 }}>
                  <Search style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', width:13, height:13, color:C.inkGhost, pointerEvents:'none' }}/>
                  <input style={{ ...INP, paddingLeft:30 }} placeholder="Search products to add..." value={productSearch} onChange={e=>setProductSearch(e.target.value)}/>
                </div>

                {productSearch && filteredProducts.length > 0 && (
                  <div style={{ background:C.parchCard, border:`1px solid ${C.parchLine}`, borderRadius:9, marginBottom:10, maxHeight:150, overflowY:'auto' }}>
                    {filteredProducts.slice(0,6).map(p=>{
                      const stock = getAvailableStock(p.id);
                      return (
                        <div key={p.id} onClick={()=>{ const idx=formData.items.length; setFormData(prev=>({...prev,items:[...prev.items,{product_id:'',description:'',quantity:1,unit_price:0,unit_cost:0,total:0}]})); setTimeout(()=>selectProduct(idx,p.id),0); setProductSearch(''); }}
                          style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', cursor:'pointer', borderBottom:`1px solid ${C.parchLine}`, fontSize:12 }}
                          onMouseEnter={e=>e.currentTarget.style.background=C.parchWarm}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <span style={{ fontWeight:600, color:C.ink }}>{p.name}</span>
                          <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:11 }}>
                            {stock!==null&&<span style={{ color:stock>0?C.terrain:C.crimson }}>{stock} in stock</span>}
                            <span style={{ color:C.inkGhost }}>{fmt$(p.price||0)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {formData.items.map((item,idx)=>{
                    const stock = item.product_id ? getAvailableStock(item.product_id) : null;
                    return (
                      <div key={idx} style={{ borderRadius:9, padding:'10px 12px', background:C.parchWarm, border:`1px solid ${C.parchLine}` }}>
                        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 20px', gap:8, alignItems:'end' }}>
                          <div>
                            <LBL>Description</LBL>
                            <input style={INP} value={item.description||''} onChange={e=>updateItem(idx,'description',e.target.value)} placeholder="Product or service"/>
                          </div>
                          <div>
                            <LBL>Qty</LBL>
                            <input style={{...INP,textAlign:'center'}} type="number" min="1" value={item.quantity||1} onChange={e=>updateItem(idx,'quantity',parseInt(e.target.value)||1)}/>
                          </div>
                          <div>
                            <LBL>Unit price</LBL>
                            <div style={{position:'relative'}}><span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:C.inkGhost,fontSize:12}}>$</span>
                            <input style={{...INP,paddingLeft:20}} type="number" step="0.01" min="0" value={item.unit_price||''} onChange={e=>updateItem(idx,'unit_price',parseFloat(e.target.value)||0)} placeholder="0.00"/></div>
                          </div>
                          <div>
                            <LBL>Total</LBL>
                            <div style={{ padding:'8px 10px', borderRadius:8, background:C.parchCard, border:`1px solid ${C.parchLine}`, fontSize:13, fontWeight:700, color:C.ink, fontFamily:MONO }}>{fmt$(item.total)}</div>
                          </div>
                          <button type="button" onClick={()=>setFormData(p=>({...p,items:p.items.filter((_,i)=>i!==idx)}))}
                            style={{ color:C.crimson, background:'none', border:'none', cursor:'pointer', padding:2, marginBottom:2 }}>
                            <X style={{width:13,height:13}}/>
                          </button>
                        </div>
                        {stock!==null&&(
                          <div style={{ marginTop:5, fontSize:10, color:stock>=(item.quantity||1)?C.terrain:C.crimson, fontWeight:600 }}>
                            {stock} in stock{stock<(item.quantity||1)?' — insufficient!':''}
                          </div>
                        )}
                        {item.unit_cost>0&&<div style={{marginTop:3,fontSize:10,color:C.inkGhost}}>Cost: {fmt$(item.unit_cost)} · Est. margin: {item.unit_price>0?((1-item.unit_cost/item.unit_price)*100).toFixed(1):0}%</div>}
                      </div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div style={{ marginTop:14, background:C.parchWarm, borderRadius:9, padding:'10px 14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'3px 0' }}>
                    <span style={{ color:C.inkDim }}>Subtotal</span>
                    <span style={{ fontFamily:MONO, fontWeight:600, color:C.ink }}>{fmt$(calcTotals().subtotal)}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'3px 0' }}>
                    <span style={{ fontSize:12, color:C.inkDim }}>Tax</span>
                    <div style={{ position:'relative' }}>
                      <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:C.inkGhost, fontSize:11 }}>$</span>
                      <input style={{ ...INP, width:100, paddingLeft:20, fontSize:12 }} type="number" step="0.01" min="0" value={formData.tax||''} onChange={e=>set('tax',parseFloat(e.target.value)||0)} placeholder="0.00"/>
                    </div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', paddingTop:8, marginTop:4, borderTop:`1px solid ${C.parchLine}` }}>
                    <span style={{ fontWeight:700, color:C.ink, fontSize:14, fontFamily:SERIF }}>Total</span>
                    <span style={{ fontFamily:MONO, fontWeight:900, color:C.gold, fontSize:16 }}>{fmt$(calcTotals().total)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <LBL>Notes</LBL>
                <textarea style={{ ...INP, resize:'vertical', fontSize:13 }} rows={2} value={formData.notes} onChange={e=>set('notes',e.target.value)} placeholder="Payment terms, thank you note..."/>
              </div>

            </form>

            {/* Footer */}
            <div style={{ padding:'14px 24px', borderTop:`1px solid ${C.parchLine}`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', background:C.parchWarm }}>
              <span style={{ fontFamily:MONO, fontSize:13, fontWeight:700, color:C.ink }}>{fmt$(calcTotals().total)}</span>
              <div style={{ display:'flex', gap:10 }}>
                <button type="button" onClick={()=>setFormOpen(false)}
                  style={{ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:500, color:C.inkFaded, background:C.parchWarm, border:`1px solid ${C.parchLine}`, cursor:'pointer', fontFamily:FONT }}>
                  Cancel
                </button>
                <button type="submit" form="inv-form"
                  style={{ padding:'8px 20px', borderRadius:8, fontSize:13, fontWeight:700, color:C.neCream, background:C.ink, border:'none', cursor:'pointer', fontFamily:SERIF }}>
                  {editingInv ? 'Save changes' : 'Create invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
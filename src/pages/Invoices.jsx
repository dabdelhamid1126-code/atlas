import React, { useState, useMemo, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Download, X, Check, FileText, Search, Trash2, Pencil, ChevronDown, ChevronUp, Upload, ImageOff, Loader, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
// html2canvas and jsPDF loaded lazily to avoid duplicate React bundling issues

// ── Input styles (all using CSS vars) ──────────────────────────────────────
const INP = { 
  background:'var(--parch-warm)', 
  border:'1px solid var(--parch-line)', 
  borderRadius:8, 
  color:'var(--ink)', 
  padding:'8px 10px', 
  fontSize:13, 
  outline:'none', 
  width:'100%', 
  fontFamily:'var(--font-sans)' 
};

const STATUS_META = {
  draft:     { label:'Draft',     color:'var(--ink-faded)', bg:'var(--parch-warm)',  bdr:'var(--parch-line)'  },
  sent:      { label:'Sent',      color:'var(--ocean)',    bg:'var(--ocean-bg)',    bdr:'var(--ocean-bdr)'   },
  paid:      { label:'Paid',      color:'var(--terrain)',  bg:'var(--terrain-bg)',  bdr:'var(--terrain-bdr)' },
  overdue:   { label:'Overdue',   color:'var(--crimson)',  bg:'var(--crimson-bg)',  bdr:'var(--crimson-bdr)' },
  cancelled: { label:'Cancelled', color:'var(--ink-ghost)', bg:'var(--parch-warm)',  bdr:'var(--parch-line)'  },
};
const STATUSES = ['draft','sent','paid','overdue','cancelled'];
const fmt$    = (v) => `$${(parseFloat(v)||0).toFixed(2)}`;
const fmtDate = (d) => { try { return d ? format(new Date(d),'MMM d, yyyy') : '—'; } catch { return '—'; } };

// ── Micro components ──────────────────────────────────────────────────────
function LBL({ children }) {
  return <label style={{ fontFamily:'var(--font-sans)', fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-faded)', display:'block', marginBottom:4 }}>{children}</label>;
}
function SectionDivider({ label, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background:color, flexShrink:0 }}/>
      <span style={{ fontFamily:'var(--font-serif)', fontSize:9, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color, whiteSpace:'nowrap' }}>{label}</span>
      <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${color}40,${color}10,transparent)` }}/>
    </div>
  );
}
function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  return <span style={{ display:'inline-flex', alignItems:'center', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, fontFamily:'var(--font-serif)', background:m.bg, color:m.color, border:`1px solid ${m.bdr}` }}>{m.label}</span>;
}
function ProductThumb({ src, name, size=36 }) {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <div style={{ width:size, height:size, borderRadius:7, flexShrink:0, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <ImageOff style={{ width:size*0.4, height:size*0.4, color:'var(--ink-ghost)' }}/>
    </div>
  );
  return (
    <div style={{ width:size, height:size, borderRadius:7, flexShrink:0, background:'white', border:'1px solid var(--parch-line)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
      <img src={src} alt={name||''} onError={()=>setErr(true)} style={{ width:'100%', height:'100%', objectFit:'contain', padding: Math.round(size*0.08) }}/>
    </div>
  );
}

// ── Default form ──────────────────────────────────────────────────────────
const blankItem = () => ({ product_id:'', product_image:'', description:'', quantity:1, unit_price:0, unit_cost:0, total:0 });
const defaultForm = () => ({
  invoice_number:'', status:'draft',
  from_name:'', from_email:'', from_seller_id:'',
  buyer:'', buyer_email:'', buyer_address:'', buyer_seller_id:'',
  invoice_date:format(new Date(),'yyyy-MM-dd'), due_date:'',
  items:[blankItem()], tax:0, notes:'',
});
const formFromInv = (inv) => ({
  invoice_number: inv.invoice_number||'', status: inv.status||'draft',
  from_name: inv.from_name||'', from_email: inv.from_email||'', from_seller_id: inv.from_seller_id||'',
  buyer: inv.buyer||'', buyer_email: inv.buyer_email||'', buyer_address: inv.buyer_address||'', buyer_seller_id: inv.buyer_seller_id||'',
  invoice_date: inv.invoice_date||'', due_date: inv.due_date||'',
  items: (inv.items||[]).map(i=>({...blankItem(),...i})),
  tax: inv.tax||0, notes: inv.notes||'',
});

// ── Main ──────────────────────────────────────────────────────────────────
export default function Invoices() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [tab,           setTab]          = useState('all');
  const [search,        setSearch]       = useState('');
  const [statusFilter,  setStatusFilter] = useState('all');
  const [sortBy,        setSortBy]       = useState('date_desc');
  const [formOpen,      setFormOpen]     = useState(false);
  const [editingInv,    setEditingInv]   = useState(null);
  const [formData,      setFormData]     = useState(defaultForm);
  const [productSearch, setProductSearch]= useState('');
  const [expandedIds,   setExpandedIds]  = useState(new Set());
  const [extracting,    setExtracting]   = useState(false);
  const [dragOver,      setDragOver]     = useState(false);
  const [wasExtracted,  setWasExtracted] = useState(false);

  const { data: invoices = [], isLoading } = useQuery({ queryKey:['invoices'], queryFn:()=>base44.entities.Invoice.list('-created_date') });
  const { data: products = [] }            = useQuery({ queryKey:['products'],  queryFn:()=>base44.entities.Product.list() });
  const { data: inventory = [] }           = useQuery({ queryKey:['inventory'], queryFn:()=>base44.entities.InventoryItem.list() });
  const { data: purchaseOrders = [] }      = useQuery({ queryKey:['purchaseOrders'], queryFn:()=>base44.entities.PurchaseOrder.list() });
  const { data: sellers = [] }             = useQuery({ queryKey:['sellers'],   queryFn:()=>base44.entities.Seller.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Invoice.create(data),
    onSuccess: () => { queryClient.invalidateQueries({queryKey:['invoices']}); toast.success('Invoice created'); setFormOpen(false); setWasExtracted(false); },
    onError: () => toast.error('Failed to create invoice'),
  });
  const updateMutation = useMutation({
    mutationFn: ({id,data}) => base44.entities.Invoice.update(id,data),
    onSuccess: () => { queryClient.invalidateQueries({queryKey:['invoices']}); toast.success('Invoice updated'); setFormOpen(false); },
    onError: () => toast.error('Failed to update invoice'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Invoice.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({queryKey:['invoices']}); toast.success('Invoice deleted'); },
  });
  
  const markPaidMutation = useMutation({
    mutationFn: ({id, newStatus}) => base44.entities.Invoice.update(id, {status: newStatus}),
    onSuccess: () => { 
      queryClient.invalidateQueries({queryKey:['invoices']});
      queryClient.invalidateQueries({queryKey:['inventory']});
    },
    onError: () => toast.error('Failed to update invoice status'),
  });

  const getStock = (pid) => {
    if (!pid) return null;
    return inventory.filter(i=>i.product_id===pid&&i.status==='in_stock').reduce((s,i)=>s+(i.quantity||0),0);
  };
  const getUnitCost = useCallback((pid) => {
    if (!pid) return 0;
    let tc=0, tq=0;
    purchaseOrders.forEach(po=>{const it=po.items?.find(i=>i.product_id===pid);if(it?.unit_cost&&it?.quantity_ordered){tc+=it.unit_cost*it.quantity_ordered;tq+=it.quantity_ordered;}});
    return tq>0?tc/tq:0;
  },[purchaseOrders]);

  const calcProfit = useCallback((invoice) => {
    let totalCost=0;
    const items=(invoice.items||[]).map(item=>{
      const uc=item.unit_cost||getUnitCost(item.product_id);
      const cost=uc*(item.quantity||1); totalCost+=cost;
      const profit=(item.total||0)-cost;
      return {...item, cost, profit, margin:item.total>0?(profit/item.total)*100:0};
    });
    const profit=(invoice.total||0)-totalCost;
    return {items, totalCost, profit, margin:invoice.total>0?(profit/invoice.total)*100:0};
  },[getUnitCost]);

  const deductInventory = async (items) => {
    for (const item of items) {
      if (!item.product_id) continue;
      const stock=inventory.filter(i=>i.product_id===item.product_id&&i.status==='in_stock').sort((a,b)=>new Date(a.created_date)-new Date(b.created_date));
      let rem=item.quantity;
      for (const s of stock) {
        if (rem<=0) break;
        const d=Math.min(s.quantity,rem);
        await base44.entities.InventoryItem.update(s.id,{quantity:s.quantity-d,status:s.quantity-d<=0?'exported':'in_stock'});
        rem-=d;
      }
    }
    queryClient.invalidateQueries({queryKey:['inventory']});
  };

  const handleFileExtract = async (file) => {
    if (!file) return;
    if (!file.name.match(/\.(pdf|jpg|jpeg|png|webp|heic)$/i)&&!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)) {
      toast.error('Please upload a PDF or image file'); return;
    }
    setExtracting(true);
    toast.info('Scanning invoice...');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type:'object',
          properties:{
            invoice_number:{ type:'string' },
            from_name:{ type:'string', description:'Sender company or person name' },
            from_email:{ type:'string' },
            buyer:{ type:'string', description:'Recipient or buyer name' },
            buyer_email:{ type:'string' },
            buyer_address:{ type:'string' },
            invoice_date:{ type:'string', description:'Invoice date YYYY-MM-DD' },
            due_date:{ type:'string', description:'Due date YYYY-MM-DD' },
            items:{ type:'array', items:{ type:'object', properties:{ description:{type:'string'}, quantity:{type:'number'}, unit_price:{type:'number'}, total:{type:'number'} }}},
            tax:{ type:'number' },
            notes:{ type:'string' },
          }
        }
      });
      if (result.status==='error') { toast.error('Could not read invoice'); return; }
      const d = result.output || {};
      const matchedItems = (d.items||[]).map(item => {
        const name=(item.description||'').toLowerCase();
        const match=products.find(p=>p.name?.toLowerCase().includes(name.slice(0,12))||name.includes((p.name||'').toLowerCase().slice(0,12)));
        const unitCost=match?getUnitCost(match.id):0;
        return { product_id:match?.id||'', product_image:match?.image||'', description:item.description||'', quantity:item.quantity||1, unit_price:item.unit_price||0, unit_cost:unitCost, total:item.total||(item.quantity||1)*(item.unit_price||0) };
      });
      setFormData({
        invoice_number:d.invoice_number||'', status:'draft',
        from_name:d.from_name||'', from_email:d.from_email||'', from_seller_id:'',
        buyer:d.buyer||'', buyer_email:d.buyer_email||'', buyer_address:d.buyer_address||'', buyer_seller_id:'',
        invoice_date:d.invoice_date||format(new Date(),'yyyy-MM-dd'), due_date:d.due_date||'',
        items:matchedItems.length>0?matchedItems:[blankItem()],
        tax:d.tax||0, notes:d.notes||'',
      });
      setEditingInv(null);
      setWasExtracted(true);
      setFormOpen(true);
      toast.success('Invoice scanned — review and save');
    } catch(e) {
      toast.error('Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file=e.dataTransfer.files?.[0];
    if (file) handleFileExtract(file);
  };

  const set = (f,v) => setFormData(p=>({...p,[f]:v}));
  const calcTotals = () => { const sub=formData.items.reduce((s,i)=>s+(i.total||0),0); return {subtotal:sub,total:sub+(formData.tax||0)}; };

  const selectProduct = (idx, productId) => {
    const prod=products.find(p=>p.id===productId); if(!prod) return;
    const uc=getUnitCost(productId);
    setFormData(p=>{const items=[...p.items];items[idx]={...items[idx],product_id:productId,product_image:prod.image||'',description:prod.name,unit_price:prod.price||0,unit_cost:uc,total:(items[idx].quantity||1)*(prod.price||0)};return{...p,items};});
  };
  const updateItem = (idx,f,v) => {
    setFormData(p=>{const items=[...p.items];items[idx]={...items[idx],[f]:v};if(f==='quantity'||f==='unit_price')items[idx].total=(items[idx].quantity||0)*(items[idx].unit_price||0);return{...p,items};});
  };

  const openCreate = () => { setEditingInv(null); setWasExtracted(false); setFormData(defaultForm()); setFormOpen(true); };
  const openEdit   = (inv) => { setEditingInv(inv); setWasExtracted(false); setFormData(formFromInv(inv)); setFormOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.invoice_number.trim()) { toast.error('Invoice number required'); return; }
    if (!formData.buyer.trim()) { toast.error('Buyer name required'); return; }
    const {subtotal,total}=calcTotals();
    const data={...formData,subtotal,total};
    if (editingInv) {
      if (!['sent','paid'].includes(editingInv.status)&&['sent','paid'].includes(data.status)) await deductInventory(data.items);
      updateMutation.mutate({id:editingInv.id,data});
    } else {
      if (['sent','paid'].includes(data.status)) await deductInventory(data.items);
      createMutation.mutate(data);
    }
  };

  const handleMarkPaid = async (inv) => {
    const newStatus = inv.status === 'paid' ? 'sent' : 'paid';
    if (newStatus === 'paid' && !['sent','paid'].includes(inv.status)) {
      await deductInventory(inv.items || []);
    }
    markPaidMutation.mutate({id: inv.id, newStatus});
    toast.success(`Marked as ${newStatus}`);
  };

  const downloadPDF = async (inv) => {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    const el=document.createElement('div');
    el.style.cssText='width:800px;padding:40px;background:white;font-family:Arial,sans-serif;position:fixed;top:-9999px;left:-9999px';
    el.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:32px;border-bottom:2px solid #eee;padding-bottom:24px"><div><h1 style="font-size:28px;font-weight:900;margin:0">INVOICE</h1><p style="color:#888">#${inv.invoice_number}</p></div><div style="text-align:right">${inv.from_name?`<p style="margin:2px 0;font-weight:700">${inv.from_name}</p>`:''}<p style="font-size:12px;color:#888">Date: ${fmtDate(inv.invoice_date)}</p><p style="font-size:12px;color:#888">Due: ${fmtDate(inv.due_date)}</p></div></div><div style="margin-bottom:24px"><p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:6px">Bill To</p><p style="font-size:14px;font-weight:700;margin:0">${inv.buyer}</p>${inv.buyer_email?`<p style="color:#666">${inv.buyer_email}</p>`:''}</div><table style="width:100%;border-collapse:collapse;margin-bottom:24px"><thead><tr style="background:#f8f8f8"><th style="padding:10px;text-align:left;border-bottom:2px solid #eee">Item</th><th style="padding:10px;text-align:center;border-bottom:2px solid #eee">Qty</th><th style="padding:10px;text-align:right;border-bottom:2px solid #eee">Price</th><th style="padding:10px;text-align:right;border-bottom:2px solid #eee">Total</th></tr></thead><tbody>${(inv.items||[]).map(i=>`<tr><td style="padding:10px;border-bottom:1px solid #eee">${i.description}</td><td style="padding:10px;text-align:center">${i.quantity}</td><td style="padding:10px;text-align:right">$${(i.unit_price||0).toFixed(2)}</td><td style="padding:10px;text-align:right">$${(i.total||0).toFixed(2)}</td></tr>`).join('')}</tbody></table><div style="text-align:right"><p>Subtotal: <strong>$${(inv.subtotal||0).toFixed(2)}</strong></p><p>Tax: <strong>$${(inv.tax||0).toFixed(2)}</strong></p><p style="font-size:20px;font-weight:900">Total: $${(inv.total||0).toFixed(2)}</p></div>${inv.notes?`<div style="margin-top:24px;border-top:1px solid #eee;padding-top:16px"><p style="font-weight:700">Notes</p><p style="color:#666">${inv.notes}</p></div>`:''}`;
    document.body.appendChild(el);
    const canvas=await html2canvas(el);
    document.body.removeChild(el);
    const pdf=new (jsPDF.jsPDF || jsPDF)('p','mm','a4');
    pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,210,(canvas.height*210)/canvas.width);
    pdf.save(`invoice-${inv.invoice_number}.pdf`);
    toast.success('PDF downloaded');
  };

  const filtered = useMemo(()=>{
    let list=[...invoices];
    if(tab==='unpaid') list=list.filter(i=>!['paid','cancelled'].includes(i.status));
    if(tab==='paid')   list=list.filter(i=>i.status==='paid');
    if(tab==='overdue')list=list.filter(i=>i.status==='overdue');
    if(statusFilter!=='all') list=list.filter(i=>i.status===statusFilter);
    if(search){const s=search.toLowerCase();list=list.filter(i=>i.invoice_number?.toLowerCase().includes(s)||i.buyer?.toLowerCase().includes(s)||i.from_name?.toLowerCase().includes(s));}
    list.sort((a,b)=>{
      if(sortBy==='date_desc') return new Date(b.invoice_date||b.created_date)-new Date(a.invoice_date||a.created_date);
      if(sortBy==='date_asc')  return new Date(a.invoice_date||a.created_date)-new Date(b.invoice_date||b.created_date);
      if(sortBy==='amount_desc') return (b.total||0)-(a.total||0);
      if(sortBy==='amount_asc')  return (a.total||0)-(b.total||0);
      return 0;
    });
    return list;
  },[invoices,tab,search,statusFilter,sortBy]);

  const stats=useMemo(()=>{
    const paid=invoices.filter(i=>i.status==='paid');
    const unpaid=invoices.filter(i=>!['paid','cancelled'].includes(i.status));
    return { total:invoices.length, paidAmt:paid.reduce((s,i)=>s+(i.total||0),0), unpaidAmt:unpaid.reduce((s,i)=>s+(i.total||0),0), profit:paid.reduce((s,i)=>s+calcProfit(i).profit,0), overdue:invoices.filter(i=>i.status==='overdue').length };
  },[invoices,calcProfit]);

  const tabCounts={all:invoices.length,unpaid:invoices.filter(i=>!['paid','cancelled'].includes(i.status)).length,paid:invoices.filter(i=>i.status==='paid').length,overdue:invoices.filter(i=>i.status==='overdue').length};
  const filteredProducts=productSearch.trim() ? products.filter(p=>p.name?.toLowerCase().includes(productSearch.toLowerCase())) : [];

  function PartySelect({label,nameField,emailField,sellerIdField}){
    const [mode,setMode]=useState(formData[sellerIdField]?'select':'manual');
    return(
      <div style={{background:'var(--parch-card)',border:'1px solid var(--parch-line)',borderRadius:10,padding:14}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <span style={{fontFamily:'var(--font-serif)',fontSize:10,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-faded)'}}>{label}</span>
          <div style={{display:'flex',gap:4}}>
            {['manual','select'].map(m=>(
              <button key={m} type="button" onClick={()=>{setMode(m);if(m==='manual')set(sellerIdField,'');else{set(nameField,'');set(emailField,'');}}}
                style={{padding:'3px 10px',borderRadius:6,fontSize:11,fontWeight:700,border:'1px solid',cursor:'pointer',fontFamily:'var(--font-serif)',...(mode===m?{background:'var(--ink)',color:'var(--ne-cream)',borderColor:'var(--ink)'}:{background:'transparent',color:'var(--ink-dim)',borderColor:'var(--parch-line)'})}}>
                {m==='manual'?'Manual':'From sellers'}
              </button>
            ))}
          </div>
        </div>
        {mode==='manual'?(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div><LBL>Name</LBL><input style={INP} value={formData[nameField]||''} onChange={e=>set(nameField,e.target.value)} placeholder="Name or company"/></div>
            <div><LBL>Email</LBL><input style={INP} value={formData[emailField]||''} onChange={e=>set(emailField,e.target.value)} placeholder="email@example.com"/></div>
          </div>
        ):(
          <div>
            <LBL>Select seller</LBL>
            <select style={{...INP,cursor:'pointer'}} value={formData[sellerIdField]||''} onChange={e=>{const s=sellers.find(x=>x.id===e.target.value);set(sellerIdField,e.target.value);if(s){set(nameField,s.name||'');set(emailField,s.email||'');}}}>
              <option value="">Choose a seller...</option>
              {sellers.map(s=><option key={s.id} value={s.id}>{s.name}{s.email?` (${s.email})`:''}</option>)}
            </select>
            {formData[sellerIdField]&&<div style={{marginTop:6,fontSize:11,color:'var(--ink-dim)'}}>{formData[nameField]} {formData[emailField]&&<span style={{color:'var(--ink-ghost)'}}>· {formData[emailField]}</span>}</div>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{paddingBottom:40}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .inv-actions{display:flex;flex-wrap:wrap;gap:6px}
        @media(max-width:640px){
          .kpi-grid{grid-template-columns:repeat(2,1fr)!important}
          .inv-header{flex-direction:column!important;align-items:flex-start!important}
          .inv-actions button{flex:1;min-width:70px;justify-content:center}
          .modal-panel{max-width:100%!important;border-left:none!important;border-radius:16px 16px 0 0!important}
          .modal-panel{position:fixed;bottom:0;top:auto!important;height:95vh!important}
          .form-3col{grid-template-columns:1fr 1fr!important}
          .party-2col{grid-template-columns:1fr!important}
        }
      `}</style>

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:22,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Manage and track your invoices</p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button onClick={()=>fileInputRef.current?.click()} disabled={extracting}
            style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,fontSize:12,fontWeight:700,background:'var(--ocean-bg)',border:'1px solid var(--ocean-bdr)',color:'var(--ocean)',cursor:extracting?'not-allowed':'pointer',fontFamily:'var(--font-serif)',opacity:extracting?0.7:1}}>
            {extracting?<Loader style={{width:14,height:14,animation:'spin 0.8s linear infinite'}}/>:<ScanLine style={{width:14,height:14}}/>}
            {extracting?'Scanning...':'Scan Invoice'}
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFileExtract(f);e.target.value='';}}/>
          <button onClick={openCreate} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:8,fontSize:12,fontWeight:700,background:'var(--ink)',color:'var(--ne-cream)',border:'none',cursor:'pointer',fontFamily:'var(--font-serif)'}}>
            <Plus style={{width:14,height:14}}/> New Invoice
          </button>
        </div>
      </div>

      {/* Drag & drop zone */}
      <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={onDrop}
        onClick={()=>fileInputRef.current?.click()}
        style={{background:dragOver?'var(--ocean-bg)':'var(--parch-card)',border:`2px dashed ${dragOver?'var(--ocean)':'var(--parch-line)'}`,borderRadius:12,padding:'16px 20px',marginBottom:20,display:'flex',alignItems:'center',gap:12,cursor:'pointer',transition:'all 0.2s'}}>
        <div style={{width:38,height:38,borderRadius:9,background:'var(--ocean-bg)',border:'1px solid var(--ocean-bdr)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          {extracting?<Loader style={{width:16,height:16,color:'var(--ocean)',animation:'spin 0.8s linear infinite'}}/>:<Upload style={{width:16,height:16,color:'var(--ocean)'}}/>}
        </div>
        <div>
          <p style={{fontSize:13,fontWeight:700,color:dragOver?'var(--ocean)':'var(--ink)',fontFamily:'var(--font-serif)',margin:0}}>{extracting?'Scanning your invoice...':'Drop invoice here to auto-fill'}</p>
          <p style={{fontSize:11,color:'var(--ink-faded)',marginTop:2}}>PDF, JPG, PNG — fields extracted automatically</p>
        </div>
      </div>

      {/* KPIs */}
      <SectionDivider label="Performance" color="var(--gold)"/>
      <div className="kpi-grid" style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:20}}>
        {[
          {label:'Invoices', val:String(stats.total),                                        accent:'var(--ocean)',   bg:'var(--ocean-bg)',   bdr:'var(--ocean-bdr)'  },
          {label:'Paid',     val:fmt$(stats.paidAmt),                                        accent:'var(--terrain)', bg:'var(--terrain-bg)', bdr:'var(--terrain-bdr)'},
          {label:'Unpaid',   val:fmt$(stats.unpaidAmt),                                      accent:'var(--gold)',    bg:'var(--gold-bg)',    bdr:'var(--gold-bdr)'   },
          {label:'Profit',   val:stats.profit!==0?fmt$(Math.abs(stats.profit)):'—',          accent:stats.profit>=0?'var(--terrain)':'var(--crimson)', bg:stats.profit>=0?'var(--terrain-bg)':'var(--crimson-bg)', bdr:stats.profit>=0?'var(--terrain-bdr)':'var(--crimson-bdr)'},
          {label:'Overdue',  val:String(stats.overdue),                                      accent:stats.overdue>0?'var(--crimson)':'var(--ink-ghost)', bg:stats.overdue>0?'var(--crimson-bg)':'var(--parch-warm)', bdr:stats.overdue>0?'var(--crimson-bdr)':'var(--parch-line)'},
        ].map(k=>(
          <div key={k.label} style={{background:'var(--parch-card)',borderTop:`3px solid ${k.accent}`,borderRadius:12,padding:'14px 16px 12px',display:'flex',flexDirection:'column',boxShadow:'var(--shadow-sm)'}}>
            <p style={{fontFamily:'var(--font-serif)',fontSize:9,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'var(--ink-dim)',margin:'0 0 6px'}}>{k.label}</p>
            <p style={{fontFamily:'var(--font-mono)',fontSize:22,fontWeight:900,color:k.accent,margin:'0 0 4px',lineHeight:1}}>{k.val}</p>
            <p style={{fontSize:10,color:'var(--ink-ghost)',margin:'0 0 14px',flex:1}}>{k.label==='Invoices'?'all time':k.label==='Paid'?'collected':k.label==='Unpaid'?'outstanding':k.label==='Profit'?'revenue − cost':'past due'}</p>
            <div style={{width:28,height:28,borderRadius:7,background:k.bg,border:`1px solid ${k.bdr}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <FileText style={{width:13,height:13,color:k.accent}}/>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <SectionDivider label="Filters" color="var(--ocean)"/>
      <div style={{background:'var(--parch-card)',border:'1px solid var(--parch-line)',borderRadius:10,padding:'12px 14px',marginBottom:14}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{flex:1,minWidth:160,position:'relative',display:'flex',alignItems:'center'}}>
            <Search style={{position:'absolute',left:10,color:'var(--ink-ghost)',pointerEvents:'none',width:14,height:14}}/>
            <input style={{width:'100%',padding:'7px 10px 7px 32px',borderRadius:8,fontSize:12,border:'1px solid var(--parch-line)',background:'var(--parch-warm)',color:'var(--ink)',outline:'none'}} placeholder="Search buyer, invoice #..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select style={{padding:'7px 10px',borderRadius:8,fontSize:12,border:'1px solid var(--parch-line)',background:'var(--parch-warm)',color:'var(--ink-dim)',outline:'none'}} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
          <select style={{padding:'7px 10px',borderRadius:8,fontSize:12,border:'1px solid var(--parch-line)',background:'var(--parch-warm)',color:'var(--ink-dim)',outline:'none'}} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="amount_desc">Highest amount</option>
            <option value="amount_asc">Lowest amount</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:2,padding:3,borderRadius:10,width:'fit-content',background:'var(--parch-card)',border:'1px solid var(--parch-line)',marginBottom:16,flexWrap:'wrap'}}>
        {[{id:'all',label:'All'},{id:'unpaid',label:'Unpaid'},{id:'paid',label:'Paid'},{id:'overdue',label:'Overdue'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{display:'flex',alignItems:'center',gap:5,padding:'7px 14px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',border:'none',fontFamily:'var(--font-serif)',background:tab===t.id?'var(--ink)':'transparent',color:tab===t.id?'var(--ne-cream)':'var(--ink-dim)'}}>
            {t.label} <span style={{fontSize:10,opacity:0.65,fontFamily:'var(--font-mono)'}}>({tabCounts[t.id]})</span>
          </button>
        ))}
      </div>

      <div style={{fontSize:11,color:'var(--ink-dim)',marginBottom:12}}>Showing <strong style={{color:'var(--ink)'}}>{filtered.length}</strong> invoice{filtered.length!==1?'s':''}</div>

      {/* Invoice list */}
      {isLoading?(
        <div style={{textAlign:'center',padding:'60px 0',color:'var(--ink-ghost)'}}>Loading...</div>
      ):filtered.length===0?(
        <div style={{textAlign:'center',padding:'56px 20px',background:'var(--parch-card)',border:'1px solid var(--parch-line)',borderRadius:12}}>
          <FileText style={{width:36,height:36,color:'var(--ink-ghost)',margin:'0 auto 12px'}}/>
          <p style={{fontSize:14,fontWeight:700,color:'var(--ink)',marginBottom:6,fontFamily:'var(--font-serif)'}}>No invoices found</p>
          <p style={{fontSize:12,color:'var(--ink-faded)',marginBottom:16}}>Create one or drop a PDF/image to scan</p>
          <button onClick={openCreate} style={{padding:'8px 16px',borderRadius:8,fontSize:12,fontWeight:700,background:'var(--ink)',color:'var(--ne-cream)',border:'none',cursor:'pointer',fontFamily:'var(--font-serif)'}}>+ New Invoice</button>
        </div>
      ):filtered.map(inv=>{
        const expanded=expandedIds.has(inv.id);
        const {items:profitItems,profit,margin}=calcProfit(inv);
        const isPaid=inv.status==='paid';
        const isOverdue=inv.status==='overdue';
        return(
          <div key={inv.id} style={{background:'var(--parch-card)',border:`1px solid ${isOverdue?'var(--crimson-bdr)':'var(--parch-line)'}`,borderRadius:12,marginBottom:10,overflow:'hidden'}}>

            <div className="inv-header" style={{display:'flex',alignItems:'center',gap:10,padding:'13px 16px',borderBottom:expanded?'1px solid var(--parch-line)':'none',flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                  <span style={{fontSize:14,fontWeight:700,color:'var(--ocean)',fontFamily:'var(--font-serif)'}}>#{inv.invoice_number}</span>
                  <StatusBadge status={inv.status}/>
                  {isOverdue&&(()=>{try{const d=Math.floor((new Date()-new Date(inv.due_date))/(864e5));return<span style={{fontSize:10,color:'var(--crimson)',fontWeight:700}}>{d}d overdue</span>}catch{return null}})()}
                  <span style={{fontSize:10,padding:'2px 7px',borderRadius:99,background:'var(--parch-warm)',color:'var(--ink-ghost)',border:'1px solid var(--parch-line)'}}>{(inv.items||[]).length} item{(inv.items||[]).length!==1?'s':''}</span>
                </div>
                <div style={{fontSize:11,color:'var(--ink-dim)',display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
                  {inv.from_name&&<><span style={{fontWeight:700,color:'var(--ink-faded)'}}>From:</span><span>{inv.from_name}</span><span style={{color:'var(--parch-line)'}}>→</span></>}
                  <span style={{fontWeight:700,color:'var(--ink-faded)'}}>To:</span>
                  <span style={{fontWeight:600,color:'var(--ink)'}}>{inv.buyer||'—'}</span>
                  {inv.buyer_email&&<span style={{color:'var(--ink-ghost)'}}>· {inv.buyer_email}</span>}
                  <span style={{color:'var(--parch-line)'}}>·</span><span>{fmtDate(inv.invoice_date)}</span>
                  {inv.due_date&&<><span style={{color:'var(--parch-line)'}}>·</span><span style={{color:isOverdue?'var(--crimson)':'var(--ink-faded)'}}>Due {fmtDate(inv.due_date)}</span></>}
                </div>
                {isPaid&&profit!==0&&<div style={{marginTop:3,fontSize:11,fontWeight:700,color:profit>=0?'var(--terrain)':'var(--crimson)'}}>{profit>=0?'+':''}{fmt$(profit)} profit ({margin.toFixed(1)}%)</div>}
              </div>

              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                <span style={{fontFamily:'var(--font-mono)',fontSize:18,fontWeight:900,color:isPaid?'var(--terrain)':isOverdue?'var(--crimson)':'var(--ink)',marginRight:4}}>{fmt$(inv.total)}</span>
                <div className="inv-actions">
                  <button onClick={()=>downloadPDF(inv)} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,fontSize:11,fontWeight:700,border:'1px solid var(--ocean-bdr)',background:'var(--ocean-bg)',color:'var(--ocean)',cursor:'pointer',fontFamily:'var(--font-serif)'}}><Download style={{width:11,height:11}}/> PDF</button>
                  <button onClick={()=>openEdit(inv)} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,fontSize:11,fontWeight:700,border:'1px solid var(--parch-line)',background:'transparent',color:'var(--ink-faded)',cursor:'pointer',fontFamily:'var(--font-serif)'}}><Pencil style={{width:11,height:11}}/> Edit</button>
                  {!['paid','cancelled'].includes(inv.status)&&<button onClick={()=>handleMarkPaid(inv)} disabled={markPaidMutation.isPending} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,fontSize:11,fontWeight:700,border:'1px solid var(--terrain-bdr)',background:'var(--terrain-bg)',color:'var(--terrain)',cursor:markPaidMutation.isPending?'not-allowed':'pointer',fontFamily:'var(--font-serif)',opacity:markPaidMutation.isPending?0.6:1}}><Check style={{width:11,height:11}}/> Mark paid</button>}
                  {inv.status==='paid'&&<button onClick={()=>handleMarkPaid(inv)} disabled={markPaidMutation.isPending} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,fontSize:11,fontWeight:700,border:'1px solid var(--parch-line)',background:'transparent',color:'var(--ink-faded)',cursor:markPaidMutation.isPending?'not-allowed':'pointer',fontFamily:'var(--font-serif)',opacity:markPaidMutation.isPending?0.6:1}}>Mark unpaid</button>}
                  <button onClick={()=>{if(confirm(`Delete #${inv.invoice_number}?`))deleteMutation.mutate(inv.id);}} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,fontSize:11,fontWeight:700,border:'1px solid var(--crimson-bdr)',background:'var(--crimson-bg)',color:'var(--crimson)',cursor:'pointer',fontFamily:'var(--font-serif)'}}><Trash2 style={{width:11,height:11}}/> Delete</button>
                  <button onClick={()=>{const n=new Set(expandedIds);n.has(inv.id)?n.delete(inv.id):n.add(inv.id);setExpandedIds(n);}} style={{padding:4,borderRadius:6,border:'none',background:'transparent',color:'var(--ink-ghost)',cursor:'pointer'}}>
                    {expanded?<ChevronUp style={{width:15,height:15}}/>:<ChevronDown style={{width:15,height:15}}/>}
                  </button>
                </div>
              </div>
            </div>

            {expanded&&(
              <>
                <div style={{display:'grid',gridTemplateColumns:`48px 1fr 50px 80px 80px${isPaid?' 80px 80px':''}`,gap:6,padding:'6px 16px',borderBottom:'1px solid var(--parch-line)'}}>
                  {['','Product','Qty','Price','Total',...(isPaid?['Cost','Profit']:[])].map((h,i)=>(
                    <div key={i} style={{fontSize:9,fontWeight:700,color:'var(--ink-ghost)',textAlign:i<=1?'left':'right',letterSpacing:'0.1em',textTransform:'uppercase',fontFamily:'var(--font-serif)'}}>{h}</div>
                  ))}
                </div>
                <div style={{padding:'0 16px'}}>
                  {profitItems.map((item,idx)=>{
                    const imgSrc=item.product_image||products.find(p=>p.id===item.product_id)?.image||null;
                    return(
                      <div key={idx} style={{display:'grid',gridTemplateColumns:`48px 1fr 50px 80px 80px${isPaid?' 80px 80px':''}`,gap:6,padding:'10px 0',borderBottom:idx<profitItems.length-1?'1px solid var(--parch-line)':'none',alignItems:'center',fontSize:12}}>
                        <ProductThumb src={imgSrc} name={item.description} size={36}/>
                        <div>
                          <div style={{fontWeight:600,color:'var(--ink)'}}>{item.description||'—'}</div>
                          {item.product_id&&getStock(item.product_id)!==null&&<div style={{fontSize:10,color:'var(--ink-ghost)',marginTop:1}}>Stock: {getStock(item.product_id)}</div>}
                        </div>
                        <div style={{textAlign:'right',color:'var(--ink-dim)'}}>{item.quantity}</div>
                        <div style={{textAlign:'right',color:'var(--ink-dim)'}}>{fmt$(item.unit_price)}</div>
                        <div style={{textAlign:'right',fontWeight:600,color:'var(--ink)'}}>{fmt$(item.total)}</div>
                        {isPaid&&<div style={{textAlign:'right',color:'var(--ink-faded)'}}>{fmt$(item.cost)}</div>}
                        {isPaid&&<div style={{textAlign:'right',fontWeight:700,color:item.profit>=0?'var(--terrain)':'var(--crimson)'}}>{item.profit>=0?'+':''}{fmt$(item.profit)}</div>}
                      </div>
                    );
                  })}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',background:'var(--parch-warm)',borderTop:'1px solid var(--parch-line)',flexWrap:'wrap'}}>
                  <span style={{fontSize:12,color:'var(--ink-faded)'}}>Subtotal: <strong style={{color:'var(--ink)',fontFamily:'var(--font-serif)'}}>{fmt$(inv.subtotal)}</strong></span>
                  {(inv.tax||0)>0&&<><span style={{width:1,height:12,background:'var(--parch-line)',display:'inline-block'}}/><span style={{fontSize:11,color:'var(--ink-faded)'}}>Tax: {fmt$(inv.tax)}</span></>}
                  <span style={{width:1,height:12,background:'var(--parch-line)',display:'inline-block'}}/>
                  <span style={{fontSize:12,fontWeight:700,color:'var(--ink)',fontFamily:'var(--font-serif)'}}>Total: {fmt$(inv.total)}</span>
                  {isPaid&&profit!==0&&<><span style={{width:1,height:12,background:'var(--parch-line)',display:'inline-block'}}/><span style={{fontSize:11,fontWeight:700,color:profit>=0?'var(--terrain)':'var(--crimson)',fontFamily:'var(--font-serif)'}}>{profit>=0?'+':''}{fmt$(profit)} profit</span></>}
                  {inv.notes&&<><span style={{width:1,height:12,background:'var(--parch-line)',display:'inline-block'}}/><span style={{fontSize:11,color:'var(--ink-ghost)',fontStyle:'italic'}}>{inv.notes}</span></>}
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Side panel modal */}
      {formOpen&&(
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',justifyContent:'flex-end'}}>
          <div onClick={()=>setFormOpen(false)} style={{position:'absolute',inset:0,background:'var(--overlay-bg)'}}/>
          <div className="modal-panel" style={{position:'relative',width:'100%',maxWidth:680,height:'100%',background:'var(--parch-card)',borderLeft:'1px solid var(--parch-line)',boxShadow:'var(--shadow-md)',display:'flex',flexDirection:'column',overflowY:'auto'}}>

            <div style={{padding:'18px 24px 14px',borderBottom:'1px solid var(--parch-line)',background:'var(--parch-warm)',flexShrink:0,position:'sticky',top:0,zIndex:10}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <h2 style={{fontFamily:'var(--font-serif)',fontSize:18,fontWeight:800,color:'var(--ink)',margin:0}}>{editingInv?'Edit Invoice':'New Invoice'}</h2>
                  {wasExtracted&&<p style={{fontSize:11,color:'var(--ocean)',marginTop:3}}>✓ Fields extracted from file — review before saving</p>}
                </div>
                <button onClick={()=>setFormOpen(false)} style={{width:32,height:32,borderRadius:8,background:'var(--parch-warm)',border:'1px solid var(--parch-line)',color:'var(--ink-dim)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                  <X style={{width:16,height:16}}/>
                </button>
              </div>
            </div>

            <form id="inv-form" onSubmit={handleSubmit} style={{flex:1,padding:'20px 24px',display:'flex',flexDirection:'column',gap:16}}>

              {/* Invoice details */}
              <div style={{background:'var(--parch-card)',border:'1px solid var(--parch-line)',borderRadius:12,padding:16}}>
                <div style={{fontFamily:'var(--font-serif)',fontSize:9,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-faded)',marginBottom:12}}>Invoice details</div>
                <div className="form-3col" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:10}}>
                  <div><LBL>Invoice # *</LBL><input style={INP} value={formData.invoice_number} onChange={e=>set('invoice_number',e.target.value)} placeholder="INV-001" required/></div>
                  <div><LBL>Status</LBL><select style={{...INP,cursor:'pointer'}} value={formData.status} onChange={e=>set('status',e.target.value)}>{STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></div>
                  <div><LBL>Invoice date</LBL><input type="date" style={INP} value={formData.invoice_date} onChange={e=>set('invoice_date',e.target.value)}/></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div><LBL>Due date</LBL><input type="date" style={INP} value={formData.due_date} onChange={e=>set('due_date',e.target.value)}/></div>
                </div>
              </div>

              <PartySelect label="From (sender)" nameField="from_name" emailField="from_email" sellerIdField="from_seller_id"/>

              <div style={{background:'var(--parch-card)',border:'1px solid var(--parch-line)',borderRadius:10,padding:14}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <span style={{fontFamily:'var(--font-serif)',fontSize:10,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-faded)'}}>To (buyer)</span>
                  {sellers.length>0&&<select style={{...INP,width:'auto',fontSize:11,cursor:'pointer'}} value={formData.buyer_seller_id||''} onChange={e=>{const s=sellers.find(x=>x.id===e.target.value);set('buyer_seller_id',e.target.value);if(s){set('buyer',s.name||'');set('buyer_email',s.email||'');set('buyer_address',s.address||'');}}}><option value="">Select from sellers...</option>{sellers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>}
                </div>
                <div className="party-2col" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div><LBL>Name *</LBL><input style={INP} value={formData.buyer} onChange={e=>set('buyer',e.target.value)} placeholder="Buyer name" required/></div>
                  <div><LBL>Email</LBL><input style={INP} value={formData.buyer_email} onChange={e=>set('buyer_email',e.target.value)} placeholder="buyer@email.com"/></div>
                  <div style={{gridColumn:'1/-1'}}><LBL>Address</LBL><input style={INP} value={formData.buyer_address} onChange={e=>set('buyer_address',e.target.value)} placeholder="123 Main St, City"/></div>
                </div>
              </div>

              {/* Line items */}
              <div style={{background:'var(--parch-card)',border:'1px solid var(--parch-line)',borderRadius:12,padding:16}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,paddingBottom:8,borderBottom:'1px solid var(--parch-line)'}}>
                  <span style={{fontFamily:'var(--font-serif)',fontSize:9,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ocean)'}}>Line items</span>
                  <button type="button" onClick={()=>setFormData(p=>({...p,items:[...p.items,blankItem()]}))}
                    style={{fontSize:11,fontWeight:700,color:'var(--terrain)',padding:'4px 10px',borderRadius:7,background:'var(--terrain-bg)',border:'1px solid var(--terrain-bdr)',cursor:'pointer',fontFamily:'var(--font-serif)'}}>
                    <Plus style={{width:11,height:11,display:'inline',marginRight:3}}/> Add item
                  </button>
                </div>

                <div style={{position:'relative',marginBottom:10}}>
                  <Search style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',width:13,height:13,color:'var(--ink-ghost)',pointerEvents:'none'}}/>
                  <input style={{...INP,paddingLeft:30}} placeholder="Search products to add..." value={productSearch} onChange={e=>setProductSearch(e.target.value)}/>
                </div>
                {filteredProducts.length>0&&(
                  <div style={{background:'var(--parch-card)',border:'1px solid var(--parch-line)',borderRadius:9,marginBottom:10,maxHeight:160,overflowY:'auto'}}>
                    {filteredProducts.slice(0,6).map(p=>{
                      const stock=getStock(p.id);
                      return(
                        <div key={p.id} onClick={()=>{const idx=formData.items.length;setFormData(prev=>({...prev,items:[...prev.items,blankItem()]}));setTimeout(()=>selectProduct(idx,p.id),0);setProductSearch('');}}
                          style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid var(--parch-line)'}}
                          onMouseEnter={e=>e.currentTarget.style.background='var(--parch-warm)'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <ProductThumb src={p.image} name={p.name} size={32}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:'var(--ink)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                            <div style={{fontSize:10,color:'var(--ink-ghost)'}}>{fmt$(p.price||0)}</div>
                          </div>
                          {stock!==null&&<span style={{fontSize:10,fontWeight:700,color:stock>0?'var(--terrain)':'var(--crimson)',flexShrink:0}}>{stock} in stock</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {formData.items.map((item,idx)=>{
                    const stock=item.product_id?getStock(item.product_id):null;
                    const imgSrc=item.product_image||products.find(p=>p.id===item.product_id)?.image||null;
                    return(
                      <div key={idx} style={{borderRadius:9,padding:'12px',background:'var(--parch-warm)',border:'1px solid var(--parch-line)'}}>
                        <div style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:10}}>
                          <ProductThumb src={imgSrc} name={item.description} size={48}/>
                          <div style={{flex:1,minWidth:0}}>
                            <LBL>Description</LBL>
                            <input style={INP} value={item.description||''} onChange={e=>updateItem(idx,'description',e.target.value)} placeholder="Product or service"/>
                          </div>
                          <button type="button" onClick={()=>setFormData(p=>({...p,items:p.items.filter((_,i)=>i!==idx)}))} style={{color:'var(--crimson)',background:'none',border:'none',cursor:'pointer',padding:2,marginTop:18,flexShrink:0}}>
                            <X style={{width:14,height:14}}/>
                          </button>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                          <div><LBL>Qty</LBL><input style={{...INP,textAlign:'center'}} type="number" min="1" value={item.quantity||1} onChange={e=>updateItem(idx,'quantity',parseInt(e.target.value)||1)}/></div>
                          <div><LBL>Unit price</LBL><div style={{position:'relative'}}><span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--ink-ghost)',fontSize:12}}>$</span><input style={{...INP,paddingLeft:20}} type="number" step="0.01" min="0" value={item.unit_price||''} onChange={e=>updateItem(idx,'unit_price',parseFloat(e.target.value)||0)} placeholder="0.00"/></div></div>
                          <div><LBL>Total</LBL><div style={{padding:'8px 10px',borderRadius:8,background:'var(--parch-card)',border:'1px solid var(--parch-line)',fontSize:13,fontWeight:700,color:'var(--ink)',fontFamily:'var(--font-mono)'}}>{fmt$(item.total)}</div></div>
                        </div>
                        {(stock!==null||item.unit_cost>0)&&(
                          <div style={{marginTop:6,display:'flex',gap:12,flexWrap:'wrap'}}>
                            {stock!==null&&<span style={{fontSize:10,fontWeight:700,color:stock>=(item.quantity||1)?'var(--terrain)':'var(--crimson)'}}>{stock} in stock{stock<(item.quantity||1)?' — insufficient!':''}</span>}
                            {item.unit_cost>0&&<span style={{fontSize:10,color:'var(--ink-ghost)'}}>Cost: {fmt$(item.unit_cost)} · Margin: {item.unit_price>0?((1-item.unit_cost/item.unit_price)*100).toFixed(1):0}%</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{marginTop:14,background:'var(--parch-warm)',borderRadius:9,padding:'10px 14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'3px 0'}}><span style={{color:'var(--ink-dim)'}}>Subtotal</span><span style={{fontFamily:'var(--font-mono)',fontWeight:600,color:'var(--ink)'}}>{fmt$(calcTotals().subtotal)}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'3px 0'}}>
                    <span style={{fontSize:12,color:'var(--ink-dim)'}}>Tax</span>
                    <div style={{position:'relative'}}><span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--ink-ghost)',fontSize:11}}>$</span><input style={{...INP,width:100,paddingLeft:20,fontSize:12}} type="number" step="0.01" min="0" value={formData.tax||''} onChange={e=>set('tax',parseFloat(e.target.value)||0)} placeholder="0.00"/></div>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',paddingTop:8,marginTop:4,borderTop:'1px solid var(--parch-line)'}}>
                    <span style={{fontWeight:700,color:'var(--ink)',fontSize:14,fontFamily:'var(--font-serif)'}}>Total</span>
                    <span style={{fontFamily:'var(--font-mono)',fontWeight:900,color:'var(--gold)',fontSize:16}}>{fmt$(calcTotals().total)}</span>
                  </div>
                </div>
              </div>

              <div><LBL>Notes</LBL><textarea style={{...INP,resize:'vertical',fontSize:13}} rows={2} value={formData.notes} onChange={e=>set('notes',e.target.value)} placeholder="Payment terms, thank you note..."/></div>
            </form>

            <div style={{padding:'14px 24px',borderTop:'1px solid var(--parch-line)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--parch-warm)',position:'sticky',bottom:0}}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:13,fontWeight:700,color:'var(--ink)'}}>{fmt$(calcTotals().total)}</span>
              <div style={{display:'flex',gap:10}}>
                <button type="button" onClick={()=>setFormOpen(false)} style={{padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:500,color:'var(--ink-faded)',background:'var(--parch-warm)',border:'1px solid var(--parch-line)',cursor:'pointer',fontFamily:'var(--font-sans)'}}>Cancel</button>
                <button type="submit" form="inv-form" style={{padding:'8px 20px',borderRadius:8,fontSize:13,fontWeight:700,color:'var(--ne-cream)',background:'var(--ink)',border:'none',cursor:'pointer',fontFamily:'var(--font-serif)'}}>
                  {editingInv?'Save changes':'Create invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
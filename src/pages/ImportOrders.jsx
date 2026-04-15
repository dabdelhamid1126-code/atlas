import React, { useState, useRef, useCallback, useEffect } from 'react';
import RetailerLogo from '@/components/shared/BrandLogo';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Upload, FileText, Mail, X, Check, Loader, AlertCircle,
  ChevronDown, ChevronUp, Plus, Package, Tag, Globe,
  Gift, Hash, Truck, Calendar, RefreshCw, Lock, ImageOff,
  Sparkles, Database, Wifi, WifiOff, Inbox, ExternalLink,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import ProductAutocomplete from '@/components/purchase-orders/ProductAutocomplete';

const API_BASE = 'https://atlas-five-ashy.vercel.app';

// ── Helpers ───────────────────────────────────────────────────────────────

const fmt$      = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;
const today     = () => format(new Date(), 'yyyy-MM-dd');
const normalize = (s) => String(s || '').replace(/\D/g, '');
const lower     = (s) => String(s || '').toLowerCase().trim();

export function parseSplitPayments(raw, creditCards = []) {
  if (!raw || typeof raw !== 'string') return [];
  const parts = raw.split('|').map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return [];
  return parts.map(p => {
    const [name, amtStr] = p.split(':');
    const cardName = (name || '').trim();
    const amount   = parseFloat(amtStr) || 0;
    const card     = creditCards.find(c => c.card_name?.toLowerCase() === cardName.toLowerCase());
    return { card_id: card?.id || '', card_name: cardName, amount };
  });
}

const RETAILERS = [
  'Amazon', 'Best Buy', 'Walmart', 'Target', 'Costco',
  "Sam's Club", 'eBay', 'Woot', 'Apple', 'Other',
];

// ── UPC lookup ────────────────────────────────────────────────────────────

async function fetchUPCData(upc) {
  if (!upc) return null;
  const clean = normalize(upc);
  if (clean.length < 8 || clean.length > 14) return null;
  try {
    const res  = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${clean}`);
    const data = await res.json();
    const item = data?.items?.[0];
    if (!item) return null;
    return { title: item.title||null, image: item.images?.[0]||null, brand: item.brand||null, category: item.category||null };
  } catch { return null; }
}

// ── Fuzzy match ───────────────────────────────────────────────────────────

function fuzzyScore(productName, query) {
  const pWords = lower(productName).split(/\s+/).filter(w => w.length > 2);
  const qWords = lower(query).split(/\s+/).filter(w => w.length > 2);
  if (!pWords.length || !qWords.length) return 0;
  const matches = qWords.filter(qw => pWords.some(pw => pw.includes(qw) || qw.includes(pw)));
  return matches.length / Math.max(pWords.length, qWords.length);
}

async function enrichItem(item, products = []) {
  let match = item.upc && products.find(p => p.upc && normalize(p.upc) === normalize(item.upc));
  if (!match) match = item.sku && products.find(p => p.sku && normalize(p.sku) === normalize(item.sku));
  if (!match && item.product_name) {
    const q = lower(item.product_name);
    match = products.find(p => p.name && (lower(p.name).includes(q) || q.includes(lower(p.name))));
  }
  let closestMatch = null;
  if (!match && item.product_name) {
    let bestScore = 0.4;
    for (const p of products) {
      if (!p.name) continue;
      const score = fuzzyScore(p.name, item.product_name);
      if (score > bestScore) { bestScore = score; closestMatch = p; }
    }
  }
  if (match) return { ...item, product_id: match.id, product_name: match.name||item.product_name, upc: match.upc||item.upc||'', sku: match.sku||item.sku||'', image_url: match.image||null, catalog_match: true, image_source: 'catalog' };
  if (closestMatch) return { ...item, product_id: closestMatch.id, product_name: item.product_name, upc: closestMatch.upc||item.upc||'', sku: closestMatch.sku||item.sku||'', image_url: closestMatch.image||null, catalog_match: false, image_source: 'catalog_fuzzy', suggested_product: closestMatch.name };
  const upcData = await fetchUPCData(item.upc || item.sku);
  if (upcData) return { ...item, product_name: upcData.title||item.product_name, image_url: upcData.image||null, upc: item.upc||'', sku: item.sku||'', catalog_match: false, image_source: 'upcitemdb', upc_brand: upcData.brand||null, upc_category: upcData.category||null };
  return { ...item, image_url: null, catalog_match: false, image_source: null };
}

// ── Product image ─────────────────────────────────────────────────────────

function ProductImage({ src, name, size = 52 }) {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <div style={{ width:size, height:size }} className="rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
      <ImageOff style={{ width:size*0.33, height:size*0.33 }} className="text-slate-300"/>
    </div>
  );
  return <img src={src} alt={name} style={{ width:size, height:size }} className="rounded-xl border border-slate-200 object-contain bg-white flex-shrink-0" onError={()=>setErr(true)}/>;
}

// ── Drop zone ─────────────────────────────────────────────────────────────

function DropZone({ onFiles, loading }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type==='application/pdf'||f.type.startsWith('image/'));
    if (files.length) onFiles(files);
  }, [onFiles]);
  return (
    <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={handleDrop} onClick={()=>!loading&&inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${dragging?'border-violet-400 bg-violet-50':'hover:border-violet-300 hover:bg-violet-50/50'} ${loading?'pointer-events-none opacity-60':''}`}
      style={!dragging?{background:'var(--parch-warm)',borderColor:'var(--parch-line)'}:{}}>
      <input ref={inputRef} type="file" multiple accept=".pdf,image/*" className="hidden" onChange={e=>{if(e.target.files?.length)onFiles(Array.from(e.target.files));e.target.value='';}}/>
      {loading ? (
        <><Loader className="h-8 w-8 text-violet-500 animate-spin"/><p className="text-sm font-semibold text-violet-600">Extracting order data...</p><p className="text-xs text-slate-400">Reading your invoice and looking up products</p></>
      ) : (
        <>
          <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center"><Upload className="h-6 w-6 text-violet-500"/></div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{color:'var(--ink)'}}>Drop invoices here or click to upload</p>
            <p className="text-xs mt-1" style={{color:'var(--ink-ghost)'}}>PDF, PNG, JPG — any retailer order confirmation</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {RETAILERS.filter(r=>r!=='Other').map(r=>(
              <span key={r} className="text-xs px-2 py-1 rounded-lg" style={{background:'var(--parch-card)',border:'1px solid var(--parch-line)',color:'var(--ink-faded)'}}>{r}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Gmail connection panel ────────────────────────────────────────────────

function GmailPanel({ userEmail }) {
  const [status,       setStatus]       = useState('checking'); // checking | connected | disconnected
  const [gmailAddress, setGmailAddress] = useState('');
  const [syncing,      setSyncing]      = useState(false);
  const [emails,       setEmails]       = useState([]);
  const [daysBack,     setDaysBack]     = useState(30);
  const [syncError,    setSyncError]    = useState('');
  const [processing,   setProcessing]   = useState(false);

  // Check URL params for OAuth result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('gmail_connected');
    const error     = params.get('gmail_error');
    if (connected) {
      setGmailAddress(decodeURIComponent(connected));
      setStatus('connected');
      toast.success(`Gmail connected: ${decodeURIComponent(connected)}`);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (error) {
      setStatus('disconnected');
      toast.error(`Gmail connection failed: ${error}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Check if already connected
  useEffect(() => {
    if (!userEmail) return;
    fetch(`${process.env.SUPABASE_URL || 'https://xawgusnshspjclaeccar.supabase.co'}/rest/v1/gmail_tokens?user_email=eq.${encodeURIComponent(userEmail)}&select=gmail_address`, {
      headers: {
        'apikey':        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhd2d1c25zaHNwamNsYWVjY2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMTUyNTUsImV4cCI6MjA5MTc5MTI1NX0.Dwdx1u35DYfIz036A_YTsjf6bpp6rGztBUb-1X2l_tQ',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhd2d1c25zaHNwamNsYWVjY2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMTUyNTUsImV4cCI6MjA5MTc5MTI1NX0.Dwdx1u35DYfIz036A_YTsjf6bpp6rGztBUb-1X2l_tQ',
      }
    })
    .then(r => r.json())
    .then(data => {
      if (data.length > 0) {
        setGmailAddress(data[0].gmail_address || '');
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
    })
    .catch(() => setStatus('disconnected'));
  }, [userEmail]);

  const handleConnect = () => {
    if (!userEmail) { toast.error('Please wait — loading user info'); return; }
    window.location.href = `${API_BASE}/api/auth/google?user_email=${encodeURIComponent(userEmail)}`;
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`${API_BASE}/api/gmail/disconnect`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user_email: userEmail }),
      });
      setStatus('disconnected');
      setGmailAddress('');
      setEmails([]);
      toast.success('Gmail disconnected');
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncError('');
    setEmails([]);
    try {
      const res  = await fetch(`${API_BASE}/api/gmail/sync`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user_email: userEmail, days_back: daysBack, max_emails: 20 }),
      });
      const data = await res.json();
      if (data.error) { setSyncError(data.error); return; }
      setEmails(data.emails || []);
      if (data.emails?.length === 0) {
        setSyncError(`No order confirmation emails found in the last ${daysBack} days.`);
      } else {
        toast.success(`Found ${data.emails.length} order email${data.emails.length!==1?'s':''}`);
      }
    } catch (err) {
      setSyncError('Sync failed — try again');
    } finally {
      setSyncing(false);
    }
  };

  if (status === 'checking') {
    return (
      <div style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:16, padding:40, textAlign:'center' }}>
        <Loader style={{ width:24, height:24, color:'var(--gold)', margin:'0 auto 8px', animation:'spin 1s linear infinite' }}/>
        <p style={{ color:'var(--ink-ghost)', fontSize:13 }}>Checking Gmail connection...</p>
      </div>
    );
  }

  if (status === 'disconnected') {
    return (
      <div style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:16, padding:40, textAlign:'center' }}>
        <div style={{ width:64, height:64, borderRadius:16, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <Mail style={{ width:28, height:28, color:'var(--ink-faded)' }}/>
        </div>
        <h2 style={{ fontFamily:'var(--font-serif)', fontSize:16, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>Connect Your Gmail</h2>
        <p style={{ fontSize:12, color:'var(--ink-dim)', maxWidth:400, margin:'0 auto 24px', lineHeight:1.6 }}>
          Connect your Gmail account to automatically detect and import order confirmation emails from Amazon, Best Buy, Walmart, Target, Sam's Club and more.
        </p>

        {/* Features */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, maxWidth:480, margin:'0 auto 24px', textAlign:'left' }}>
          {[
            { icon:Inbox,     label:'Auto-detect orders',   desc:'Finds confirmations automatically' },
            { icon:RefreshCw, label:'One-click sync',        desc:'Import all at once, review before saving' },
            { icon:Lock,      label:'Read-only access',      desc:'We never send, delete, or modify emails' },
          ].map(f => (
            <div key={f.label} style={{ padding:'12px', background:'var(--parch-warm)', borderRadius:10, border:'1px solid var(--parch-line)' }}>
              <f.icon style={{ width:14, height:14, color:'var(--gold)', marginBottom:6 }}/>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--ink)', marginBottom:2 }}>{f.label}</p>
              <p style={{ fontSize:10, color:'var(--ink-ghost)' }}>{f.desc}</p>
            </div>
          ))}
        </div>

        <button onClick={handleConnect}
          style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 24px', borderRadius:10, background:'var(--ink)', color:'var(--ne-cream)', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'var(--font-serif)' }}>
          <Mail style={{ width:15, height:15 }}/> Connect Gmail Account
        </button>
        <p style={{ fontSize:10, color:'var(--ink-ghost)', marginTop:12 }}>
          You'll be redirected to Google to authorize access. Only read permission is requested.
        </p>
      </div>
    );
  }

  // Connected state
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* Connected header */}
      <div style={{ background:'var(--terrain-bg)', border:'1px solid var(--terrain-bdr)', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:'var(--parch-card)', border:'1px solid var(--terrain-bdr)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Mail style={{ width:16, height:16, color:'var(--terrain)' }}/>
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:12, fontWeight:700, color:'var(--terrain)' }}>Gmail Connected</p>
          <p style={{ fontSize:11, color:'var(--ink-faded)' }}>{gmailAddress}</p>
        </div>
        <button onClick={handleDisconnect}
          style={{ fontSize:11, color:'var(--crimson)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-serif)', fontWeight:600 }}>
          Disconnect
        </button>
      </div>

      {/* Sync controls */}
      <div style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:12, padding:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div>
            <p style={{ fontFamily:'var(--font-serif)', fontSize:11, fontWeight:700, color:'var(--ink)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Sync Order Emails</p>
            <p style={{ fontSize:11, color:'var(--ink-dim)', marginTop:2 }}>Scans for order confirmations from Amazon, Best Buy, Walmart, Target and more</p>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', borderRadius:8, padding:'6px 12px' }}>
            <span style={{ fontSize:11, color:'var(--ink-faded)' }}>Last</span>
            {[7,14,30,60].map(d => (
              <button key={d} onClick={()=>setDaysBack(d)}
                style={{ padding:'3px 8px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', border:'none',
                  background: daysBack===d ? 'var(--ink)' : 'transparent',
                  color:      daysBack===d ? 'var(--ne-cream)' : 'var(--ink-faded)',
                }}>
                {d}d
              </button>
            ))}
          </div>
          <button onClick={handleSync} disabled={syncing}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, background:'var(--ink)', color:'var(--ne-cream)', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'var(--font-serif)', opacity:syncing?0.6:1 }}>
            {syncing ? <><Loader style={{ width:13, height:13, animation:'spin 0.8s linear infinite' }}/> Scanning...</> : <><RefreshCw style={{ width:13, height:13 }}/> Scan Emails</>}
          </button>
        </div>

        {syncError && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:8, background:'var(--crimson-bg)', border:'1px solid var(--crimson-bdr)', marginBottom:12 }}>
            <AlertCircle style={{ width:13, height:13, color:'var(--crimson)', flexShrink:0 }}/>
            <p style={{ fontSize:11, color:'var(--crimson)' }}>{syncError}</p>
          </div>
        )}

        {emails.length > 0 && (
          <div>
            <p style={{ fontFamily:'var(--font-serif)', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-faded)', marginBottom:8 }}>
              {emails.length} Email{emails.length!==1?'s':''} Found — Select to Import
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:360, overflowY:'auto' }}>
              {emails.map((email, i) => (
                <EmailRow key={email.id} email={email} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Email row ─────────────────────────────────────────────────────────────

function EmailRow({ email, index }) {
  const [expanded, setExpanded] = useState(false);

  const detectRetailer = (from) => {
    const f = lower(from);
    if (f.includes('amazon'))  return 'Amazon';
    if (f.includes('bestbuy')) return 'Best Buy';
    if (f.includes('walmart')) return 'Walmart';
    if (f.includes('target'))  return 'Target';
    if (f.includes('costco'))  return 'Costco';
    if (f.includes('samsclub')||f.includes('sam\'s')) return "Sam's Club";
    if (f.includes('apple'))   return 'Apple';
    if (f.includes('staples')) return 'Staples';
    return 'Unknown';
  };

  const retailer = detectRetailer(email.from);
  const dateStr  = email.date ? format(new Date(email.date), 'MMM d, yyyy') : '—';

  return (
    <div style={{ borderRadius:10, border:'1px solid var(--parch-line)', background:'var(--parch-warm)', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', cursor:'pointer' }} onClick={()=>setExpanded(!expanded)}>
        <div style={{ width:32, height:32, borderRadius:8, background:'var(--parch-card)', border:'1px solid var(--parch-line)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:12, fontWeight:700, color:'var(--ink-dim)' }}>
          {retailer.charAt(0)}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:12, fontWeight:600, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email.subject}</p>
          <p style={{ fontSize:10, color:'var(--ink-faded)' }}>{retailer} · {dateStr}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'var(--gold-bg)', color:'var(--gold)', border:'1px solid var(--gold-bdr)' }}>
            {retailer}
          </span>
          {expanded ? <ChevronUp style={{ width:13, height:13, color:'var(--ink-ghost)' }}/> : <ChevronDown style={{ width:13, height:13, color:'var(--ink-ghost)' }}/>}
        </div>
      </div>
      {expanded && (
        <div style={{ padding:'10px 12px', borderTop:'1px solid var(--parch-line)', background:'var(--parch-card)' }}>
          <p style={{ fontSize:10, color:'var(--ink-dim)', marginBottom:8 }}>{email.snippet}</p>
          <p style={{ fontSize:10, color:'var(--ink-ghost)', marginBottom:12, fontFamily:'var(--font-mono)' }}>From: {email.from}</p>
          <button
            onClick={() => {
              // This would trigger extractInvoice with email body
              // For now show a toast — full wiring requires base44 function update
              toast.info('Use the Upload tab — paste the email body as text or PDF');
            }}
            style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, background:'var(--ink)', color:'var(--ne-cream)', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'var(--font-serif)' }}>
            <Plus style={{ width:12, height:12 }}/> Import This Order
          </button>
        </div>
      )}
    </div>
  );
}

// ── Item row ──────────────────────────────────────────────────────────────

function ItemRow({ item, onUpdate, onRemove, products = [] }) {
  const total = (parseFloat(item.unit_cost)||0) * (parseInt(item.quantity)||1);
  const sourceLabel = {
    catalog:       { text:'Matched from your product catalog',                 color:'text-emerald-600', icon:Sparkles },
    catalog_fuzzy: { text:`Closest match: "${item.suggested_product||''}"`,    color:'text-amber-600',   icon:Sparkles },
    upcitemdb:     { text:'Product info from UPC Item DB',                     color:'text-blue-600',    icon:Database },
  };
  const src = sourceLabel[item.image_source];
  const handleSelectProduct = (p) => {
    onUpdate('product_id',    p.id);
    onUpdate('product_name',  p.name);
    onUpdate('upc',           p.upc   || '');
    onUpdate('sku',           p.upc   || '');
    onUpdate('image_url',     p.image || null);
    onUpdate('catalog_match', true);
    onUpdate('image_source',  'catalog');
  };
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-3">
      <div className="flex items-start gap-3">
        <ProductImage src={item.image_url} name={item.product_name} size={52}/>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <ProductAutocomplete products={products} nameValue={item.product_name||''} upcValue={item.upc||''} searchField="name" onSelect={handleSelectProduct} onChangeName={v=>onUpdate('product_name',v)} placeholder="Product name"/>
            </div>
            <button onClick={onRemove} className="p-1.5 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0 mt-1"><X className="h-3.5 w-3.5"/></button>
          </div>
          {src && <div className={`flex items-center gap-1.5 text-xs font-medium ${src.color}`}><src.icon className="h-3 w-3 flex-shrink-0"/>{src.text}</div>}
          {item.upc_brand && <p className="text-xs text-slate-400">Brand: {item.upc_brand}</p>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[['sku','SKU'],['upc','UPC'],['model','Model']].map(([k,label])=>(
          <div key={k}>
            <label className="text-[10px] text-slate-400 font-medium mb-1 block">{label}</label>
            <Input className="h-8 text-xs bg-white" value={item[k]||''} onChange={e=>onUpdate(k,e.target.value)} placeholder={label}/>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 items-end">
        <div>
          <label className="text-[10px] text-slate-400 font-medium mb-1 block">Qty</label>
          <Input className="h-8 text-xs bg-white text-center" type="number" min="1" value={item.quantity||1} onChange={e=>onUpdate('quantity',e.target.value)}/>
        </div>
        {[['unit_cost','Unit Price'],['sale_price','Sale Price']].map(([k,label])=>(
          <div key={k}>
            <label className="text-[10px] text-slate-400 font-medium mb-1 block">{label}</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
              <Input className="h-8 text-xs bg-white pl-5" type="number" step="0.01" value={item[k]||''} onChange={e=>onUpdate(k,e.target.value)} placeholder="0.00"/>
            </div>
          </div>
        ))}
        <div className="text-right">
          <label className="text-[10px] text-slate-400 font-medium mb-1 block">Total</label>
          <p className="text-sm font-semibold text-slate-700">{fmt$(total)}</p>
        </div>
      </div>
    </div>
  );
}

// ── Review card ───────────────────────────────────────────────────────────

function ReviewCard({ draft, idx, creditCards, giftCards, products, onUpdate, onConfirm, onDiscard, confirming }) {
  const [expanded, setExpanded] = useState(true);
  const [form,     setForm]     = useState(draft.extracted);
  const set     = (k,v)      => { const f={...form,[k]:v}; setForm(f); onUpdate(idx,f); };
  const setItem = (iid,k,v)  => set('items',form.items.map(it=>it.id===iid?{...it,[k]:v}:it));
  const removeItem = (iid)   => set('items',form.items.filter(it=>it.id!==iid));
  const addItem = () => set('items',[...(form.items||[]),{ id:crypto.randomUUID(), product_name:'', sku:'', upc:'', model:'', quantity:1, unit_cost:'', sale_price:'', image_url:null, catalog_match:false, image_source:null }]);
  const itemsTotal   = (form.items||[]).reduce((s,it)=>s+(parseFloat(it.unit_cost)||0)*(parseInt(it.quantity)||1),0);
  const gcTotal      = (form.gift_cards||[]).reduce((s,gc)=>s+(parseFloat(gc.amount)||0),0);
  const finalCost    = itemsTotal+(parseFloat(form.tax)||0)+(parseFloat(form.shipping_cost)||0)+(parseFloat(form.fees)||0)-gcTotal;
  const catalogCount = (form.items||[]).filter(it=>it.catalog_match).length;
  const fuzzyCount   = (form.items||[]).filter(it=>it.image_source==='catalog_fuzzy').length;
  const upcCount     = (form.items||[]).filter(it=>it.image_source==='upcitemdb').length;
  const statusStyles = { ready:'bg-emerald-50 text-emerald-700 border border-emerald-200', error:'bg-red-50 text-red-600 border border-red-200', confirmed:'bg-violet-50 text-violet-700 border border-violet-200', duplicate:'bg-amber-50 text-amber-700 border border-amber-200', pending:'bg-slate-100 text-slate-600' };
  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${draft.status==='confirmed'?'border-emerald-200 opacity-75':draft.status==='error'?'border-red-200':'border-slate-100'}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <RetailerLogo retailer={form.retailer} size={36}/>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {form.retailer||'Unknown Retailer'}{form.order_number&&<span className="text-slate-400 font-normal ml-2">#{form.order_number}</span>}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {form.items?.length||0} item(s) · {fmt$(itemsTotal)}
              {catalogCount>0&&<span className="text-emerald-600 ml-1.5">· {catalogCount} catalog</span>}
              {fuzzyCount>0&&<span className="text-amber-600 ml-1">· {fuzzyCount} suggested</span>}
              {upcCount>0&&<span className="text-blue-600 ml-1">· {upcCount} UPC</span>}
              {draft.filename&&<span className="ml-1.5">· {draft.filename}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyles[draft.status]||statusStyles.pending}`}>
            {draft.status==='confirmed'?'Saved':draft.status==='error'?'Error':draft.status==='duplicate'?'Duplicate':draft.status==='ready'?'Ready':'Review'}
          </span>
          <button onClick={()=>setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400">
            {expanded?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}
          </button>
          {draft.status!=='confirmed'&&<button onClick={()=>onDiscard(idx)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-400 transition"><X className="h-4 w-4"/></button>}
        </div>
      </div>
      {expanded&&draft.status!=='confirmed'&&(
        <div className="px-5 py-4 space-y-5">
          {draft.isDuplicate&&<div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700"><AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0"/><span>Order <strong>#{form.order_number}</strong> already exists. Edit the order number if different, or discard.</span></div>}
          {draft.error&&<div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600"><AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0"/>{draft.error}</div>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 flex items-center gap-1"><Tag className="h-3 w-3"/>Retailer</Label>
              <Select value={form.retailer||''} onValueChange={v=>set('retailer',v)}>
                <SelectTrigger className="h-9 bg-slate-50"><SelectValue placeholder="Select retailer..."/></SelectTrigger>
                <SelectContent>{RETAILERS.map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 flex items-center gap-1"><Hash className="h-3 w-3"/>Order #</Label>
              <Input className="h-9 bg-slate-50" value={form.order_number||''} onChange={e=>set('order_number',e.target.value)}/>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="h-3 w-3"/>Order Date</Label>
              <Input className="h-9 bg-slate-50" type="date" value={form.order_date||today()} onChange={e=>set('order_date',e.target.value)}/>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Order Type</Label>
              <Select value={form.order_type_hint||'churning'} onValueChange={v=>set('order_type_hint',v)}>
                <SelectTrigger className="h-9 bg-slate-50"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="churning"><span className="flex items-center gap-1.5"><Tag className="h-3 w-3 text-amber-500"/>Churning</span></SelectItem>
                  <SelectItem value="marketplace"><span className="flex items-center gap-1.5"><Globe className="h-3 w-3 text-blue-500"/>Marketplace</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-slate-500 flex items-center gap-1"><Truck className="h-3 w-3"/>Tracking Number(s)</Label>
            {(form.tracking_numbers?.length?form.tracking_numbers:['']).map((tn,ti)=>(
              <div key={ti} className="flex items-center gap-2">
                <Input className="h-9 bg-slate-50 flex-1" value={tn} onChange={e=>{const t=[...(form.tracking_numbers||[''])];t[ti]=e.target.value;set('tracking_numbers',t);}} placeholder="e.g. 1Z999AA10123456784"/>
                {(form.tracking_numbers?.length||1)>1&&<button onClick={()=>set('tracking_numbers',form.tracking_numbers.filter((_,i)=>i!==ti))} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition"><X className="h-3.5 w-3.5"/></button>}
              </div>
            ))}
            <button onClick={()=>set('tracking_numbers',[...(form.tracking_numbers||['']),'''])} className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 font-medium"><Plus className="h-3 w-3"/>Add tracking number</button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-500 flex items-center gap-1"><Package className="h-3 w-3"/>Items</Label>
              <button onClick={addItem} className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 font-medium"><Plus className="h-3 w-3"/>Add item</button>
            </div>
            {(form.items||[]).map(item=>(
              <ItemRow key={item.id} item={item} products={products} onUpdate={(k,v)=>setItem(item.id,k,v)} onRemove={()=>removeItem(item.id)}/>
            ))}
            <p className="text-xs text-right text-slate-400 font-medium pr-1">{fmt$(itemsTotal)} subtotal</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[['tax','Tax'],['shipping_cost','Shipping'],['fees','Fees']].map(([k,label])=>(
              <div key={k} className="space-y-1">
                <Label className="text-xs text-slate-500">{label}</Label>
                <div className="relative"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <Input className="h-9 bg-slate-50 pl-6 text-sm" type="number" step="0.01" value={form[k]||''} onChange={e=>set(k,e.target.value)} placeholder="0.00"/></div>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Payment Method</Label>
            <Select value={form.credit_card_id||''} onValueChange={v=>set('credit_card_id',v)}>
              <SelectTrigger className="bg-slate-50 h-9"><SelectValue placeholder={form.payment_method_last_four?`Card ending ••••${form.payment_method_last_four} — select to match`:'Select payment method...'}/></SelectTrigger>
              <SelectContent>
                <SelectItem value="">No card</SelectItem>
                {creditCards.map(c=><SelectItem key={c.id} value={c.id}>{c.card_name}{c.last_4_digits?` ••••${c.last_4_digits}`:''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Notes</Label>
            <Textarea className="bg-slate-50 text-sm resize-none" rows={2} value={form.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="Any additional notes..."/>
          </div>
          <div className="flex items-center justify-between p-3 bg-violet-50 border border-violet-100 rounded-xl">
            <div className="text-xs text-slate-500 space-y-0.5">
              <p>Items {fmt$(itemsTotal)} + tax {fmt$(form.tax||0)} + shipping {fmt$(form.shipping_cost||0)}</p>
              {gcTotal>0&&<p className="text-amber-600 font-medium">Gift cards: −{fmt$(gcTotal)}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Final cost</p>
              <p className="text-base font-bold text-violet-700">{fmt$(finalCost)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={()=>onConfirm(idx,form)} disabled={confirming||!form.retailer||!(form.items?.length)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed">
              {confirming?<Loader className="h-4 w-4 animate-spin"/>:<Check className="h-4 w-4"/>}
              {confirming?'Saving...':'Confirm & Save Order'}
            </button>
            <button onClick={()=>onDiscard(idx)} className="px-4 py-2.5 rounded-xl text-sm text-slate-500 border border-slate-200 hover:bg-slate-50 transition">Discard</button>
          </div>
        </div>
      )}
      {draft.status==='confirmed'&&<div className="px-5 py-3 flex items-center gap-2 text-sm text-emerald-600"><Check className="h-4 w-4"/>Order saved successfully</div>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function ImportOrders() {
  const queryClient = useQueryClient();
  const [tab,           setTab]           = useState('upload');
  const [drafts,        setDrafts]        = useState([]);
  const [extracting,    setExtracting]    = useState(false);
  const [confirmingIdx, setConfirmingIdx] = useState(null);
  const [userEmail,     setUserEmail]     = useState(null);

  useEffect(()=>{ base44.auth.me().then(u=>setUserEmail(u?.email||null)).catch(()=>{}); },[]);

  // Check for gmail tab in URL params
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail_connected') || params.get('gmail_error')) setTab('gmail');
  },[]);

  const { data:creditCards    =[] } = useQuery({ queryKey:['creditCards',userEmail],    queryFn:()=>userEmail?base44.entities.CreditCard.filter({created_by:userEmail}):[], enabled:!!userEmail });
  const { data:giftCards      =[] } = useQuery({ queryKey:['giftCards',userEmail],      queryFn:()=>userEmail?base44.entities.GiftCard.filter({created_by:userEmail}):[], enabled:!!userEmail });
  const { data:products       =[] } = useQuery({ queryKey:['products'],                 queryFn:()=>base44.entities.Product.list() });
  const { data:existingOrders =[] } = useQuery({ queryKey:['purchaseOrders',userEmail], queryFn:()=>userEmail?base44.entities.PurchaseOrder.filter({created_by:userEmail}):[], enabled:!!userEmail });

  const handleFiles = async (files) => {
    setExtracting(true);
    const newDrafts = [];
    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const res = await base44.functions.invoke('extractInvoice', { file_url, file_type: file.type });
        const extracted = res.data.extracted;
        extracted.items = (extracted.items||[]).map(it=>({...it,id:crypto.randomUUID()}));
        extracted.items = await Promise.all(extracted.items.map(it=>enrichItem(it,products)));
        if (extracted.payment_method_last_four) {
          const cardMatch = creditCards.find(c=>String(c.last_4_digits)===String(extracted.payment_method_last_four));
          if (cardMatch) extracted.credit_card_id = cardMatch.id;
        }
        const isDuplicate = extracted.order_number && existingOrders.some(o=>o.order_number===extracted.order_number);
        newDrafts.push({ id:crypto.randomUUID(), filename:file.name, status:isDuplicate?'duplicate':'ready', extracted, error:null, isDuplicate });
      } catch (err) {
        newDrafts.push({ id:crypto.randomUUID(), filename:file.name, status:'error', extracted:{items:[],gift_cards:[],tracking_numbers:[]}, error:`Failed to extract: ${err.message||'Unknown error'}` });
      }
    }
    setDrafts(prev=>[...newDrafts,...prev]);
    setExtracting(false);
  };

  const handleUpdate  = (idx,form) => setDrafts(prev=>prev.map((d,i)=>i===idx?{...d,extracted:form}:d));
  const handleDiscard = (idx)      => setDrafts(prev=>prev.filter((_,i)=>i!==idx));

  const handleConfirm = async (idx, form) => {
    const duplicate = form.order_number && existingOrders.some(o=>o.order_number===form.order_number);
    if (duplicate) { toast.error(`Order #${form.order_number} already exists`); return; }
    setConfirmingIdx(idx);
    try {
      const gcTotal       = (form.gift_cards||[]).reduce((s,gc)=>s+(parseFloat(gc.amount)||0),0);
      const itemsSubtotal = (form.items||[]).reduce((s,it)=>s+(parseFloat(it.unit_cost)||0)*(parseInt(it.quantity)||1),0);
      const tax           = parseFloat(form.tax)||0;
      const shipping      = parseFloat(form.shipping_cost)||0;
      const fees          = parseFloat(form.fees)||0;
      const totalCost     = itemsSubtotal+tax+shipping+fees;
      const finalCost     = totalCost-gcTotal;
      const matchedGcIds  = (form.gift_cards||[]).reduce((acc,gc)=>{ const m=giftCards.find(g=>String(g.last_four)===String(gc.last_four)&&g.status==='available'); if(m) acc.push(m.id); return acc; },[]);
      const hasSplits     = form.payment_splits?.length>1;
      const primaryCardId = hasSplits?(form.payment_splits[0]?.card_id||form.credit_card_id||null):(form.credit_card_id||null);
      const order = await base44.entities.PurchaseOrder.create({
        order_type: form.order_type_hint||'churning', order_number: form.order_number||`ORD-${Date.now()}`,
        retailer: form.retailer, order_date: form.order_date||today(), status:'ordered',
        tax, shipping_cost:shipping, fees, total_cost:totalCost, gift_card_value:gcTotal, final_cost:finalCost,
        credit_card_id:primaryCardId, payment_splits:hasSplits?form.payment_splits:[],
        gift_card_ids:matchedGcIds, tracking_numbers:(form.tracking_numbers||[]).filter(Boolean),
        notes:form.notes||null, imported_from:'invoice_upload',
        items:(form.items||[]).map(it=>({ product_id:it.product_id||null, product_name:it.product_name, sku:it.sku||null, upc:it.upc||null, model:it.model||null, quantity_ordered:parseInt(it.quantity)||1, quantity_received:0, unit_cost:parseFloat(it.unit_cost)||0, sale_price:parseFloat(it.sale_price)||0 })),
      });
      for (const gcId of matchedGcIds) await base44.entities.GiftCard.update(gcId,{status:'used',used_order_number:form.order_number});
      if (!hasSplits && primaryCardId && finalCost>0) {
        const card = creditCards.find(c=>c.id===primaryCardId);
        if (card?.cashback_rate) {
          const cb = parseFloat((finalCost*card.cashback_rate/100).toFixed(2));
          if (cb>0) await base44.entities.Reward.create({ credit_card_id:card.id, card_name:card.card_name, source:card.card_name, type:'cashback', currency:'USD', purchase_amount:finalCost, amount:cb, purchase_order_id:order.id, order_number:form.order_number, date_earned:form.order_date||today(), status:'pending', notes:`Auto from imported order ${form.order_number}` });
        }
      }
      queryClient.invalidateQueries({queryKey:['purchaseOrders']});
      queryClient.invalidateQueries({queryKey:['giftCards']});
      queryClient.invalidateQueries({queryKey:['rewards']});
      setDrafts(prev=>prev.map((d,i)=>i===idx?{...d,status:'confirmed'}:d));
      toast.success(`Order ${form.order_number||''} saved!`);
    } catch (err) {
      setDrafts(prev=>prev.map((d,i)=>i===idx?{...d,status:'error',error:err.message}:d));
      toast.error('Failed to save order');
    } finally {
      setConfirmingIdx(null);
    }
  };

  const pendingCount   = drafts.filter(d=>d.status!=='confirmed').length;
  const confirmedCount = drafts.filter(d=>d.status==='confirmed').length;

  return (
    <div style={{ maxWidth:860, margin:'0 auto', paddingBottom:40 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'var(--font-serif)', fontSize:24, fontWeight:900, color:'var(--ink)', letterSpacing:'-0.3px' }}>Import Orders</h1>
        <p style={{ fontSize:11, color:'var(--ink-dim)', marginTop:3 }}>Upload invoices or sync from Gmail to auto-import orders</p>
      </div>

      {/* Tab bar */}
      <div className="tab-bar" style={{ marginBottom:20, width:'fit-content' }}>
        {[
          { key:'upload', label:'Upload Invoice', icon:Upload, badge: pendingCount||null },
          { key:'gmail',  label:'Gmail Sync',     icon:Mail },
        ].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} className={`tab-btn${tab===t.key?' active':''}`}
            style={{ display:'flex', alignItems:'center', gap:6 }}>
            <t.icon style={{ width:13, height:13 }}/>
            {t.label}
            {t.badge && (
              <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:99, background: tab===t.key?'rgba(255,219,187,0.3)':'var(--parch-line)', color: tab===t.key?'var(--ne-cream)':'var(--ink-faded)' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Upload tab */}
      {tab==='upload' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <DropZone onFiles={handleFiles} loading={extracting}/>
          {drafts.length>0&&(
            <div style={{ display:'flex', alignItems:'center', gap:16, fontSize:13, padding:'0 4px' }}>
              <span style={{ color:'var(--ink-dim)' }}><strong style={{ color:'var(--ink)' }}>{drafts.length}</strong> invoice{drafts.length!==1?'s':''} imported</span>
              {confirmedCount>0&&<span style={{ color:'var(--terrain)', fontWeight:600 }}>✓ {confirmedCount} saved</span>}
              {pendingCount>0&&<span style={{ color:'var(--gold)', fontWeight:600 }}>{pendingCount} pending review</span>}
              <button onClick={()=>setDrafts(d=>d.filter(x=>x.status!=='confirmed'))} style={{ marginLeft:'auto', fontSize:11, color:'var(--ink-ghost)', background:'none', border:'none', cursor:'pointer' }}>Clear saved</button>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {drafts.map((draft,idx)=>(
              <ReviewCard key={draft.id} draft={draft} idx={idx} creditCards={creditCards} giftCards={giftCards} products={products} onUpdate={handleUpdate} onConfirm={handleConfirm} onDiscard={handleDiscard} confirming={confirmingIdx===idx}/>
            ))}
          </div>
          {drafts.length===0&&!extracting&&(
            <p style={{ textAlign:'center', padding:'32px 0', fontSize:13, color:'var(--ink-ghost)' }}>
              Upload a PDF or image of any order confirmation to get started
            </p>
          )}
        </div>
      )}

      {/* Gmail tab */}
      {tab==='gmail' && <GmailPanel userEmail={userEmail}/>}
    </div>
  );
}
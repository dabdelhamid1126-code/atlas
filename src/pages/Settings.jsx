import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  User, Database, Target, Key, Palette, Shield,
  ExternalLink, Check, Sparkles, DollarSign, Eye, EyeOff,
  Download, Upload, Trash2, Loader, X, Inbox, Plus,
  Store, Users, Pencil,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  EXACT VALUES FROM globals.css                                       */
/* ------------------------------------------------------------------ */
const C = {
  ink:        '#3D2B1A',
  inkDim:     '#664930',
  inkFaded:   '#8a6d56',
  inkGhost:   '#b89e8a',
  gold:       '#A0722A',
  gold2:      '#C4922E',
  goldBg:     'rgba(160,114,42,0.08)',
  goldBdr:    'rgba(160,114,42,0.22)',
  parchCard:  '#FFF8F0',
  parchWarm:  '#F5EDE0',
  parchLine:  'rgba(153,126,103,0.18)',
  parchDeep:  '#EDE0CC',
  ocean:      '#2a5c7a',
  ocean2:     '#336e90',
  oceanBg:    'rgba(42,92,122,0.08)',
  oceanBdr:   'rgba(42,92,122,0.2)',
  terrain:    '#4a7a35',
  terrain2:   '#5a8c42',
  terrainBg:  'rgba(74,122,53,0.08)',
  terrainBdr: 'rgba(74,122,53,0.2)',
  violet:     '#5a3a6e',
  violet2:    '#6e4a85',
  violetBg:   'rgba(90,58,110,0.08)',
  violetBdr:  'rgba(90,58,110,0.2)',
  crimson:    '#8b3a2a',
  crimson2:   '#a34535',
  crimsonBg:  'rgba(139,58,42,0.08)',
  crimsonBdr: 'rgba(139,58,42,0.2)',
  neCream:    '#FFDBBB',
};

const FONT = 'ui-sans-serif, system-ui, -apple-system, sans-serif';
const MONO = "ui-monospace, 'SF Mono', 'Consolas', monospace";

const card = {
  background:   C.parchCard,
  border:       `1px solid ${C.parchLine}`,
  borderRadius: 14,
  padding:      24,
  marginBottom: 20,
};

const INP = {
  background:   C.parchWarm,
  border:       `1px solid ${C.parchLine}`,
  borderRadius: 8,
  color:        C.ink,
  padding:      '8px 12px',
  fontSize:     13,
  outline:      'none',
  width:        '100%',
  fontFamily:   FONT,
};

/* ------------------------------------------------------------------ */
/*  SHARED COMPONENTS                                                   */
/* ------------------------------------------------------------------ */
function LBL({ children }) {
  return (
    <label style={{ fontFamily:FONT, fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:C.inkFaded, display:'block', marginBottom:4 }}>
      {children}
    </label>
  );
}

function SectionDivider({ title, color=C.gold }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, margin:'18px 0 12px' }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background:color, flexShrink:0 }}/>
      <span style={{ fontFamily:FONT, fontSize:10, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:C.inkFaded, whiteSpace:'nowrap' }}>{title}</span>
      <div style={{ flex:1, height:1, background:`linear-gradient(to right, rgba(160,114,42,0.25), transparent)` }}/>
    </div>
  );
}

function SectionRow({ icon:Icon, title, description, children, noBorder=false }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:noBorder?'none':`1px solid ${C.parchLine}` }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0, paddingRight:16 }}>
        {Icon&&<Icon style={{ width:16, height:16, color:C.inkDim, flexShrink:0 }}/>}
        <div style={{ minWidth:0 }}>
          <p style={{ fontSize:13, fontWeight:500, color:C.ink, margin:0, fontFamily:FONT }}>{title}</p>
          {description&&<p style={{ fontSize:11, color:C.inkDim, marginTop:2, fontFamily:FONT }}>{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onToggle }) {
  return (
    <button onClick={onToggle}
      style={{ position:'relative', width:40, height:22, borderRadius:99, border:'none', cursor:'pointer', background:on?C.gold:C.parchDeep, transition:'all 0.2s', flexShrink:0 }}>
      <span style={{ position:'absolute', top:3, left:on?21:3, width:16, height:16, borderRadius:'50%', background:'white', transition:'left 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }}/>
    </button>
  );
}

function BtnPrimary({ onClick, disabled, children, loading }) {
  return (
    <button onClick={onClick} disabled={disabled||loading}
      style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 18px', borderRadius:8, fontSize:12, fontWeight:700, background:disabled||loading?C.parchWarm:C.ink, border:disabled||loading?`1px solid ${C.parchLine}`:'none', color:disabled||loading?C.inkGhost:C.neCream, cursor:disabled||loading?'not-allowed':'pointer', fontFamily:FONT, transition:'opacity 0.15s' }}>
      {loading&&<div style={{ width:13, height:13, borderRadius:'50%', border:`2px solid ${C.neCream}`, borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>}
      {children}
    </button>
  );
}

function BtnGhost({ onClick, children }) {
  return (
    <button onClick={onClick}
      style={{ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:500, background:C.parchWarm, border:`1px solid ${C.parchLine}`, color:C.inkFaded, cursor:'pointer', fontFamily:FONT }}>
      {children}
    </button>
  );
}

const BRANDFETCH = '1idzVIG0BYPKsFIDJDI';

const getStoreDomain = (v) => {
  const n = String(v||'').toLowerCase().replace(/[\s\-_.']/g,'').replace(/[^a-z0-9]/g,'');
  if (n.includes('bestbuy'))  return 'bestbuy.com';
  if (n.includes('amazon'))   return 'amazon.com';
  if (n.includes('walmart'))  return 'walmart.com';
  if (n.includes('apple'))    return 'apple.com';
  if (n.includes('target'))   return 'target.com';
  if (n.includes('costco'))   return 'costco.com';
  if (n.includes('samsclub')||n.includes('sams')) return 'samsclub.com';
  if (n.includes('staples'))  return 'staples.com';
  if (n.includes('ebay'))     return 'ebay.com';
  if (n.includes('woot'))     return 'woot.com';
  if (n.includes('homedepot')) return 'homedepot.com';
  if (n.includes('bjs'))      return 'bjs.com';
  if (n.includes('kroger'))   return 'kroger.com';
  if (n.includes('macys'))    return 'macys.com';
  return null;
};

function VendorLogo({ name, size=28 }) {
  const [err, setErr] = useState(false);
  const domain = getStoreDomain(name);
  const url = domain ? `https://cdn.brandfetch.io/domain/${domain}?c=${BRANDFETCH}` : null;
  if (!url || err) return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:C.goldBg, border:`1px solid ${C.goldBdr}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:C.gold2, flexShrink:0, fontFamily:FONT }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
  return (
    <img src={url} alt={name} onError={()=>setErr(true)}
      style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:`1px solid ${C.parchLine}` }}/>
  );
}
function VendorsTab() {
  const DEFAULT_VENDORS = ['Amazon','Best Buy','Walmart','Target','Costco',"Sam's Club",'eBay','Woot','Apple','Staples'];
  const [vendors,  setVendors]  = useState([]);
  const [newName,  setNewName]  = useState('');
  const [editing,  setEditing]  = useState(null); // { index, value }
  const [saving,   setSaving]   = useState(false);

  useEffect(()=>{
    try {
      const stored = JSON.parse(localStorage.getItem('atlas_vendors')||'[]');
      // Merge defaults + saved, deduplicate
      const merged = [...new Set([...DEFAULT_VENDORS, ...stored])].sort();
      setVendors(merged);
    } catch { setVendors(DEFAULT_VENDORS); }
  },[]);

  const persist = (list) => {
    setVendors(list);
    try { localStorage.setItem('atlas_vendors', JSON.stringify(list)); } catch {}
  };

  const addVendor = () => {
    const name = newName.trim();
    if (!name) return;
    if (vendors.some(v=>v.toLowerCase()===name.toLowerCase())) { setNewName(''); return; }
    persist([...vendors, name].sort());
    setNewName('');
  };

  const removeVendor = (idx) => {
    persist(vendors.filter((_,i)=>i!==idx));
  };

  const saveEdit = () => {
    if (!editing) return;
    const name = editing.value.trim();
    if (!name) { setEditing(null); return; }
    const updated = vendors.map((v,i)=>i===editing.index?name:v).sort();
    persist(updated);
    setEditing(null);
  };

  const isDefault = (v) => DEFAULT_VENDORS.includes(v);

  return (
    <div style={card}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
        <Store style={{ width:16, height:16, color:C.gold }}/>
        <h2 style={{ fontFamily:FONT, fontSize:15, fontWeight:700, color:C.ink, margin:0 }}>Vendors</h2>
      </div>
      <p style={{ fontSize:12, color:C.inkDim, marginBottom:20, fontFamily:FONT }}>Manage your vendor list. These appear as suggestions when adding orders.</p>

      {/* Add new */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        <input
          type="text"
          value={newName}
          onChange={e=>setNewName(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&addVendor()}
          placeholder="Add new vendor..."
          style={{ ...INP, flex:1 }}
        />
        <button onClick={addVendor} disabled={!newName.trim()}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, fontSize:12, fontWeight:700, background:newName.trim()?C.ink:C.parchWarm, border:newName.trim()?'none':`1px solid ${C.parchLine}`, color:newName.trim()?C.neCream:C.inkGhost, cursor:newName.trim()?'pointer':'not-allowed', fontFamily:FONT, whiteSpace:'nowrap', flexShrink:0 }}>
          <Plus style={{ width:13, height:13 }}/> Add
        </button>
      </div>

      <SectionDivider title={`${vendors.length} vendors`}/>

      {/* Vendor list */}
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {vendors.map((v,i)=>(
          <div key={v+i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:C.parchWarm, border:`1px solid ${C.parchLine}` }}>
            {/* Logo */}
            <VendorLogo name={v} size={28}/>

            {editing?.index===i ? (
              <input
                autoFocus
                value={editing.value}
                onChange={e=>setEditing({...editing,value:e.target.value})}
                onKeyDown={e=>{ if(e.key==='Enter') saveEdit(); if(e.key==='Escape') setEditing(null); }}
                style={{ ...INP, flex:1, padding:'4px 8px', fontSize:12 }}
              />
            ) : (
              <span style={{ flex:1, fontSize:13, fontWeight:500, color:C.ink, fontFamily:FONT }}>{v}</span>
            )}

            {isDefault(v)&&!editing && (
              <span style={{ fontSize:9, color:C.inkGhost, fontStyle:'italic', flexShrink:0, fontFamily:FONT }}>default</span>
            )}

            <div style={{ display:'flex', gap:4, flexShrink:0 }}>
              {editing?.index===i ? (
                <>
                  <button onClick={saveEdit} style={{ padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:700, background:C.terrainBg, border:`1px solid ${C.terrainBdr}`, color:C.terrain2, cursor:'pointer', fontFamily:FONT }}>Save</button>
                  <button onClick={()=>setEditing(null)} style={{ padding:'4px 8px', borderRadius:6, fontSize:11, background:'none', border:'none', color:C.inkGhost, cursor:'pointer' }}>Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={()=>setEditing({index:i,value:v})} style={{ width:26, height:26, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:`1px solid ${C.parchLine}`, color:C.inkDim, cursor:'pointer' }}>
                    <Pencil style={{ width:11, height:11 }}/>
                  </button>
                  {!isDefault(v)&&(
                    <button onClick={()=>removeVendor(i)} style={{ width:26, height:26, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', background:C.crimsonBg, border:`1px solid ${C.crimsonBdr}`, color:C.crimson, cursor:'pointer' }}>
                      <Trash2 style={{ width:11, height:11 }}/>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize:11, color:C.inkGhost, marginTop:12, fontFamily:FONT }}>Default vendors cannot be deleted. Custom vendors can be edited or removed.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SELLERS TAB                                                         */
/* ------------------------------------------------------------------ */
function SellersTab() {
  const [sellers,  setSellers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [newName,  setNewName]  = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [editing,  setEditing]  = useState(null);
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async()=>{
    setLoading(true);
    try { const data = await base44.entities.Seller.list(); setSellers(data||[]); }
    catch { setSellers([]); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  const addSeller = async() => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await base44.entities.Seller.create({ name, email:newEmail.trim()||null, phone:newPhone.trim()||null });
      setNewName(''); setNewEmail(''); setNewPhone('');
      await load();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const deleteSeller = async(id) => {
    try { await base44.entities.Seller.delete(id); await load(); } catch(e) { console.error(e); }
  };

  const saveEdit = async() => {
    if (!editing) return;
    setSaving(true);
    try {
      await base44.entities.Seller.update(editing.id, { name:editing.name.trim(), email:editing.email?.trim()||null, phone:editing.phone?.trim()||null });
      setEditing(null);
      await load();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div style={card}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
        <Users style={{ width:16, height:16, color:C.ocean2 }}/>
        <h2 style={{ fontFamily:FONT, fontSize:15, fontWeight:700, color:C.ink, margin:0 }}>Sellers / Buyers</h2>
      </div>
      <p style={{ fontSize:12, color:C.inkDim, marginBottom:20, fontFamily:FONT }}>People or platforms you sell to. These appear in the Sales tab when recording a sale.</p>

      {/* Add new */}
      <div style={{ background:C.parchWarm, border:`1px solid ${C.parchLine}`, borderRadius:12, padding:16, marginBottom:20 }}>
        <SectionDivider title="Add New Seller"/>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:10 }}>
          <div>
            <LBL>Name *</LBL>
            <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addSeller()} placeholder="e.g. John Doe" style={INP}/>
          </div>
          <div>
            <LBL>Email</LBL>
            <input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="Optional" style={INP}/>
          </div>
          <div>
            <LBL>Phone</LBL>
            <input type="tel" value={newPhone} onChange={e=>setNewPhone(e.target.value)} placeholder="Optional" style={INP}/>
          </div>
        </div>
        <button onClick={addSeller} disabled={!newName.trim()||saving}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, fontSize:12, fontWeight:700, background:newName.trim()?C.ink:C.parchWarm, border:newName.trim()?'none':`1px solid ${C.parchLine}`, color:newName.trim()?C.neCream:C.inkGhost, cursor:newName.trim()?'pointer':'not-allowed', fontFamily:FONT }}>
          {saving?<div style={{ width:12, height:12, borderRadius:'50%', border:`2px solid ${C.neCream}`, borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>:<Plus style={{ width:13, height:13 }}/>}
          Add Seller
        </button>
      </div>

      <SectionDivider title={`${sellers.length} sellers`} color={C.ocean2}/>

      {/* Sellers list */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:32 }}>
          <div style={{ width:24, height:24, borderRadius:'50%', border:`3px solid ${C.oceanBg}`, borderTopColor:C.ocean2, animation:'spin 0.8s linear infinite' }}/>
        </div>
      ) : sellers.length===0 ? (
        <div style={{ textAlign:'center', padding:'32px 0', color:C.inkGhost, fontSize:13, fontFamily:FONT }}>
          No sellers yet -- add one above
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {sellers.map(s=>(
            <div key={s.id} style={{ background:C.parchWarm, border:`1px solid ${C.parchLine}`, borderRadius:12, padding:'12px 14px' }}>
              {editing?.id===s.id ? (
                <div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:8, marginBottom:10 }}>
                    <div><LBL>Name</LBL><input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})} style={INP}/></div>
                    <div><LBL>Email</LBL><input type="email" value={editing.email||''} onChange={e=>setEditing({...editing,email:e.target.value})} style={INP}/></div>
                    <div><LBL>Phone</LBL><input type="tel" value={editing.phone||''} onChange={e=>setEditing({...editing,phone:e.target.value})} style={INP}/></div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={saveEdit} disabled={saving}
                      style={{ padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:700, background:C.ink, color:C.neCream, border:'none', cursor:'pointer', fontFamily:FONT }}>
                      {saving?'Saving...':'Save'}
                    </button>
                    <button onClick={()=>setEditing(null)} style={{ padding:'6px 12px', borderRadius:8, fontSize:12, background:'none', border:`1px solid ${C.parchLine}`, color:C.inkFaded, cursor:'pointer', fontFamily:FONT }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  {/* Avatar */}
                  <div style={{ width:36, height:36, borderRadius:'50%', background:C.oceanBg, border:`1px solid ${C.oceanBdr}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:C.ocean2, flexShrink:0, fontFamily:FONT }}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:C.ink, margin:0, fontFamily:FONT }}>{s.name}</p>
                    <p style={{ fontSize:11, color:C.inkDim, marginTop:2, fontFamily:FONT }}>
                      {[s.email, s.phone].filter(Boolean).join('   ') || 'No contact info'}
                    </p>
                  </div>
                  <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                    <button onClick={()=>setEditing({id:s.id,name:s.name,email:s.email||'',phone:s.phone||''})}
                      style={{ width:28, height:28, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:`1px solid ${C.parchLine}`, color:C.inkDim, cursor:'pointer' }}>
                      <Pencil style={{ width:12, height:12 }}/>
                    </button>
                    <button onClick={()=>deleteSeller(s.id)}
                      style={{ width:28, height:28, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', background:C.crimsonBg, border:`1px solid ${C.crimsonBdr}`, color:C.crimson, cursor:'pointer' }}>
                      <Trash2 style={{ width:12, height:12 }}/>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EXISTING TABS (kept exactly, just restyled to match)               */
/* ------------------------------------------------------------------ */
function ProfileTab({ user }) {
  return (
    <div style={card}>
      <h2 style={{ fontFamily:FONT, fontSize:15, fontWeight:700, color:C.ink, marginBottom:20 }}>Profile</h2>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24 }}>
        <div style={{ width:52, height:52, borderRadius:'50%', background:C.gold, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'white', flexShrink:0, fontFamily:FONT }}>
          {user?.full_name?.charAt(0)||user?.email?.charAt(0)||'U'}
        </div>
        <div>
          <p style={{ fontFamily:FONT, fontSize:15, fontWeight:700, color:C.ink }}>{user?.full_name||'User'}</p>
          <p style={{ fontSize:12, color:C.inkDim, marginTop:2, fontFamily:FONT }}>Connected via Base44</p>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:16 }}>
        {[['Full Name',user?.full_name],['Email',user?.email],['Role',user?.role||'user']].map(([label,val])=>(
          <div key={label}>
            <LBL>{label}</LBL>
            <div style={{ ...INP, color:C.inkFaded, cursor:'not-allowed' }}>{val||'--'}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize:11, color:C.inkDim, fontFamily:FONT }}>Profile information is managed through your Base44 account.</p>
    </div>
  );
}

function DataSetupTab() {
  const pages = [
    { label:'Payment Methods', page:'PaymentMethods' },
    { label:'Products',        page:'Products'        },
    { label:'Import Orders',   page:'ImportOrders'    },
    { label:'Gift Cards',      page:'GiftCards'       },
  ];
  return (
    <div style={card}>
      <h2 style={{ fontFamily:FONT, fontSize:15, fontWeight:700, color:C.ink, marginBottom:8 }}>Data Setup</h2>
      <p style={{ fontSize:12, color:C.inkDim, marginBottom:16, fontFamily:FONT }}>Quick links to setup pages.</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:8 }}>
        {pages.map(p=>(
          <Link key={p.page} to={`/${p.page}`}
            style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'12px 14px', borderRadius:10, fontSize:13, fontWeight:500, color:C.ink, background:C.parchWarm, border:`1px solid ${C.parchLine}`, textDecoration:'none', fontFamily:FONT }}
            onMouseEnter={e=>{ e.currentTarget.style.background=C.goldBg; e.currentTarget.style.borderColor=C.goldBdr; e.currentTarget.style.color=C.gold2; }}
            onMouseLeave={e=>{ e.currentTarget.style.background=C.parchWarm; e.currentTarget.style.borderColor=C.parchLine; e.currentTarget.style.color=C.ink; }}>
            <span>{p.label}</span>
            <ExternalLink style={{ width:13, height:13, color:C.inkDim, flexShrink:0 }}/>
          </Link>
        ))}
      </div>
    </div>
  );
}

const GOAL_METRICS = [
  { metric:'profit',       label:'Profit',       color:C.terrain  },
  { metric:'revenue',      label:'Revenue',      color:C.ocean2   },
  { metric:'cashback',     label:'Cashback',     color:C.violet2  },
  { metric:'transactions', label:'Transactions', color:C.gold     },
];

function GoalsTab() {
  const [goals, setGoals] = useState(GOAL_METRICS.map(m=>({ metric:m.metric, period:'WEEKLY', target:'', isActive:false })));
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(()=>{
    const stored = localStorage.getItem('dalia_goals');
    if (stored) { try { setGoals(JSON.parse(stored)); } catch {} }
  },[]);

  const update = (idx, patch) => { setGoals(g=>g.map((r,i)=>i===idx?{...r,...patch}:r)); setSaved(false); };

  const handleSave = () => {
    setSaving(true);
    localStorage.setItem('dalia_goals', JSON.stringify(goals));
    setSaved(true);
    setTimeout(()=>setSaved(false), 3000);
    setSaving(false);
  };

  return (
    <div style={card}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <Target style={{ width:16, height:16, color:C.terrain2 }}/>
        <h2 style={{ fontFamily:FONT, fontSize:15, fontWeight:700, color:C.ink, margin:0 }}>Goal Tracking</h2>
      </div>
      <p style={{ fontSize:12, color:C.inkDim, marginBottom:20, fontFamily:FONT }}>Set targets. Active goals appear on your Dashboard.</p>
      <div>
        {goals.map((goal,idx)=>{
          const meta=GOAL_METRICS[idx];
          const isCurrency=goal.metric!=='transactions';
          return (
            <div key={goal.metric} style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:12, padding:'14px 0', borderBottom:idx<goals.length-1?`1px solid ${C.parchLine}`:'none' }}>
              <div style={{ width:100, flexShrink:0 }}>
                <p style={{ fontSize:13, fontWeight:700, color:meta.color, fontFamily:FONT }}>{meta.label}</p>
              </div>
              <div style={{ display:'flex', gap:2, padding:3, borderRadius:8, background:C.parchWarm, border:`1px solid ${C.parchLine}` }}>
                {['WEEKLY','MONTHLY'].map(p=>(
                  <button key={p} onClick={()=>update(idx,{period:p})}
                    style={{ padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', border:'none', background:goal.period===p?C.ink:'transparent', color:goal.period===p?C.neCream:C.inkDim, fontFamily:FONT }}>
                    {p==='WEEKLY'?'Weekly':'Monthly'}
                  </button>
                ))}
              </div>
              <div style={{ position:'relative', width:140 }}>
                {isCurrency&&<span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:C.inkGhost, fontSize:12 }}>$</span>}
                <input type="number" min="0" placeholder={isCurrency?'0.00':'0'} value={goal.target}
                  onChange={e=>update(idx,{target:e.target.value})}
                  style={{ ...INP, paddingLeft:isCurrency?26:12 }}/>
              </div>
              <Toggle on={goal.isActive} onToggle={()=>update(idx,{isActive:!goal.isActive})}/>
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:20 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 20px', borderRadius:8, fontSize:12, fontWeight:700, background:C.ink, border:'none', color:C.neCream, cursor:'pointer', fontFamily:FONT }}>
          {saving?'Saving...':'Save Goals'}
        </button>
        {saved&&<span style={{ fontSize:12, color:C.terrain2, display:'flex', alignItems:'center', gap:4, fontFamily:FONT }}><Check style={{ width:13, height:13 }}/> Saved</span>}
      </div>
    </div>
  );
}

const EXPORT_ITEMS = [
  { key:'orders',      label:'Purchase Orders', description:'All order records'        },
  { key:'rewards',     label:'Rewards',         description:'Cashback & reward entries' },
  { key:'invoices',    label:'Invoices',        description:'Invoice records'           },
  { key:'creditCards', label:'Payment Methods', description:'Credit card info'          },
];

function DataTab() {
  const [sel, setSel]         = useState(Object.fromEntries(EXPORT_ITEMS.map(i=>[i.key,true])));
  const [exporting, setExp]   = useState(false);
  const [exported, setExp2]   = useState(false);
  const [importing, setImp]   = useState(false);
  const [importResult, setIR] = useState(null);
  const [stage, setStage]     = useState('idle');
  const [resetInput, setRI]   = useState('');
  const [deleted, setDeleted] = useState(null);
  const fileRef = useRef(null);
  const CONFIRM = 'DELETE ALL MY DATA';

  const handleExport = async() => {
    setExp(true);
    try {
      const data={};
      if(sel.orders)      data.orders      = await base44.entities.PurchaseOrder.list();
      if(sel.rewards)     data.rewards     = await base44.entities.Reward.list();
      if(sel.invoices)    data.invoices    = await base44.entities.Invoice.list();
      if(sel.creditCards) data.creditCards = await base44.entities.CreditCard.list();
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url; a.download=`atlas-export-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      setExp2(true); setTimeout(()=>setExp2(false),3000);
    } catch(err) { alert('Export failed: '+err.message); }
    finally { setExp(false); }
  };

  const handleImport = async(e) => {
    const file=e.target.files?.[0]; if(!file) return;
    setImp(true); setIR(null);
    try {
      const json=JSON.parse(await file.text()); const summary={};
      if(json.orders)   { for(const o of json.orders)   await base44.entities.PurchaseOrder.create(o); summary['Purchase Orders']=json.orders.length; }
      if(json.rewards)  { for(const r of json.rewards)  await base44.entities.Reward.create(r);        summary['Rewards']=json.rewards.length; }
      if(json.invoices) { for(const i of json.invoices) await base44.entities.Invoice.create(i);       summary['Invoices']=json.invoices.length; }
      setIR({success:true,summary});
    } catch(err) { setIR({success:false,error:err.message}); }
    finally { setImp(false); if(fileRef.current) fileRef.current.value=''; }
  };

  const handleReset = async() => {
    setStage('deleting');
    try {
      const [orders,rewards,invoices,cards]=await Promise.all([base44.entities.PurchaseOrder.list(),base44.entities.Reward.list(),base44.entities.Invoice.list(),base44.entities.CreditCard.list()]);
      await Promise.all([...orders.map(o=>base44.entities.PurchaseOrder.delete(o.id)),...rewards.map(r=>base44.entities.Reward.delete(r.id)),...invoices.map(i=>base44.entities.Invoice.delete(i.id)),...cards.map(c=>base44.entities.CreditCard.delete(c.id))]);
      setDeleted({'Purchase Orders':orders.length,Rewards:rewards.length,Invoices:invoices.length,'Payment Methods':cards.length});
      setStage('done');
    } catch(err) { alert('Reset failed: '+err.message); setStage('idle'); }
  };

  const resetAll=()=>{ setStage('idle'); setRI(''); setDeleted(null); };

  return (
    <div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {/* Export */}
      <div style={card}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <Download style={{ width:16, height:16, color:C.terrain2 }}/>
          <h2 style={{ fontFamily:FONT, fontSize:15, fontWeight:700, color:C.ink, margin:0 }}>Export Data</h2>
        </div>
        <p style={{ fontSize:12, color:C.inkDim, marginBottom:16, fontFamily:FONT }}>Select which data to include in your export file.</p>
        <div style={{ display:'flex', gap:12, marginBottom:12, fontSize:11 }}>
          <button onClick={()=>setSel(Object.fromEntries(EXPORT_ITEMS.map(i=>[i.key,true])))} style={{ background:'none', border:'none', color:C.terrain2, cursor:'pointer', fontWeight:600, fontFamily:FONT }}>Select all</button>
          <span style={{ color:C.parchLine }}>|</span>
          <button onClick={()=>setSel(Object.fromEntries(EXPORT_ITEMS.map(i=>[i.key,false])))} style={{ background:'none', border:'none', color:C.inkDim, cursor:'pointer', fontFamily:FONT }}>Deselect all</button>
        </div>
        <div style={{ marginBottom:16 }}>
          {EXPORT_ITEMS.map(item=>(
            <button key={item.key} onClick={()=>setSel(s=>({...s,[item.key]:!s[item.key]}))}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 12px', borderRadius:8, background:'none', border:'none', cursor:'pointer', marginBottom:4, textAlign:'left', fontFamily:FONT }}
              onMouseEnter={e=>e.currentTarget.style.background=C.parchWarm}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              <div style={{ width:16, height:16, borderRadius:4, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:sel[item.key]?C.ink:'transparent', border:sel[item.key]?'none':`1.5px solid ${C.parchLine}` }}>
                {sel[item.key]&&<Check style={{ width:10, height:10, color:C.neCream }}/>}
              </div>
              <div>
                <p style={{ fontSize:13, fontWeight:500, color:C.ink, margin:0, fontFamily:FONT }}>{item.label}</p>
                <p style={{ fontSize:11, color:C.inkDim, margin:0, fontFamily:FONT }}>{item.description}</p>
              </div>
            </button>
          ))}
        </div>
        <button onClick={handleExport} disabled={!Object.values(sel).some(Boolean)||exporting}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 18px', borderRadius:8, fontSize:12, fontWeight:700, background:Object.values(sel).some(Boolean)?C.ink:C.parchWarm, border:Object.values(sel).some(Boolean)?'none':`1px solid ${C.parchLine}`, color:Object.values(sel).some(Boolean)?C.neCream:C.inkGhost, cursor:'pointer', fontFamily:FONT }}>
          {exporting?<Loader style={{ width:14, height:14, animation:'spin 0.8s linear infinite' }}/>:exported?<Check style={{ width:14, height:14 }}/>:<Download style={{ width:14, height:14 }}/>}
          {exporting?'Exporting...':exported?'Downloaded!':'Export as JSON'}
        </button>
      </div>
      {/* Import */}
      <div style={card}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <Upload style={{ width:16, height:16, color:C.ocean2 }}/>
          <h2 style={{ fontFamily:FONT, fontSize:15, fontWeight:700, color:C.ink, margin:0 }}>Import Data</h2>
        </div>
        <p style={{ fontSize:12, color:C.inkDim, marginBottom:16, fontFamily:FONT }}>Import a previously exported JSON file.</p>
        <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleImport} style={{ display:'none' }}/>
        <button onClick={()=>fileRef.current?.click()} disabled={importing}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:500, background:C.parchWarm, border:`1px solid ${C.parchLine}`, color:C.inkFaded, cursor:'pointer', fontFamily:FONT }}>
          {importing?<Loader style={{ width:14, height:14, animation:'spin 0.8s linear infinite' }}/>:<Upload style={{ width:14, height:14 }}/>}
          {importing?'Importing...':'Choose JSON File'}
        </button>
        {importResult&&(
          <div style={{ marginTop:12, padding:'10px 14px', borderRadius:8, background:importResult.success?C.terrainBg:C.crimsonBg, border:`1px solid ${importResult.success?C.terrainBdr:C.crimsonBdr}`, fontSize:12, color:importResult.success?C.terrain2:C.crimson2, fontFamily:FONT }}>
            {importResult.success
              ?<><p style={{ fontWeight:700, margin:'0 0 4px' }}>Import complete</p>{Object.entries(importResult.summary||{}).map(([k,v])=><p key={k} style={{ margin:0 }}>{k}: <span style={{ fontWeight:600 }}>{v}</span> records</p>)}</>
              :<p style={{ margin:0 }}>{importResult.error||'Import failed'}</p>}
          </div>
        )}
      </div>
      {/* Danger Zone */}
      <div style={{ ...card, border:`1px solid ${C.crimsonBdr}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <Trash2 style={{ width:16, height:16, color:C.crimson }}/>
          <h2 style={{ fontFamily:FONT, fontSize:15, fontWeight:700, color:C.ink, margin:0 }}>Danger Zone</h2>
        </div>
        <p style={{ fontSize:12, color:C.inkDim, marginBottom:16, fontFamily:FONT }}>Permanently delete all your data. This cannot be undone.</p>
        {stage==='idle'&&<button onClick={()=>setStage('confirm')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:600, background:C.crimsonBg, border:`1px solid ${C.crimsonBdr}`, color:C.crimson, cursor:'pointer', fontFamily:FONT }}><Trash2 style={{ width:13, height:13 }}/> Reset All Data</button>}
        {stage==='confirm'&&(
          <div style={{ padding:14, borderRadius:10, background:C.crimsonBg, border:`1px solid ${C.crimsonBdr}` }}>
            <p style={{ fontSize:13, fontWeight:600, color:C.crimson, marginBottom:8, fontFamily:FONT }}>Are you absolutely sure? This is irreversible.</p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setStage('typing')} style={{ padding:'7px 16px', borderRadius:8, fontSize:13, fontWeight:700, background:C.crimson2, border:'none', color:'white', cursor:'pointer', fontFamily:FONT }}>Yes, delete everything</button>
              <BtnGhost onClick={resetAll}>Cancel</BtnGhost>
            </div>
          </div>
        )}
        {stage==='typing'&&(
          <div style={{ padding:14, borderRadius:10, background:C.crimsonBg, border:`1px solid ${C.crimsonBdr}` }}>
            <p style={{ fontSize:12, color:C.inkDim, marginBottom:8, fontFamily:FONT }}>
              Type <code style={{ background:C.crimsonBg, color:C.crimson, padding:'1px 6px', borderRadius:4, fontFamily:MONO, border:`1px solid ${C.crimsonBdr}` }}>{CONFIRM}</code> to confirm.
            </p>
            <input type="text" value={resetInput} onChange={e=>setRI(e.target.value)} placeholder={CONFIRM} autoFocus style={{ ...INP, marginBottom:10 }}/>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={handleReset} disabled={resetInput!==CONFIRM} style={{ padding:'7px 16px', borderRadius:8, fontSize:13, fontWeight:700, background:C.crimson2, border:'none', color:'white', cursor:'pointer', opacity:resetInput!==CONFIRM?0.4:1, fontFamily:FONT }}>Permanently Delete</button>
              <BtnGhost onClick={resetAll}>Cancel</BtnGhost>
            </div>
          </div>
        )}
        {stage==='deleting'&&<div style={{ display:'flex', alignItems:'center', gap:8, color:C.crimson, fontSize:13, fontFamily:FONT }}><Loader style={{ width:15, height:15, animation:'spin 0.8s linear infinite' }}/> Deleting all data...</div>}
        {stage==='done'&&deleted&&(
          <div style={{ padding:14, borderRadius:10, background:C.crimsonBg, border:`1px solid ${C.crimsonBdr}` }}>
            <p style={{ fontSize:13, fontWeight:700, color:C.crimson, marginBottom:8, fontFamily:FONT }}>All data has been deleted.</p>
            {Object.entries(deleted).map(([k,v])=><p key={k} style={{ fontSize:11, color:C.inkDim, margin:'2px 0', fontFamily:FONT }}>{k}: {v} removed</p>)}
            <BtnGhost onClick={resetAll}>Close</BtnGhost>
          </div>
        )}
      </div>
    </div>
  );
}

function ApiKeysTab() {
  const [apiKey, setApiKey]     = useState('');
  const [masked, setMasked]     = useState(null);
  const [connected, setConn]    = useState(false);
  const [showKey, setShowKey]   = useState(false);
  const [message, setMessage]   = useState(null);

  useEffect(()=>{
    const stored=localStorage.getItem('dalia_track17_key');
    if(stored){setConn(true);setMasked(stored.slice(0,4)+'...'+stored.slice(-4));}
  },[]);

  const save=()=>{
    if(apiKey.trim()){localStorage.setItem('dalia_track17_key',apiKey.trim());setConn(true);setMasked(apiKey.slice(0,4)+'...'+apiKey.slice(-4));setMessage({type:'success',text:'API key saved'});}
    else{localStorage.removeItem('dalia_track17_key');setConn(false);setMasked(null);setMessage({type:'success',text:'API key removed'});}
    setApiKey('');
  };
  const remove=()=>{localStorage.removeItem('dalia_track17_key');setConn(false);setMasked(null);setApiKey('');};

  return (
    <div style={card}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
        <Key style={{ width:16, height:16, color:C.violet2 }}/>
        <h2 style={{ fontFamily:FONT, fontSize:15, fontWeight:700, color:C.ink, margin:0 }}>API Keys</h2>
      </div>
      <div style={{ padding:16, borderRadius:10, background:C.parchWarm, border:`1px solid ${C.parchLine}` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <p style={{ fontSize:13, fontWeight:700, color:C.ink, fontFamily:FONT }}>17TRACK</p>
          {connected&&<span style={{ fontSize:10, fontWeight:700, padding:'2px 10px', borderRadius:99, background:C.terrainBg, color:C.terrain2, border:`1px solid ${C.terrainBdr}`, fontFamily:FONT }}>Connected</span>}
        </div>
        {connected&&masked&&(
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background:C.parchCard, border:`1px solid ${C.parchLine}`, marginBottom:12 }}>
            <code style={{ fontSize:12, color:C.inkFaded, flex:1, fontFamily:MONO }}>{masked}</code>
            <button onClick={remove} style={{ fontSize:11, fontWeight:600, color:C.crimson, background:C.crimsonBg, border:`1px solid ${C.crimsonBdr}`, borderRadius:6, padding:'3px 10px', cursor:'pointer', fontFamily:FONT }}>Remove</button>
          </div>
        )}
        <div style={{ position:'relative', marginBottom:10 }}>
          <input type={showKey?'text':'password'} value={apiKey} onChange={e=>setApiKey(e.target.value)}
            placeholder={connected?'Enter new key to replace...':'Enter your 17TRACK API key'}
            style={{ ...INP, paddingRight:40 }} autoComplete="off"/>
          <button type="button" onClick={()=>setShowKey(!showKey)}
            style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:C.inkDim, cursor:'pointer', padding:0 }}>
            {showKey?<EyeOff style={{ width:14, height:14 }}/>:<Eye style={{ width:14, height:14 }}/>}
          </button>
        </div>
        <button onClick={save} disabled={!apiKey.trim()}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:8, fontSize:12, fontWeight:700, background:apiKey.trim()?C.ink:C.parchWarm, border:apiKey.trim()?'none':`1px solid ${C.parchLine}`, color:apiKey.trim()?C.neCream:C.inkGhost, cursor:'pointer', fontFamily:FONT }}>
          {connected?'Update Key':'Save Key'}
        </button>
        {message&&<p style={{ marginTop:10, fontSize:12, color:C.terrain2, display:'flex', alignItems:'center', gap:4, fontFamily:FONT }}><Check style={{ width:12, height:12 }}/> {message.text}</p>}
      </div>
    </div>
  );
}

function SecurityTab({ user }) {
  return (
    <div style={card}>
      <h2 style={{ fontFamily:FONT, fontSize:15, fontWeight:700, color:C.ink, marginBottom:16 }}>Security</h2>
      <SectionRow title="Authentication" description="Signed in via Base44">
        <span style={{ fontSize:10, fontWeight:700, padding:'2px 10px', borderRadius:99, background:C.terrainBg, color:C.terrain2, border:`1px solid ${C.terrainBdr}`, fontFamily:FONT }}>Active</span>
      </SectionRow>
      <SectionRow title="Session" description="Your current browser session">
        <span style={{ fontSize:11, color:C.inkDim, fontFamily:FONT }}>Current</span>
      </SectionRow>
      <SectionRow title="Account" description={user?.email||'--'} noBorder>
        <span style={{ fontSize:11, color:C.inkDim, fontFamily:FONT }}>{user?.role||'user'}</span>
      </SectionRow>
    </div>
  );
}

function AppearanceTab() {
  const [settings, setSettings] = useState(()=>{ try{return JSON.parse(localStorage.getItem('dalia_appearance')||'{}');}catch{return {};} });
  const upd=(key,val)=>{ const next={...settings,[key]:val}; setSettings(next); localStorage.setItem('dalia_appearance',JSON.stringify(next)); };

  const dashToggles=[
    { key:'splitYACashback',         label:'Split YA Cashback',   description:'Show CC and YA cashback as separate KPIs',  icon:Sparkles,   color:C.gold     },
    { key:'costIncludesTaxShipping',  label:'Include Tax in Cost', description:'Total Cost will include taxes and shipping', icon:DollarSign, color:C.ocean2   },
    { key:'showPipeline',             label:'Status Pipeline',     description:'Show the status pipeline on the Dashboard',  icon:Inbox,      color:C.violet2  },
    { key:'showProductImages',        label:'Show Product Images', description:'Display product thumbnails in Transactions', icon:Eye,        color:C.ocean2   },
    { key:'showGoals',                label:'Goal Tracker',        description:'Show the goal tracker on the Dashboard',     icon:Target,     color:C.terrain2 },
  ];

  return (
    <div style={card}>
      <h2 style={{ fontFamily:FONT, fontSize:15, fontWeight:700, color:C.ink, marginBottom:20 }}>Appearance</h2>
      <SectionDivider title="Dashboard & Analytics"/>
      {dashToggles.map((t,i)=>(
        <SectionRow key={t.key} icon={t.icon} title={t.label} description={t.description} noBorder={i===dashToggles.length-1}>
          <Toggle on={settings[t.key]!==false} onToggle={()=>upd(t.key,!settings[t.key])}/>
        </SectionRow>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN SETTINGS PAGE                                                  */
/* ------------------------------------------------------------------ */
const TABS = [
  { key:'profile',    label:'Profile',    icon:User     },
  { key:'navigation', label:'Data Setup', icon:Database },
  { key:'vendors',    label:'Vendors',    icon:Store    },
  { key:'sellers',    label:'Sellers',    icon:Users    },
  { key:'goals',      label:'Goals',      icon:Target   },
  { key:'data',       label:'Data',       icon:Download },
  { key:'api-keys',   label:'API Keys',   icon:Key      },
  { key:'appearance', label:'Appearance', icon:Palette  },
  { key:'security',   label:'Security',   icon:Shield   },
];

export default function Settings() {
  const [user, setUser] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam||'profile');

  useEffect(()=>{ base44.auth.me().then(setUser).catch(()=>{}); },[]);
  useEffect(()=>{ if(tabParam) setActiveTab(tabParam); },[tabParam]);

  const switchTab = key => { setActiveTab(key); setSearchParams({tab:key}); };

  return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ marginBottom:24 }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account preferences</p>
      </div>
      <div style={{ display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' }}>
        {/* Sidebar nav */}
        <div style={{ width:180, flexShrink:0 }}>
          <nav style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {TABS.map(tab=>(
              <button key={tab.key} onClick={()=>switchTab(tab.key)}
                style={{
                  display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:10,
                  fontSize:12, fontWeight:500, cursor:'pointer', textAlign:'left', fontFamily:FONT,
                  border:activeTab===tab.key?`1px solid ${C.goldBdr}`:`1px solid transparent`,
                  borderLeft:activeTab===tab.key?`2px solid ${C.gold}`:`2px solid transparent`,
                  background:activeTab===tab.key?C.goldBg:'transparent',
                  color:activeTab===tab.key?C.gold2:C.inkDim,
                }}>
                <tab.icon style={{ width:14, height:14, flexShrink:0 }}/>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        {/* Content */}
        <div style={{ flex:1, minWidth:0 }}>
          {activeTab==='profile'    && <ProfileTab    user={user}/>}
          {activeTab==='navigation' && <DataSetupTab />}
          {activeTab==='vendors'    && <VendorsTab />}
          {activeTab==='sellers'    && <SellersTab />}
          {activeTab==='goals'      && <GoalsTab />}
          {activeTab==='data'       && <DataTab />}
          {activeTab==='api-keys'   && <ApiKeysTab />}
          {activeTab==='appearance' && <AppearanceTab />}
          {activeTab==='security'   && <SecurityTab user={user}/>}
        </div>
      </div>
    </div>
  );
}
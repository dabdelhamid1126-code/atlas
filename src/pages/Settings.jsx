import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  User, Database, Target, Palette, Shield,
  ExternalLink, Check, Sparkles, DollarSign, Eye, EyeOff,
  Download, Upload, Trash2, Loader, X, Inbox, Plus,
  Store, Users, Pencil, CreditCard, Package, Gift,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  CSS VAR ALIASES — theme-aware                                      */
/* ------------------------------------------------------------------ */
const C = {
  ink:        'var(--ink)',
  inkDim:     'var(--ink-dim)',
  inkFaded:   'var(--ink-faded)',
  inkGhost:   'var(--ink-ghost)',
  gold:       'var(--gold)',
  gold2:      'var(--gold2)',
  goldBg:     'var(--gold-bg)',
  goldBdr:    'var(--gold-bdr)',
  parchCard:  'var(--parch-card)',
  parchWarm:  'var(--parch-warm)',
  parchLine:  'var(--parch-line)',
  parchDeep:  'var(--parch-deep)',
  ocean:      'var(--ocean)',
  ocean2:     'var(--ocean2)',
  oceanBg:    'var(--ocean-bg)',
  oceanBdr:   'var(--ocean-bdr)',
  terrain:    'var(--terrain)',
  terrain2:   'var(--terrain2)',
  terrainBg:  'var(--terrain-bg)',
  terrainBdr: 'var(--terrain-bdr)',
  violet:     'var(--violet)',
  violet2:    'var(--violet2)',
  violetBg:   'var(--violet-bg)',
  violetBdr:  'var(--violet-bdr)',
  crimson:    'var(--crimson)',
  crimson2:   'var(--crimson2)',
  crimsonBg:  'var(--crimson-bg)',
  crimsonBdr: 'var(--crimson-bdr)',
  neCream:    'var(--ne-cream)',
};

const FONT = 'var(--font-sans)';
const MONO = 'var(--font-mono)';

const card = {
  background:   'var(--parch-card)',
  border:       '1px solid var(--parch-line)',
  borderRadius: 14,
  padding:      24,
  marginBottom: 20,
};

const INP = {
  background:   'var(--parch-warm)',
  border:       '1px solid var(--parch-line)',
  borderRadius: 8,
  color:        'var(--ink)',
  padding:      '8px 12px',
  fontSize:     13,
  outline:      'none',
  width:        '100%',
  fontFamily:   'var(--font-sans)',
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
/*  PROFILE TAB                                                         */
/* ------------------------------------------------------------------ */
function ProfileTab({ user }) {
  const STORAGE_KEY = 'atlas_profile_extra';

  const [photo,    setPhoto]    = useState(null);
  const [phone,    setPhone]    = useState('');
  const [company,  setCompany]  = useState('');
  const [location, setLocation] = useState('');
  const [bio,      setBio]      = useState('');
  const [saved,    setSaved]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  // Load saved extras from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (stored.photo)    setPhoto(stored.photo);
      if (stored.phone)    setPhone(stored.phone);
      if (stored.company)  setCompany(stored.company);
      if (stored.location) setLocation(stored.location);
      if (stored.bio)      setBio(stored.bio);
    } catch {}
  }, []);

  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setPhoto(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e) => handleImageFile(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleImageFile(e.dataTransfer.files?.[0]);
  };

  const removePhoto = () => { setPhoto(null); if (fileRef.current) fileRef.current.value = ''; };

  const handleSave = () => {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ photo, phone, company, location, bio }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const initials = (user?.full_name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={card}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
        <User style={{ width:16, height:16, color:C.gold }}/>
        <h2 style={{ fontFamily:FONT, fontSize:15, fontWeight:700, color:C.ink, margin:0 }}>Profile</h2>
      </div>

      {/* ── Avatar upload ── */}
      <SectionDivider title="Profile Photo"/>
      <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:24, flexWrap:'wrap' }}>
        {/* Avatar circle */}
        <div style={{ position:'relative', flexShrink:0 }}>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              width:80, height:80, borderRadius:'50%', cursor:'pointer',
              border:`2px ${dragOver ? 'solid' : 'dashed'} ${dragOver ? C.gold : C.parchLine}`,
              background: dragOver ? C.goldBg : C.parchWarm,
              display:'flex', alignItems:'center', justifyContent:'center',
              overflow:'hidden', transition:'all 0.2s', position:'relative',
            }}>
            {photo
              ? <img src={photo} alt="Profile" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              : <span style={{ fontSize:26, fontWeight:800, color:C.gold, fontFamily:FONT }}>{initials}</span>
            }
            {/* Hover overlay */}
            <div style={{
              position:'absolute', inset:0, borderRadius:'50%',
              background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center',
              justifyContent:'center', opacity:0, transition:'opacity 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
              <span style={{ fontSize:10, color:'white', fontWeight:700, fontFamily:FONT, textAlign:'center', padding:'0 6px' }}>CHANGE</span>
            </div>
          </div>
          {/* Remove button */}
          {photo && (
            <button onClick={removePhoto} style={{
              position:'absolute', top:-2, right:-2, width:20, height:20, borderRadius:'50%',
              background:C.crimson2, border:'2px solid white', color:'white', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900,
            }}>×</button>
          )}
        </div>

        <div>
          <p style={{ fontSize:13, fontWeight:700, color:C.ink, fontFamily:FONT, marginBottom:4 }}>
            {user?.full_name || 'User'}
          </p>
          <p style={{ fontSize:11, color:C.inkDim, fontFamily:FONT, marginBottom:10 }}>
            Connected via Base44
          </p>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => fileRef.current?.click()} style={{
              padding:'6px 14px', borderRadius:8, fontSize:11, fontWeight:700,
              background:C.ink, border:'none', color:C.neCream, cursor:'pointer', fontFamily:FONT,
            }}>Upload Photo</button>
            {photo && (
              <button onClick={removePhoto} style={{
                padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:600,
                background:C.crimsonBg, border:`1px solid ${C.crimsonBdr}`, color:C.crimson2,
                cursor:'pointer', fontFamily:FONT,
              }}>Remove</button>
            )}
          </div>
          <p style={{ fontSize:10, color:C.inkGhost, marginTop:6, fontFamily:FONT }}>
            JPG, PNG or GIF · Max 5MB · Click or drag to upload
          </p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileInput} style={{ display:'none' }}/>
      </div>

      {/* ── Read-only Base44 fields ── */}
      <SectionDivider title="Account Info" color={C.ocean2}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
        {[['Full Name', user?.full_name], ['Email', user?.email], ['Role', user?.role || 'user']].map(([label, val]) => (
          <div key={label}>
            <LBL>{label}</LBL>
            <div style={{ ...INP, color:C.inkFaded, cursor:'not-allowed', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{val || '--'}</span>
              <span style={{ fontSize:9, color:C.inkGhost, fontFamily:FONT, flexShrink:0 }}>Base44</span>
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize:10, color:C.inkGhost, fontFamily:FONT, marginBottom:20, display:'flex', alignItems:'center', gap:4 }}>
        <Shield style={{ width:11, height:11 }}/> Name and email are managed by your Base44 account and cannot be changed here.
      </p>

      {/* ── Editable fields ── */}
      <SectionDivider title="Additional Info" color={C.terrain2}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:16 }}>
        <div>
          <LBL>Phone Number</LBL>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            style={INP}
          />
        </div>
        <div>
          <LBL>Company / Business</LBL>
          <input
            type="text"
            value={company}
            onChange={e => setCompany(e.target.value)}
            placeholder="Your business name"
            style={INP}
          />
        </div>
        <div>
          <LBL>Location</LBL>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="City, State"
            style={INP}
          />
        </div>
      </div>
      <div style={{ marginBottom:20 }}>
        <LBL>Bio / Notes</LBL>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="A short note about yourself or your business..."
          rows={3}
          style={{ ...INP, resize:'vertical', lineHeight:1.5 }}
        />
      </div>

      {/* ── Save button ── */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={handleSave} disabled={saving} style={{
          display:'flex', alignItems:'center', gap:6, padding:'9px 22px',
          borderRadius:8, fontSize:12, fontWeight:700,
          background:C.ink, border:'none', color:C.neCream,
          cursor:'pointer', fontFamily:FONT, opacity: saving ? 0.6 : 1,
        }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {saved && (
          <span style={{ fontSize:12, color:C.terrain2, display:'flex', alignItems:'center', gap:4, fontFamily:FONT }}>
            <Check style={{ width:13, height:13 }}/> Saved successfully
          </span>
        )}
      </div>
    </div>
  );
}

function DataSetupTab() {
  const pages = [
    { label:'Payment Methods', page:'PaymentMethods', icon:CreditCard,  desc:'Add credit cards and cashback rates',   color:C.ocean2   },
    { label:'Products',        page:'Products',       icon:Package,     desc:'Manage your master product catalog',    color:C.terrain2 },
    { label:'Import Orders',   page:'ImportOrders',   icon:Upload,      desc:'Import via PDF invoice or Gmail sync',  color:C.violet2  },
    { label:'Gift Cards',      page:'GiftCards',      icon:Gift,        desc:'Track available gift card balances',    color:C.gold     },
  ];
  return (
    <div style={card}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <Database style={{ width:16, height:16, color:C.ocean2 }}/>
        <h2 style={{ fontFamily:FONT, fontSize:15, fontWeight:700, color:C.ink, margin:0 }}>Data Setup</h2>
      </div>
      <p style={{ fontSize:12, color:C.inkDim, marginBottom:20, fontFamily:FONT }}>Quick links to set up the key parts of your account.</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:10 }}>
        {pages.map(p => {
          const Icon = p.icon;
          return (
            <Link key={p.page} to={`/${p.page}`}
              style={{ display:'flex', flexDirection:'column', gap:10, padding:'14px 16px', borderRadius:12, fontSize:13, color:C.ink, background:C.parchWarm, border:`1px solid ${C.parchLine}`, textDecoration:'none', fontFamily:FONT, transition:'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background=C.goldBg; e.currentTarget.style.borderColor=C.goldBdr; }}
              onMouseLeave={e => { e.currentTarget.style.background=C.parchWarm; e.currentTarget.style.borderColor=C.parchLine; }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ width:32, height:32, borderRadius:8, background:C.parchCard, border:`1px solid ${C.parchLine}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon style={{ width:15, height:15, color:p.color }}/>
                </div>
                <ExternalLink style={{ width:12, height:12, color:C.inkGhost }}/>
              </div>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:C.ink, fontFamily:FONT, margin:0 }}>{p.label}</p>
                <p style={{ fontSize:11, color:C.inkDim, fontFamily:FONT, margin:0, marginTop:3 }}>{p.desc}</p>
              </div>
            </Link>
          );
        })}
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

function SecurityTab({ user }) {
  const [signedOut, setSignedOut] = useState(false);
  const loginTime = useState(() => {
    const stored = localStorage.getItem('atlas_login_time');
    if (!stored) {
      const now = new Date().toISOString();
      localStorage.setItem('atlas_login_time', now);
      return now;
    }
    return stored;
  })[0];

  const fmtTime = (iso) => {
    try {
      return new Date(iso).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' });
    } catch { return 'Unknown'; }
  };

  const handleSignOut = async () => {
    try { await base44.auth.logout(); } catch {}
    localStorage.removeItem('atlas_login_time');
    setSignedOut(true);
    setTimeout(() => window.location.href = '/', 1200);
  };

  return (
    <div style={card}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
        <Shield style={{ width:16, height:16, color:C.ocean2 }}/>
        <h2 style={{ fontFamily:FONT, fontSize:15, fontWeight:700, color:C.ink, margin:0 }}>Security</h2>
      </div>

      <SectionDivider title="Session Info" color={C.ocean2}/>
      <SectionRow title="Authentication" description="Signed in via Base44 OAuth">
        <span style={{ fontSize:10, fontWeight:700, padding:'2px 10px', borderRadius:99, background:C.terrainBg, color:C.terrain2, border:`1px solid ${C.terrainBdr}`, fontFamily:FONT }}>Active</span>
      </SectionRow>
      <SectionRow title="Signed In" description={`Session started ${fmtTime(loginTime)}`}>
        <span style={{ fontSize:11, color:C.inkDim, fontFamily:FONT }}>Current</span>
      </SectionRow>
      <SectionRow title="Account" description={user?.email || '--'}>
        <span style={{ fontSize:10, fontWeight:700, padding:'2px 10px', borderRadius:99, background:C.goldBg, color:C.gold2, border:`1px solid ${C.goldBdr}`, fontFamily:FONT, textTransform:'capitalize' }}>{user?.role || 'user'}</span>
      </SectionRow>
      <SectionRow title="Role Permissions" description="Admin accounts can manage all data" noBorder>
        <span style={{ fontSize:11, color:C.inkDim, fontFamily:FONT }}>{user?.role === 'admin' ? 'Full access' : 'Standard'}</span>
      </SectionRow>

      <SectionDivider title="Actions" color={C.crimson}/>
      <div style={{ padding:'14px 0' }}>
        <p style={{ fontSize:13, fontWeight:500, color:C.ink, fontFamily:FONT, marginBottom:4 }}>Sign Out</p>
        <p style={{ fontSize:11, color:C.inkDim, fontFamily:FONT, marginBottom:14 }}>You will be signed out of Atlas and redirected to the login page.</p>
        <button onClick={handleSignOut} disabled={signedOut} style={{
          display:'flex', alignItems:'center', gap:6, padding:'8px 20px', borderRadius:8,
          fontSize:12, fontWeight:700, background:signedOut ? C.parchWarm : C.crimsonBg,
          border:`1px solid ${C.crimsonBdr}`, color:signedOut ? C.inkGhost : C.crimson2,
          cursor: signedOut ? 'not-allowed' : 'pointer', fontFamily:FONT, transition:'all 0.2s',
        }}>
          {signedOut ? '✓ Signing out...' : '→ Sign Out'}
        </button>
      </div>
    </div>
  );
}

function AppearanceTab() {
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dalia_appearance') || '{}'); } catch { return {}; }
  });
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');

  const upd = (key, val) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    localStorage.setItem('dalia_appearance', JSON.stringify(next));
  };

  const switchTheme = (t) => {
    document.documentElement.setAttribute('data-theme', t === 'midnight' ? 'midnight' : '');
    localStorage.setItem('atlas_theme', t);
    setTheme(t);
  };

  const themes = [
    { key:'light',    label:'Neutral Elegance', desc:'Warm parchment, gold accents',    dot:'#A0722A' },
    { key:'midnight', label:'Midnight',          desc:'Deep navy, cyan accents',          dot:'rgb(6,182,212)' },
  ];

  const dashToggles = [
    { key:'splitYACashback',        label:'Split YA Cashback',   description:'Show CC and YA cashback as separate KPIs',  icon:Sparkles,   color:C.gold     },
    { key:'costIncludesTaxShipping', label:'Include Tax in Cost', description:'Total Cost will include taxes and shipping', icon:DollarSign, color:C.ocean2   },
    { key:'showPipeline',            label:'Status Pipeline',     description:'Show the status pipeline on the Dashboard',  icon:Inbox,      color:C.violet2  },
    { key:'showProductImages',       label:'Show Product Images', description:'Display product thumbnails in Transactions', icon:Eye,        color:C.ocean2   },
    { key:'showGoals',               label:'Goal Tracker',        description:'Show the goal tracker on the Dashboard',     icon:Target,     color:C.terrain2 },
  ];

  return (
    <div style={card}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
        <Palette style={{ width:16, height:16, color:C.violet2 }}/>
        <h2 style={{ fontFamily:FONT, fontSize:15, fontWeight:700, color:C.ink, margin:0 }}>Appearance</h2>
      </div>

      {/* ── Theme picker ── */}
      <SectionDivider title="Theme" color={C.violet2}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:10, marginBottom:20 }}>
        {themes.map(t => (
          <button key={t.key} onClick={() => switchTheme(t.key)} style={{
            display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:10,
            cursor:'pointer', textAlign:'left', fontFamily:FONT,
            background: theme === t.key ? C.goldBg : C.parchWarm,
            border: theme === t.key ? `2px solid ${C.gold}` : `1px solid ${C.parchLine}`,
            transition:'all 0.2s',
          }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:t.dot, flexShrink:0, border:'2px solid rgba(0,0,0,0.1)' }}/>
            <div>
              <p style={{ fontSize:12, fontWeight:700, color: theme === t.key ? C.gold2 : C.ink, fontFamily:FONT, margin:0 }}>{t.label}</p>
              <p style={{ fontSize:10, color:C.inkDim, fontFamily:FONT, margin:0, marginTop:2 }}>{t.desc}</p>
            </div>
            {theme === t.key && (
              <Check style={{ width:14, height:14, color:C.gold, marginLeft:'auto', flexShrink:0 }}/>
            )}
          </button>
        ))}
      </div>

      {/* ── Dashboard toggles ── */}
      <SectionDivider title="Dashboard & Display"/>
      {dashToggles.map((t, i) => (
        <SectionRow key={t.key} icon={t.icon} title={t.label} description={t.description} noBorder={i === dashToggles.length - 1}>
          <Toggle on={settings[t.key] !== false} onToggle={() => upd(t.key, !settings[t.key])}/>
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
    <div>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .settings-wrap { display:flex; gap:0; align-items:flex-start; min-height:80vh; background:var(--parch-card); border:1px solid var(--parch-line); border-radius:16px; overflow:hidden; }
        .settings-sidenav { width:200px; flex-shrink:0; border-right:1px solid var(--parch-line); background:var(--parch-warm); display:flex; flex-direction:column; }
        .settings-content { flex:1; min-width:0; padding:28px; overflow-y:auto; }
        .settings-mobilenav { display:none; }
        @media(max-width:640px){
          .settings-wrap { flex-direction:column; }
          .settings-sidenav { display:none; }
          .settings-mobilenav { display:block; margin-bottom:16px; }
          .settings-content { padding:16px; }
        }
      `}</style>

      <div style={{ marginBottom:20 }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account preferences</p>
      </div>

      {/* Mobile tab selector */}
      <div className="settings-mobilenav">
        <select value={activeTab} onChange={e=>switchTab(e.target.value)}
          style={{ width:'100%', padding:'10px 14px', borderRadius:10, fontSize:13, fontWeight:600, background:C.parchCard, border:`1px solid ${C.parchLine}`, color:C.ink, outline:'none', fontFamily:FONT }}>
          {TABS.map(tab=><option key={tab.key} value={tab.key}>{tab.label}</option>)}
        </select>
      </div>

      <div className="settings-wrap">
        {/* Sidebar nav */}
        <div className="settings-sidenav">
          <div style={{ padding:'14px 12px 8px', borderBottom:`1px solid ${C.parchLine}` }}>
            <p style={{ fontFamily:FONT, fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:C.inkFaded, margin:0 }}>Settings</p>
          </div>
          <nav style={{ display:'flex', flexDirection:'column', gap:2, padding:'10px 8px', flex:1 }}>
            {TABS.map(tab=>{
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={()=>switchTab(tab.key)}
                  style={{
                    display:'flex', alignItems:'center', gap:9, padding:'9px 10px', borderRadius:8,
                    fontSize:12.5, fontWeight: active ? 600 : 500, cursor:'pointer', textAlign:'left',
                    fontFamily:FONT, border:'none', width:'100%',
                    borderLeft: active ? `3px solid ${C.gold}` : '3px solid transparent',
                    background: active ? C.goldBg : 'transparent',
                    color: active ? C.gold2 : C.inkDim,
                    transition:'all 0.15s',
                  }}>
                  <Icon style={{ width:14, height:14, flexShrink:0, opacity: active ? 1 : 0.65 }}/>
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="settings-content">
          {activeTab==='profile'    && <ProfileTab    user={user}/>}
          {activeTab==='navigation' && <DataSetupTab />}
          {activeTab==='vendors'    && <VendorsTab />}
          {activeTab==='sellers'    && <SellersTab />}
          {activeTab==='goals'      && <GoalsTab />}
          {activeTab==='data'       && <DataTab />}
          {activeTab==='appearance' && <AppearanceTab />}
          {activeTab==='security'   && <SecurityTab user={user}/>}
        </div>
      </div>
    </div>
  );
}
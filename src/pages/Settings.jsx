import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import RetailerLogo from '@/components/shared/BrandLogo';
import {
  User, Database, Target, Key, Palette, Shield, Lock,
  ExternalLink, Check, Sparkles, DollarSign, Eye, EyeOff,
  Download, Upload, Trash2, Loader, X, Inbox, Plus, Store, Users, Pencil, Bell, Globe, Smartphone,
} from 'lucide-react';

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

function LBL({ children }) {
  return (
    <label style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.inkFaded, display: 'block', marginBottom: 4 }}>
      {children}
    </label>
  );
}

function SectionDivider({ title, color = C.gold }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '16px 0 12px' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${color}40, transparent)` }} />
    </div>
  );
}

function Toggle({ on, onToggle }) {
  return (
    <button onClick={onToggle} style={{ position: 'relative', width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer', background: on ? C.gold : C.parchDeep, transition: 'all 0.2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

/* ── Profile Section ──────────────────────────────────────────────── */
function ProfileSection() {
  const [user, setUser] = useState({ full_name: '', email: '', role: '', phone: '', businessName: '', businessLocation: '' });
  const [saved, setSaved] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = React.useRef(null);

  useEffect(() => {
    base44.auth.me().then(u => { if (u) setUser(u); }).catch(() => {});
    try { const p = localStorage.getItem('atlas_profile_photo'); if (p) setPhoto(p); } catch {}
  }, []);

  const handleImageFile = file => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => { setPhoto(e.target.result); localStorage.setItem('atlas_profile_photo', e.target.result); };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => { setPhoto(null); localStorage.removeItem('atlas_profile_photo'); if (fileRef.current) fileRef.current.value = ''; };

  const handleSave = async () => {
    try {
      await base44.auth.updateMe({ full_name: user.full_name, phone: user.phone, businessName: user.businessName, businessLocation: user.businessLocation });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
  };

  const initials = (user.full_name || user.email || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ background: C.parchCard, border: `1px solid ${C.parchLine}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <User style={{ width: 18, height: 18, color: C.gold }} />
        <h2 style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.ink, margin: 0 }}>Profile</h2>
      </div>

      {/* Photo upload */}
      <SectionDivider title="Profile Photo" color={C.gold} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleImageFile(e.dataTransfer.files?.[0]); }}
            style={{ width: 72, height: 72, borderRadius: '50%', cursor: 'pointer', border: `2px ${dragOver ? 'solid' : 'dashed'} ${dragOver ? C.gold : C.parchLine}`, background: dragOver ? C.goldBg : C.parchWarm, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', transition: 'all 0.2s' }}>
            {photo
              ? <img src={photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 22, fontWeight: 800, color: C.gold, fontFamily: FONT }}>{initials}</span>
            }
          </div>
          {photo && (
            <button onClick={removePhoto} style={{ position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: C.crimson2, border: '2px solid white', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, lineHeight: 1 }}>×</button>
          )}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.ink, fontFamily: FONT, marginBottom: 4 }}>{user.full_name || 'User'}</p>
          <p style={{ fontSize: 11, color: C.inkDim, fontFamily: FONT, marginBottom: 10 }}>Connected via Base44</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => fileRef.current?.click()} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: C.ink, border: 'none', color: C.neCream, cursor: 'pointer', fontFamily: FONT }}>Upload Photo</button>
            {photo && <button onClick={removePhoto} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.crimsonBg, border: `1px solid ${C.crimsonBdr}`, color: C.crimson2, cursor: 'pointer', fontFamily: FONT }}>Remove</button>}
          </div>
          <p style={{ fontSize: 10, color: C.inkGhost, marginTop: 6, fontFamily: FONT }}>JPG, PNG · Max 5MB · Click or drag to upload</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={e => handleImageFile(e.target.files?.[0])} style={{ display: 'none' }} />
      </div>

      <SectionDivider title="Account Information" color={C.ocean2} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div>
          <LBL>Full Name</LBL>
          <input value={user.full_name || ''} onChange={e => setUser(u => ({ ...u, full_name: e.target.value }))} placeholder="Your full name" style={INP} />
        </div>
        <div>
          <LBL>Email</LBL>
          <div style={{ ...INP, cursor: 'not-allowed', color: C.inkFaded }}>{user.email || '—'}</div>
          <p style={{ fontSize: 10, color: C.inkGhost, marginTop: 4, fontFamily: FONT }}>Managed by Base44</p>
        </div>
        <div>
          <LBL>Role</LBL>
          <div style={{ ...INP, cursor: 'not-allowed', color: C.inkFaded }}>{user.role || 'user'}</div>
        </div>
        <div>
          <LBL>Phone Number</LBL>
          <input type="tel" value={user.phone || ''} onChange={e => setUser(u => ({ ...u, phone: e.target.value }))} placeholder="+1 (555) 000-0000" style={INP} />
        </div>
      </div>

      <SectionDivider title="Business Information" color={C.terrain2} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div>
          <LBL>Business Name</LBL>
          <input value={user.businessName || ''} onChange={e => setUser(u => ({ ...u, businessName: e.target.value }))} placeholder="Your reselling business" style={INP} />
        </div>
        <div>
          <LBL>Location</LBL>
          <input value={user.businessLocation || ''} onChange={e => setUser(u => ({ ...u, businessLocation: e.target.value }))} placeholder="City, State" style={INP} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: C.ink, border: 'none', color: C.neCream, cursor: 'pointer', fontFamily: FONT }}>
          Save Changes
        </button>
        {saved && <span style={{ fontSize: 12, color: C.terrain2, display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT }}><Check style={{ width: 13, height: 13 }} /> Saved</span>}
      </div>
    </div>
  );
}

/* ── Vendors Section ──────────────────────────────────────────────── */
function VendorsSection() {
  const DEFAULT_VENDORS = ['Amazon', 'Best Buy', 'Walmart', 'Target', 'Costco', "Sam's Club", 'eBay', 'Woot', 'Apple', 'Staples'];
  const [vendors, setVendors] = useState([]);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('atlas_vendors') || '[]');
      setVendors([...new Set([...DEFAULT_VENDORS, ...stored])].sort());
    } catch { setVendors(DEFAULT_VENDORS); }
  }, []);

  const persist = (list) => {
    setVendors(list);
    try { localStorage.setItem('atlas_vendors', JSON.stringify(list)); } catch {}
  };

  const addVendor = () => {
    const name = newName.trim();
    if (!name || vendors.some(v => v.toLowerCase() === name.toLowerCase())) { setNewName(''); return; }
    persist([...vendors, name].sort());
    setNewName('');
  };

  const removeVendor = (idx) => persist(vendors.filter((_, i) => i !== idx));
  const isDefault = (v) => DEFAULT_VENDORS.includes(v);

  return (
    <div style={{ background: C.parchCard, border: `1px solid ${C.parchLine}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Store style={{ width: 18, height: 18, color: C.gold }} />
        <h2 style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.ink, margin: 0 }}>Vendors</h2>
      </div>
      <p style={{ fontSize: 12, color: C.inkDim, marginBottom: 16, fontFamily: FONT }}>Manage vendors for purchase orders</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addVendor()} placeholder="Add vendor..." style={{ ...INP, flex: 1 }} />
        <button onClick={addVendor} disabled={!newName.trim()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: newName.trim() ? C.ink : C.parchWarm, border: newName.trim() ? 'none' : `1px solid ${C.parchLine}`, color: newName.trim() ? C.neCream : C.inkGhost, cursor: newName.trim() ? 'pointer' : 'not-allowed', fontFamily: FONT }}>
          <Plus style={{ width: 13, height: 13 }} /> Add
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {vendors.map((v, i) => (
          <div key={v + i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.parchWarm, border: `1px solid ${C.parchLine}`, borderRadius: 8 }}>
            <RetailerLogo retailer={v} size={28} />
            {editing?.index === i ? (
              <input autoFocus value={editing.value} onChange={e => setEditing({ ...editing, value: e.target.value })}
                onKeyDown={e => {
                  if (e.key === 'Enter') { const upd = vendors.map((x, j) => j === i ? editing.value.trim() || x : x).sort(); persist(upd); setEditing(null); }
                  if (e.key === 'Escape') setEditing(null);
                }}
                style={{ ...INP, flex: 1, padding: '4px 8px', fontSize: 12 }} />
            ) : (
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.ink, fontFamily: FONT }}>{v}</span>
            )}
            {isDefault(v) && !editing && <span style={{ fontSize: 9, color: C.inkGhost, fontStyle: 'italic', flexShrink: 0 }}>default</span>}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {editing?.index === i ? (
                <>
                  <button onClick={() => { const upd = vendors.map((x, j) => j === i ? editing.value.trim() || x : x).sort(); persist(upd); setEditing(null); }} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: C.terrainBg, border: `1px solid ${C.terrainBdr}`, color: C.terrain2, cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setEditing(null)} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, background: 'none', border: 'none', color: C.inkGhost, cursor: 'pointer' }}>Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing({ index: i, value: v })} style={{ width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: `1px solid ${C.parchLine}`, color: C.inkDim, cursor: 'pointer' }}>
                    <Pencil style={{ width: 11, height: 11 }} />
                  </button>
                  {!isDefault(v) && (
                    <button onClick={() => removeVendor(i)} style={{ width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.crimsonBg, border: `1px solid ${C.crimsonBdr}`, color: C.crimson, cursor: 'pointer' }}>
                      <Trash2 style={{ width: 11, height: 11 }} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Sellers Section ──────────────────────────────────────────────── */
function SellersSection() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await base44.entities.Seller.list(); setSellers(data || []); }
    catch { setSellers([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addSeller = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await base44.entities.Seller.create({ name: newName.trim(), email: newEmail.trim() || null, phone: newPhone.trim() || null });
      setNewName(''); setNewEmail(''); setNewPhone('');
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const deleteSeller = async (id) => {
    try { await base44.entities.Seller.delete(id); await load(); } catch (e) { console.error(e); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await base44.entities.Seller.update(editing.id, { name: editing.name.trim(), email: editing.email?.trim() || null, phone: editing.phone?.trim() || null });
      setEditing(null); await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ background: C.parchCard, border: `1px solid ${C.parchLine}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Users style={{ width: 18, height: 18, color: C.ocean2 }} />
        <h2 style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.ink, margin: 0 }}>Sellers / Buyers</h2>
      </div>
      <p style={{ fontSize: 12, color: C.inkDim, marginBottom: 16, fontFamily: FONT }}>People you sell to</p>

      <div style={{ background: C.parchWarm, border: `1px solid ${C.parchLine}`, borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 10 }}>
          <div><LBL>Name *</LBL><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" style={INP} /></div>
          <div><LBL>Email</LBL><input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Optional" style={INP} /></div>
          <div><LBL>Phone</LBL><input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Optional" style={INP} /></div>
        </div>
        <button onClick={addSeller} disabled={!newName.trim() || saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: newName.trim() ? C.ink : C.parchWarm, border: 'none', color: newName.trim() ? C.neCream : C.inkGhost, cursor: newName.trim() ? 'pointer' : 'not-allowed', fontFamily: FONT }}>
          {saving ? <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${C.neCream}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} /> : <Plus style={{ width: 13, height: 13 }} />}
          Add Seller
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: C.inkGhost, fontSize: 13 }}>Loading...</div>
      ) : sellers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: C.inkGhost, fontSize: 13 }}>No sellers yet — add one above</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sellers.map(s => (
            <div key={s.id} style={{ background: C.parchWarm, border: `1px solid ${C.parchLine}`, borderRadius: 10, padding: '10px 14px' }}>
              {editing?.id === s.id ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 10 }}>
                    <div><LBL>Name</LBL><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} style={INP} /></div>
                    <div><LBL>Email</LBL><input type="email" value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} style={INP} /></div>
                    <div><LBL>Phone</LBL><input type="tel" value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} style={INP} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveEdit} disabled={saving} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: C.ink, color: C.neCream, border: 'none', cursor: 'pointer', fontFamily: FONT }}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => setEditing(null)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, background: 'none', border: `1px solid ${C.parchLine}`, color: C.inkFaded, cursor: 'pointer', fontFamily: FONT }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.oceanBg, border: `1px solid ${C.oceanBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: C.ocean2, flexShrink: 0 }}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.ink, margin: 0, fontFamily: FONT }}>{s.name}</p>
                    <p style={{ fontSize: 11, color: C.inkDim, marginTop: 2, fontFamily: FONT }}>{[s.email, s.phone].filter(Boolean).join(' · ') || 'No contact info'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => setEditing({ id: s.id, name: s.name, email: s.email || '', phone: s.phone || '' })} style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: `1px solid ${C.parchLine}`, color: C.inkDim, cursor: 'pointer' }}>
                      <Pencil style={{ width: 12, height: 12 }} />
                    </button>
                    <button onClick={() => deleteSeller(s.id)} style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.crimsonBg, border: `1px solid ${C.crimsonBdr}`, color: C.crimson, cursor: 'pointer' }}>
                      <Trash2 style={{ width: 12, height: 12 }} />
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

/* ── Appearance Section ───────────────────────────────────────────── */
function AppearanceSection() {
  const [theme, setTheme] = useState(() => localStorage.getItem('atlas_theme') || 'light');
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dalia_appearance') || '{}'); } catch { return {}; }
  });

  const switchTheme = (t) => {
    document.documentElement.setAttribute('data-theme', t === 'midnight' ? 'midnight' : '');
    localStorage.setItem('atlas_theme', t);
    setTheme(t);
  };

  const upd = (key, val) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    localStorage.setItem('dalia_appearance', JSON.stringify(next));
  };

  const themes = [
    { key: 'light',    label: 'Neutral Elegance', desc: 'Light, warm palette'  },
    { key: 'midnight', label: 'Midnight',          desc: 'Dark, cool palette'   },
  ];

  const toggles = [
    { key: 'splitYACashback',         label: 'Split YA Cashback',    desc: 'Show CC and YA cashback as separate KPIs' },
    { key: 'costIncludesTaxShipping', label: 'Include Tax in Cost',  desc: 'Total Cost will include taxes and shipping' },
    { key: 'showPipeline',            label: 'Status Pipeline',      desc: 'Show the status pipeline on the Dashboard' },
    { key: 'showProductImages',       label: 'Show Product Images',  desc: 'Display product thumbnails in Transactions' },
    { key: 'showGoals',               label: 'Goal Tracker',         desc: 'Show the goal tracker on the Dashboard' },
  ];

  return (
    <div style={{ background: C.parchCard, border: `1px solid ${C.parchLine}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Palette style={{ width: 18, height: 18, color: C.violet2 }} />
        <h2 style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.ink, margin: 0 }}>Appearance</h2>
      </div>

      <SectionDivider title="Theme" color={C.violet2} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {themes.map(t => (
          <button key={t.key} onClick={() => switchTheme(t.key)} style={{ flex: 1, minWidth: 140, padding: '12px 14px', borderRadius: 8, background: theme === t.key ? C.goldBg : C.parchWarm, border: `2px solid ${theme === t.key ? C.gold : C.parchLine}`, cursor: 'pointer', textAlign: 'left' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: theme === t.key ? C.gold2 : C.ink, margin: '0 0 2px', fontFamily: FONT }}>{t.label}</p>
            <p style={{ fontSize: 10, color: C.inkFaded, margin: 0, fontFamily: FONT }}>{t.desc}</p>
          </button>
        ))}
      </div>

      <SectionDivider title="Dashboard & Display" color={C.violet2} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {toggles.map((t, i) => (
          <div key={t.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < toggles.length - 1 ? `1px solid ${C.parchLine}` : 'none' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: C.ink, margin: 0, fontFamily: FONT }}>{t.label}</p>
              <p style={{ fontSize: 11, color: C.inkDim, marginTop: 2, fontFamily: FONT }}>{t.desc}</p>
            </div>
            <Toggle on={settings[t.key] !== false} onToggle={() => upd(t.key, !settings[t.key])} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Security Section ─────────────────────────────────────────────── */
function SecuritySection({ user }) {
  const [signedOut, setSignedOut] = useState(false);

  const handleSignOut = async () => {
    try { await base44.auth.logout(); } catch {}
    setSignedOut(true);
    setTimeout(() => window.location.href = '/', 1200);
  };

  return (
    <div style={{ background: C.parchCard, border: `1px solid ${C.parchLine}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Shield style={{ width: 18, height: 18, color: C.crimson2 }} />
        <h2 style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.ink, margin: 0 }}>Security</h2>
      </div>

      <SectionDivider title="Session" color={C.ocean2} />
      {[
        { label: 'Authentication', desc: 'Signed in via Base44 OAuth', right: <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: C.terrainBg, color: C.terrain2, border: `1px solid ${C.terrainBdr}` }}>Active</span> },
        { label: 'Account',        desc: user?.email || '—',          right: <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: C.goldBg, color: C.gold2, border: `1px solid ${C.goldBdr}`, textTransform: 'capitalize' }}>{user?.role || 'user'}</span> },
      ].map(row => (
        <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${C.parchLine}` }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: C.ink, margin: 0, fontFamily: FONT }}>{row.label}</p>
            <p style={{ fontSize: 11, color: C.inkDim, marginTop: 2, fontFamily: FONT }}>{row.desc}</p>
          </div>
          {row.right}
        </div>
      ))}

      <SectionDivider title="Actions" color={C.crimson} />
      <div style={{ padding: '12px 0' }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: C.ink, margin: '0 0 4px', fontFamily: FONT }}>Sign Out</p>
        <p style={{ fontSize: 11, color: C.inkDim, marginBottom: 14, fontFamily: FONT }}>You will be signed out of Atlas.</p>
        <button onClick={handleSignOut} disabled={signedOut} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: signedOut ? C.parchWarm : C.crimsonBg, border: `1px solid ${C.crimsonBdr}`, color: signedOut ? C.inkGhost : C.crimson2, cursor: signedOut ? 'not-allowed' : 'pointer', fontFamily: FONT }}>
          {signedOut ? '✓ Signing out...' : '→ Sign Out'}
        </button>
      </div>
    </div>
  );
}

/* ── Main Settings Page ───────────────────────────────────────────── */
const TABS = [
  { id: 'profile',  label: 'Profile',  icon: User   },
  { id: 'vendors',  label: 'Vendors',  icon: Store  },
  { id: 'sellers',  label: 'Sellers',  icon: Users  },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account preferences</p>
      </div>

      {/* Mobile tab selector */}
      <div style={{ marginBottom: 16, display: 'none' }} className="settings-mobile-nav">
        <select value={activeTab} onChange={e => setActiveTab(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: C.parchCard, border: `1px solid ${C.parchLine}`, color: C.ink, outline: 'none', fontFamily: FONT }}>
          {TABS.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
        </select>
      </div>

      <style>{`
        .settings-wrap { display: flex; gap: 0; align-items: flex-start; background: var(--parch-card); border: 1px solid var(--parch-line); border-radius: 16px; overflow: hidden; }
        .settings-sidenav { width: 200px; flex-shrink: 0; border-right: 1px solid var(--parch-line); background: var(--parch-warm); }
        .settings-content { flex: 1; min-width: 0; padding: 28px; }
        @media (max-width: 640px) {
          .settings-wrap { flex-direction: column; }
          .settings-sidenav { display: none; }
          .settings-mobile-nav { display: block !important; }
          .settings-content { padding: 16px; }
        }
      `}</style>

      <div className="settings-wrap">
        {/* Sidebar nav */}
        <div className="settings-sidenav">
          <div style={{ padding: '14px 12px 8px', borderBottom: `1px solid ${C.parchLine}` }}>
            <p style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.inkFaded, margin: 0 }}>Settings</p>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 8px' }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 8,
                    fontSize: 12.5, fontWeight: active ? 600 : 500, cursor: 'pointer', textAlign: 'left',
                    fontFamily: FONT, border: 'none', width: '100%',
                    borderLeft: active ? `3px solid ${C.gold}` : '3px solid transparent',
                    background: active ? C.goldBg : 'transparent',
                    color: active ? C.gold2 : C.inkDim,
                    transition: 'all 0.15s',
                  }}>
                  <Icon style={{ width: 14, height: 14, flexShrink: 0, opacity: active ? 1 : 0.65 }} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="settings-content">
          {activeTab === 'profile'  && <ProfileSection />}
          {activeTab === 'vendors'  && <VendorsSection />}
          {activeTab === 'sellers'  && <SellersSection />}
          {activeTab === 'security' && <SecuritySection user={user} />}
        </div>
      </div>
    </div>
  );
}
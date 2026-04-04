import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  User, Database, Target, Mail, Key, Bell, Palette, Shield,
  ExternalLink, Check, Sparkles, DollarSign, Eye, EyeOff,
  Download, Upload, Trash2, Loader, X, Inbox,
} from 'lucide-react';

// ─── parchment-theme helpers ──────────────────────────────────────────────────
const card = { background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 14, padding: 24, marginBottom: 20 };
const inp = { background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', borderRadius: 8, color: 'var(--ink)', padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%' };
const labelStyle = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-dim)', display: 'block', marginBottom: 4, fontFamily: "'Playfair Display', serif" };

function SectionRow({ icon: Icon, title, description, children, noBorder = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: noBorder ? 'none' : '1px solid var(--parch-line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, paddingRight: 16 }}>
        {Icon && <Icon style={{ width: 16, height: 16, color: 'var(--ink-dim)', flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', margin: 0 }}>{title}</p>
          {description && <p style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 2 }}>{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onToggle }) {
  return (
    <button onClick={onToggle}
      style={{ position: 'relative', width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer', background: on ? 'linear-gradient(135deg,#8b6914,#b8860b)' : 'var(--parch-deep)', transition: 'all 0.2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

function SectionLabel({ children }) {
  return <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12, marginTop: 8 }}>{children}</p>;
}

// ── Profile ────────────────────────────────────────────────────────────────
function ProfileTab({ user }) {
  return (
    <div style={card}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>Profile</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#8b6914,#b8860b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: 'white', flexShrink: 0 }}>
          {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
        </div>
        <div>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{user?.full_name || 'User'}</p>
          <p style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 2 }}>Connected via Base44</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[['Full Name', user?.full_name], ['Email', user?.email], ['Role', user?.role || 'user']].map(([label, val]) => (
          <div key={label}>
            <label style={labelStyle}>{label}</label>
            <div style={{ ...inp, color: 'var(--ink-faded)', cursor: 'not-allowed', width: 'auto' }}>{val || '—'}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: 'var(--ink-dim)' }}>Profile information is managed through your Base44 account.</p>
    </div>
  );
}

// ── Data Setup ─────────────────────────────────────────────────────────────
function DataSetupTab() {
  const pages = [
    { label: 'Payment Methods', page: 'PaymentMethods' },
    { label: 'Products',        page: 'Products' },
    { label: 'Import Orders',   page: 'ImportOrders' },
  ];
  return (
    <div style={card}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Data Setup</h2>
      <p style={{ fontSize: 12, color: 'var(--ink-dim)', marginBottom: 16 }}>Quick links to setup pages.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {pages.map(p => (
          <Link key={p.page} to={`/${p.page}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500, color: 'var(--ink)', background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold-bg)'; e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.color = 'var(--gold)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--parch-warm)'; e.currentTarget.style.borderColor = 'var(--parch-line)'; e.currentTarget.style.color = 'var(--ink)'; }}>
            <span>{p.label}</span>
            <ExternalLink style={{ width: 13, height: 13, color: 'var(--ink-dim)', flexShrink: 0 }} />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Goals ──────────────────────────────────────────────────────────────────
const GOAL_METRICS = [
  { metric: 'profit',       label: 'Profit',       color: '#10b981' },
  { metric: 'revenue',      label: 'Revenue',      color: '#06b6d4' },
  { metric: 'cashback',     label: 'Cashback',     color: '#ec4899' },
  { metric: 'transactions', label: 'Transactions', color: '#f59e0b' },
];

function GoalsTab() {
  const [goals, setGoals] = useState(GOAL_METRICS.map(m => ({ metric: m.metric, period: 'WEEKLY', target: '', isActive: false })));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('dalia_goals');
    if (stored) { try { setGoals(JSON.parse(stored)); } catch {} }
  }, []);

  const update = (idx, patch) => { setGoals(g => g.map((r, i) => i === idx ? { ...r, ...patch } : r)); setSaved(false); };

  const handleSave = () => {
    setSaving(true);
    localStorage.setItem('dalia_goals', JSON.stringify(goals));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  };

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Target style={{ width: 16, height: 16, color: '#10b981' }} />
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Goal Tracking</h2>
      </div>
      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>Set targets. Active goals appear on your Dashboard.</p>
      <div>
        {goals.map((goal, idx) => {
          const meta = GOAL_METRICS[idx];
          const isCurrency = goal.metric !== 'transactions';
          return (
            <div key={goal.metric} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: idx < goals.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div style={{ width: 100, flexShrink: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label}</p>
              </div>
              <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {['WEEKLY', 'MONTHLY'].map(p => (
                  <button key={p} onClick={() => update(idx, { period: p })}
                    style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: goal.period === p ? 'var(--gold-bg)' : 'transparent', color: goal.period === p ? 'var(--gold)' : 'var(--ink-dim)' }}>
                    {p === 'WEEKLY' ? 'Weekly' : 'Monthly'}
                  </button>
                ))}
              </div>
              <div style={{ position: 'relative', width: 160 }}>
                {isCurrency && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 12 }}>$</span>}
                <input type="number" min="0" placeholder={isCurrency ? '0.00' : '0'} value={goal.target}
                  onChange={e => update(idx, { target: e.target.value })}
                  style={{ ...inp, width: 'auto', paddingLeft: isCurrency ? 26 : 12 }} />
              </div>
              <Toggle on={goal.isActive} onToggle={() => update(idx, { isActive: !goal.isActive })} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#8b6914,#b8860b)', border: 'none', color: 'white', cursor: 'pointer', fontFamily: "'Playfair Display', serif" }}>
          {saving ? 'Saving...' : 'Save Goals'}
        </button>
        {saved && <span style={{ fontSize: 12, color: 'var(--terrain)', display: 'flex', alignItems: 'center', gap: 4 }}><Check style={{ width: 13, height: 13 }} /> Saved</span>}
      </div>
    </div>
  );
}

// ── Data (Export / Import / Danger) ────────────────────────────────────────
const EXPORT_ITEMS = [
  { key: 'orders',      label: 'Purchase Orders', description: 'All order records' },
  { key: 'rewards',     label: 'Rewards',         description: 'Cashback & reward entries' },
  { key: 'invoices',    label: 'Invoices',         description: 'Invoice records' },
  { key: 'creditCards', label: 'Payment Methods',  description: 'Credit card info' },
];

function DataTab() {
  const [sel, setSel]         = useState(Object.fromEntries(EXPORT_ITEMS.map(i => [i.key, true])));
  const [exporting, setExp]   = useState(false);
  const [exported, setExported] = useState(false);
  const [importing, setImp]   = useState(false);
  const [importResult, setIR] = useState(null);
  const [stage, setStage]     = useState('idle');
  const [resetInput, setRI]   = useState('');
  const [deleted, setDeleted] = useState(null);
  const fileRef = useRef(null);
  const CONFIRM = 'DELETE ALL MY DATA';

  const handleExport = async () => {
    setExp(true);
    try {
      const data = {};
      if (sel.orders)      data.orders      = await base44.entities.PurchaseOrder.list();
      if (sel.rewards)     data.rewards      = await base44.entities.Reward.list();
      if (sel.invoices)    data.invoices     = await base44.entities.Invoice.list();
      if (sel.creditCards) data.creditCards  = await base44.entities.CreditCard.list();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `dalia-distro-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      setExported(true); setTimeout(() => setExported(false), 3000);
    } catch (err) { alert('Export failed: ' + err.message); }
    finally { setExp(false); }
  };

  const handleImport = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    setImp(true); setIR(null);
    try {
      const json = JSON.parse(await file.text()); const summary = {};
      if (json.orders)      { for (const o of json.orders) await base44.entities.PurchaseOrder.create(o); summary['Purchase Orders'] = json.orders.length; }
      if (json.rewards)     { for (const r of json.rewards) await base44.entities.Reward.create(r); summary['Rewards'] = json.rewards.length; }
      if (json.invoices)    { for (const i of json.invoices) await base44.entities.Invoice.create(i); summary['Invoices'] = json.invoices.length; }
      setIR({ success: true, summary });
    } catch (err) { setIR({ success: false, error: err.message }); }
    finally { setImp(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const handleReset = async () => {
    setStage('deleting');
    try {
      const [orders, rewards, invoices, cards] = await Promise.all([base44.entities.PurchaseOrder.list(), base44.entities.Reward.list(), base44.entities.Invoice.list(), base44.entities.CreditCard.list()]);
      await Promise.all([...orders.map(o => base44.entities.PurchaseOrder.delete(o.id)), ...rewards.map(r => base44.entities.Reward.delete(r.id)), ...invoices.map(i => base44.entities.Invoice.delete(i.id)), ...cards.map(c => base44.entities.CreditCard.delete(c.id))]);
      setDeleted({ 'Purchase Orders': orders.length, Rewards: rewards.length, Invoices: invoices.length, 'Payment Methods': cards.length });
      setStage('done');
    } catch (err) { alert('Reset failed: ' + err.message); setStage('idle'); }
  };

  const resetAll = () => { setStage('idle'); setRI(''); setDeleted(null); };

  const btnPrimary = { padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#8b6914,#b8860b)', border: 'none', color: 'white', cursor: 'pointer', fontFamily: "'Playfair Display', serif" };
  const btnGhost = { padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: 'var(--ink-faded)', cursor: 'pointer' };

  return (
    <div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {/* Export */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Download style={{ width: 16, height: 16, color: '#10b981' }} />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Export Data</h2>
        </div>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Select which data to include in your export file.</p>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 11 }}>
          <button onClick={() => setSel(Object.fromEntries(EXPORT_ITEMS.map(i => [i.key, true])))} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontWeight: 600 }}>Select all</button>
          <span style={{ color: '#334155' }}>|</span>
          <button onClick={() => setSel(Object.fromEntries(EXPORT_ITEMS.map(i => [i.key, false])))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>Deselect all</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          {EXPORT_ITEMS.map(item => (
            <button key={item.key} onClick={() => setSel(s => ({ ...s, [item.key]: !s[item.key] }))}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 4, textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: sel[item.key] ? 'linear-gradient(135deg,#10b981,#06b6d4)' : 'transparent', border: sel[item.key] ? 'none' : '1.5px solid rgba(255,255,255,0.2)' }}>
                {sel[item.key] && <Check style={{ width: 10, height: 10, color: 'white' }} />}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', margin: 0 }}>{item.label}</p>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{item.description}</p>
              </div>
            </button>
          ))}
        </div>
        <button onClick={handleExport} disabled={!Object.values(sel).some(Boolean) || exporting}
          style={{ ...btnPrimary, opacity: Object.values(sel).some(Boolean) ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 6 }}>
          {exporting ? <Loader style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : exported ? <Check style={{ width: 14, height: 14 }} /> : <Download style={{ width: 14, height: 14 }} />}
          {exporting ? 'Exporting…' : exported ? 'Downloaded!' : 'Export as JSON'}
        </button>
      </div>

      {/* Import */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Upload style={{ width: 16, height: 16, color: '#60a5fa' }} />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Import Data</h2>
        </div>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Import a previously exported JSON file.</p>
        <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleImport} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current?.click()} disabled={importing} style={{ ...btnGhost, display: 'flex', alignItems: 'center', gap: 6 }}>
          {importing ? <Loader style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <Upload style={{ width: 14, height: 14 }} />}
          {importing ? 'Importing…' : 'Choose JSON File'}
        </button>
        {importResult && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: importResult.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${importResult.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, fontSize: 12, color: importResult.success ? '#10b981' : '#f87171' }}>
            {importResult.success
              ? <><p style={{ fontWeight: 700, margin: '0 0 4px' }}>Import complete</p>{Object.entries(importResult.summary || {}).map(([k, v]) => <p key={k} style={{ margin: 0 }}>{k}: {v} records</p>)}</>
              : <p style={{ margin: 0 }}>{importResult.error || 'Import failed'}</p>}
          </div>
        )}
      </div>

      {/* Danger */}
      <div style={{ ...card, border: '1px solid rgba(239,68,68,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Trash2 style={{ width: 16, height: 16, color: '#f87171' }} />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Danger Zone</h2>
        </div>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Permanently delete all your data. This cannot be undone.</p>
        {stage === 'idle' && <button onClick={() => setStage('confirm')} style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Trash2 style={{ width: 13, height: 13 }} /> Reset All Data</button>}
        {stage === 'confirm' && (
          <div style={{ padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#f87171', marginBottom: 8 }}>Are you absolutely sure? This is irreversible.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStage('typing')} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer' }}>Yes, delete everything</button>
              <button onClick={resetAll} style={btnGhost}>Cancel</button>
            </div>
          </div>
        )}
        {stage === 'typing' && (
          <div style={{ padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Type <code style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{CONFIRM}</code> to confirm.</p>
            <input type="text" value={resetInput} onChange={e => setRI(e.target.value)} placeholder={CONFIRM} autoFocus style={{ ...inp, marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleReset} disabled={resetInput !== CONFIRM} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', opacity: resetInput !== CONFIRM ? 0.4 : 1 }}>Permanently Delete</button>
              <button onClick={resetAll} style={btnGhost}>Cancel</button>
            </div>
          </div>
        )}
        {stage === 'deleting' && <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171', fontSize: 13 }}><Loader style={{ width: 15, height: 15, animation: 'spin 0.8s linear infinite' }} /> Deleting all data…</div>}
        {stage === 'done' && deleted && (
          <div style={{ padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f87171', marginBottom: 8 }}>All data has been deleted.</p>
            {Object.entries(deleted).map(([k, v]) => <p key={k} style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0' }}>{k}: {v} removed</p>)}
            <button onClick={resetAll} style={{ ...btnGhost, marginTop: 8 }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── API Keys ───────────────────────────────────────────────────────────────
function ApiKeysTab() {
  const [apiKey, setApiKey] = useState('');
  const [masked, setMasked] = useState(null);
  const [connected, setConnected] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('dalia_track17_key');
    if (stored) { setConnected(true); setMasked(stored.slice(0, 4) + '••••' + stored.slice(-4)); }
  }, []);

  const save = () => {
    if (apiKey.trim()) {
      localStorage.setItem('dalia_track17_key', apiKey.trim());
      setConnected(true); setMasked(apiKey.slice(0, 4) + '••••' + apiKey.slice(-4));
      setMessage({ type: 'success', text: 'API key saved' });
    } else {
      localStorage.removeItem('dalia_track17_key');
      setConnected(false); setMasked(null);
      setMessage({ type: 'success', text: 'API key removed' });
    }
    setApiKey('');
  };

  const remove = () => { localStorage.removeItem('dalia_track17_key'); setConnected(false); setMasked(null); setApiKey(''); };

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Key style={{ width: 16, height: 16, color: '#a78bfa' }} />
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>API Keys</h2>
      </div>
      <div style={{ padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>17TRACK</p>
          {connected && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: 'var(--terrain-bg)', color: 'var(--terrain)', border: '1px solid var(--terrain-bdr)' }}>Connected</span>}
        </div>
        {connected && masked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }}>
            <code style={{ fontSize: 12, color: '#94a3b8', flex: 1, fontFamily: 'monospace' }}>{masked}</code>
            <button onClick={remove} style={{ fontSize: 11, fontWeight: 600, color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>Remove</button>
          </div>
        )}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder={connected ? 'Enter new key to replace...' : 'Enter your 17TRACK API key'}
            style={{ ...inp, paddingRight: 40 }} autoComplete="off" />
          <button type="button" onClick={() => setShowKey(!showKey)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}>
            {showKey ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
          </button>
        </div>
        <button onClick={save} disabled={!apiKey.trim()}
          style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#8b6914,#b8860b)', border: 'none', color: 'white', cursor: 'pointer', opacity: !apiKey.trim() ? 0.4 : 1, fontFamily: "'Playfair Display', serif" }}>
          {connected ? 'Update Key' : 'Save Key'}
        </button>
        {message && <p style={{ marginTop: 10, fontSize: 12, color: 'var(--terrain)', display: 'flex', alignItems: 'center', gap: 4 }}><Check style={{ width: 12, height: 12 }} /> {message.text}</p>}
      </div>
    </div>
  );
}

// ── Security ───────────────────────────────────────────────────────────────
function SecurityTab({ user }) {
  return (
    <div style={card}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>Security</h2>
      <SectionRow title="Authentication" description="Signed in via Base44">
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: 'var(--terrain-bg)', color: 'var(--terrain)', border: '1px solid var(--terrain-bdr)' }}>Active</span>
      </SectionRow>
      <SectionRow title="Session" description="Your current browser session">
        <span style={{ fontSize: 11, color: '#64748b' }}>Current</span>
      </SectionRow>
      <SectionRow title="Account" description={user?.email || '—'} noBorder>
        <span style={{ fontSize: 11, color: '#64748b' }}>{user?.role || 'user'}</span>
      </SectionRow>
    </div>
  );
}

// ── Appearance ─────────────────────────────────────────────────────────────
function AppearanceTab() {
  const [settings, setSettings] = useState(() => { try { return JSON.parse(localStorage.getItem('dalia_appearance') || '{}'); } catch { return {}; } });
  const upd = (key, val) => { const next = { ...settings, [key]: val }; setSettings(next); localStorage.setItem('dalia_appearance', JSON.stringify(next)); };

  const dashToggles = [
    { key: 'splitYACashback',         label: 'Split YA Cashback',   description: 'Show CC and YA cashback as separate KPIs',  icon: Sparkles,   color: '#f59e0b' },
    { key: 'costIncludesTaxShipping',  label: 'Include Tax in Cost', description: 'Total Cost will include taxes and shipping', icon: DollarSign, color: '#60a5fa' },
    { key: 'showPipeline',             label: 'Status Pipeline',     description: 'Show the status pipeline on the Dashboard',  icon: Inbox,      color: '#a78bfa' },
    { key: 'showProductImages',        label: 'Show Product Images', description: 'Display product thumbnails in Transactions', icon: Eye,        color: '#06b6d4' },
    { key: 'showGoals',                label: 'Goal Tracker',        description: 'Show the goal tracker on the Dashboard',     icon: Target,     color: '#10b981' },
  ];

  return (
    <div style={card}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>Appearance</h2>
      <SectionLabel>Dashboard & Analytics</SectionLabel>
      {dashToggles.map((t, i) => (
        <SectionRow key={t.key} icon={t.icon} title={t.label} description={t.description} noBorder={i === dashToggles.length - 1}>
          <Toggle on={settings[t.key] !== false} onToggle={() => upd(t.key, !settings[t.key])} />
        </SectionRow>
      ))}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <SectionLabel>Profit Calculation Mode</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { key: 'accounting',      label: 'Accounting',      desc: 'Profit = Revenue − Cost + Cashback', color: '#10b981' },
            { key: 'cashback_wallet', label: 'Cashback Wallet', desc: 'Profit = Accounting − YA Used',      color: '#06b6d4' },
          ].map(opt => {
            const isActive = (settings.profitCalculationMode || 'accounting') === opt.key;
            return (
              <button key={opt.key} onClick={() => upd('profitCalculationMode', opt.key)}
                style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid', textAlign: 'left', cursor: 'pointer', background: isActive ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)', borderColor: isActive ? `${opt.color}40` : 'rgba(255,255,255,0.08)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: isActive ? opt.color : '#e2e8f0', margin: '0 0 4px' }}>{opt.label}</p>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'profile',     label: 'Profile',    icon: User     },
  { key: 'navigation',  label: 'Data Setup', icon: Database },
  { key: 'goals',       label: 'Goals',      icon: Target   },
  { key: 'data',        label: 'Data',       icon: Download },
  { key: 'api-keys',    label: 'API Keys',   icon: Key      },
  { key: 'appearance',  label: 'Appearance', icon: Palette  },
  { key: 'security',    label: 'Security',   icon: Shield   },
];

export default function Settings() {
  const [user, setUser] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'profile');

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);
  useEffect(() => { if (tabParam) setActiveTab(tabParam); }, [tabParam]);

  const switchTab = key => { setActiveTab(key); setSearchParams({ tab: key }); };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.3px', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 4 }}>Manage your account preferences</p>
      </div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ width: 200, flexShrink: 0 }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => switchTab(tab.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
                  borderLeft: activeTab === tab.key ? '2px solid var(--gold)' : '2px solid transparent',
                  border: activeTab === tab.key ? '1px solid var(--gold-border)' : '1px solid transparent',
                  background: activeTab === tab.key ? 'var(--gold-bg)' : 'transparent',
                  color: activeTab === tab.key ? 'var(--gold)' : 'var(--ink-dim)',
                }}>
                <tab.icon style={{ width: 14, height: 14, flexShrink: 0 }} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeTab === 'profile'    && <ProfileTab    user={user} />}
          {activeTab === 'navigation' && <DataSetupTab />}
          {activeTab === 'goals'      && <GoalsTab />}
          {activeTab === 'data'       && <DataTab />}
          {activeTab === 'api-keys'   && <ApiKeysTab />}
          {activeTab === 'appearance' && <AppearanceTab />}
          {activeTab === 'security'   && <SecurityTab user={user} />}
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import {
  User, Database, Target, Mail, Key, Bell, Palette, Shield,
  ExternalLink, Check, Monitor, Sparkles, DollarSign, Eye, EyeOff,
  Download, Upload, Trash2, TriangleAlert, Loader, X,
  Package, CreditCard as CardIcon, Hash, Inbox,
} from 'lucide-react';

function cn(...c) { return c.filter(Boolean).join(' '); }

function Toggle({ on, onToggle, color = 'bg-violet-500' }) {
  return (
    <button onClick={onToggle} className={cn('relative w-10 h-6 rounded-full transition-colors flex-shrink-0', on ? color : 'bg-slate-200')}>
      <span className={cn('absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform', on ? 'translate-x-4' : 'translate-x-0')} />
    </button>
  );
}

function Card({ children, className = '', danger = false }) {
  return (
    <div className={cn('bg-white rounded-2xl p-6 space-y-5 shadow-sm', danger ? 'border border-red-200' : 'border border-slate-100', className)}>
      {children}
    </div>
  );
}

function SectionRow({ icon: Icon, iconColor = 'text-slate-400', title, description, children, noBorder = false }) {
  return (
    <div className={cn('flex items-center justify-between py-3', !noBorder && 'border-b border-slate-100')}>
      <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
        {Icon && <Icon className={cn('w-4 h-4 flex-shrink-0', iconColor)} />}
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700">{title}</p>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return <p className="text-sm text-slate-400 font-medium mb-3 mt-1">{children}</p>;
}

// Profile
function ProfileTab({ user }) {
  return (
    <Card>
      <h2 className="text-base font-semibold text-slate-800">Profile</h2>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 ring-2 ring-violet-200">
          {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
        </div>
        <div>
          <p className="font-semibold text-slate-800">{user?.full_name || 'User'}</p>
          <p className="text-sm text-slate-400">Connected via Base44</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[['Full Name', user?.full_name], ['Email', user?.email], ['Role', user?.role || 'user']].map(([label, val]) => (
          <div key={label}>
            <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-500 cursor-not-allowed">{val || '—'}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400">Profile information is managed through your Base44 account.</p>
    </Card>
  );
}

// Data Setup
function DataSetupTab() {
  const pages = [
    { label: 'Payment Methods', page: 'PaymentMethods' },
    { label: 'Rewards & Cashback', page: 'Rewards' },
    { label: 'Invoices', page: 'Invoices' },
    { label: 'Products', page: 'Products' },
    { label: 'Import Orders', page: 'EmailImport' },
  ];
  return (
    <Card>
      <h2 className="text-base font-semibold text-slate-800">Data Setup</h2>
      <p className="text-sm text-slate-400">These pages were moved from the sidebar to keep navigation cleaner and easier to scan.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {pages.map(p => (
          <Link key={p.page} to={createPageUrl(p.page)} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 border border-slate-100 bg-slate-50 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-all">
            <span>{p.label}</span>
            <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
          </Link>
        ))}
      </div>
    </Card>
  );
}

// Goals
const GOAL_METRICS = [
  { metric: 'PROFIT', label: 'Profit', color: 'text-emerald-600', toggleColor: 'bg-emerald-500' },
  { metric: 'REVENUE', label: 'Revenue', color: 'text-green-600', toggleColor: 'bg-green-500' },
  { metric: 'CASHBACK', label: 'Cashback', color: 'text-pink-600', toggleColor: 'bg-pink-500' },
  { metric: 'TRANSACTIONS', label: 'Transactions', color: 'text-violet-600', toggleColor: 'bg-violet-500' },
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

  const handleSave = async () => {
    setSaving(true);
    try { localStorage.setItem('dalia_goals', JSON.stringify(goals)); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    finally { setSaving(false); }
  };

  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <Target className="w-5 h-5 text-violet-500" />
        <h2 className="text-base font-semibold text-slate-800">Goal Tracking</h2>
      </div>
      <p className="text-sm text-slate-400">Set profit, revenue, cashback, or volume targets. Active goals appear on your Dashboard.</p>
      <div>
        {goals.map((goal, idx) => {
          const meta = GOAL_METRICS[idx];
          const isCurrency = goal.metric !== 'TRANSACTIONS';
          return (
            <div key={goal.metric} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-slate-100 last:border-0">
              <div className="w-28 flex-shrink-0"><p className={cn('text-sm font-semibold', meta.color)}>{meta.label}</p></div>
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100">
                {['WEEKLY', 'MONTHLY'].map(p => (
                  <button key={p} onClick={() => update(idx, { period: p })} className={cn('px-3 py-1.5 text-xs font-semibold rounded-md transition-all', goal.period === p ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
                    {p === 'WEEKLY' ? 'Weekly' : 'Monthly'}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 max-w-[200px]">
                {isCurrency && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>}
                <input type="number" min="0" placeholder={isCurrency ? '0.00' : '0'} value={goal.target} onChange={e => update(idx, { target: e.target.value })}
                  className={cn('w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300', isCurrency && 'pl-7')} />
              </div>
              <Toggle on={goal.isActive} onToggle={() => update(idx, { isActive: !goal.isActive })} color={meta.toggleColor} />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 pt-1">
        <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Goals'}
        </button>
        {saved && <span className="flex items-center gap-1.5 text-sm text-emerald-600"><Check className="w-4 h-4" /> Saved</span>}
      </div>
    </Card>
  );
}

// Data (Export / Import / Danger)
const EXPORT_ITEMS = [
  { key: 'orders', label: 'Purchase Orders', description: 'All order records' },
  { key: 'rewards', label: 'Rewards', description: 'Cashback & reward entries' },
  { key: 'invoices', label: 'Invoices', description: 'Invoice records' },
  { key: 'creditCards', label: 'Payment Methods', description: 'Credit card info' },
];

function DataTab() {
  const [sel, setSel] = useState(Object.fromEntries(EXPORT_ITEMS.map(i => [i.key, true])));
  const [exporting, setExp] = useState(false);
  const [exported, setExported] = useState(false);
  const [importing, setImp] = useState(false);
  const [importResult, setIR] = useState(null);
  const [stage, setStage] = useState('idle');
  const [resetInput, setRI] = useState('');
  const [deleted, setDeleted] = useState(null);
  const fileRef = useRef(null);
  const CONFIRM = 'DELETE ALL MY DATA';

  const toggleAll = val => setSel(Object.fromEntries(EXPORT_ITEMS.map(i => [i.key, val])));

  const handleExport = async () => {
    setExp(true);
    try {
      const data = {};
      if (sel.orders) data.orders = await base44.entities.PurchaseOrder.list();
      if (sel.rewards) data.rewards = await base44.entities.Reward.list();
      if (sel.invoices) data.invoices = await base44.entities.Invoice.list();
      if (sel.creditCards) data.creditCards = await base44.entities.CreditCard.list();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
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
      if (json.orders) { for (const o of json.orders) await base44.entities.PurchaseOrder.create(o); summary['Purchase Orders'] = json.orders.length; }
      if (json.rewards) { for (const r of json.rewards) await base44.entities.Reward.create(r); summary['Rewards'] = json.rewards.length; }
      if (json.invoices) { for (const i of json.invoices) await base44.entities.Invoice.create(i); summary['Invoices'] = json.invoices.length; }
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

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-2.5"><Download className="w-5 h-5 text-violet-500" /><h2 className="text-base font-semibold text-slate-800">Export Data</h2></div>
        <p className="text-sm text-slate-400">Select which data to include in your export file.</p>
        <div className="flex gap-3 text-xs">
          <button onClick={() => toggleAll(true)} className="text-violet-600 hover:text-violet-700 font-medium">Select all</button>
          <span className="text-slate-300">|</span>
          <button onClick={() => toggleAll(false)} className="text-slate-400 hover:text-slate-600">Deselect all</button>
        </div>
        <div className="space-y-1">
          {EXPORT_ITEMS.map(item => (
            <button key={item.key} onClick={() => setSel(s => ({ ...s, [item.key]: !s[item.key] }))} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 transition-colors">
              <div className={cn('w-4 h-4 rounded flex items-center justify-center flex-shrink-0', sel[item.key] ? 'bg-violet-500' : 'border border-slate-300')}>
                {sel[item.key] && <Check className="w-3 h-3 text-white" />}
              </div>
              <div><p className="text-sm font-medium text-slate-700">{item.label}</p><p className="text-xs text-slate-400">{item.description}</p></div>
            </button>
          ))}
        </div>
        <button onClick={handleExport} disabled={!Object.values(sel).some(Boolean) || exporting} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {exporting ? <Loader className="w-4 h-4 animate-spin" /> : exported ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          {exporting ? 'Exporting…' : exported ? 'Downloaded!' : 'Export as JSON'}
        </button>
      </Card>

      <Card>
        <div className="flex items-center gap-2.5"><Upload className="w-5 h-5 text-blue-500" /><h2 className="text-base font-semibold text-slate-800">Import Data</h2></div>
        <p className="text-sm text-slate-400">Import a previously exported JSON file. Transactions are always added as new entries.</p>
        <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleImport} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={importing} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-40">
          {importing ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {importing ? 'Importing…' : 'Choose JSON File'}
        </button>
        {importResult && (
          <div className={cn('flex items-start gap-2.5 p-3 rounded-xl text-sm', importResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100')}>
            {importResult.success ? <Check className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <TriangleAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            <div>{importResult.success ? <><p className="font-semibold">Import complete</p><ul className="mt-1 space-y-0.5 text-xs">{Object.entries(importResult.summary || {}).map(([k, v]) => <li key={k}>{k}: {v} record{v !== 1 ? 's' : ''}</li>)}</ul></> : <p>{importResult.error || 'Import failed'}</p>}</div>
          </div>
        )}
      </Card>

      <Card danger>
        <div className="flex items-center gap-2.5"><Trash2 className="w-5 h-5 text-red-500" /><h2 className="text-base font-semibold text-slate-800">Danger Zone</h2></div>
        <p className="text-sm text-slate-500">Permanently delete <span className="text-red-500 font-semibold">all</span> your data. This cannot be undone.</p>
        {stage === 'idle' && <button onClick={() => setStage('confirm')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /> Reset All Data</button>}
        {stage === 'confirm' && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 space-y-4">
            <div className="flex items-start gap-3"><TriangleAlert className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" /><div><p className="text-sm font-semibold text-slate-800">Are you absolutely sure?</p><p className="text-xs text-slate-500 mt-1">We recommend exporting a backup first. This action is <span className="text-red-500 font-semibold">irreversible</span>.</p></div></div>
            <div className="flex gap-3">
              <button onClick={() => setStage('typing')} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">Yes, delete everything</button>
              <button onClick={resetAll} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors">Cancel</button>
            </div>
          </div>
        )}
        {stage === 'typing' && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 space-y-3">
            <p className="text-sm text-slate-700">Type <code className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-xs font-mono">{CONFIRM}</code> to confirm.</p>
            <input type="text" value={resetInput} onChange={e => setRI(e.target.value)} placeholder={CONFIRM} autoFocus className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            <div className="flex gap-3">
              <button onClick={handleReset} disabled={resetInput !== CONFIRM} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Permanently Delete All Data</button>
              <button onClick={resetAll} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors">Cancel</button>
            </div>
          </div>
        )}
        {stage === 'deleting' && <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50"><Loader className="w-5 h-5 text-red-500 animate-spin" /><p className="text-sm text-red-600">Deleting all data…</p></div>}
        {stage === 'done' && deleted && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 space-y-3">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-red-600">All data has been deleted.</p><button onClick={resetAll} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button></div>
            <ul className="space-y-0.5 text-xs text-red-500">{Object.entries(deleted).map(([k, v]) => <li key={k}>{k}: {v} removed</li>)}</ul>
          </div>
        )}
      </Card>
    </div>
  );
}

// Email Setup
function EmailSetupTab() {
  return (
    <Card>
      <h2 className="text-base font-semibold text-slate-800">Email Setup</h2>
      <p className="text-sm text-slate-400">Configure your forwarding address, pause or enable inbox processing, and review setup steps.</p>
      <div className="rounded-xl p-4 space-y-4 bg-slate-50 border border-slate-100">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-violet-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Forward order emails to Dalia Distro</p>
            <p className="text-xs text-slate-400 mt-1">Use your personal forwarding address to auto-parse order confirmations from supported vendors.</p>
          </div>
        </div>
        <Link to={createPageUrl('EmailImport')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors">
          Open Email Setup Page <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </Card>
  );
}

// API Keys
function ApiKeysTab() {
  const [apiKey, setApiKey] = useState('');
  const [masked, setMasked] = useState(null);
  const [connected, setConnected] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('dalia_track17_key');
    if (stored) { setConnected(true); setMasked(stored.slice(0, 4) + '••••' + stored.slice(-4)); }
  }, []);

  const save = async () => {
    setSaving(true); setMessage(null);
    try {
      if (apiKey.trim()) {
        localStorage.setItem('dalia_track17_key', apiKey.trim());
        setConnected(true); setMasked(apiKey.slice(0, 4) + '••••' + apiKey.slice(-4));
        setMessage({ type: 'success', text: 'API key saved successfully' });
      } else {
        localStorage.removeItem('dalia_track17_key');
        setConnected(false); setMasked(null);
        setMessage({ type: 'success', text: 'API key removed' });
      }
      setApiKey('');
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    finally { setSaving(false); }
  };

  const remove = () => { localStorage.removeItem('dalia_track17_key'); setConnected(false); setMasked(null); setApiKey(''); setMessage({ type: 'success', text: 'API key removed' }); };

  return (
    <Card>
      <div><h2 className="text-base font-semibold text-slate-800">API Keys</h2><p className="text-sm text-slate-400 mt-1">Connect third-party services for enhanced package tracking.</p></div>
      <div className="rounded-xl p-5 space-y-4 bg-slate-50 border border-slate-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-violet-500 mt-0.5" />
            <div><p className="text-sm font-semibold text-slate-800">17TRACK</p><p className="text-xs text-slate-400 mt-1">Universal shipment tracking fallback. Used only when direct carrier APIs return no data.</p></div>
          </div>
          {connected && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">Connected</span>}
        </div>
        {connected && masked && (
          <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-white border border-slate-200">
            <code className="text-sm text-slate-600 font-mono flex-1">{masked}</code>
            <button onClick={remove} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-colors">Remove</button>
          </div>
        )}
        <div className="space-y-3">
          <div className="relative">
            <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={connected ? 'Enter new key to replace...' : 'Enter your 17TRACK API key'} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 pr-10" autoComplete="off" />
            <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving || !apiKey.trim()} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : connected ? 'Update Key' : 'Save Key'}
            </button>
            <a href="https://www.17track.net/en/apilist" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">Get an API key <ExternalLink className="w-3 h-3" /></a>
          </div>
        </div>
        {message && (
          <div className={cn('flex items-center gap-2 text-sm', message.type === 'success' ? 'text-emerald-600' : 'text-red-600')}>
            {message.type === 'success' ? <Check className="w-4 h-4" /> : <TriangleAlert className="w-4 h-4" />} {message.text}
          </div>
        )}
        <div className="text-xs text-slate-400 space-y-1">
          <p>• Your API key is stored locally and never shared with other users.</p>
          <p>• 17TRACK is only used when the direct carrier API has no data.</p>
        </div>
      </div>
    </Card>
  );
}

// Notifications
function NotificationRow({ label, description, defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  return <SectionRow title={label} description={description}><Toggle on={on} onToggle={() => setOn(!on)} /></SectionRow>;
}

function NotificationsTab() {
  return (
    <Card>
      <h2 className="text-base font-semibold text-slate-800">Notifications</h2>
      <div>
        <NotificationRow label="Transaction Alerts" description="Get notified when transactions are updated" defaultOn />
        <NotificationRow label="Profit Milestones" description="Celebrate when you hit profit targets" defaultOn />
        <NotificationRow label="Inventory Low Stock" description="Alert when inventory items need restocking" />
        <NotificationRow label="Signup Bonus Reminders" description="Remind you about upcoming spend requirements" defaultOn />
      </div>
      <p className="text-xs text-slate-400">Notification delivery coming soon.</p>
    </Card>
  );
}

// Appearance
const THEMES = [
  { key: 'light', label: 'Light', colors: ['#f4f4f8', '#7c3aed', '#ec4899'] },
  { key: 'dark', label: 'Dark', colors: ['#0b0c12', '#7c3aed', '#ec4899'] },
  { key: 'teal', label: 'Teal', colors: ['#f0fdfa', '#0d9488', '#0891b2'] },
  { key: 'midnight', label: 'Midnight', colors: ['#0a0e1a', '#06b6d4', '#3b82f6'] },
];

function AppearanceTab() {
  const [theme, setTheme] = useState(() => localStorage.getItem('dalia_theme') || 'light');
  const [settings, setSettings] = useState(() => { try { return JSON.parse(localStorage.getItem('dalia_appearance') || '{}'); } catch { return {}; } });

  const upd = (key, val) => { const next = { ...settings, [key]: val }; setSettings(next); localStorage.setItem('dalia_appearance', JSON.stringify(next)); };

  const sidebarToggles = [
    { key: 'showDataSetupInSidebar', label: 'Show Data Setup Button in Sidebar', description: 'Quick access to the Data Setup settings menu', icon: Database, color: 'text-violet-500', tc: 'bg-violet-500' },
    { key: 'showMailboxInSidebar', label: 'Show Email Import in Sidebar', description: 'Keep this page under Settings, or pin it into main navigation', icon: Mail, color: 'text-sky-500', tc: 'bg-sky-500' },
    { key: 'showPaymentMethodsInSidebar', label: 'Show Payment Methods in Sidebar', description: 'Keep this page under Settings, or pin it into main navigation', icon: CardIcon, color: 'text-indigo-500', tc: 'bg-indigo-500' },
    { key: 'showStoresInSidebar', label: 'Show Vendors & Accounts in Sidebar', description: 'Keep this page under Settings, or pin it into main navigation', icon: Package, color: 'text-orange-500', tc: 'bg-orange-500' },
    { key: 'showSkuDatabaseInSidebar', label: 'Show SKU Database in Sidebar', description: 'Keep this page under Settings, or pin it into main navigation', icon: Hash, color: 'text-emerald-500', tc: 'bg-emerald-500' },
    { key: 'showBulkUploadInSidebar', label: 'Show Bulk Upload in Sidebar', description: 'Keep this page under Settings, or pin it into main navigation', icon: Upload, color: 'text-cyan-500', tc: 'bg-cyan-500' },
  ];

  const dashToggles = [
    { key: 'splitYACashback', label: 'Split Young Adult Cashback', description: 'Show CC and YA cashback as separate KPIs on Dashboard & Analytics', icon: Sparkles, color: 'text-amber-500', tc: 'bg-amber-500' },
    { key: 'costIncludesTaxShipping', label: 'Include Tax & Shipping in Cost', description: '"Total Cost" on Dashboard will include taxes and shipping', icon: DollarSign, color: 'text-blue-500', tc: 'bg-blue-500' },
    { key: 'showPipeline', label: 'Status Pipeline', description: 'Show the status pipeline section on the Dashboard', icon: Inbox, color: 'text-violet-500', tc: 'bg-violet-500' },
    { key: 'showProductImages', label: 'Show Product Images', description: 'Display product thumbnails in Transactions', icon: Eye, color: 'text-cyan-500', tc: 'bg-cyan-500' },
    { key: 'showGoals', label: 'Goal Tracker', description: 'Show the goal tracker section on the Dashboard', icon: Target, color: 'text-emerald-500', tc: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-base font-semibold text-slate-800">Appearance</h2>
        <div className="rounded-xl p-4 bg-slate-50 border border-slate-100">
          <p className="text-sm font-semibold text-slate-700">Customize your workspace</p>
          <p className="text-xs text-slate-400 mt-1">Control theme, layout, dashboard widgets, and which Data Setup pages appear in the sidebar.</p>
        </div>
        <div>
          <SectionLabel>Theme</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {THEMES.map(t => {
              const active = theme === t.key;
              return (
                <button key={t.key} onClick={() => { setTheme(t.key); localStorage.setItem('dalia_theme', t.key); }} className={cn('relative rounded-xl overflow-hidden transition-all border-2', active ? 'border-violet-500' : 'border-slate-100 hover:border-slate-200')}>
                  <div className="flex h-10"><div className="flex-1" style={{ background: t.colors[0] }} /><div className="w-8" style={{ background: t.colors[1] }} /><div className="w-6" style={{ background: t.colors[2] }} /></div>
                  <div className="px-3 py-2 flex items-center justify-between bg-white">
                    <span className="text-xs font-semibold text-slate-700">{t.label}</span>
                    {active && <span className="flex items-center justify-center w-4 h-4 rounded-full bg-violet-100"><Check className="w-2.5 h-2.5 text-violet-600" /></span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <SectionLabel>Layout & Frame</SectionLabel>
          <SectionRow title="Sharp Edges" description="Use straight, angular corners instead of rounded ones"><Toggle on={!!settings.sharpEdges} onToggle={() => upd('sharpEdges', !settings.sharpEdges)} /></SectionRow>
          <SectionRow title="Edge Frame" description="Show rounded borders and shadows around the sidebar and content area" noBorder><Toggle on={!!settings.edgeFrame} onToggle={() => upd('edgeFrame', !settings.edgeFrame)} /></SectionRow>
        </div>
      </Card>

      <Card>
        <div>
          <SectionLabel>Sidebar Navigation</SectionLabel>
          <p className="text-xs text-slate-400 mb-3">Show Data Setup pages directly in the sidebar for faster access.</p>
        </div>
        {sidebarToggles.map((t, i) => (
          <SectionRow key={t.key} icon={t.icon} iconColor={t.color} title={t.label} description={t.description} noBorder={i === sidebarToggles.length - 1}>
            <Toggle on={!!settings[t.key]} onToggle={() => upd(t.key, !settings[t.key])} color={t.tc} />
          </SectionRow>
        ))}
      </Card>

      <Card>
        <SectionLabel>Dashboard & Analytics</SectionLabel>
        {dashToggles.map((t, i) => (
          <SectionRow key={t.key} icon={t.icon} iconColor={t.color} title={t.label} description={t.description} noBorder={i === dashToggles.length - 1}>
            <Toggle on={settings[t.key] !== false} onToggle={() => upd(t.key, !settings[t.key])} color={t.tc} />
          </SectionRow>
        ))}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <div><p className="text-sm font-medium text-slate-700">Profit Calculation Mode</p><p className="text-xs text-slate-400">Choose how YA cashback impacts profit in Dashboard & Analytics</p></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[{ key: 'ACCOUNTING', label: 'Accounting', desc: 'Profit = Revenue − Cost + Cashback Earned', active: 'bg-emerald-50 border-emerald-200 text-emerald-700' }, { key: 'CASHBACK_WALLET', label: 'Cashback Wallet', desc: 'Profit = Accounting Profit − YA Used', active: 'bg-cyan-50 border-cyan-200 text-cyan-700' }].map(opt => {
              const isActive = (settings.profitCalculationMode || 'ACCOUNTING') === opt.key;
              return (
                <button key={opt.key} onClick={() => upd('profitCalculationMode', opt.key)} className={cn('px-3 py-2.5 rounded-xl border text-left transition-all', isActive ? opt.active : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50')}>
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs mt-0.5 opacity-70">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}

// Security
function SecurityTab({ user }) {
  return (
    <Card>
      <h2 className="text-base font-semibold text-slate-800">Security</h2>
      <SectionRow title="Authentication" description="Signed in via Base44"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">Active</span></SectionRow>
      <SectionRow title="Session" description="Your current browser session"><span className="text-xs text-slate-400">Current</span></SectionRow>
      <SectionRow title="Account" description={user?.email || '—'} noBorder><span className="text-xs text-slate-400">{user?.role || 'user'}</span></SectionRow>
    </Card>
  );
}

// Main
const TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'navigation', label: 'Data Setup', icon: Database },
  { key: 'goals', label: 'Goals', icon: Target },
  { key: 'data', label: 'Data', icon: Download },
  { key: 'email', label: 'Email Setup', icon: Mail },
  { key: 'api-keys', label: 'API Keys', icon: Key },
  { key: 'notifications', label: 'Notifications', icon: Bell, disabled: true },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'security', label: 'Security', icon: Shield },
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
    <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8 lg:py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your account preferences</p>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-56 flex-shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => !tab.disabled && switchTab(tab.key)} disabled={tab.disabled}
                className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap', tab.disabled ? 'text-slate-300 cursor-not-allowed opacity-60' : activeTab === tab.key ? 'bg-violet-50 text-violet-700 border border-violet-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent')}>
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
                {tab.disabled && <span className="text-[10px] text-slate-300 ml-auto">Soon</span>}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex-1 min-w-0">
          {activeTab === 'profile'       && <ProfileTab      user={user} />}
          {activeTab === 'navigation'    && <DataSetupTab />}
          {activeTab === 'goals'         && <GoalsTab />}
          {activeTab === 'data'          && <DataTab />}
          {activeTab === 'email'         && <EmailSetupTab />}
          {activeTab === 'api-keys'      && <ApiKeysTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'appearance'    && <AppearanceTab />}
          {activeTab === 'security'      && <SecurityTab user={user} />}
        </div>
      </div>
    </div>
  );
}
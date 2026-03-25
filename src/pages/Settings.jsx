import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import {
  User, Database, Target, Download, Upload, Trash2,
  DollarSign, Eye, Palette, Shield, ExternalLink,
  Check, Monitor, Sparkles, TriangleAlert, Loader,
  X, Octagon, Settings as SettingsIcon,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────

function Toggle({ on, onToggle, color = 'bg-violet-500' }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${on ? color : 'bg-slate-200'}`}
    >
      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

function SectionRow({ icon: Icon, iconColor = 'text-slate-400', title, description, children }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
        {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />}
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700">{title}</p>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Card({ children, className = '', danger = false }) {
  return (
    <div className={`bg-white rounded-2xl border p-6 space-y-5 ${danger ? 'border-red-200' : 'border-slate-100'} shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// ── Tab: Profile ──────────────────────────────────────────────────────────

function ProfileTab({ user }) {
  return (
    <Card>
      <h2 className="text-base font-semibold text-slate-800">Profile</h2>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
        </div>
        <div>
          <p className="font-semibold text-slate-800">{user?.full_name || 'User'}</p>
          <p className="text-sm text-slate-400">{user?.email || 'Connected via Base44'}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Full Name</label>
          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-500 cursor-not-allowed">{user?.full_name || '—'}</div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Email</label>
          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-500 cursor-not-allowed">{user?.email || '—'}</div>
        </div>
      </div>
      <p className="text-xs text-slate-400">Profile information is managed through your Base44 account.</p>
    </Card>
  );
}

// ── Tab: Data Setup ───────────────────────────────────────────────────────

function DataSetupTab() {
  const pages = [
    { label: 'Payment Methods',    page: 'PaymentMethods' },
    { label: 'Rewards & Cashback', page: 'Rewards' },
    { label: 'Invoices',           page: 'Invoices' },
    { label: 'Products',           page: 'Products' },
    { label: 'Import Orders',      page: 'EmailImport' },
  ];
  return (
    <Card>
      <h2 className="text-base font-semibold text-slate-800">Data Setup</h2>
      <p className="text-sm text-slate-400">Configure the underlying data that powers your dashboard and analytics.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {pages.map(p => (
          <a key={p.page} href={`/${p.page}`}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 border border-slate-100 bg-slate-50 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-all">
            <span>{p.label}</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>
        ))}
      </div>
    </Card>
  );
}

// ── Tab: Goals ────────────────────────────────────────────────────────────

const GOAL_METRICS = [
  { metric: 'PROFIT',       label: 'Profit',       color: 'text-emerald-600', toggleColor: 'bg-emerald-500' },
  { metric: 'REVENUE',      label: 'Revenue',      color: 'text-green-600',   toggleColor: 'bg-green-500' },
  { metric: 'CASHBACK',     label: 'Cashback',     color: 'text-pink-600',    toggleColor: 'bg-pink-500' },
  { metric: 'TRANSACTIONS', label: 'Transactions', color: 'text-violet-600',  toggleColor: 'bg-violet-500' },
];

function GoalsTab() {
  const [goals, setGoals] = useState(GOAL_METRICS.map(m => ({ metric: m.metric, period: 'WEEKLY', target: '', isActive: false })));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('dalia_goals');
    if (stored) { try { setGoals(JSON.parse(stored)); } catch {} }
  }, []);

  const update = (idx, patch) => { setGoals(g => g.map((r, i) => i === idx ? { ...r, ...patch } : r)); setSaved(false); };

  const handleSave = async () => {
    setSaving(true);
    localStorage.setItem('dalia_goals', JSON.stringify(goals));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  };

  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <Target className="w-5 h-5 text-violet-500" />
        <h2 className="text-base font-semibold text-slate-800">Goal Tracking</h2>
      </div>
      <p className="text-sm text-slate-400">Set profit, revenue, cashback, or volume targets. Active goals appear on your Dashboard.</p>
      <div className="space-y-1">
        {goals.map((goal, idx) => {
          const meta = GOAL_METRICS[idx];
          const isCurrency = goal.metric !== 'TRANSACTIONS';
          return (
            <div key={goal.metric} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-slate-100 last:border-0">
              <div className="w-28 flex-shrink-0">
                <p className={`text-sm font-semibold ${meta.color}`}>{meta.label}</p>
              </div>
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100">
                {['WEEKLY', 'MONTHLY'].map(p => (
                  <button key={p} onClick={() => update(idx, { period: p })}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${goal.period === p ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    {p === 'WEEKLY' ? 'Weekly' : 'Monthly'}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 max-w-[180px]">
                {isCurrency && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>}
                <input type="number" min="0" placeholder={isCurrency ? '0.00' : '0'} value={goal.target}
                  onChange={e => update(idx, { target: e.target.value })}
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 ${isCurrency ? 'pl-7' : ''}`} />
              </div>
              <Toggle on={goal.isActive} onToggle={() => update(idx, { isActive: !goal.isActive })} color={meta.toggleColor} />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button onClick={handleSave} disabled={saving}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Goals'}
        </button>
        {saved && <span className="flex items-center gap-1.5 text-sm text-emerald-600"><Check className="w-4 h-4" /> Saved</span>}
      </div>
    </Card>
  );
}

// ── Tab: Data (Export / Import / Danger) ──────────────────────────────────

const EXPORT_ITEMS = [
  { key: 'orders',      label: 'Purchase Orders', description: 'All order records' },
  { key: 'rewards',     label: 'Rewards',         description: 'Cashback & reward entries' },
  { key: 'invoices',    label: 'Invoices',         description: 'Invoice records' },
  { key: 'creditCards', label: 'Payment Methods', description: 'Credit card info' },
];

function DataTab() {
  const [selected, setSelected]     = useState(Object.fromEntries(EXPORT_ITEMS.map(i => [i.key, true])));
  const [exporting, setExporting]   = useState(false);
  const [exported, setExported]     = useState(false);
  const [importing, setImporting]   = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [resetStage, setResetStage] = useState('idle');
  const [resetInput, setResetInput] = useState('');
  const [deletedSummary, setDeletedSummary] = useState(null);
  const fileRef = React.useRef(null);
  const CONFIRM_TEXT = 'DELETE ALL MY DATA';

  const toggleAll = (val) => setSelected(Object.fromEntries(EXPORT_ITEMS.map(i => [i.key, val])));

  const handleExport = async () => {
    setExporting(true);
    const data = {};
    if (selected.orders)      data.orders      = await base44.entities.PurchaseOrder.list();
    if (selected.rewards)     data.rewards     = await base44.entities.Reward.list();
    if (selected.invoices)    data.invoices    = await base44.entities.Invoice.list();
    if (selected.creditCards) data.creditCards = await base44.entities.CreditCard.list();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `dalia-distro-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    setExported(true); setTimeout(() => setExported(false), 3000);
    setExporting(false);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true); setImportResult(null);
    const text = await file.text();
    const json = JSON.parse(text);
    const summary = {};
    if (json.orders)      { for (const o of json.orders)      await base44.entities.PurchaseOrder.create(o); summary.orders      = json.orders.length; }
    if (json.rewards)     { for (const r of json.rewards)     await base44.entities.Reward.create(r);        summary.rewards     = json.rewards.length; }
    if (json.invoices)    { for (const i of json.invoices)    await base44.entities.Invoice.create(i);       summary.invoices    = json.invoices.length; }
    setImportResult({ success: true, summary });
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleReset = async () => {
    setResetStage('deleting');
    const [orders, rewards, invoices, cards] = await Promise.all([
      base44.entities.PurchaseOrder.list(), base44.entities.Reward.list(),
      base44.entities.Invoice.list(), base44.entities.CreditCard.list(),
    ]);
    await Promise.all([
      ...orders.map(o => base44.entities.PurchaseOrder.delete(o.id)),
      ...rewards.map(r => base44.entities.Reward.delete(r.id)),
      ...invoices.map(i => base44.entities.Invoice.delete(i.id)),
      ...cards.map(c => base44.entities.CreditCard.delete(c.id)),
    ]);
    setDeletedSummary({ 'Purchase Orders': orders.length, 'Rewards': rewards.length, 'Invoices': invoices.length, 'Payment Methods': cards.length });
    setResetStage('done');
  };

  const resetReset = () => { setResetStage('idle'); setResetInput(''); setDeletedSummary(null); };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-2.5"><Download className="w-5 h-5 text-violet-500" /><h2 className="text-base font-semibold text-slate-800">Export Data</h2></div>
        <p className="text-sm text-slate-400">Select which data to include in your export file.</p>
        <div className="flex gap-3 text-xs">
          <button onClick={() => toggleAll(true)}  className="text-violet-600 hover:text-violet-700 font-medium">Select all</button>
          <span className="text-slate-300">|</span>
          <button onClick={() => toggleAll(false)} className="text-slate-400 hover:text-slate-600">Deselect all</button>
        </div>
        <div className="space-y-1">
          {EXPORT_ITEMS.map(item => (
            <button key={item.key} onClick={() => setSelected(s => ({ ...s, [item.key]: !s[item.key] }))}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 transition-colors">
              <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${selected[item.key] ? 'bg-violet-500' : 'border border-slate-300'}`}>
                {selected[item.key] && <Check className="w-3 h-3 text-white" />}
              </div>
              <div>
                <p className="text-sm text-slate-700 font-medium">{item.label}</p>
                <p className="text-xs text-slate-400">{item.description}</p>
              </div>
            </button>
          ))}
        </div>
        <button onClick={handleExport} disabled={!Object.values(selected).some(Boolean) || exporting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {exporting ? <Loader className="w-4 h-4 animate-spin" /> : exported ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          {exporting ? 'Exporting…' : exported ? 'Downloaded!' : 'Export as JSON'}
        </button>
      </Card>

      <Card>
        <div className="flex items-center gap-2.5"><Upload className="w-5 h-5 text-blue-500" /><h2 className="text-base font-semibold text-slate-800">Import Data</h2></div>
        <p className="text-sm text-slate-400">Import a previously exported JSON file.</p>
        <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleImport} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={importing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-40">
          {importing ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {importing ? 'Importing…' : 'Choose JSON File'}
        </button>
        {importResult && (
          <div className={`flex items-start gap-2.5 p-3 rounded-xl text-sm ${importResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
            {importResult.success ? <Check className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <TriangleAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            <div>
              {importResult.success
                ? <><p className="font-semibold">Import complete</p><ul className="mt-1 space-y-0.5 text-xs">{Object.entries(importResult.summary || {}).map(([k, v]) => <li key={k}>{k}: {v} record{v !== 1 ? 's' : ''}</li>)}</ul></>
                : <p>{importResult.error || 'Import failed'}</p>}
            </div>
          </div>
        )}
      </Card>

      <Card danger>
        <div className="flex items-center gap-2.5"><Trash2 className="w-5 h-5 text-red-500" /><h2 className="text-base font-semibold text-slate-800">Danger Zone</h2></div>
        <p className="text-sm text-slate-500">Permanently delete <span className="text-red-500 font-semibold">all</span> your data. This cannot be undone.</p>

        {resetStage === 'idle' && (
          <button onClick={() => setResetStage('confirm')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" /> Reset All Data
          </button>
        )}
        {resetStage === 'confirm' && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 space-y-4">
            <div className="flex items-start gap-3">
              <TriangleAlert className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-800">Are you absolutely sure?</p>
                <p className="text-xs text-slate-500 mt-1">We recommend exporting a backup first. This is <span className="text-red-500 font-semibold">irreversible</span>.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setResetStage('typing')} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">Yes, delete everything</button>
              <button onClick={resetReset} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors">Cancel</button>
            </div>
          </div>
        )}
        {resetStage === 'typing' && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 space-y-3">
            <p className="text-sm text-slate-700">Type <code className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-xs font-mono">{CONFIRM_TEXT}</code> to confirm.</p>
            <input type="text" value={resetInput} onChange={e => setResetInput(e.target.value)} placeholder={CONFIRM_TEXT} autoFocus
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            <div className="flex gap-3">
              <button onClick={handleReset} disabled={resetInput !== CONFIRM_TEXT}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                Permanently Delete All Data
              </button>
              <button onClick={resetReset} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors">Cancel</button>
            </div>
          </div>
        )}
        {resetStage === 'deleting' && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50">
            <Loader className="w-5 h-5 text-red-500 animate-spin" />
            <p className="text-sm text-red-600">Deleting all data…</p>
          </div>
        )}
        {resetStage === 'done' && deletedSummary && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-red-600">All data has been deleted.</p>
              <button onClick={resetReset} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <ul className="space-y-0.5 text-xs text-red-500">
              {Object.entries(deletedSummary).map(([k, v]) => <li key={k}>{k}: {v} removed</li>)}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Tab: Appearance ───────────────────────────────────────────────────────

const THEMES = [
  { key: 'light',    label: 'Light',    colors: ['#f4f4f8', '#7c3aed', '#ec4899'] },
  { key: 'dark',     label: 'Dark',     colors: ['#0b0c12', '#7c3aed', '#ec4899'] },
  { key: 'teal',     label: 'Teal',     colors: ['#f0fdfa', '#0d9488', '#0891b2'] },
  { key: 'midnight', label: 'Midnight', colors: ['#0a0e1a', '#06b6d4', '#3b82f6'] },
];

function AppearanceTab() {
  const [theme, setTheme]       = useState(() => localStorage.getItem('dalia_theme') || 'light');
  const [settings, setSettings] = useState(() => { try { return JSON.parse(localStorage.getItem('dalia_appearance') || '{}'); } catch { return {}; } });

  const updateSetting = (key, val) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    localStorage.setItem('dalia_appearance', JSON.stringify(next));
  };

  const toggles = [
    { key: 'splitYACashback',        label: 'Split Young Adult Cashback',       description: 'Show CC and Young Adult cashback as separate KPIs',        icon: Sparkles,  color: 'text-amber-500',   toggleColor: 'bg-amber-500' },
    { key: 'costIncludesTaxShipping', label: 'Include Tax & Shipping in Cost',  description: '"Total Cost" on Dashboard includes taxes and shipping',    icon: DollarSign,color: 'text-blue-500',    toggleColor: 'bg-blue-500' },
    { key: 'showProductImages',      label: 'Show Product Images',              description: 'Display product thumbnails in Transactions',               icon: Eye,       color: 'text-cyan-500',    toggleColor: 'bg-cyan-500' },
    { key: 'showPipeline',           label: 'Status Pipeline',                  description: 'Show the status pipeline section on Dashboard',            icon: Palette,   color: 'text-violet-500',  toggleColor: 'bg-violet-500' },
    { key: 'showGoals',              label: 'Goal Tracker',                     description: 'Show the goal tracker section on Dashboard',               icon: Target,    color: 'text-emerald-500', toggleColor: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-base font-semibold text-slate-800">Appearance</h2>
        <div>
          <label className="block text-sm text-slate-500 mb-3">Theme</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {THEMES.map(t => {
              const active = theme === t.key;
              return (
                <button key={t.key} onClick={() => { setTheme(t.key); localStorage.setItem('dalia_theme', t.key); }}
                  className={`relative rounded-xl overflow-hidden transition-all border-2 ${active ? 'border-violet-500' : 'border-slate-100 hover:border-slate-200'}`}>
                  <div className="flex h-10">
                    <div className="flex-1" style={{ background: t.colors[0] }} />
                    <div className="w-8"   style={{ background: t.colors[1] }} />
                    <div className="w-6"   style={{ background: t.colors[2] }} />
                  </div>
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
          <label className="block text-sm text-slate-500 mb-1">Layout</label>
          <SectionRow icon={Octagon} title="Sharp Edges" description="Use straight, angular corners instead of rounded ones">
            <Toggle on={!!settings.sharpEdges} onToggle={() => updateSetting('sharpEdges', !settings.sharpEdges)} />
          </SectionRow>
          <SectionRow icon={Monitor} title="Edge Frame" description="Show borders and shadows around the sidebar and content area">
            <Toggle on={!!settings.edgeFrame} onToggle={() => updateSetting('edgeFrame', !settings.edgeFrame)} />
          </SectionRow>
        </div>
      </Card>
      <Card>
        <label className="block text-sm font-semibold text-slate-700">Dashboard & Analytics</label>
        {toggles.map(t => (
          <SectionRow key={t.key} icon={t.icon} iconColor={t.color} title={t.label} description={t.description}>
            <Toggle on={settings[t.key] !== false} onToggle={() => updateSetting(t.key, settings[t.key] === false)} color={t.toggleColor} />
          </SectionRow>
        ))}
      </Card>
    </div>
  );
}

// ── Tab: Profit Calculation ───────────────────────────────────────────────

function ProfitTab() {
  const [mode, setMode] = useState(() => localStorage.getItem('dalia_profit_mode') || 'ACCOUNTING');
  const select = (m) => { setMode(m); localStorage.setItem('dalia_profit_mode', m); };

  return (
    <Card>
      <div className="flex items-center gap-2.5"><DollarSign className="w-5 h-5 text-emerald-500" /><h2 className="text-base font-semibold text-slate-800">Profit Calculation</h2></div>
      <p className="text-sm text-slate-400">Choose how Young Adult cashback impacts profit in Dashboard & Analytics.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={() => select('ACCOUNTING')}
          className={`px-4 py-3 rounded-xl border text-left transition-all ${mode === 'ACCOUNTING' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}>
          <p className="text-sm font-semibold">Accounting</p>
          <p className="text-xs mt-0.5 opacity-70">Profit = Revenue − Cost + Cashback Earned</p>
        </button>
        <button onClick={() => select('CASHBACK_WALLET')}
          className={`px-4 py-3 rounded-xl border text-left transition-all ${mode === 'CASHBACK_WALLET' ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}>
          <p className="text-sm font-semibold">Cashback Wallet</p>
          <p className="text-xs mt-0.5 opacity-70">Profit = Accounting Profit − YA Used</p>
        </button>
      </div>
    </Card>
  );
}

// ── Tab: Security ─────────────────────────────────────────────────────────

function SecurityTab({ user }) {
  return (
    <Card>
      <h2 className="text-base font-semibold text-slate-800">Security</h2>
      <SectionRow title="Authentication" description="Signed in via Base44">
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">Active</span>
      </SectionRow>
      <SectionRow title="Session" description="Your current browser session">
        <span className="text-xs text-slate-400">Current</span>
      </SectionRow>
      <SectionRow title="Account" description={user?.email || '—'}>
        <span className="text-xs text-slate-400">{user?.role || 'user'}</span>
      </SectionRow>
    </Card>
  );
}

// ── Main Settings page ────────────────────────────────────────────────────

const TABS = [
  { key: 'profile',    label: 'Profile',      icon: User },
  { key: 'data-setup', label: 'Data Setup',   icon: Database },
  { key: 'goals',      label: 'Goals',        icon: Target },
  { key: 'data',       label: 'Data',         icon: Download },
  { key: 'profit',     label: 'Profit Mode',  icon: DollarSign },
  { key: 'appearance', label: 'Appearance',   icon: Palette },
  { key: 'security',   label: 'Security',     icon: Shield },
];

export default function Settings() {
  const [user, setUser] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'profile');

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);
  useEffect(() => { if (tabParam) setActiveTab(tabParam); }, [tabParam]);

  const switchTab = (key) => { setActiveTab(key); setSearchParams({ tab: key }); };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8 lg:py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your account preferences</p>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-52 flex-shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => switchTab(tab.key)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                  activeTab === tab.key
                    ? 'bg-violet-50 text-violet-700 border border-violet-100'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent'
                )}>
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex-1 min-w-0">
          {activeTab === 'profile'    && <ProfileTab    user={user} />}
          {activeTab === 'data-setup' && <DataSetupTab />}
          {activeTab === 'goals'      && <GoalsTab />}
          {activeTab === 'data'       && <DataTab />}
          {activeTab === 'profit'     && <ProfitTab />}
          {activeTab === 'appearance' && <AppearanceTab />}
          {activeTab === 'security'   && <SecurityTab user={user} />}
        </div>
      </div>
    </div>
  );
}
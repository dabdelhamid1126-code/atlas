import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, Upload, Trash2, Check, AlertTriangle } from 'lucide-react';

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
  terrain:    'var(--terrain)',
  terrain2:   'var(--terrain2)',
  terrainBg:  'var(--terrain-bg)',
  terrainBdr: 'var(--terrain-bdr)',
  ocean:      'var(--ocean2)',
  oceanBg:    'var(--ocean-bg)',
  oceanBdr:   'var(--ocean-bdr)',
  crimson:    'var(--crimson)',
  crimson2:   'var(--crimson2)',
  crimsonBg:  'var(--crimson-bg)',
  crimsonBdr: 'var(--crimson-bdr)',
  neCream:    'var(--ne-cream)',
};
const FONT = 'var(--font-sans)';

const EXPORT_ITEMS = [
  { key: 'orders',      label: 'Transactions',    desc: 'All purchase & sale records',     entity: 'PurchaseOrder'  },
  { key: 'rewards',     label: 'Rewards',          desc: 'Cashback & points earned',        entity: 'Reward'         },
  { key: 'creditCards', label: 'Payment Methods',  desc: 'Credit cards & payment info',     entity: 'CreditCard'     },
  { key: 'giftCards',   label: 'Gift Cards',       desc: 'Gift card codes & balances',      entity: 'GiftCard'       },
  { key: 'inventory',   label: 'Inventory',        desc: 'Current inventory items',         entity: 'InventoryItem'  },
  { key: 'products',    label: 'Products',         desc: 'Product catalog',                 entity: 'Product'        },
  { key: 'expenses',    label: 'Expenses',         desc: 'Recurring and one-time expenses', entity: 'Expense'        },
  { key: 'goals',       label: 'Goals',            desc: 'Weekly/monthly targets',          entity: 'Goal'           },
  { key: 'sellers',     label: 'Buyers / Sellers', desc: 'Buyers & selling platforms',      entity: 'Seller'         },
];

export default function DataSection() {
  const [selected, setSelected]       = useState(new Set(EXPORT_ITEMS.map(i => i.key)));
  const [exporting, setExporting]     = useState(false);
  const [importing, setImporting]     = useState(false);
  const [importDone, setImportDone]   = useState(false);
  const [exportDone, setExportDone]   = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting]     = useState(false);
  const [importErrors, setImportErrors] = useState([]);

  const toggleItem = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectAll   = () => setSelected(new Set(EXPORT_ITEMS.map(i => i.key)));
  const deselectAll = () => setSelected(new Set());

  const handleExport = async () => {
    setExporting(true);
    try {
      const exportData = { exportedAt: new Date().toISOString(), version: 1 };
      const items = EXPORT_ITEMS.filter(i => selected.has(i.key));
      await Promise.all(items.map(async (item) => {
        const records = await base44.entities[item.entity].list();
        exportData[item.key] = records;
      }));
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atlas-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const orders = await base44.entities.PurchaseOrder.list();
      const rows = [
        ['Order Number', 'Retailer', 'Account', 'Status', 'Order Date', 'Total Cost', 'Final Cost', 'Tax', 'Shipping', 'Notes'].join(','),
        ...orders.map(o => [
          o.order_number || '',
          o.retailer || '',
          o.account || '',
          o.status || '',
          o.order_date || '',
          o.total_cost || 0,
          o.final_cost || 0,
          o.tax || 0,
          o.shipping_cost || 0,
          `"${(o.notes || '').replace(/"/g, '""')}"`,
        ].join(','))
      ];
      const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atlas-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportErrors([]);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const errors = [];
      for (const item of EXPORT_ITEMS) {
        if (data[item.key]?.length > 0) {
          try {
            await base44.entities[item.entity].bulkCreate(
              data[item.key].map(r => { const { id, created_date, updated_date, created_by, ...rest } = r; return rest; })
            );
          } catch (err) {
            errors.push(`${item.label}: ${err.message}`);
          }
        }
      }
      setImportErrors(errors);
      setImportDone(true);
      setTimeout(() => setImportDone(false), 4000);
    } catch {
      setImportErrors(['Invalid JSON file. Please use a file exported from Atlas.']);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await Promise.all(EXPORT_ITEMS.map(item =>
        base44.entities[item.entity].list().then(records =>
          Promise.all(records.map(r => base44.entities[item.entity].delete(r.id)))
        )
      ));
      setResetConfirm(false);
      window.location.reload();
    } finally {
      setResetting(false);
    }
  };

  const sectionStyle = {
    background: C.parchCard, border: `1px solid ${C.parchLine}`,
    borderRadius: 14, padding: 24, marginBottom: 20,
  };

  const btnStyle = (color, bg, bdr) => ({
    display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
    borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
    border: `1px solid ${bdr}`, background: bg, color, fontFamily: FONT,
  });

  return (
    <div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Export ── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Download style={{ width: 18, height: 18, color: C.ocean }} />
          <h2 style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.ink, margin: 0 }}>Export Data</h2>
        </div>
        <p style={{ fontSize: 12, color: C.inkDim, marginBottom: 16, fontFamily: FONT }}>
          Select which data to include in your export file.
        </p>

        {/* Select / Deselect all */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <button onClick={selectAll} style={{ fontSize: 11, fontWeight: 600, color: C.ocean, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: FONT }}>Select all</button>
          <span style={{ color: C.parchLine }}>|</span>
          <button onClick={deselectAll} style={{ fontSize: 11, fontWeight: 600, color: C.inkFaded, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: FONT }}>Deselect all</button>
        </div>

        {/* Checkboxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20, border: `1px solid ${C.parchLine}`, borderRadius: 10, overflow: 'hidden' }}>
          {EXPORT_ITEMS.map((item, i) => {
            const checked = selected.has(item.key);
            return (
              <label key={item.key} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', cursor: 'pointer',
                background: checked ? C.goldBg : 'transparent',
                borderBottom: i < EXPORT_ITEMS.length - 1 ? `1px solid ${C.parchLine}` : 'none',
                transition: 'background 0.15s',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  border: `1.5px solid ${checked ? C.gold : C.parchLine}`,
                  background: checked ? C.gold : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {checked && <Check style={{ width: 11, height: 11, color: 'white' }} />}
                </div>
                <input type="checkbox" checked={checked} onChange={() => toggleItem(item.key)} style={{ display: 'none' }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: 0, fontFamily: FONT }}>{item.label}</p>
                  <p style={{ fontSize: 11, color: C.inkDim, margin: 0, fontFamily: FONT }}>{item.desc}</p>
                </div>
              </label>
            );
          })}
        </div>

        {/* Export buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={handleExport} disabled={exporting || selected.size === 0}
            style={{ ...btnStyle(C.neCream, C.ink, C.ink), opacity: (exporting || selected.size === 0) ? 0.6 : 1 }}>
            {exporting
              ? <div style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${C.neCream}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              : <Download style={{ width: 13, height: 13 }} />}
            Export as JSON
          </button>
          <button onClick={handleExportCSV} disabled={exporting}
            style={{ ...btnStyle(C.ocean, C.oceanBg, C.oceanBdr), opacity: exporting ? 0.6 : 1 }}>
            <Download style={{ width: 13, height: 13 }} />
            Transactions CSV
          </button>
          {exportDone && (
            <span style={{ fontSize: 12, color: C.terrain2, display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT }}>
              <Check style={{ width: 13, height: 13 }} /> Exported!
            </span>
          )}
        </div>
      </div>

      {/* ── Import ── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Upload style={{ width: 18, height: 18, color: C.terrain }} />
          <h2 style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.ink, margin: 0 }}>Import Data</h2>
        </div>
        <p style={{ fontSize: 12, color: C.inkDim, marginBottom: 16, fontFamily: FONT }}>
          Import a previously exported JSON file. New records are created; existing ones are skipped.
        </p>

        <label style={{ ...btnStyle(C.terrain2, C.terrainBg, C.terrainBdr), width: 'fit-content', cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.6 : 1 }}>
          {importing
            ? <div style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${C.terrain2}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            : <Upload style={{ width: 13, height: 13 }} />}
          {importing ? 'Importing...' : 'Choose JSON File'}
          <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} disabled={importing} />
        </label>

        {importDone && importErrors.length === 0 && (
          <p style={{ marginTop: 12, fontSize: 12, color: C.terrain2, display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT }}>
            <Check style={{ width: 13, height: 13 }} /> Import completed successfully!
          </p>
        )}
        {importErrors.length > 0 && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: C.crimsonBg, border: `1px solid ${C.crimsonBdr}` }}>
            {importErrors.map((e, i) => <p key={i} style={{ fontSize: 11, color: C.crimson2, margin: '2px 0', fontFamily: FONT }}>{e}</p>)}
          </div>
        )}
      </div>

      {/* ── Reset ── */}
      <div style={{ ...sectionStyle, borderColor: C.crimsonBdr }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Trash2 style={{ width: 18, height: 18, color: C.crimson2 }} />
          <h2 style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.ink, margin: 0 }}>Reset All Data</h2>
        </div>
        <p style={{ fontSize: 12, color: C.inkDim, marginBottom: 16, fontFamily: FONT }}>
          Permanently delete all your app data — transactions, inventory, cards, gift cards, expenses, rewards, and goals.{' '}
          <strong style={{ color: C.crimson2 }}>This cannot be undone.</strong>
        </p>

        {!resetConfirm ? (
          <button onClick={() => setResetConfirm(true)}
            style={btnStyle(C.crimson2, C.crimsonBg, C.crimsonBdr)}>
            <Trash2 style={{ width: 13, height: 13 }} /> Reset All Data
          </button>
        ) : (
          <div style={{ padding: '14px 16px', borderRadius: 10, background: C.crimsonBg, border: `1px solid ${C.crimsonBdr}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <AlertTriangle style={{ width: 15, height: 15, color: C.crimson2 }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: C.crimson2, margin: 0, fontFamily: FONT }}>
                Are you absolutely sure? This will delete everything.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleReset} disabled={resetting}
                style={{ ...btnStyle('white', C.crimson2, C.crimson2), opacity: resetting ? 0.6 : 1 }}>
                {resetting
                  ? <div style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid white', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                  : <Trash2 style={{ width: 13, height: 13 }} />}
                {resetting ? 'Deleting...' : 'Yes, delete everything'}
              </button>
              <button onClick={() => setResetConfirm(false)}
                style={btnStyle(C.inkFaded, 'transparent', C.parchLine)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
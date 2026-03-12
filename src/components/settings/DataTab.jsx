import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const exportItems = [
  { key: 'creditCards',    label: 'Payment Methods',    sub: 'Credit cards & payment info' },
  { key: 'purchaseOrders', label: 'Transactions',        sub: 'All purchase & sale records' },
  { key: 'inventoryItems', label: 'Inventory',           sub: 'Current inventory items' },
  { key: 'giftCards',      label: 'Gift Cards',          sub: 'Gift card records' },
  { key: 'rewards',        label: 'Rewards',             sub: 'Cashback & reward records' },
  { key: 'invoices',       label: 'Invoices',            sub: 'Invoice records' },
  { key: 'exports',        label: 'Exports',             sub: 'Export records' },
];

export default function DataTab() {
  const [selected, setSelected] = useState(new Set(exportItems.map(i => i.key)));
  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const toggle = (key) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });
  };

  const selectAll = () => setSelected(new Set(exportItems.map(i => i.key)));
  const deselectAll = () => setSelected(new Set());

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = {};
      await Promise.all(
        exportItems.filter(i => selected.has(i.key)).map(async (item) => {
          const data = await base44.entities[item.key.charAt(0).toUpperCase() + item.key.slice(1)]?.list?.() || [];
          result[item.key] = data;
        })
      );
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dalia-distro-export-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Download className="h-4 w-4 text-purple-400" />
          <h3 className="text-base font-bold text-foreground">Export Data</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Select which data to include in your export file.</p>

        <div className="flex gap-4 mb-4 text-sm">
          <button onClick={selectAll} className="text-purple-400 hover:underline">Select all</button>
          <span className="text-border">|</span>
          <button onClick={deselectAll} className="text-purple-400 hover:underline">Deselect all</button>
        </div>

        <div className="space-y-3 mb-6">
          {exportItems.map(item => (
            <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
              <div
                onClick={() => toggle(item.key)}
                className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                  selected.has(item.key) ? 'bg-purple-600 border-purple-600' : 'border-border group-hover:border-purple-400'
                }`}
              >
                {selected.has(item.key) && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div onClick={() => toggle(item.key)}>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
            </label>
          ))}
        </div>

        <Button onClick={handleExport} disabled={exporting || selected.size === 0} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-2">
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export as JSON'}
        </Button>
      </div>

      {/* Import */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Upload className="h-4 w-4 text-purple-400" />
          <h3 className="text-base font-bold text-foreground">Import Data</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Import a previously exported JSON file. Existing records with the same name are updated; new ones are created. Transactions and inventory are always added as new entries.</p>
        <Button variant="outline" className="rounded-xl gap-2">
          <Upload className="h-4 w-4" />
          Choose JSON File
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-500/30 bg-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Trash2 className="h-4 w-4 text-red-400" />
          <h3 className="text-base font-bold text-red-400">Danger Zone</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete <span className="text-red-400 font-semibold">all</span> your data — purchase orders, inventory, gift cards, rewards, invoices, and exports. This cannot be undone.
        </p>
        {!confirmReset ? (
          <Button variant="outline" onClick={() => setConfirmReset(true)} className="border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-xl gap-2">
            <Trash2 className="h-4 w-4" />
            Reset All Data
          </Button>
        ) : (
          <div className="flex gap-3 items-center">
            <p className="text-sm text-red-400 font-medium">Are you sure? This cannot be undone.</p>
            <Button onClick={() => setConfirmReset(false)} variant="outline" className="rounded-xl text-sm">Cancel</Button>
            <Button
              onClick={async () => {
                setResetting(true);
                await Promise.all([
                  base44.entities.PurchaseOrder.list().then(items => Promise.all(items.map(i => base44.entities.PurchaseOrder.delete(i.id)))),
                  base44.entities.InventoryItem.list().then(items => Promise.all(items.map(i => base44.entities.InventoryItem.delete(i.id)))),
                  base44.entities.GiftCard.list().then(items => Promise.all(items.map(i => base44.entities.GiftCard.delete(i.id)))),
                  base44.entities.Reward.list().then(items => Promise.all(items.map(i => base44.entities.Reward.delete(i.id)))),
                  base44.entities.Invoice.list().then(items => Promise.all(items.map(i => base44.entities.Invoice.delete(i.id)))),
                  base44.entities.Export.list().then(items => Promise.all(items.map(i => base44.entities.Export.delete(i.id)))),
                ]);
                setResetting(false);
                setConfirmReset(false);
              }}
              disabled={resetting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {resetting ? 'Deleting...' : 'Yes, Delete Everything'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
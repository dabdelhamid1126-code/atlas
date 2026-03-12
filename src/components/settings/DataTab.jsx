import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const exportItems = [
  { key: 'CreditCard',    label: 'Payment Methods', sub: 'Credit cards & payment info' },
  { key: 'PurchaseOrder', label: 'Transactions',    sub: 'All purchase & sale records' },
  { key: 'InventoryItem', label: 'Inventory',       sub: 'Current inventory items' },
  { key: 'GiftCard',      label: 'Gift Cards',      sub: 'Gift card records' },
  { key: 'Reward',        label: 'Rewards',         sub: 'Cashback & reward records' },
  { key: 'Invoice',       label: 'Invoices',        sub: 'Invoice records' },
  { key: 'Export',        label: 'Exports',         sub: 'Export records' },
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

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = {};
      await Promise.all(
        exportItems.filter(i => selected.has(i.key)).map(async (item) => {
          const data = await base44.entities[item.key].list();
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

  const handleReset = async () => {
    setResetting(true);
    const entities = ['PurchaseOrder', 'InventoryItem', 'GiftCard', 'Reward', 'Invoice', 'Export'];
    await Promise.all(
      entities.map(async (entity) => {
        const items = await base44.entities[entity].list();
        await Promise.all(items.map(i => base44.entities[entity].delete(i.id)));
      })
    );
    setResetting(false);
    setConfirmReset(false);
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
          <button onClick={() => setSelected(new Set(exportItems.map(i => i.key)))} className="text-purple-400 hover:underline">Select all</button>
          <span className="text-muted-foreground">|</span>
          <button onClick={() => setSelected(new Set())} className="text-purple-400 hover:underline">Deselect all</button>
        </div>

        <div className="space-y-3 mb-6">
          {exportItems.map(item => (
            <label key={item.key} className="flex items-start gap-3 cursor-pointer group" onClick={() => toggle(item.key)}>
              <div className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                selected.has(item.key) ? 'bg-purple-600 border-purple-600' : 'border-border group-hover:border-purple-400'
              }`}>
                {selected.has(item.key) && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
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
          <div className="flex flex-wrap gap-3 items-center">
            <p className="text-sm text-red-400 font-medium">Are you sure? This cannot be undone.</p>
            <Button onClick={() => setConfirmReset(false)} variant="outline" className="rounded-xl text-sm">Cancel</Button>
            <Button onClick={handleReset} disabled={resetting} className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2">
              <Trash2 className="h-4 w-4" />
              {resetting ? 'Deleting...' : 'Yes, Delete Everything'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
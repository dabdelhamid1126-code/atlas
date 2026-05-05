// src/components/VendorCashbackConfig.jsx
// Manage per-vendor cashback rates and cost multipliers

import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_VENDORS = [
  { name: 'Amazon', cashback_rate: 5, cost_multiplier: 1 },
  { name: 'Best Buy', cashback_rate: 3, cost_multiplier: 1 },
  { name: 'Target', cashback_rate: 2, cost_multiplier: 1 },
  { name: 'Walmart', cashback_rate: 2, cost_multiplier: 1 },
  { name: 'Costco', cashback_rate: 0, cost_multiplier: 1 },
  { name: 'eBay', cashback_rate: 1, cost_multiplier: 1 },
  { name: 'Apple', cashback_rate: 1, cost_multiplier: 1 },
  { name: 'Staples', cashback_rate: 2, cost_multiplier: 1 },
];

/**
 * VendorCashbackConfig Component
 * 
 * Manages cashback rates and cost multipliers per vendor
 * 
 * Props:
 * - value: array of vendor configs
 * - onChange: callback when configs change
 */
export default function VendorCashbackConfig({ value = [], onChange }) {
  const [vendors, setVendors] = useState(value && value.length > 0 ? value : DEFAULT_VENDORS);
  const [newVendor, setNewVendor] = useState('');

  const handleUpdateVendor = useCallback((index, field, val) => {
    const updated = [...vendors];
    updated[index] = { ...updated[index], [field]: parseFloat(val) || 0 };
    setVendors(updated);
    onChange?.(updated);
  }, [vendors, onChange]);

  const handleDeleteVendor = useCallback((index) => {
    const updated = vendors.filter((_, i) => i !== index);
    setVendors(updated);
    onChange?.(updated);
    toast.success('Vendor removed');
  }, [vendors, onChange]);

  const handleAddVendor = useCallback(() => {
    if (!newVendor.trim()) {
      toast.error('Enter vendor name');
      return;
    }
    if (vendors.some(v => v.name.toLowerCase() === newVendor.toLowerCase())) {
      toast.error('Vendor already exists');
      return;
    }
    const updated = [...vendors, { name: newVendor.trim(), cashback_rate: 0, cost_multiplier: 1 }];
    setVendors(updated);
    onChange?.(updated);
    setNewVendor('');
    toast.success(`Added ${newVendor}`);
  }, [newVendor, vendors, onChange]);

  const handleReset = useCallback(() => {
    setVendors(DEFAULT_VENDORS);
    onChange?.(DEFAULT_VENDORS);
    toast.success('Reset to defaults');
  }, [onChange]);

  const calculateCostExample = (storePrice, cashbackRate, costMultiplier) => {
    const afterMultiplier = storePrice * costMultiplier;
    const cashback = afterMultiplier * (cashbackRate / 100);
    const finalCost = afterMultiplier - cashback;
    return finalCost;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: 0, fontFamily: 'var(--font-serif)' }}>
            Vendor Cashback & Cost Rules
          </h3>
          <p style={{ fontSize: 11, color: 'var(--ink-faded)', margin: '4px 0 0' }}>
            Set default cashback rates and cost multipliers per vendor
          </p>
        </div>
        <button
          onClick={handleReset}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 12px',
            background: 'var(--parch-warm)',
            color: 'var(--ink-dim)',
            border: '1px solid var(--parch-line)',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-serif)',
          }}
        >
          <RefreshCw size={12} />
          Reset
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--parch-line)', background: 'var(--parch-card)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--parch-bg)', borderBottom: '1px solid var(--parch-line)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: 'var(--ink-faded)', minWidth: 120 }}>Vendor</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, fontSize: 10, color: 'var(--ink-faded)', minWidth: 100 }}>Cashback %</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, fontSize: 10, color: 'var(--ink-faded)', minWidth: 100 }}>Cost Multiplier</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: 'var(--ink-faded)', minWidth: 140 }}>Example Cost</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, fontSize: 10, color: 'var(--ink-faded)', minWidth: 40 }}>❌</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((vendor, idx) => {
              const exampleCost = calculateCostExample(100, vendor.cashback_rate, vendor.cost_multiplier);
              return (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid var(--parch-line)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(201,168,76,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '8px 12px' }}>
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--ink)' }}>{vendor.name}</p>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={vendor.cashback_rate}
                      onChange={(e) => handleUpdateVendor(idx, 'cashback_rate', e.target.value)}
                      style={{
                        width: 60,
                        padding: '6px 8px',
                        border: '1px solid var(--parch-line)',
                        borderRadius: 6,
                        background: 'var(--parch-warm)',
                        color: 'var(--ink)',
                        fontSize: 12,
                        textAlign: 'center',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      step="0.01"
                      value={vendor.cost_multiplier}
                      onChange={(e) => handleUpdateVendor(idx, 'cost_multiplier', e.target.value)}
                      style={{
                        width: 60,
                        padding: '6px 8px',
                        border: '1px solid var(--parch-line)',
                        borderRadius: 6,
                        background: 'var(--parch-warm)',
                        color: 'var(--ink)',
                        fontSize: 12,
                        textAlign: 'center',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    $100 → ${exampleCost.toFixed(2)}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleDeleteVendor(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--crimson)',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 32,
                        minWidth: 32,
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add new vendor */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 4 }}>
            Add Vendor
          </label>
          <input
            type="text"
            placeholder="e.g., Newegg"
            value={newVendor}
            onChange={(e) => setNewVendor(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddVendor()}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid var(--parch-line)',
              borderRadius: 8,
              background: 'var(--parch-warm)',
              color: 'var(--ink)',
              fontSize: 12,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <button
          onClick={handleAddVendor}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 12px',
            background: 'var(--gold)',
            color: 'var(--ne-cream)',
            border: 'none',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: 40,
            fontFamily: 'var(--font-serif)',
          }}
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* Help text */}
      <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', fontSize: 11, color: 'var(--ink-faded)' }}>
        <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--ink)' }}>How it works:</p>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          <li><strong>Cashback %:</strong> Percentage you get back (e.g., 5% on Amazon credit card)</li>
          <li><strong>Cost Multiplier:</strong> If you get discounts (e.g., 0.85 = 15% off)</li>
          <li><strong>Example:</strong> $100 item with 5% cashback = $95 true cost</li>
        </ul>
      </div>
    </div>
  );
}
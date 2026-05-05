// src/components/SpreadsheetTable.jsx
// UPDATED: Smart pricing + product search + cashback

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Copy, Trash2, Plus, Download, Search, X } from 'lucide-react';
import { calculateTrueCost, calculateProfit, calculateROI, fmt$, getVendorConfig } from '@/utils/smartPricing';

/**
 * SpreadsheetTable Component
 * 
 * Features:
 * - Product autocomplete search (from saved products)
 * - Smart price calculation (MSRP + cashback → true cost)
 * - Auto-fill product details
 * - Inline editable cells
 * - Auto-calculated profit
 * - Live vendor config application
 * 
 * Props:
 * - rows: array of row objects
 * - onRowsChange: callback when rows are modified
 * - onSave: callback when user clicks "Save"
 * - products: array of saved products
 * - vendors: array of available vendors
 * - vendorConfigs: array of vendor cashback configs
 */
export default function SpreadsheetTable({
  rows,
  onRowsChange,
  onSave,
  products = [],
  vendors = ['Amazon', 'Best Buy', 'Target', 'Walmart', 'Costco', 'Staples'],
  vendorConfigs = [],
}) {
  const [openSearch, setOpenSearch] = useState(null);
  const searchRef = useRef({});

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setOpenSearch(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const updateRow = useCallback((id, field, value) => {
    const updated = rows.map((r) => (r.id === id ? { ...r, [field]: value } : r));
    onRowsChange(updated);
  }, [rows, onRowsChange]);

  const addRow = useCallback(() => {
    const newId = Math.max(...rows.map((r) => r.id || 0), 0) + 1;
    onRowsChange([
      ...rows,
      {
        id: newId,
        product: '',
        product_id: '',
        vendor: '',
        msrp: 0,
        actual_price: 0,
        cashback_rate: 0,
        true_cost: 0,
        sale: 0,
        qty: 1,
        status: 'Ordered',
      },
    ]);
  }, [rows, onRowsChange]);

  const duplicateRow = useCallback((id) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const newId = Math.max(...rows.map((r) => r.id || 0), 0) + 1;
    onRowsChange([...rows, { ...row, id: newId }]);
  }, [rows, onRowsChange]);

  const deleteRow = useCallback((id) => {
    onRowsChange(rows.filter((r) => r.id !== id));
  }, [rows, onRowsChange]);

  // Search products
  const searchProducts = useCallback(
    (query) => {
      if (!query.trim()) return [];
      const q = query.toLowerCase();
      return products
        .filter((p) =>
          (p.name || p.product_name || '').toLowerCase().includes(q) ||
          (p.upc || '').includes(q)
        )
        .slice(0, 8);
    },
    [products]
  );

  // Select product from search
  const selectProduct = useCallback(
    (rowId, product) => {
      updateRow(rowId, 'product', product.name || product.product_name || '');
      updateRow(rowId, 'product_id', product.id || '');
      setOpenSearch(null);
    },
    [updateRow]
  );

  // When vendor changes, update cashback rate
  const handleVendorChange = useCallback(
    (rowId, vendor) => {
      updateRow(rowId, 'vendor', vendor);
      const config = getVendorConfig(vendor, vendorConfigs);
      updateRow(rowId, 'cashback_rate', config.cashback_rate || 0);
      // Trigger cost recalculation
      const row = rows.find((r) => r.id === rowId);
      if (row && row.actual_price > 0) {
        const trueCost = calculateTrueCost(row.actual_price, config.cashback_rate || 0, config.cost_multiplier || 1);
        updateRow(rowId, 'true_cost', trueCost);
        // Auto-suggest sale price = true cost
        updateRow(rowId, 'sale', trueCost);
      }
    },
    [rows, updateRow, vendorConfigs]
  );

  // When actual price or cashback changes, recalculate true cost
  const handlePriceChange = useCallback(
    (rowId, field, value) => {
      updateRow(rowId, field, value);
      const row = rows.find((r) => r.id === rowId);
      if (row) {
        const vendor = field === 'vendor' ? value : row.vendor;
        const actualPrice = field === 'actual_price' ? parseFloat(value) || 0 : row.actual_price || 0;
        const cashbackRate = field === 'cashback_rate' ? parseFloat(value) || 0 : row.cashback_rate || 0;
        const config = getVendorConfig(vendor, vendorConfigs);
        const costMultiplier = config.cost_multiplier || 1;

        if (actualPrice > 0) {
          const trueCost = calculateTrueCost(actualPrice, cashbackRate, costMultiplier);
          updateRow(rowId, 'true_cost', trueCost);
          // Auto-suggest sale price = true cost
          if (field === 'actual_price' || field === 'cashback_rate') {
            updateRow(rowId, 'sale', trueCost);
          }
        }
      }
    },
    [rows, updateRow, vendorConfigs]
  );

  // Live calculations
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        rows: acc.rows + 1,
        units: acc.units + (r.qty || 1),
        cost: acc.cost + (r.true_cost * (r.qty || 1) || 0),
        sale: acc.sale + (r.sale || 0),
        profit: acc.profit + ((r.sale || 0) - (r.true_cost || 0)),
      }),
      { rows: 0, units: 0, cost: 0, sale: 0, profit: 0 }
    );
  }, [rows]);

  const exportCSV = useCallback(() => {
    const headers = ['Product', 'Vendor', 'MSRP', 'Actual Price', 'Cashback %', 'True Cost', 'Sale', 'Qty', 'Profit', 'Status'];
    const data = rows.map((r) => [
      r.product || '',
      r.vendor || '',
      r.msrp || 0,
      r.actual_price || 0,
      r.cashback_rate || 0,
      r.true_cost || 0,
      r.sale || 0,
      r.qty || 1,
      (r.sale || 0) - (r.true_cost || 0),
      r.status || '',
    ]);

    const csv = [headers, ...data]
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }, [rows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Table Container */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--parch-line)', background: 'var(--parch-card)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: 'var(--parch-bg)', borderBottom: '1px solid var(--parch-line)' }}>
              <th style={{ padding: '6px 6px', textAlign: 'center', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 28 }}>#</th>
              <th style={{ padding: '6px 6px', textAlign: 'left', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 130 }}>Product</th>
              <th style={{ padding: '6px 6px', textAlign: 'left', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 100 }}>Vendor</th>
              <th style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 60 }}>MSRP</th>
              <th style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 60 }}>Actual</th>
              <th style={{ padding: '6px 6px', textAlign: 'center', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 50 }}>CB %</th>
              <th style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 60 }}>Cost</th>
              <th style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 60 }}>Sale</th>
              <th style={{ padding: '6px 6px', textAlign: 'center', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 45 }}>Qty</th>
              <th style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 60 }}>Profit</th>
              <th style={{ padding: '6px 6px', textAlign: 'center', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 60 }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => {
              const profit = (row.sale || 0) - (row.true_cost || 0);
              const profitColor = profit >= 0 ? 'var(--profit)' : 'var(--crimson)';
              const suggestions = searchProducts(row.product || '');
              const isSearchOpen = openSearch === row.id;

              return (
                <tr
                  key={row.id}
                  style={{ borderBottom: '1px solid var(--parch-line)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(201,168,76,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '4px 4px', textAlign: 'center', fontSize: 10, color: 'var(--ink-faded)' }}>{idx + 1}</td>

                  {/* Product */}
                  <td style={{ padding: '4px 6px', position: 'relative' }} ref={(el) => { if (el) searchRef.current = el; }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Search style={{ width: 12, height: 12, color: 'var(--ink-ghost)', position: 'absolute', left: 6, pointerEvents: 'none' }} />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={row.product || ''}
                          onChange={(e) => updateRow(row.id, 'product', e.target.value)}
                          onFocus={() => {
                            if (row.product) setOpenSearch(row.id);
                          }}
                          style={{
                            width: '100%',
                            padding: '4px 6px 4px 24px',
                            border: '1px solid var(--parch-line)',
                            borderRadius: 4,
                            background: 'var(--parch-warm)',
                            color: 'var(--ink)',
                            fontSize: 10,
                            outline: 'none',
                            boxSizing: 'border-box',
                            minHeight: 28,
                          }}
                        />
                      </div>

                      {isSearchOpen && suggestions.length > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 100,
                            marginTop: 2,
                            background: 'var(--parch-card)',
                            border: '1px solid var(--parch-line)',
                            borderRadius: 6,
                            maxHeight: 150,
                            overflowY: 'auto',
                          }}
                        >
                          {suggestions.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => selectProduct(row.id, p)}
                              style={{
                                padding: '6px 8px',
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--parch-line)',
                                fontSize: 10,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--parch-warm)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              {p.name || p.product_name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Vendor */}
                  <td style={{ padding: '4px 6px' }}>
                    <select
                      value={row.vendor || ''}
                      onChange={(e) => handleVendorChange(row.id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        border: '1px solid var(--parch-line)',
                        borderRadius: 4,
                        background: 'var(--parch-warm)',
                        color: 'var(--ink)',
                        fontSize: 10,
                        outline: 'none',
                        boxSizing: 'border-box',
                        minHeight: 28,
                      }}
                    >
                      <option value="">—</option>
                      {vendors.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* MSRP */}
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.msrp || ''}
                      onChange={(e) => updateRow(row.id, 'msrp', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        border: '1px solid var(--parch-line)',
                        borderRadius: 4,
                        background: 'var(--parch-warm)',
                        color: 'var(--ink)',
                        fontSize: 10,
                        textAlign: 'right',
                        outline: 'none',
                        boxSizing: 'border-box',
                        minHeight: 28,
                      }}
                    />
                  </td>

                  {/* Actual Price Paid */}
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.actual_price || ''}
                      onChange={(e) => handlePriceChange(row.id, 'actual_price', e.target.value)}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        border: '1px solid var(--parch-line)',
                        borderRadius: 4,
                        background: 'var(--parch-warm)',
                        color: 'var(--ink)',
                        fontSize: 10,
                        textAlign: 'right',
                        outline: 'none',
                        boxSizing: 'border-box',
                        minHeight: 28,
                      }}
                    />
                  </td>

                  {/* Cashback % */}
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={row.cashback_rate || ''}
                      onChange={(e) => handlePriceChange(row.id, 'cashback_rate', e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        border: '1px solid var(--parch-line)',
                        borderRadius: 4,
                        background: 'var(--parch-warm)',
                        color: 'var(--ink)',
                        fontSize: 10,
                        textAlign: 'center',
                        outline: 'none',
                        boxSizing: 'border-box',
                        minHeight: 28,
                      }}
                    />
                  </td>

                  {/* True Cost */}
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--ocean)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                    {fmt$(row.true_cost || 0)}
                  </td>

                  {/* Sale Price */}
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.sale || ''}
                      onChange={(e) => updateRow(row.id, 'sale', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        border: '1px solid var(--parch-line)',
                        borderRadius: 4,
                        background: 'var(--parch-warm)',
                        color: 'var(--ink)',
                        fontSize: 10,
                        textAlign: 'right',
                        outline: 'none',
                        boxSizing: 'border-box',
                        minHeight: 28,
                      }}
                    />
                  </td>

                  {/* Qty */}
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="number"
                      min="1"
                      value={row.qty || 1}
                      onChange={(e) => updateRow(row.id, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        border: '1px solid var(--parch-line)',
                        borderRadius: 4,
                        background: 'var(--parch-warm)',
                        color: 'var(--ink)',
                        fontSize: 10,
                        textAlign: 'center',
                        outline: 'none',
                        boxSizing: 'border-box',
                        minHeight: 28,
                      }}
                    />
                  </td>

                  {/* Profit */}
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600, color: profitColor, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                    {fmt$(profit)}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '4px 4px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button
                        onClick={() => duplicateRow(row.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--gold)', display: 'flex', minHeight: 24 }}
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        onClick={() => deleteRow(row.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--crimson)', display: 'flex', minHeight: 24 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid var(--parch-line)',
          background: 'var(--parch-card)',
          fontSize: 11,
        }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <div>
            <span style={{ color: 'var(--ink-faded)' }}>Rows:</span>
            <span style={{ fontWeight: 600, marginLeft: 4, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{totals.rows}</span>
          </div>
          <div>
            <span style={{ color: 'var(--ink-faded)' }}>Cost:</span>
            <span style={{ fontWeight: 600, marginLeft: 4, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{fmt$(totals.cost)}</span>
          </div>
          <div>
            <span style={{ color: 'var(--ink-faded)' }}>Sale:</span>
            <span style={{ fontWeight: 600, marginLeft: 4, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{fmt$(totals.sale)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-faded)' }}>Profit</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: totals.profit >= 0 ? 'var(--profit)' : 'var(--crimson)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {fmt$(totals.profit)}
          </span>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={addRow}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 14px',
            background: 'var(--gold)',
            color: 'var(--ne-cream)',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
            minHeight: 44,
            fontFamily: 'var(--font-serif)',
          }}
        >
          <Plus size={16} />
          Add Row
        </button>

        <button
          onClick={() => onSave(rows)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 14px',
            background: 'transparent',
            color: 'var(--gold)',
            border: '1px solid var(--gold)',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
            minHeight: 44,
            fontFamily: 'var(--font-serif)',
          }}
        >
          Save {totals.rows} Row{totals.rows !== 1 ? 's' : ''}
        </button>

        <button
          onClick={exportCSV}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 14px',
            background: 'transparent',
            color: 'var(--ink-faded)',
            border: '1px solid var(--parch-line)',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
            minHeight: 44,
            fontFamily: 'var(--font-serif)',
          }}
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>
    </div>
  );
}
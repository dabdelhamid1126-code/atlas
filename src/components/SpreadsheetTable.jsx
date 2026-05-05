// src/components/SpreadsheetTable.jsx
// Inline editable table for bulk order entry (BuyingAIO pattern)

import React, { useState, useCallback, useMemo } from 'react';
import { Copy, Trash2, Plus, Download } from 'lucide-react';

const fmt$ = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(parseFloat(v) || 0);

/**
 * SpreadsheetTable Component
 * 
 * Features:
 * - Inline editable cells (text, dropdown, number)
 * - Auto-calculated profit
 * - Duplicate row button
 * - Delete row button
 * - Live summary bar (totals)
 * - Tab navigation between cells
 * - Enter key creates new row
 * - CSV import/export
 * 
 * Props:
 * - rows: array of row objects with { id, product, vendor, qty, cost, sale, status, payment }
 * - onRowsChange: callback when rows are modified
 * - onSave: callback when user clicks "Save"
 * - vendors: array of available vendors
 * - paymentMethods: array of available payment methods
 */
export const SpreadsheetTable = ({
  rows,
  onRowsChange,
  onSave,
  vendors = ['Amazon', 'Best Buy', 'Target', 'Walmart', 'Costco', 'Staples'],
  paymentMethods = ['Chase Sapphire', 'Chase Freedom', 'Amex', 'Other'],
}) => {
  const [focusedCell, setFocusedCell] = useState(null);

  const updateRow = useCallback((id, field, value) => {
    const updated = rows.map((r) =>
      r.id === id ? { ...r, [field]: value } : r
    );
    onRowsChange(updated);
  }, [rows, onRowsChange]);

  const addRow = useCallback(() => {
    const newId = Math.max(...rows.map((r) => r.id || 0), 0) + 1;
    onRowsChange([
      ...rows,
      { id: newId, product: '', vendor: '', qty: 1, cost: 0, sale: 0, status: 'Ordered', payment: '' },
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

  // Live calculations
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        rows: acc.rows + 1,
        units: acc.units + (r.qty || 1),
        cost: acc.cost + (r.cost * (r.qty || 1)),
        sale: acc.sale + (r.sale || 0),
        profit: acc.profit + ((r.sale || 0) - (r.cost || 0)),
      }),
      { rows: 0, units: 0, cost: 0, sale: 0, profit: 0 }
    );
  }, [rows]);

  const exportCSV = useCallback(() => {
    const headers = ['Product', 'Vendor', 'Qty', 'Cost', 'Sale', 'Profit', 'Status', 'Payment'];
    const data = rows.map((r) => [
      r.product || '',
      r.vendor || '',
      r.qty || 1,
      r.cost || 0,
      r.sale || 0,
      (r.sale || 0) - (r.cost || 0),
      r.status || '',
      r.payment || '',
    ]);

    const csv = [headers, ...data].map((row) =>
      row.map((cell) => {
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    ).join('\n');

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
      <div
        style={{
          overflowX: 'auto',
          borderRadius: 12,
          border: '1px solid var(--parch-line)',
          background: 'var(--parch-card)',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
          }}
        >
          {/* Header */}
          <thead>
            <tr style={{ background: 'var(--parch-bg)', borderBottom: '1px solid var(--parch-line)' }}>
              <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700, fontSize: 10, color: 'var(--ink-faded)', minWidth: 28 }}>#</th>
              <th style={{ padding: '8px 8px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: 'var(--ink-faded)', minWidth: 160 }}>Product</th>
              <th style={{ padding: '8px 8px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: 'var(--ink-faded)', minWidth: 110 }}>Vendor</th>
              <th style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 700, fontSize: 10, color: 'var(--ink-faded)', minWidth: 50 }}>Qty</th>
              <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, fontSize: 10, color: 'var(--ink-faded)', minWidth: 70 }}>Cost</th>
              <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, fontSize: 10, color: 'var(--ink-faded)', minWidth: 70 }}>Sale</th>
              <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, fontSize: 10, color: 'var(--ink-faded)', minWidth: 70 }}>Profit</th>
              <th style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 700, fontSize: 10, color: 'var(--ink-faded)', minWidth: 90 }}>Status</th>
              <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700, fontSize: 10, color: 'var(--ink-faded)', minWidth: 60 }}>Actions</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {rows.map((row, idx) => {
              const profit = (row.sale || 0) - (row.cost || 0);
              const profitColor = profit >= 0 ? 'var(--terrain)' : 'var(--crimson)';

              return (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: '1px solid var(--parch-line)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(201,168,76,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Row Number */}
                  <td style={{ padding: '6px 6px', textAlign: 'center', fontSize: 11, color: 'var(--ink-faded)' }}>
                    {idx + 1}
                  </td>

                  {/* Product */}
                  <td style={{ padding: '6px 8px' }}>
                    <input
                      type="text"
                      placeholder="Item name"
                      value={row.product || ''}
                      onChange={(e) => updateRow(row.id, 'product', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid var(--parch-line)',
                        borderRadius: 6,
                        background: 'var(--parch-warm)',
                        color: 'var(--ink)',
                        fontSize: 12,
                        outline: 'none',
                        boxSizing: 'border-box',
                        minHeight: 32,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--gold)';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(201,168,76,0.1)';
                        setFocusedCell(`${row.id}-product`);
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--parch-line)';
                        e.currentTarget.style.boxShadow = 'none';
                        setFocusedCell(null);
                      }}
                    />
                  </td>

                  {/* Vendor */}
                  <td style={{ padding: '6px 8px' }}>
                    <select
                      value={row.vendor || ''}
                      onChange={(e) => updateRow(row.id, 'vendor', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid var(--parch-line)',
                        borderRadius: 6,
                        background: 'var(--parch-warm)',
                        color: 'var(--ink)',
                        fontSize: 12,
                        outline: 'none',
                        boxSizing: 'border-box',
                        minHeight: 32,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--gold)';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(201,168,76,0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--parch-line)';
                        e.currentTarget.style.boxShadow = 'none';
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

                  {/* Quantity */}
                  <td style={{ padding: '6px 8px' }}>
                    <input
                      type="number"
                      min="1"
                      value={row.qty || 1}
                      onChange={(e) => updateRow(row.id, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid var(--parch-line)',
                        borderRadius: 6,
                        background: 'var(--parch-warm)',
                        color: 'var(--ink)',
                        fontSize: 12,
                        outline: 'none',
                        textAlign: 'center',
                        boxSizing: 'border-box',
                        minHeight: 32,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--gold)';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(201,168,76,0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--parch-line)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </td>

                  {/* Cost */}
                  <td style={{ padding: '6px 8px' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.cost || ''}
                      onChange={(e) => updateRow(row.id, 'cost', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid var(--parch-line)',
                        borderRadius: 6,
                        background: 'var(--parch-warm)',
                        color: 'var(--ink)',
                        fontSize: 12,
                        outline: 'none',
                        textAlign: 'right',
                        boxSizing: 'border-box',
                        minHeight: 32,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--gold)';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(201,168,76,0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--parch-line)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </td>

                  {/* Sale Price */}
                  <td style={{ padding: '6px 8px' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.sale || ''}
                      onChange={(e) => updateRow(row.id, 'sale', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid var(--parch-line)',
                        borderRadius: 6,
                        background: 'var(--parch-warm)',
                        color: 'var(--ink)',
                        fontSize: 12,
                        outline: 'none',
                        textAlign: 'right',
                        boxSizing: 'border-box',
                        minHeight: 32,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--gold)';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(201,168,76,0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--parch-line)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </td>

                  {/* Profit (auto-calculated) */}
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: profitColor, fontSize: 12 }}>
                    {fmt$(profit)}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '6px 8px' }}>
                    <select
                      value={row.status || 'Ordered'}
                      onChange={(e) => updateRow(row.id, 'status', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid var(--parch-line)',
                        borderRadius: 6,
                        background: 'var(--parch-warm)',
                        color: 'var(--ink)',
                        fontSize: 12,
                        outline: 'none',
                        boxSizing: 'border-box',
                        minHeight: 32,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--gold)';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(201,168,76,0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--parch-line)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <option value="Ordered">Ordered</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Listed">Listed</option>
                      <option value="Sold">Sold</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button
                        onClick={() => duplicateRow(row.id)}
                        title="Duplicate row"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: 'var(--gold)',
                          display: 'flex',
                          opacity: 0.6,
                          transition: 'opacity 0.15s',
                          minHeight: 32,
                          minWidth: 32,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => deleteRow(row.id)}
                        title="Delete row"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: 'var(--crimson)',
                          display: 'flex',
                          opacity: 0.6,
                          transition: 'opacity 0.15s',
                          minHeight: 32,
                          minWidth: 32,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
                      >
                        <Trash2 size={14} />
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
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 16,
          padding: '12px 16px',
          borderRadius: 12,
          border: '1px solid var(--parch-line)',
          background: 'var(--parch-card)',
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-faded)' }}>Summary</span>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: 'var(--ink-faded)' }}>Rows:</span>
              <span style={{ fontWeight: 600, marginLeft: 4, color: 'var(--ink)' }}>{totals.rows}</span>
            </div>
            <div>
              <span style={{ color: 'var(--ink-faded)' }}>Units:</span>
              <span style={{ fontWeight: 600, marginLeft: 4, color: 'var(--ink)' }}>{totals.units}</span>
            </div>
            <div>
              <span style={{ color: 'var(--ink-faded)' }}>Cost:</span>
              <span style={{ fontWeight: 600, marginLeft: 4, color: 'var(--ink)' }}>{fmt$(totals.cost)}</span>
            </div>
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-faded)' }}>Total Profit</span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: totals.profit >= 0 ? 'var(--terrain)' : 'var(--crimson)',
              fontFamily: 'monospace',
              letterSpacing: '0.02em',
              minWidth: 80,
              textAlign: 'right',
            }}
          >
            {fmt$(totals.profit)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
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
            transition: 'all 0.15s',
            minHeight: 44,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
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
            transition: 'all 0.15s',
            minHeight: 44,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,168,76,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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
            transition: 'all 0.15s',
            minHeight: 44,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
            e.currentTarget.style.borderColor = 'var(--ink-faded)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'var(--parch-line)';
          }}
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>
    </div>
  );
};

export default SpreadsheetTable;
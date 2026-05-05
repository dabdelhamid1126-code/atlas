import React, { useState, useRef, useCallback } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';

const STATUSES = ['Pending', 'Ordered', 'Shipped', 'Received', 'Cancelled'];

const cellStyle = (focused) => ({
  width: '100%',
  height: '100%',
  padding: '6px 8px',
  border: 'none',
  outline: focused ? '2px solid var(--gold)' : 'none',
  background: focused ? 'var(--gold-bg)' : 'transparent',
  color: 'var(--ink)',
  fontSize: 12,
  fontFamily: 'var(--font-sans)',
  boxSizing: 'border-box',
});

const COLS = [
  { key: 'product',  label: 'Product',  width: 220, type: 'text'   },
  { key: 'vendor',   label: 'Vendor',   width: 140, type: 'vendor' },
  { key: 'qty',      label: 'Qty',      width: 60,  type: 'number' },
  { key: 'cost',     label: 'Cost ($)', width: 90,  type: 'number' },
  { key: 'sale',     label: 'Sale ($)', width: 90,  type: 'number' },
  { key: 'status',   label: 'Status',   width: 110, type: 'select' },
  { key: 'payment',  label: 'Payment',  width: 140, type: 'text'   },
];

const newRow = (id) => ({
  id,
  product: '', vendor: '', qty: 1, cost: 0, sale: 0,
  status: 'Ordered', payment: '',
});

export default function SpreadsheetTable({ rows, onRowsChange, onSave, vendors = [] }) {
  const [focusedCell, setFocusedCell] = useState(null); // { rowId, col }
  const tableRef = useRef(null);

  const updateCell = useCallback((rowId, col, value) => {
    onRowsChange(rows.map(r =>
      r.id === rowId ? { ...r, [col]: value } : r
    ));
  }, [rows, onRowsChange]);

  const addRow = () => {
    const id = Date.now();
    onRowsChange([...rows, newRow(id)]);
  };

  const removeRow = (rowId) => {
    if (rows.length === 1) return;
    onRowsChange(rows.filter(r => r.id !== rowId));
  };

  const handleKeyDown = (e, rowIdx, colIdx) => {
    const col = COLS[colIdx];
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextCol = colIdx + 1;
      const nextRow = rowIdx + (nextCol >= COLS.length ? 1 : 0);
      const nextColIdx = nextCol >= COLS.length ? 0 : nextCol;
      if (nextRow >= rows.length) addRow();
      setTimeout(() => {
        const cell = tableRef.current?.querySelector(
          `[data-row="${nextRow}"][data-col="${nextColIdx}"] input, [data-row="${nextRow}"][data-col="${nextColIdx}"] select`
        );
        cell?.focus();
      }, 10);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextRow = rowIdx + 1;
      if (nextRow >= rows.length) addRow();
      setTimeout(() => {
        const cell = tableRef.current?.querySelector(
          `[data-row="${nextRow}"][data-col="${colIdx}"] input, [data-row="${nextRow}"][data-col="${colIdx}"] select`
        );
        cell?.focus();
      }, 10);
    }
  };

  const allVendors = [...new Set([...vendors, ...rows.map(r => r.vendor).filter(Boolean)])];

  const totalCost = rows.reduce((s, r) => s + (parseFloat(r.cost) || 0) * (parseInt(r.qty) || 1), 0);
  const totalSale = rows.reduce((s, r) => s + (parseFloat(r.sale) || 0) * (parseInt(r.qty) || 1), 0);
  const totalProfit = totalSale - totalCost;

  const fmt$ = (v) => `$${(v || 0).toFixed(2)}`;

  return (
    <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 14, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--parch-warm)', borderBottom: '1px solid var(--parch-line)' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
            <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{rows.length}</strong> rows
          </span>
          <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
            Cost: <strong style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>{fmt$(totalCost)}</strong>
          </span>
          {totalSale > 0 && (
            <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
              Profit: <strong style={{ color: totalProfit >= 0 ? 'var(--terrain)' : 'var(--crimson)', fontFamily: 'var(--font-mono)' }}>{totalProfit >= 0 ? '+' : ''}{fmt$(totalProfit)}</strong>
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={addRow}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--parch-card)', border: '1px solid var(--parch-line)', color: 'var(--ink-dim)', cursor: 'pointer' }}>
            <Plus style={{ width: 12, height: 12 }} /> Add Row
          </button>
          <button type="button" onClick={() => onSave(rows)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--ink)', border: 'none', color: 'var(--ne-cream)', cursor: 'pointer' }}>
            <Save style={{ width: 12, height: 12 }} /> Save Orders
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table ref={tableRef} style={{ borderCollapse: 'collapse', width: '100%', minWidth: COLS.reduce((s, c) => s + c.width, 0) + 40 }}>
          <thead>
            <tr style={{ background: 'var(--parch-warm)', borderBottom: '2px solid var(--parch-line)' }}>
              <th style={{ width: 36, padding: '8px 0', textAlign: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink-ghost)', textTransform: 'uppercase' }}>#</th>
              {COLS.map(col => (
                <th key={col.key} style={{ width: col.width, padding: '8px 10px', textAlign: 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink-faded)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {col.label}
                </th>
              ))}
              <th style={{ width: 36 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={row.id} style={{ borderBottom: '1px solid var(--parch-line)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--parch-warm)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {/* Row number */}
                <td style={{ textAlign: 'center', fontSize: 10, color: 'var(--ink-ghost)', fontFamily: 'var(--font-mono)', padding: '2px 0' }}>
                  {rowIdx + 1}
                </td>

                {COLS.map((col, colIdx) => {
                  const focused = focusedCell?.rowId === row.id && focusedCell?.col === col.key;
                  return (
                    <td key={col.key}
                      data-row={rowIdx}
                      data-col={colIdx}
                      style={{ padding: 0, border: '1px solid var(--parch-line)', height: 36, position: 'relative' }}>

                      {col.type === 'select' ? (
                        <select
                          value={row[col.key]}
                          onChange={e => updateCell(row.id, col.key, e.target.value)}
                          onFocus={() => setFocusedCell({ rowId: row.id, col: col.key })}
                          onBlur={() => setFocusedCell(null)}
                          onKeyDown={e => handleKeyDown(e, rowIdx, colIdx)}
                          style={{ ...cellStyle(focused), cursor: 'pointer' }}>
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                      ) : col.type === 'vendor' ? (
                        <input
                          list={`vendors-${row.id}`}
                          value={row[col.key]}
                          onChange={e => updateCell(row.id, col.key, e.target.value)}
                          onFocus={() => setFocusedCell({ rowId: row.id, col: col.key })}
                          onBlur={() => setFocusedCell(null)}
                          onKeyDown={e => handleKeyDown(e, rowIdx, colIdx)}
                          style={cellStyle(focused)}
                          placeholder="Vendor..."
                        />
                      ) : col.type === 'number' ? (
                        <input
                          type="number"
                          min="0"
                          step={col.key === 'qty' ? '1' : '0.01'}
                          value={row[col.key]}
                          onChange={e => updateCell(row.id, col.key, parseFloat(e.target.value) || 0)}
                          onFocus={() => setFocusedCell({ rowId: row.id, col: col.key })}
                          onBlur={() => setFocusedCell(null)}
                          onKeyDown={e => handleKeyDown(e, rowIdx, colIdx)}
                          style={{ ...cellStyle(focused), textAlign: 'right' }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={row[col.key]}
                          onChange={e => updateCell(row.id, col.key, e.target.value)}
                          onFocus={() => setFocusedCell({ rowId: row.id, col: col.key })}
                          onBlur={() => setFocusedCell(null)}
                          onKeyDown={e => handleKeyDown(e, rowIdx, colIdx)}
                          style={cellStyle(focused)}
                          placeholder={col.label + '...'}
                        />
                      )}

                      {col.type === 'vendor' && (
                        <datalist id={`vendors-${row.id}`}>
                          {allVendors.map(v => <option key={v} value={v} />)}
                        </datalist>
                      )}
                    </td>
                  );
                })}

                {/* Delete row */}
                <td style={{ textAlign: 'center', padding: '0 4px' }}>
                  <button type="button" onClick={() => removeRow(row.id)} disabled={rows.length === 1}
                    style={{ background: 'none', border: 'none', cursor: rows.length === 1 ? 'not-allowed' : 'pointer', color: 'var(--crimson)', opacity: rows.length === 1 ? 0.3 : 1, padding: 4 }}>
                    <Trash2 style={{ width: 13, height: 13 }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

          {/* Summary row */}
          <tfoot>
            <tr style={{ background: 'var(--parch-warm)', borderTop: '2px solid var(--parch-line)' }}>
              <td colSpan={3} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--ink-faded)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Totals</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>{fmt$(totalCost)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: totalProfit >= 0 ? 'var(--terrain)' : 'var(--crimson)' }}>{totalSale > 0 ? fmt$(totalSale) : '—'}</td>
              <td colSpan={3} style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: totalProfit >= 0 ? 'var(--terrain)' : 'var(--crimson)' }}>
                {totalSale > 0 ? `${totalProfit >= 0 ? '+' : ''}${fmt$(totalProfit)} profit` : ''}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Hint */}
      <div style={{ padding: '7px 14px', background: 'var(--parch-warm)', borderTop: '1px solid var(--parch-line)', fontSize: 10, color: 'var(--ink-ghost)' }}>
        Tab to move between cells · Enter to add a new row · Click "Save Orders" to create purchase orders
      </div>
    </div>
  );
}
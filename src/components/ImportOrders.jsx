// src/components/ImportOrders.jsx
// COMPLETE: CSV/Excel importer with product matching + smart pricing

import React, { useState, useCallback, useMemo } from 'react';
import { Upload, X, AlertCircle, Check, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { calculateTrueCost, fmt$, getVendorConfig } from '@/utils/smartPricing';

/**
 * ImportOrders Component
 * 
 * Features:
 * - Drag & drop CSV/Excel upload
 * - Auto-detect columns
 * - Product matching from saved products
 * - Smart price calculation (actual price - cashback = true cost)
 * - Preview with inline editing
 * - Live validation
 * - Batch create purchase orders
 * 
 * Props:
 * - onImportComplete: callback after successful import
 * - products: array of saved products { id, name, cost, upc, ... }
 * - vendors: list of available vendors
 * - vendorConfigs: array of vendor cashback configs
 */
export default function ImportOrders({ 
  onImportComplete, 
  products = [], 
  vendors = [],
  vendorConfigs = []
}) {
  const [step, setStep] = useState('upload'); // 'upload' | 'preview'
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Column detection
  const KNOWN_COLUMNS = {
    product: ['product', 'product name', 'item', 'item name', 'title', 'description'],
    vendor: ['vendor', 'store', 'retailer', 'where', 'bought from', 'seller'],
    msrp: ['msrp', 'list price', 'original price', 'retail price'],
    actual_price: ['actual price', 'cost', 'price', 'paid', 'price paid', 'amount paid'],
    cashback_rate: ['cashback', 'cashback %', 'cb %', 'cb rate', 'reward %'],
    qty: ['qty', 'quantity', 'quantity ordered', 'amount', 'count'],
    date: ['date', 'order date', 'purchase date', 'date ordered', 'when'],
    status: ['status', 'state', 'condition'],
  };

  const autoDetectColumns = useCallback((headerRow) => {
    const map = {};
    headerRow.forEach((header, idx) => {
      const normalized = header.toLowerCase().trim();
      for (const [key, aliases] of Object.entries(KNOWN_COLUMNS)) {
        if (aliases.some(alias => normalized.includes(alias))) {
          map[key] = idx;
          break;
        }
      }
    });
    return map;
  }, []);

  // Parse CSV
  const parseCSV = useCallback((text) => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return { headers: [], rows: [] };

    const headerRow = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const dataRows = lines.slice(1).map(line => {
      const cols = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
          cols.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
          continue;
        }
        current += char;
      }
      cols.push(current.trim().replace(/^["']|["']$/g, ''));
      return cols;
    });

    return { headers: headerRow, rows: dataRows };
  }, []);

  // Parse Excel
  const parseExcel = useCallback(async (file) => {
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (data.length === 0) return { headers: [], rows: [] };

      const headers = data[0];
      const rows = data.slice(1);

      return { headers, rows };
    } catch (error) {
      console.error('Excel parse error:', error);
      toast.error('Failed to parse Excel file. Try CSV instead.');
      return { headers: [], rows: [] };
    }
  }, []);

  // Handle file
  const handleFile = useCallback(async (file) => {
    if (!file) return;

    setIsLoading(true);
    try {
      let parsed;

      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const text = await file.text();
        parsed = parseCSV(text);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
        parsed = await parseExcel(file);
      } else {
        toast.error('Please upload a CSV or Excel file');
        setIsLoading(false);
        return;
      }

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        toast.error('No data found in file');
        setIsLoading(false);
        return;
      }

      setHeaders(parsed.headers);

      // Auto-detect columns
      const columnMap = autoDetectColumns(parsed.headers);

      // Convert to editable rows with smart pricing
      const editableRows = parsed.rows.map((row, idx) => {
        const productName = row[columnMap.product] || '';
        const vendorName = row[columnMap.vendor] || '';
        const msrp = parseFloat(row[columnMap.msrp] || 0);
        const actualPrice = parseFloat(row[columnMap.actual_price] || 0);
        const manualCashback = parseFloat(row[columnMap.cashback_rate] || -1);

        // Try to match product
        const matchedProduct = products.find((p) =>
          (p.name || p.product_name || '').toLowerCase() === productName.toLowerCase() ||
          (p.upc && p.upc === (row[columnMap.sku] || ''))
        );

        // Get vendor config for cashback
        const vendorConfig = getVendorConfig(vendorName, vendorConfigs);
        const cashbackRate = manualCashback >= 0 ? manualCashback : (vendorConfig.cashback_rate || 0);
        const costMultiplier = vendorConfig.cost_multiplier || 1;

        // Calculate true cost
        const trueCost = actualPrice > 0
          ? calculateTrueCost(actualPrice, cashbackRate, costMultiplier)
          : 0;

        return {
          id: idx,
          product: productName,
          product_id: matchedProduct?.id || '',
          vendor: vendorName,
          msrp: msrp,
          actual_price: actualPrice,
          cashback_rate: cashbackRate,
          cost_multiplier: costMultiplier,
          true_cost: trueCost,
          sale: trueCost,
          qty: parseInt(row[columnMap.qty] || 1),
          date: row[columnMap.date] || new Date().toISOString().split('T')[0],
          status: row[columnMap.status] || 'Ordered',
        };
      });

      setRows(editableRows);
      setStep('preview');
      toast.success(`Loaded ${editableRows.length} rows`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsLoading(false);
    }
  }, [parseCSV, parseExcel, autoDetectColumns, products, vendorConfigs]);

  // Drag handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  // Update row
  const updateRow = useCallback((id, field, value) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r;

        const updated = { ...r, [field]: value };

        // Recalculate true cost if relevant fields change
        if (field === 'actual_price' || field === 'cashback_rate' || field === 'vendor') {
          const vendor = field === 'vendor' ? value : r.vendor;
          const actualPrice = field === 'actual_price' ? parseFloat(value) || 0 : r.actual_price || 0;
          const cashbackRate = field === 'cashback_rate' ? parseFloat(value) || 0 : r.cashback_rate || 0;

          const vendorConfig = getVendorConfig(vendor, vendorConfigs);
          const costMultiplier = vendorConfig.cost_multiplier || 1;

          if (actualPrice > 0) {
            const trueCost = calculateTrueCost(actualPrice, cashbackRate, costMultiplier);
            updated.true_cost = trueCost;
            updated.sale = trueCost; // Auto-suggest sale = true cost
          }
        }

        return updated;
      })
    );
  }, [vendorConfigs]);

  // Delete row
  const deleteRow = useCallback((id) => {
    setRows(prev => prev.filter(r => r.id !== id));
  }, []);

  // Validation
  const validation = useMemo(() => {
    return rows.map(r => ({
      id: r.id,
      errors: [
        !r.product?.trim() ? 'Product required' : null,
        !r.vendor?.trim() ? 'Vendor required' : null,
        r.actual_price <= 0 ? 'Actual price must be > 0' : null,
      ].filter(Boolean),
    }));
  }, [rows]);

  const validRows = rows.filter(r => validation.find(v => v.id === r.id)?.errors.length === 0);
  const hasErrors = validRows.length < rows.length;

  // Submit
  const handleImport = async () => {
    if (validRows.length === 0) {
      toast.error('Fix errors before importing');
      return;
    }

    setIsLoading(true);
    try {
      if (onImportComplete) {
        await onImportComplete(validRows);
      }
      setStep('upload');
      setRows([]);
      setHeaders([]);
      toast.success(`✅ Imported ${validRows.length} orders`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import orders');
    } finally {
      setIsLoading(false);
    }
  };

  // Download template
  const downloadTemplate = () => {
    const template = [
      ['Product Name', 'Vendor', 'MSRP', 'Actual Price Paid', 'Cashback %', 'Qty', 'Date', 'Status'].join(','),
      ['iPad Pro 11"', 'Amazon', '799.00', '650.00', '5', '1', '2026-05-04', 'Ordered'].join(','),
      ['Samsung TV 55"', 'Best Buy', '599.00', '499.99', '3', '1', '2026-05-04', 'Ordered'].join(','),
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'atlas-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* STEP 1: Upload */}
      {step === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>
              Import Orders
            </h2>
            <p style={{ fontSize: 13, color: 'var(--ink-faded)' }}>Upload CSV or Excel with smart pricing auto-calculation</p>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
              position: 'relative',
              padding: 40,
              borderRadius: 16,
              border: `2px dashed ${dragActive ? 'var(--gold)' : 'var(--parch-line)'}`,
              background: dragActive ? 'rgba(201,168,76,0.05)' : 'var(--parch-card)',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => handleFile(e.target.files?.[0])}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
            />
            <Upload style={{ width: 40, height: 40, color: dragActive ? 'var(--gold)' : 'var(--ocean)' }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                Drag & drop your file here
              </p>
              <p style={{ fontSize: 12, color: 'var(--ink-faded)', margin: '4px 0 0' }}>
                or click to browse (CSV or Excel)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={downloadTemplate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                background: 'transparent',
                color: 'var(--ocean)',
                border: '1px solid var(--ocean-bdr)',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.15s',
                minHeight: 44,
                fontFamily: 'var(--font-serif)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--ocean-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Download size={14} />
              Download Template
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Preview & Edit */}
      {step === 'preview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: 0, fontFamily: 'var(--font-serif)' }}>
                Preview & Edit
              </h2>
              <p style={{ fontSize: 12, color: 'var(--ink-faded)', margin: '4px 0 0' }}>
                {rows.length} rows loaded · {validRows.length} ready to import
              </p>
            </div>
            <button
              onClick={() => setStep('upload')}
              style={{
                padding: '8px 12px',
                background: 'transparent',
                color: 'var(--ink-dim)',
                border: '1px solid var(--parch-line)',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ← Upload Different File
            </button>
          </div>

          {/* Data table */}
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--parch-line)', background: 'var(--parch-card)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: 'var(--parch-bg)', borderBottom: '1px solid var(--parch-line)' }}>
                  <th style={{ padding: '6px 6px', textAlign: 'center', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 28 }}>#</th>
                  <th style={{ padding: '6px 6px', textAlign: 'left', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 120 }}>Product</th>
                  <th style={{ padding: '6px 6px', textAlign: 'left', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 100 }}>Vendor</th>
                  <th style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 60 }}>Actual $</th>
                  <th style={{ padding: '6px 6px', textAlign: 'center', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 50 }}>CB %</th>
                  <th style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 60 }}>Cost</th>
                  <th style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 60 }}>Sale</th>
                  <th style={{ padding: '6px 6px', textAlign: 'center', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 45 }}>Qty</th>
                  <th style={{ padding: '6px 6px', textAlign: 'center', fontWeight: 700, fontSize: 9, color: 'var(--ink-faded)', minWidth: 40 }}>❌</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const rowValidation = validation.find(v => v.id === row.id);
                  const isValid = !rowValidation?.errors.length;
                  const matched = !!row.product_id;

                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: '1px solid var(--parch-line)',
                        background: isValid ? 'transparent' : 'rgba(220, 38, 38, 0.05)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isValid ? 'rgba(201,168,76,0.08)' : 'rgba(220, 38, 38, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isValid ? 'transparent' : 'rgba(220, 38, 38, 0.05)';
                      }}
                    >
                      <td style={{ padding: '4px 6px', textAlign: 'center', fontSize: 10, color: 'var(--ink-faded)' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input
                          type="text"
                          value={row.product}
                          onChange={(e) => updateRow(row.id, 'product', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            border: '1px solid ' + (matched ? 'var(--terrain-bdr)' : 'var(--parch-line)'),
                            borderRadius: 4,
                            background: matched ? 'var(--terrain-bg)' : 'var(--parch-warm)',
                            color: 'var(--ink)',
                            fontSize: 10,
                            outline: 'none',
                            boxSizing: 'border-box',
                            minHeight: 28,
                          }}
                        />
                        {matched && <p style={{ fontSize: 8, color: 'var(--terrain)', margin: '1px 0 0', fontWeight: 600 }}>✓ Matched</p>}
                        {!isValid && rowValidation?.errors.includes('Product required') && (
                          <p style={{ fontSize: 8, color: 'var(--crimson)', margin: '1px 0 0' }}>Required</p>
                        )}
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <select
                          value={row.vendor}
                          onChange={(e) => updateRow(row.id, 'vendor', e.target.value)}
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
                          {vendors.map(v => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                        {!isValid && rowValidation?.errors.includes('Vendor required') && (
                          <p style={{ fontSize: 8, color: 'var(--crimson)', margin: '1px 0 0' }}>Required</p>
                        )}
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.actual_price}
                          onChange={(e) => updateRow(row.id, 'actual_price', e.target.value)}
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
                        {!isValid && rowValidation?.errors.includes('Actual price must be > 0') && (
                          <p style={{ fontSize: 8, color: 'var(--crimson)', margin: '1px 0 0' }}>Must be > 0</p>
                        )}
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={row.cashback_rate}
                          onChange={(e) => updateRow(row.id, 'cashback_rate', e.target.value)}
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
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--ocean)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                        {fmt$(row.true_cost)}
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.sale}
                          onChange={(e) => updateRow(row.id, 'sale', e.target.value)}
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
                      <td style={{ padding: '4px 6px' }}>
                        <input
                          type="number"
                          min="1"
                          value={row.qty}
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
                      <td style={{ padding: '4px 4px', textAlign: 'center' }}>
                        <button
                          onClick={() => deleteRow(row.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--crimson)',
                            padding: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 28,
                            minWidth: 28,
                          }}
                        >
                          <X size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Import button */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleImport}
              disabled={isLoading || validRows.length === 0}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 16px',
                background: validRows.length > 0 ? 'var(--gold)' : 'var(--parch-line)',
                color: validRows.length > 0 ? 'var(--ne-cream)' : 'var(--ink-faded)',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                minHeight: 44,
                transition: 'all 0.15s',
                fontFamily: 'var(--font-serif)',
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                  Importing...
                </>
              ) : (
                <>
                  <Check size={14} />
                  Import {validRows.length} Order{validRows.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>

          {hasErrors && (
            <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--crimson-bg)', border: '1px solid var(--crimson-bdr)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertCircle style={{ width: 14, height: 14, color: 'var(--crimson)', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 11, color: 'var(--crimson)', fontWeight: 600, margin: 0 }}>
                {rows.length - validRows.length} row{rows.length - validRows.length !== 1 ? 's' : ''} have errors
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default ImportOrders;

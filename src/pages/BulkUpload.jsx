import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {
  ArrowLeft, Upload, Mail, FileText, ChevronRight, ArrowUp
} from 'lucide-react';

const BG = '#0d0f1e';
const CARD = '#1a1d2e';
const BORDER = '#2a2d3e';
const MUTED = '#6b7280';

const CARD_STYLE = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 22px', marginBottom: 16 };

const COLUMNS = [
  [
    { label: 'Product Name', required: true },
    { label: 'Quantity' },
    { label: 'Shipping Cost' },
    { label: 'Order Number' },
    { label: 'Sale Date' },
    { label: 'Payment Method' },
    { label: 'Amazon/YA Cashback ($)' },
    { label: 'Amazon Young Adult' },
  ],
  [
    { label: 'Vendor / Store', required: true },
    { label: 'Unit Price', required: true },
    { label: 'Fees' },
    { label: 'Tracking Number(s)' },
    { label: 'Payout Date' },
    { label: 'Cashback %' },
    { label: 'Gift Card Used' },
    { label: 'Notes' },
  ],
  [
    { label: 'Buyer / Marketplace' },
    { label: 'Total Price' },
    { label: 'Sale Price' },
    { label: 'Account' },
    { label: 'Category' },
    { label: 'CB Multiplier' },
    { label: 'Tax Cashbackable' },
  ],
  [
    { label: 'Status' },
    { label: 'Tax' },
    { label: 'Commission' },
    { label: 'Transaction Date' },
    { label: 'SKU / UPC' },
    { label: 'Card Cashback ($)' },
    { label: 'Shipping Cashbackable' },
  ],
];

const STEPS = ['Upload CSV', 'Map Columns', 'Review & Submit'];

export default function BulkUpload() {
  const [currentStep] = useState(0);
  const [importMethod, setImportMethod] = useState('paste');
  const [emailText, setEmailText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) setCsvFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setCsvFile(file);
  };

  const handleImport = async () => {
    if (!emailText.trim()) return;
    setImporting(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract order details from this email/invoice text. Return structured data.\n\n${emailText}`,
        response_json_schema: {
          type: 'object',
          properties: {
            order_number: { type: 'string' },
            retailer: { type: 'string' },
            total: { type: 'number' },
            items: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, quantity: { type: 'number' }, price: { type: 'number' } } } },
            tracking_number: { type: 'string' },
            order_date: { type: 'string' },
          }
        }
      });
      if (result?.order_number) {
        await base44.entities.PurchaseOrder.create({
          order_number: result.order_number || `IMP-${Date.now()}`,
          retailer: result.retailer || 'Unknown',
          total_cost: result.total || 0,
          tracking_number: result.tracking_number || '',
          order_date: result.order_date || '',
          status: 'ordered',
          items: (result.items || []).map(i => ({
            product_name: i.name,
            quantity_ordered: i.quantity || 1,
            unit_cost: i.price || 0,
          }))
        });
        setEmailText('');
        alert('Order imported successfully!');
      }
    } catch (e) {
      alert('Import failed: ' + e.message);
    }
    setImporting(false);
  };

  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#e5e7eb' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link to={createPageUrl('Transactions')} style={{ color: MUTED, display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Bulk Upload Transactions</h1>
          <p style={{ color: MUTED, fontSize: 14 }}>Upload a CSV file or import from email/invoice</p>
        </div>
      </div>

      {/* Step Progress Bar */}
      <div className="flex items-center gap-2 mb-5 mt-4">
        {STEPS.map((step, i) => (
          <React.Fragment key={step}>
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                style={i === currentStep
                  ? { background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: '#fff' }
                  : { background: CARD, border: `1px solid ${BORDER}`, color: MUTED }
                }
              >
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: i === currentStep ? 'rgba(255,255,255,0.2)' : '#2a2d3e',
                  fontSize: 11, fontWeight: 700, flexShrink: 0
                }}>{i + 1}</span>
                {step}
              </div>
            </div>
            {i < STEPS.length - 1 && <ChevronRight size={14} style={{ color: MUTED, flexShrink: 0 }} />}
          </React.Fragment>
        ))}
      </div>

      {/* Section 1: Column Reference */}
      <div style={CARD_STYLE}>
        <p style={{ color: MUTED, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
          Column Reference
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1">
          {COLUMNS.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1.5">
              {col.map(field => (
                <div key={field.label} className="flex items-center gap-2">
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: field.required ? '#ef4444' : '#374151'
                  }} />
                  <span style={{ fontSize: 12, color: field.required ? '#e5e7eb' : '#9ca3af' }}>{field.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-1.5"><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /><span style={{ fontSize: 11, color: MUTED }}>Required</span></div>
          <div className="flex items-center gap-1.5"><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#374151', display: 'inline-block' }} /><span style={{ fontSize: 11, color: MUTED }}>Optional</span></div>
        </div>
      </div>

      {/* Section 2: Upload CSV */}
      <div style={CARD_STYLE}>
        <div className="flex items-center gap-2 mb-1">
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', borderRadius: 8, padding: '5px 6px', display: 'flex' }}>
            <Upload size={13} color="#fff" />
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Upload Your CSV</span>
        </div>
        <p style={{ color: MUTED, fontSize: 12, marginBottom: 14 }}>
          Select your filled-in CSV file. We'll auto-detect columns and let you map them.
        </p>

        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center py-10 cursor-pointer transition-all"
          style={{
            border: `2px dashed ${dragging ? '#6366f1' : BORDER}`,
            borderRadius: 12,
            background: dragging ? 'rgba(99,102,241,0.05)' : BG,
          }}
        >
          <div style={{ background: 'rgba(99,102,241,0.15)', borderRadius: '50%', padding: 14, marginBottom: 12 }}>
            <Upload size={24} color="#6366f1" />
          </div>
          <p style={{ color: '#e5e7eb', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
            {csvFile ? csvFile.name : 'Click to choose a CSV file or drag & drop'}
          </p>
          <p style={{ color: MUTED, fontSize: 12 }}>Max 500 rows per upload</p>
        </div>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />

        {csvFile && (
          <button
            className="mt-3 px-5 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', border: 'none', cursor: 'pointer' }}
          >
            Continue to Map Columns →
          </button>
        )}
      </div>

      {/* Section 3: Import from Email */}
      <div style={CARD_STYLE}>
        <div className="flex items-center gap-2 mb-1">
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', borderRadius: 8, padding: '5px 6px', display: 'flex' }}>
            <Mail size={13} color="#fff" />
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Import from Email or Invoice</span>
        </div>

        <div className="mt-4 mb-4">
          <p style={{ color: '#e5e7eb', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>How to Import Orders</p>
          <p style={{ color: MUTED, fontSize: 12, marginBottom: 12 }}>Follow these steps to import your orders</p>
          <div className="flex flex-col gap-3">
            {[
              'From any retailer in your inbox',
              'Select all text (Ctrl+A or Cmd+A) and copy (Ctrl+C or Cmd+C)',
              'The system will automatically extract order details',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                  color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1
                }}>{i + 1}</span>
                <span style={{ color: '#d1d5db', fontSize: 13 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
          {[
            ['Supported retailers:', 'Amazon, Best Buy, Woot, Walmart, Target'],
            ['Extracted data:', 'Order number, total, items, tracking number, order date, credit card (last 4), SKU codes'],
            ['Smart grouping:', 'Order + shipping emails for the same order are automatically combined'],
          ].map(([label, val]) => (
            <p key={label} style={{ fontSize: 12, color: '#c7d2fe', marginBottom: 6 }}>
              <span style={{ fontWeight: 700 }}>{label}</span>{' '}
              <span style={{ color: '#a5b4fc' }}>{val}</span>
            </p>
          ))}
        </div>

        {/* Import Method */}
        <div>
          <p style={{ color: '#e5e7eb', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>Import Method</p>
          <p style={{ color: MUTED, fontSize: 12, marginBottom: 10 }}>Choose to paste email text or upload a PDF</p>
          <div className="flex gap-2 mb-4">
            {[
              { key: 'gmail', label: 'Gmail', icon: <Mail size={13} /> },
              { key: 'paste', label: 'Paste Email', icon: <FileText size={13} /> },
              { key: 'pdf', label: 'Upload PDF', icon: <ArrowUp size={13} /> },
            ].map(m => (
              <button
                key={m.key}
                onClick={() => setImportMethod(m.key)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={importMethod === m.key
                  ? { background: '#2a2d3e', border: `1px solid #6366f1`, color: '#e5e7eb' }
                  : { background: BG, border: `1px solid ${BORDER}`, color: MUTED }
                }
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {importMethod === 'paste' && (
            <>
              <textarea
                value={emailText}
                onChange={e => setEmailText(e.target.value)}
                placeholder="Paste your order confirmation email here..."
                rows={8}
                style={{
                  width: '100%', background: BG, border: `1px solid ${BORDER}`, borderRadius: 10,
                  color: '#e5e7eb', padding: '12px 14px', fontSize: 13, outline: 'none',
                  resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box'
                }}
              />
              <button
                onClick={handleImport}
                disabled={importing || !emailText.trim()}
                className="mt-3 w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', border: 'none', cursor: 'pointer' }}
              >
                <ArrowUp size={15} /> {importing ? 'Importing...' : 'Import Order'}
              </button>
            </>
          )}

          {importMethod === 'gmail' && (
            <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '24px', textAlign: 'center' }}>
              <Mail size={28} color={MUTED} style={{ margin: '0 auto 10px' }} />
              <p style={{ color: MUTED, fontSize: 13 }}>Gmail import reads your connected Gmail inbox for order confirmation emails.</p>
              <Link to={createPageUrl('EmailImport')} style={{ color: '#6366f1', fontSize: 13, fontWeight: 600, marginTop: 8, display: 'inline-block' }}>
                Go to Gmail Import →
              </Link>
            </div>
          )}

          {importMethod === 'pdf' && (
            <div
              className="flex flex-col items-center justify-center py-8 cursor-pointer"
              style={{ border: `2px dashed ${BORDER}`, borderRadius: 12, background: BG }}
            >
              <FileText size={28} color={MUTED} style={{ marginBottom: 10 }} />
              <p style={{ color: '#e5e7eb', fontSize: 13, fontWeight: 500 }}>Click to upload a PDF invoice</p>
              <p style={{ color: MUTED, fontSize: 12 }}>PDF parsing extracts order details automatically</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
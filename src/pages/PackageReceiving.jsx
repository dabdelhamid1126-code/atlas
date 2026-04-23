import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Package, ScanBarcode, Plus, Check, X, BoxSelect, History,
  Camera, CameraOff, Search, Loader, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

const today = () => format(new Date(), 'yyyy-MM-dd');

const CONDITION_STYLES = {
  good:    { bg: 'var(--terrain-bg)',  color: 'var(--terrain2)',  border: 'var(--terrain-bdr)',  label: 'Good'    },
  damaged: { bg: 'var(--crimson-bg)',  color: 'var(--crimson2)',  border: 'var(--crimson-bdr)',  label: 'Damaged' },
  missing: { bg: 'var(--gold-bg)',     color: 'var(--gold2)',     border: 'var(--gold-bdr)',     label: 'Missing' },
};

function ConditionBadge({ condition }) {
  const s = CONDITION_STYLES[condition] || CONDITION_STYLES.good;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: s.bg, color: s.color, border: `1px solid ${s.border}`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {s.label}
    </span>
  );
}

function ConditionPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {['good', 'damaged', 'missing'].map(c => {
        const s = CONDITION_STYLES[c];
        const active = value === c;
        return (
          <button key={c} onClick={() => onChange(c)}
            style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${active ? s.border : 'var(--parch-line)'}`, background: active ? s.bg : 'var(--parch-warm)', color: active ? s.color : 'var(--ink-faded)', transition: 'all 0.12s' }}>
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Camera Barcode Scanner ────────────────────────────────────────────────

function CameraScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [error, setError] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [autoDetect, setAutoDetect] = useState(false);

  useEffect(() => {
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if ('BarcodeDetector' in window) {
          setAutoDetect(true);
          const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'] });
          const detect = async () => {
            if (!videoRef.current) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) { onScan(barcodes[0].rawValue); return; }
            } catch {}
            rafRef.current = requestAnimationFrame(detect);
          };
          rafRef.current = requestAnimationFrame(detect);
        }
      } catch {
        setError('Camera access denied or unavailable.');
      }
    };
    start();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [onScan]);

  const handleCapture = async () => {
    if (!videoRef.current) return;
    setCapturing(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);

      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'] });
        const barcodes = await detector.detect(canvas);
        if (barcodes.length > 0) { onScan(barcodes[0].rawValue); return; }
        setError('No barcode found — try again or type manually.');
      } else {
        // Upload frame to LLM vision to read the barcode
        canvas.toBlob(async (blob) => {
          try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file: blob });
            const res = await base44.integrations.Core.InvokeLLM({
              prompt: 'Read the barcode or QR code in this image. Return ONLY the raw barcode value as plain text, nothing else. If no barcode is visible, return the word NONE.',
              file_urls: [file_url],
            });
            const val = (res || '').trim();
            if (val && val !== 'NONE') { onScan(val); }
            else { setError('No barcode found — try again or type manually.'); }
          } catch { setError('Could not read barcode — try typing it manually.'); }
          finally { setCapturing(false); }
        }, 'image/jpeg', 0.92);
        return; // setCapturing handled in blob callback
      }
    } catch { setError('Capture failed — try again.'); }
    setCapturing(false);
  };

  return (
    <div style={{ background: '#000', borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
      <video ref={videoRef} muted playsInline style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {/* Aiming overlay */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ width: 220, height: 100, border: '2px solid rgba(201,168,76,0.8)', borderRadius: 10, boxShadow: '0 0 0 2000px rgba(0,0,0,0.35)' }} />
      </div>
      {/* Bottom bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 14px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1 }}>
          {error
            ? <p style={{ fontSize: 11, color: '#fca5a5', margin: 0 }}>{error}</p>
            : <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: 0 }}>{autoDetect ? 'Auto-detecting…' : 'Align barcode in box, then tap Capture'}</p>
          }
        </div>
        {/* Capture shutter button */}
        <button onClick={handleCapture} disabled={capturing}
          style={{ width: 52, height: 52, borderRadius: '50%', border: '3px solid #fff', background: capturing ? 'rgba(255,255,255,0.4)' : '#fff', cursor: capturing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
          {capturing
            ? <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #999', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#000' }} />
          }
        </button>
        <button onClick={onClose}
          style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 7, padding: '6px 14px', cursor: 'pointer', flexShrink: 0 }}>
          Close
        </button>
      </div>
    </div>
  );
}

// ── Product / UPC search ──────────────────────────────────────────────────

function ProductSearch({ onSelect, products }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const isUPC = (q) => /^\d{6,14}$/.test(q.trim());

  const search = useCallback(async (q) => {
    q = q.trim();
    if (!q) { setResults([]); return; }
    setLoading(true);
    try {
      if (isUPC(q)) {
        // Try catalog first
        const catalogMatch = products.find(p => p.upc === q);
        if (catalogMatch) {
          setResults([{ source: 'catalog', name: catalogMatch.name, sku: q, image: catalogMatch.image, id: catalogMatch.id }]);
          setLoading(false);
          return;
        }
        // UPC lookup
        const res = await base44.functions.invoke('lookupUPC', { upc: q });
        const data = res.data;
        const hits = (data.results || []).slice(0, 4).map(r => ({
          source: 'upc',
          name: r.title,
          sku: q,
          image: r.image,
        }));
        setResults(hits.length ? hits : [{ source: 'none', name: `Unknown (${q})`, sku: q }]);
      } else {
        // Text search in catalog
        const ql = q.toLowerCase();
        const hits = products.filter(p =>
          p.name?.toLowerCase().includes(ql) || p.upc?.includes(q)
        ).slice(0, 6).map(p => ({ source: 'catalog', name: p.name, sku: p.upc || '', image: p.image, id: p.id }));
        setResults(hits.length ? hits : []);
      }
    } catch {
      setResults([]);
      toast.error('Search failed');
    }
    setLoading(false);
  }, [products]);

  const handleScan = (code) => {
    setShowCamera(false);
    setQuery(code);
    search(code);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') search(query);
  };

  const SRC_BADGE = {
    catalog: { label: 'Catalog', color: 'var(--terrain2)', bg: 'var(--terrain-bg)', border: 'var(--terrain-bdr)' },
    upc:     { label: 'UPC DB',  color: 'var(--ocean2)',   bg: 'var(--ocean-bg)',   border: 'var(--ocean-bdr)'   },
    none:    { label: 'Manual',  color: 'var(--ink-faded)',bg: 'var(--parch-warm)', border: 'var(--parch-line)'  },
  };

  return (
    <div>
      {showCamera && (
        <div style={{ marginBottom: 10 }}>
          <CameraScanner onScan={handleScan} onClose={() => setShowCamera(false)} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--ink-ghost)', pointerEvents: 'none' }} />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); if (e.target.value.length === 0) setResults([]); }}
            onKeyDown={handleKey}
            placeholder="Search name or scan UPC..."
            style={{ width: '100%', height: 36, paddingLeft: 32, paddingRight: 10, borderRadius: 8, border: '1px solid var(--parch-line)', background: 'var(--parch-card)', color: 'var(--ink)', fontSize: 13, outline: 'none' }}
          />
        </div>
        <button onClick={() => search(query)} disabled={loading}
          style={{ padding: '0 12px', borderRadius: 8, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: 'var(--ink-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
          {loading ? <Loader style={{ width: 13, height: 13, animation: 'spin 0.8s linear infinite' }} /> : <Search style={{ width: 13, height: 13 }} />} Search
        </button>
        <button onClick={() => setShowCamera(v => !v)}
          title="Scan with camera"
          style={{ padding: '0 12px', borderRadius: 8, background: showCamera ? 'var(--gold-bg)' : 'var(--parch-warm)', border: `1px solid ${showCamera ? 'var(--gold-bdr)' : 'var(--parch-line)'}`, color: showCamera ? 'var(--gold2)' : 'var(--ink-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Camera style={{ width: 15, height: 15 }} />
        </button>
      </div>

      {results.length > 0 && (
        <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 10, overflow: 'hidden', marginBottom: 6 }}>
          {results.map((r, i) => {
            const badge = SRC_BADGE[r.source] || SRC_BADGE.none;
            return (
              <button key={i} onClick={() => { onSelect(r); setQuery(''); setResults([]); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: 'none', borderBottom: i < results.length - 1 ? '1px solid var(--parch-line)' : 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--parch-warm)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: 38, height: 38, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {r.image
                    ? <img src={r.image} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
                    : <Package style={{ width: 16, height: 16, color: 'var(--ink-ghost)' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</p>
                  {r.sku && <p style={{ fontSize: 10, color: 'var(--ink-ghost)', fontFamily: 'var(--font-mono)' }}>{r.sku}</p>}
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, flexShrink: 0 }}>{badge.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Item editor row ───────────────────────────────────────────────────────

function ItemRow({ item, onChange, onRemove, products }) {
  const [showSearch, setShowSearch] = useState(!item.name);

  const handleSelect = (result) => {
    onChange('name', result.name);
    onChange('sku', result.sku || '');
    setShowSearch(false);
  };

  return (
    <div style={{ background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', borderRadius: 10, padding: 12 }}>
      {/* Product name row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
            <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)' }}>Product *</label>
            <button onClick={() => setShowSearch(v => !v)}
              style={{ fontSize: 9, fontWeight: 600, color: 'var(--ocean2)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Search style={{ width: 10, height: 10 }} /> {showSearch ? 'Hide search' : 'Search / Scan'}
            </button>
          </div>
          {showSearch && (
            <div style={{ marginBottom: 6 }}>
              <ProductSearch products={products} onSelect={handleSelect} />
            </div>
          )}
          <input value={item.name} onChange={e => onChange('name', e.target.value)} placeholder="Item name..."
            style={{ width: '100%', height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--parch-line)', background: 'var(--parch-card)', color: 'var(--ink)', fontSize: 13, outline: 'none' }} />
        </div>
        <button onClick={onRemove} style={{ marginTop: 18, width: 28, height: 28, borderRadius: 7, background: 'var(--crimson-bg)', border: '1px solid var(--crimson-bdr)', color: 'var(--crimson)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <X style={{ width: 12, height: 12 }} />
        </button>
      </div>

      {/* SKU / Qty / Cost row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px', gap: 8, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 3 }}>SKU / UPC</label>
          <input value={item.sku} onChange={e => onChange('sku', e.target.value)} placeholder="Optional"
            style={{ width: '100%', height: 32, padding: '0 8px', borderRadius: 7, border: '1px solid var(--parch-line)', background: 'var(--parch-card)', color: 'var(--ink)', fontSize: 12, outline: 'none', fontFamily: 'var(--font-mono)' }} />
        </div>
        <div>
          <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 3 }}>Qty</label>
          <input type="number" min="1" value={item.quantity} onChange={e => onChange('quantity', parseInt(e.target.value) || 1)}
            style={{ width: '100%', height: 32, padding: '0 6px', borderRadius: 7, border: '1px solid var(--parch-line)', background: 'var(--parch-card)', color: 'var(--ink)', fontSize: 13, outline: 'none', textAlign: 'center' }} />
        </div>
        <div>
          <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 3 }}>Cost/Unit</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--ink-ghost)' }}>$</span>
            <input type="number" step="0.01" min="0" value={item.cost_per_unit} onChange={e => onChange('cost_per_unit', e.target.value)}
              placeholder="0.00"
              style={{ width: '100%', height: 32, paddingLeft: 18, paddingRight: 6, borderRadius: 7, border: '1px solid var(--parch-line)', background: 'var(--parch-card)', color: 'var(--ink)', fontSize: 12, outline: 'none' }} />
          </div>
        </div>
      </div>

      {/* Condition */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 4 }}>Condition</label>
          <ConditionPicker value={item.condition} onChange={v => onChange('condition', v)} />
        </div>
        {item.condition !== 'good' && (
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 3 }}>Damage Notes</label>
            <input value={item.notes} onChange={e => onChange('notes', e.target.value)} placeholder="e.g. box dented, missing charger..."
              style={{ width: '100%', height: 30, padding: '0 10px', borderRadius: 7, border: '1px solid var(--parch-line)', background: 'var(--parch-card)', color: 'var(--ink)', fontSize: 12, outline: 'none' }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Box code input with camera ────────────────────────────────────────────

function BoxCodeInput({ value, onChange, inputRef }) {
  const [showCamera, setShowCamera] = useState(false);

  const handleScan = (code) => {
    onChange(code);
    setShowCamera(false);
    toast.success(`Scanned: ${code}`);
  };

  return (
    <div>
      {showCamera && (
        <div style={{ marginBottom: 8 }}>
          <CameraScanner onScan={handleScan} onClose={() => setShowCamera(false)} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <input ref={inputRef} value={value} onChange={e => onChange(e.target.value)}
          placeholder="Scan or type tracking / box code..."
          style={{ flex: 1, height: 40, padding: '0 12px', borderRadius: 9, border: '2px solid var(--gold-bdr)', background: 'var(--parch-warm)', color: 'var(--ink)', fontSize: 14, outline: 'none', fontFamily: 'var(--font-mono)', fontWeight: 700 }} />
        <button onClick={() => setShowCamera(v => !v)}
          title="Scan with camera"
          style={{ width: 40, height: 40, borderRadius: 9, background: showCamera ? 'var(--gold-bg)' : 'var(--parch-warm)', border: `1px solid ${showCamera ? 'var(--gold-bdr)' : 'var(--parch-line)'}`, color: showCamera ? 'var(--gold2)' : 'var(--ink-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Camera style={{ width: 18, height: 18 }} />
        </button>
      </div>
    </div>
  );
}

// ── Shipment history card ─────────────────────────────────────────────────

function ShipmentCard({ shipment, items }) {
  const [open, setOpen] = useState(false);
  const shipItems = items.filter(i => i.shipment_id === shipment.id);
  const condS = CONDITION_STYLES[shipment.box_condition] || CONDITION_STYLES.good;
  const damageItems = shipItems.filter(i => i.condition !== 'good');

  return (
    <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: condS.bg, border: `1px solid ${condS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Package style={{ width: 18, height: 18, color: condS.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{shipment.box_code}</span>
            <ConditionBadge condition={shipment.box_condition} />
            {damageItems.length > 0 && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'var(--crimson-bg)', color: 'var(--crimson)', border: '1px solid var(--crimson-bdr)' }}>
                {damageItems.length} issue{damageItems.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-faded)' }}>
            {shipment.supplier && <span>{shipment.supplier} · </span>}
            {shipItems.length} item{shipItems.length !== 1 ? 's' : ''}
            {shipment.received_date && <span> · {format(new Date(shipment.received_date + 'T12:00:00'), 'MMM d, yyyy')}</span>}
          </div>
        </div>
        {open ? <ChevronUp style={{ width: 15, height: 15, color: 'var(--ink-ghost)', flexShrink: 0 }} /> : <ChevronDown style={{ width: 15, height: 15, color: 'var(--ink-ghost)', flexShrink: 0 }} />}
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--parch-line)', padding: '10px 14px' }}>
          {shipment.box_notes && (
            <p style={{ fontSize: 11, color: 'var(--ink-dim)', marginBottom: 10, padding: '8px 10px', background: 'var(--parch-warm)', borderRadius: 8 }}>{shipment.box_notes}</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {shipItems.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--parch-warm)', borderRadius: 8 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{item.name}</span>
                  {item.sku && <span style={{ fontSize: 10, color: 'var(--ink-ghost)', marginLeft: 6, fontFamily: 'var(--font-mono)' }}>{item.sku}</span>}
                  {item.notes && <p style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 2 }}>{item.notes}</p>}
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink-faded)', fontFamily: 'var(--font-mono)' }}>×{item.quantity}</span>
                {item.cost_per_unit > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>${parseFloat(item.cost_per_unit).toFixed(2)}</span>}
                <ConditionBadge condition={item.condition} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

const newItem = () => ({ id: crypto.randomUUID(), name: '', sku: '', quantity: 1, cost_per_unit: '', condition: 'good', notes: '' });

export default function PackageReceiving() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('receive');
  const [boxCode, setBoxCode] = useState('');
  const [supplier, setSupplier] = useState('');
  const [boxCondition, setBoxCondition] = useState('good');
  const [boxNotes, setBoxNotes] = useState('');
  const [receivedDate, setReceivedDate] = useState(today());
  const [items, setItems] = useState([newItem()]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const boxCodeRef = useRef(null);

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => base44.entities.ShipmentReceiving.list('-received_date', 50),
  });
  const { data: allItems = [] } = useQuery({
    queryKey: ['receivedItems'],
    queryFn: () => base44.entities.ReceivedItem.list('-created_date', 200),
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const addItem = () => setItems(prev => [...prev, newItem()]);
  const removeItem = id => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id, key, val) => setItems(prev => prev.map(i => i.id === id ? { ...i, [key]: val } : i));

  const reset = () => {
    setBoxCode(''); setSupplier(''); setBoxCondition('good'); setBoxNotes('');
    setReceivedDate(today()); setItems([newItem()]); setDone(false);
    setTimeout(() => boxCodeRef.current?.focus(), 100);
  };

  const handleSave = async () => {
    if (!boxCode.trim()) { toast.error('Box code is required'); return; }
    if (!items.some(i => i.name.trim())) { toast.error('Add at least one item'); return; }
    setSaving(true);
    try {
      const validItems = items.filter(i => i.name.trim());
      const damageCount = validItems.filter(i => i.condition !== 'good').length;
      const shipment = await base44.entities.ShipmentReceiving.create({
        box_code: boxCode.trim(), supplier: supplier.trim() || null,
        box_condition: boxCondition, box_notes: boxNotes.trim() || null,
        item_count: validItems.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0),
        damage_count: damageCount, received_date: receivedDate,
      });
      await Promise.all(validItems.map(item =>
        base44.entities.ReceivedItem.create({
          shipment_id: shipment.id, box_code: boxCode.trim(),
          sku: item.sku.trim() || null, name: item.name.trim(),
          condition: item.condition, notes: item.notes.trim() || null,
          quantity: parseInt(item.quantity) || 1,
          cost_per_unit: item.cost_per_unit ? parseFloat(item.cost_per_unit) : null,
        })
      ));
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['receivedItems'] });
      toast.success(`Shipment ${boxCode} saved — ${validItems.length} item${validItems.length !== 1 ? 's' : ''} received`);
      setDone(true);
      setTimeout(reset, 2500);
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally { setSaving(false); }
  };

  const totalItems = items.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0);
  const issueCount = items.filter(i => i.condition !== 'good').length;
  const totalCost  = items.reduce((s, i) => s + (parseFloat(i.cost_per_unit) || 0) * (parseInt(i.quantity) || 1), 0);

  return (
    <div style={{ paddingBottom: 40 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Package Receiving</h1>
        <p className="page-subtitle">Scan, inspect, and log incoming shipments</p>
      </div>

      <div className="tab-bar" style={{ marginBottom: 20, width: 'fit-content' }}>
        {[
          { key: 'receive', label: 'Receive Package', icon: BoxSelect },
          { key: 'history', label: `History (${shipments.length})`, icon: History },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`tab-btn${tab === t.key ? ' active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <t.icon style={{ width: 13, height: 13 }} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── RECEIVE TAB ── */}
      {tab === 'receive' && (
        <div style={{ maxWidth: 800 }}>
          {done ? (
            <div style={{ background: 'var(--terrain-bg)', border: '1px solid var(--terrain-bdr)', borderRadius: 16, padding: 40, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--terrain)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Check style={{ width: 28, height: 28, color: '#fff' }} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, color: 'var(--terrain2)', marginBottom: 8 }}>Shipment Saved!</h2>
              <p style={{ fontSize: 13, color: 'var(--ink-dim)' }}>Ready for next package...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Box info */}
              <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <ScanBarcode style={{ width: 16, height: 16, color: 'var(--gold)' }} />
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink)', margin: 0 }}>Box / Shipment Info</h2>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 4 }}>Box Code / Tracking # *</label>
                  <BoxCodeInput value={boxCode} onChange={setBoxCode} inputRef={boxCodeRef} />
                </div>
                <div className="grid-2col" style={{ marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 4 }}>Supplier</label>
                    <input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="e.g. Amazon, Best Buy..."
                      style={{ width: '100%', height: 36, padding: '0 12px', borderRadius: 9, border: '1px solid var(--parch-line)', background: 'var(--parch-warm)', color: 'var(--ink)', fontSize: 13, outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 4 }}>Received Date</label>
                    <input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)}
                      style={{ width: '100%', height: 36, padding: '0 12px', borderRadius: 9, border: '1px solid var(--parch-line)', background: 'var(--parch-warm)', color: 'var(--ink)', fontSize: 13, outline: 'none' }} />
                  </div>
                </div>
                <div style={{ marginBottom: boxCondition !== 'good' ? 12 : 0 }}>
                  <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 4 }}>Box Condition</label>
                  <ConditionPicker value={boxCondition} onChange={setBoxCondition} />
                </div>
                {boxCondition !== 'good' && (
                  <div>
                    <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 4 }}>Box Notes</label>
                    <input value={boxNotes} onChange={e => setBoxNotes(e.target.value)} placeholder="Describe the box condition..."
                      style={{ width: '100%', height: 34, padding: '0 12px', borderRadius: 9, border: '1px solid var(--parch-line)', background: 'var(--parch-warm)', color: 'var(--ink)', fontSize: 13, outline: 'none' }} />
                  </div>
                )}
              </div>

              {/* Items */}
              <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package style={{ width: 16, height: 16, color: 'var(--ocean2)' }} />
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink)', margin: 0 }}>Items</h2>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'var(--ocean-bg)', color: 'var(--ocean2)', border: '1px solid var(--ocean-bdr)', fontWeight: 700 }}>{items.length}</span>
                  </div>
                  <button onClick={addItem}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: 'var(--ink-dim)', cursor: 'pointer' }}>
                    <Plus style={{ width: 12, height: 12 }} /> Add Item
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map(item => (
                    <ItemRow key={item.id} item={item} products={products} onChange={(k, v) => updateItem(item.id, k, v)} onRemove={() => removeItem(item.id)} />
                  ))}
                </div>
              </div>

              {/* Summary + Save */}
              <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Items',      value: totalItems,                                          color: 'var(--ocean2)'   },
                    { label: 'Issues',     value: issueCount,                                          color: issueCount > 0 ? 'var(--crimson2)' : 'var(--terrain2)' },
                    { label: 'Total Cost', value: totalCost > 0 ? `$${totalCost.toFixed(2)}` : '—',  color: 'var(--gold)'     },
                  ].map(s => (
                    <div key={s.label}>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faded)', marginBottom: 2 }}>{s.label}</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={reset}
                    style={{ padding: '9px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600, background: 'none', border: '1px solid var(--parch-line)', color: 'var(--ink-faded)', cursor: 'pointer' }}>
                    Reset
                  </button>
                  <button onClick={handleSave} disabled={saving || !boxCode.trim()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 9, fontSize: 13, fontWeight: 700, background: saving || !boxCode.trim() ? 'var(--parch-warm)' : 'var(--ink)', border: 'none', color: saving || !boxCode.trim() ? 'var(--ink-ghost)' : 'var(--ne-cream)', cursor: saving || !boxCode.trim() ? 'not-allowed' : 'pointer' }}>
                    {saving
                      ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--ink-ghost)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} /> Saving...</>
                      : <><Check style={{ width: 14, height: 14 }} /> Save Shipment</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div style={{ maxWidth: 800 }}>
          {shipments.length > 0 && (
            <div className="grid-kpi" style={{ marginBottom: 16 }}>
              {[
                { label: 'Total Shipments', value: shipments.length,                                                                                      color: 'var(--gold)'     },
                { label: 'Total Items',     value: allItems.reduce((s, i) => s + (i.quantity || 1), 0),                                                    color: 'var(--ocean2)'   },
                { label: 'Issues Found',    value: allItems.filter(i => i.condition !== 'good').length,                                                    color: 'var(--crimson2)' },
                { label: 'Total Cost',      value: `$${allItems.reduce((s, i) => s + (parseFloat(i.cost_per_unit) || 0) * (i.quantity || 1), 0).toFixed(0)}`, color: 'var(--terrain2)' },
              ].map(s => (
                <div key={s.label} className="kpi-card fade-up" style={{ borderTopColor: s.color }}>
                  <div className="kpi-label">{s.label}</div>
                  <div className="kpi-value" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
          {shipments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 14 }}>
              <Package style={{ width: 36, height: 36, color: 'var(--ink-ghost)', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>No shipments yet</p>
              <p style={{ fontSize: 12, color: 'var(--ink-dim)' }}>Receive your first package to see history here</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {shipments.map(s => (
                <ShipmentCard key={s.id} shipment={s} items={allItems} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
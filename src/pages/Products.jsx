import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Package, Upload, X, Loader, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['phones', 'tablets', 'laptops', 'gaming', 'accessories', 'wearables', 'audio', 'other'];
const PAGE_SIZE = 24;

const guessCategory = (name) => {
  const n = String(name || '').toLowerCase();
  if (n.includes('ipad') || n.includes('tablet') || n.includes('galaxy tab') || n.includes('fire hd')) return 'tablets';
  if (n.includes('iphone') || n.includes('galaxy s') || n.includes('galaxy a') || n.includes('pixel') || n.includes('smartphone')) return 'phones';
  if (n.includes('macbook') || n.includes('laptop') || n.includes('notebook') || n.includes('chromebook') || n.includes('thinkpad') || n.includes('inspiron') || n.includes('omnibook') || n.includes('mac mini') || n.includes('imac') || n.includes('mac pro') || n.includes('nuc') || n.includes('desktop') || n.includes('surface pro')) return 'laptops';
  if (n.includes('airpods') || n.includes('earbuds') || n.includes('headphone') || n.includes('headset') || n.includes('speaker') || n.includes('soundbar') || n.includes('buds') || n.includes('tws')) return 'audio';
  if (n.includes('apple watch') || n.includes('galaxy watch') || n.includes('watch se') || n.includes('watch series') || n.includes('watch ultra') || n.includes('fitbit') || n.includes('garmin') || n.includes('smartwatch') || n.includes('sport band')) return 'wearables';
  if (n.includes('nintendo') || n.includes('playstation') || n.includes('xbox') || n.includes('switch') || n.includes('ps5') || n.includes('ps4') || n.includes('mario')) return 'gaming';
  if (n.includes('airtag') || n.includes('case') || n.includes('cable') || n.includes('charger') || n.includes('adapter') || n.includes('hub') || n.includes('keyboard') || n.includes('mouse') || n.includes('webcam') || n.includes('pencil') || n.includes('stylus') || n.includes('hdmi') || n.includes('usb') || n.includes('ssd') || n.includes('fire stick') || n.includes('firestick') || n.includes('fire tv') || n.includes('roku') || n.includes('echo') || n.includes('alexa') || n.includes('ring')) return 'accessories';
  return 'other';
};

const inp = { background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', borderRadius: 8, color: 'var(--ink)', padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%' };

const LBL = ({ children }) => (
  <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-dim)', display: 'block', marginBottom: 4, fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
    {children}
  </label>
);

const CAT_COLORS = {
  phones:      { bg: 'var(--ocean-bg)',   color: 'var(--ocean)',   border: 'var(--ocean-bdr)'   },
  tablets:     { bg: 'var(--terrain-bg)', color: 'var(--terrain)', border: 'var(--terrain-bdr)' },
  laptops:     { bg: 'var(--violet-bg)',  color: 'var(--violet)',  border: 'var(--violet-bdr)'  },
  gaming:      { bg: 'var(--crimson-bg)', color: 'var(--crimson)', border: 'var(--crimson-bdr)' },
  accessories: { bg: 'var(--gold-bg)',    color: 'var(--gold)',    border: 'var(--gold-border)' },
  wearables:   { bg: 'var(--ocean-bg)',   color: 'var(--ocean2)',  border: 'var(--ocean-bdr)'   },
  audio:       { bg: 'var(--rose-bg)',    color: 'var(--rose)',    border: 'var(--rose-bdr)'    },
  other:       { bg: 'var(--parch-warm)', color: 'var(--ink-dim)', border: 'var(--parch-line)'  },
};

const SOURCE_STYLES = {
  'UPCitemdb': { bg: 'var(--ocean-bg)',   color: 'var(--ocean)',   border: 'var(--ocean-bdr)'   },
  'Best Buy':  { bg: 'var(--gold-bg)',    color: 'var(--gold2)',   border: 'var(--gold-border)' },
  'Google':    { bg: 'var(--terrain-bg)', color: 'var(--terrain)', border: 'var(--terrain-bdr)' },
};

function CategoryBadge({ category }) {
  const s = CAT_COLORS[category] || CAT_COLORS.other;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 99, fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {category || 'other'}
    </span>
  );
}

function SourceBadge({ source }) {
  const s = SOURCE_STYLES[source] || SOURCE_STYLES['Google'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 99, fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {source}
    </span>
  );
}

function ProductImage({ src, name, size = 60 }) {
  const [err, setErr] = useState(false);
  if (src && !err) return (
    <img src={src} alt={name} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: 10, objectFit: 'contain', objectPosition: 'center', flexShrink: 0, padding: 4 }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: 10, background: 'var(--terrain-bg)', border: '1px solid var(--terrain-bdr)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: size * 0.4, fontWeight: 700, color: 'var(--terrain)' }}>{name?.charAt(0)?.toUpperCase() || '?'}</span>
    </div>
  );
}

function ProductThumb({ src, name, size = 38 }) {
  const [err, setErr] = useState(false);
  if (src && !err) return (
    <img src={src} alt={name} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: 8, objectFit: 'contain', objectPosition: 'center', flexShrink: 0, padding: size > 50 ? 6 : 3, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)' }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: 8, flexShrink: 0, background: 'var(--terrain-bg)', border: '1px solid var(--terrain-bdr)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: size * 0.38, fontWeight: 700, color: 'var(--terrain)' }}>{name?.charAt(0)?.toUpperCase() || '?'}</span>
    </div>
  );
}

// ─── UPC result picker modal ──────────────────────────────────────────────────
function UPCPickerModal({ upc, results, onSelect, onManual, onClose }) {
  const [selected, setSelected] = useState(0);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,22,18,0.6)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 520, background: 'var(--parch-card)', borderRadius: 16, border: '1px solid var(--parch-line)', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--parch-line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: 'var(--parch-warm)' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
              {results.length > 1 ? 'Multiple results found' : 'Result found'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 2 }}>
              UPC <span style={{ fontFamily: 'monospace', background: 'var(--parch-warm)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--parch-line)', color: 'var(--ink-faded)' }}>{upc}</span>
              {results.length > 1 ? ' · pick the correct product' : ' · confirm or enter manually'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-dim)', cursor: 'pointer', padding: 4 }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 7, maxHeight: '60vh', overflowY: 'auto' }}>
          {results.map((r, i) => (
            <div key={i} onClick={() => setSelected(i)}
              style={{ borderRadius: 10, padding: '10px 12px', border: '1px solid', borderColor: selected === i ? 'var(--terrain-bdr)' : 'var(--parch-line)', background: selected === i ? 'var(--terrain-bg)' : 'var(--parch-warm)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'all 0.12s' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: selected === i ? 'none' : '1.5px solid var(--parch-line)', background: selected === i ? 'var(--terrain)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selected === i && <Check style={{ width: 11, height: 11, color: 'white' }} />}
              </div>
              <ProductThumb src={r.image} name={r.title} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {r.title}
                </div>
              </div>
              <SourceBadge source={r.source} />
            </div>
          ))}
          <div onClick={onManual}
            style={{ borderRadius: 10, padding: '9px 12px', border: '1px solid var(--crimson-bdr)', background: 'var(--crimson-bg)', fontSize: 11, color: 'var(--crimson)', cursor: 'pointer', textAlign: 'center' }}>
            None of these — I'll enter manually
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--parch-line)', background: 'var(--parch-warm)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: 'var(--ink-faded)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => onSelect(results[selected])}
            style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--ink)', color: 'var(--gold)', border: 'none', cursor: 'pointer', fontFamily: "'Playfair Display', serif" }}>
            Use selected →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── product card ─────────────────────────────────────────────────────────────
function ProductCard({ product, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? 'var(--gold-bg)' : 'var(--parch-card)', border: `1px solid ${hovered ? 'var(--gold-border)' : 'var(--parch-line)'}`, borderRadius: 12, padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', position: 'relative', transition: 'all 0.15s' }}>
      {hovered && (
        <div style={{ position: 'absolute', top: 7, right: 7, display: 'flex', gap: 3 }}>
          <button onClick={() => onEdit(product)} style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: 'var(--ink-dim)', cursor: 'pointer' }}><Pencil style={{ width: 11, height: 11 }} /></button>
          <button onClick={() => onDelete(product)} style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--crimson-bg)', border: '1px solid var(--crimson-bdr)', color: 'var(--crimson)', cursor: 'pointer' }}><Trash2 style={{ width: 11, height: 11 }} /></button>
        </div>
      )}
      <ProductImage src={product.image} name={product.name} size={60} />
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, maxWidth: '100%', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{product.name}</div>
      <CategoryBadge category={product.category} />
      {product.upc && <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'var(--ink-ghost)' }}>{product.upc}</span>}
    </div>
  );
}

// ─── pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, onPage }) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end   = Math.min(page * PAGE_SIZE, total);
  const pages = [];
  if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
  else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }
  const btnStyle = (active) => ({ width: 32, height: 32, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer', border: '1px solid', background: active ? 'var(--gold-bg)' : 'var(--parch-card)', borderColor: active ? 'var(--gold-border)' : 'var(--parch-line)', color: active ? 'var(--gold)' : 'var(--ink-dim)' });
  const navStyle = (disabled) => ({ width: 32, height: 32, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer', border: '1px solid var(--parch-line)', background: 'var(--parch-card)', color: disabled ? 'var(--ink-ghost)' : 'var(--ink-faded)', opacity: disabled ? 0.4 : 1 });
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, flexWrap: 'wrap', gap: 10 }}>
      <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>Showing {start}–{end} of {total} products</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={() => onPage(page - 1)} disabled={page === 1} style={navStyle(page === 1)}><ChevronLeft style={{ width: 14, height: 14 }} /></button>
        {pages.map((p, i) => p === '...' ? <span key={`e${i}`} style={{ width: 32, textAlign: 'center', fontSize: 12, color: 'var(--ink-ghost)' }}>…</span> : <button key={p} onClick={() => onPage(p)} style={btnStyle(p === page)}>{p}</button>)}
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages} style={navStyle(page === totalPages)}><ChevronRight style={{ width: 14, height: 14 }} /></button>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function Products() {
  const queryClient = useQueryClient();
  const [search, setSearch]               = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage]                   = useState(1);
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loadingUPC, setLoadingUPC]       = useState(false);
  const [formData, setFormData]           = useState({ name: '', upc: '', image: '', category: '' });
  const [pickerResults, setPickerResults] = useState(null);
  const [pickerUPC, setPickerUPC]         = useState('');
  const [importOpen, setImportOpen]       = useState(false);
  const [upcInput, setUpcInput]           = useState('');
  const [importRows, setImportRows]       = useState([]);
  const [importing, setImporting]         = useState(false);
  const [lookingUp, setLookingUp]         = useState(false);

  const [userEmail, setUserEmail] = useState(null);
  useEffect(() => { base44.auth.me().then(u => setUserEmail(u?.email)).catch(() => {}); }, []);

  const { data: allProducts = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list() });

  // Filter out products hidden by this user
  const products = useMemo(() =>
    userEmail ? allProducts.filter(p => !(p.hidden_by || []).includes(userEmail)) : allProducts,
    [allProducts, userEmail]
  );

  const createMutation = useMutation({ mutationFn: (data) => base44.entities.Product.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Product created'); closeDialog(); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => base44.entities.Product.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Product updated'); closeDialog(); } });
  // Soft-delete: add user email to hidden_by array
  const deleteMutation = useMutation({
    mutationFn: (product) => {
      const hidden = [...new Set([...(product.hidden_by || []), userEmail])];
      return base44.entities.Product.update(product.id, { hidden_by: hidden });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Product removed from your view'); }
  });

  const openDialog = (product = null) => {
    setEditingProduct(product);
    setFormData(product ? { name: product.name || '', upc: product.upc || '', image: product.image || '', category: product.category || '' } : { name: '', upc: '', image: '', category: '' });
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditingProduct(null); };
  const handleSubmit = (e) => { e.preventDefault(); if (editingProduct) updateMutation.mutate({ id: editingProduct.id, data: { ...formData } }); else createMutation.mutate({ ...formData }); };
  const handleDelete = (product) => { if (confirm(`Remove "${product.name}" from your catalog?`)) deleteMutation.mutate(product); };

  const lookupSingleUPC = async () => {
    if (!formData.upc) { toast.error('Enter a UPC first'); return; }
    setLoadingUPC(true);
    try {
      const { data } = await base44.functions.invoke('lookupUPC', { upc: formData.upc });
      const results = data.results || [];
      if (results.length === 0) toast.error('No results found — enter manually');
      else { setPickerUPC(formData.upc); setPickerResults(results); }
    } catch { toast.error('Lookup failed. Enter manually.'); }
    finally { setLoadingUPC(false); }
  };

  const handlePickerSelect = (result) => {
    const autoCategory = guessCategory(result.title);
    setFormData(prev => ({ ...prev, name: result.title, image: result.image || prev.image, category: prev.category || autoCategory }));
    setPickerResults(null);
    toast.success(`Applied from ${result.source} · category auto-set to "${autoCategory}"`);
  };

  const handleBulkLookup = async () => {
    const rawUpcs = upcInput.split(/[\n,]+/).map(s => s.trim().replace(/\D/g, '')).filter(s => s.length >= 6).slice(0, 60);
    if (rawUpcs.length === 0) { toast.error('Paste at least one UPC'); return; }
    setImportRows(rawUpcs.map(upc => ({ upc, name: '', image: '', category: '', status: 'loading', selected: true })));
    setLookingUp(true);
    const existingUpcs = new Set(products.map(p => (p.upc || '').trim()));
    for (const upc of rawUpcs) {
      if (existingUpcs.has(upc)) {
        setImportRows(prev => prev.map(r => r.upc === upc ? { ...r, status: 'duplicate', selected: false, name: products.find(p => p.upc === upc)?.name || '' } : r));
        continue;
      }
      try {
        const { data } = await base44.functions.invoke('lookupUPC', { upc });
        const results = data.results || [];
        const best = results.find(r => r.source === 'Best Buy') || results[0];
        if (best) {
          const autoCategory = guessCategory(best.title);
          setImportRows(prev => prev.map(r => r.upc === upc ? { ...r, name: best.title, image: best.image || '', category: autoCategory, source: best.source, status: 'new', selected: true } : r));
        } else {
          setImportRows(prev => prev.map(r => r.upc === upc ? { ...r, status: 'not_found', selected: false } : r));
        }
      } catch {
        setImportRows(prev => prev.map(r => r.upc === upc ? { ...r, status: 'not_found', selected: false } : r));
      }
      await new Promise(res => setTimeout(res, 150));
    }
    setLookingUp(false);
  };

  const handleBulkImport = async () => {
    const toImport = importRows.filter(r => r.selected && r.status === 'new');
    if (toImport.length === 0) { toast.error('No new products selected'); return; }
    setImporting(true);
    let created = 0;
    for (const row of toImport) { try { await base44.entities.Product.create({ name: row.name, upc: row.upc, image: row.image, category: row.category || '' }); created++; } catch {} }
    queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success(`Imported ${created} product${created !== 1 ? 's' : ''}`);
    setImporting(false); setImportOpen(false); setUpcInput(''); setImportRows([]);
  };

  const toggleRow       = (upc) => setImportRows(prev => prev.map(r => r.upc === upc ? { ...r, selected: !r.selected } : r));
  const toggleAll       = () => { const allSel = importRows.filter(r => r.status === 'new').every(r => r.selected); setImportRows(prev => prev.map(r => r.status === 'new' ? { ...r, selected: !allSel } : r)); };
  const updateImportRow = (upc, field, value) => setImportRows(prev => prev.map(r => r.upc === upc ? { ...r, [field]: value } : r));

  const filtered = useMemo(() =>
    products.filter(p => {
      const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.upc?.toLowerCase().includes(search.toLowerCase());
      const matchCat    = categoryFilter === 'all' || p.category === categoryFilter;
      return matchSearch && matchCat;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [products, search, categoryFilter]
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const newCount   = importRows.filter(r => r.status === 'new').length;
  const dupCount   = importRows.filter(r => r.status === 'duplicate').length;
  const failCount  = importRows.filter(r => r.status === 'not_found').length;
  const selCount   = importRows.filter(r => r.selected && r.status === 'new').length;

  const th  = { color: 'var(--ink-dim)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--parch-line)', fontWeight: 700 };
  const tdS = { padding: '8px', borderBottom: '1px solid var(--parch-line)', verticalAlign: 'middle' };

  return (
    <div style={{ paddingBottom: 24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif", fontSize: 24, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.3px', margin: 0 }}>Products</h1>
          <p style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 4 }}>Master product catalog · {products.length} total</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setImportOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: 'var(--ink-faded)', cursor: 'pointer' }}>
            <Upload style={{ width: 14, height: 14 }} /> Import UPCs
          </button>
          <button onClick={() => openDialog()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--ink)', color: 'var(--gold)', border: 'none', cursor: 'pointer', fontFamily: "'Playfair Display', serif", letterSpacing: '0.04em' }}>
            <Plus style={{ width: 14, height: 14 }} /> Add Product
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 10, padding: '8px 12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--ink-ghost)' }} />
          <input type="text" placeholder="Search products or UPC..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ ...inp, paddingLeft: 32 }} />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['all', ...CATEGORIES].map(cat => {
            const s = cat === 'all' ? null : CAT_COLORS[cat];
            const active = categoryFilter === cat;
            return (
              <button key={cat} onClick={() => { setCategoryFilter(cat); setPage(1); }}
                style={{ padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer', border: '1px solid', background: active ? (s?.bg || 'var(--terrain-bg)') : 'transparent', color: active ? (s?.color || 'var(--terrain)') : 'var(--ink-ghost)', borderColor: active ? (s?.border || 'var(--terrain-bdr)') : 'var(--parch-line)' }}>
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grid ── */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--terrain-bg)', borderTopColor: 'var(--terrain)', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--parch-card)', borderRadius: 12, border: '1px solid var(--parch-line)' }}>
          <Package style={{ width: 36, height: 36, color: 'var(--ink-ghost)', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--ink-dim)', fontSize: 13 }}>No products found.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {paginated.map(product => <ProductCard key={product.id} product={product} onEdit={openDialog} onDelete={handleDelete} />)}
          </div>
          <Pagination page={page} totalPages={totalPages} total={filtered.length} onPage={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        </>
      )}

      {/* ══ UPC PICKER MODAL ════════════════════════════════════════════════ */}
      {pickerResults && (
        <UPCPickerModal upc={pickerUPC} results={pickerResults} onSelect={handlePickerSelect}
          onManual={() => { setPickerResults(null); toast('Enter the product name manually'); }}
          onClose={() => setPickerResults(null)} />
      )}

      {/* ══ ADD/EDIT MODAL ═══════════════════════════════════════════════════ */}
      {dialogOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={closeDialog} style={{ position: 'absolute', inset: 0, background: 'rgba(26,22,18,0.5)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 440, background: 'var(--parch-card)', borderRadius: 16, border: '1px solid var(--parch-line)', boxShadow: '0 24px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--parch-line)', background: 'var(--parch-warm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif", fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={closeDialog} style={{ background: 'none', border: 'none', color: 'var(--ink-dim)', cursor: 'pointer', padding: 4 }}><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {formData.image && <div style={{ display: 'flex', justifyContent: 'center' }}><ProductThumb src={formData.image} name={formData.name} size={80} /></div>}
                <div>
                  <LBL>Product Name *</LBL>
                  <input style={inp} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g. MacBook Air M5" />
                </div>
                <div>
                  <LBL>UPC</LBL>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...inp, flex: 1 }} value={formData.upc} onChange={e => setFormData({ ...formData, upc: e.target.value })} placeholder="Barcode number" />
                    <button type="button" disabled={loadingUPC} onClick={lookupSingleUPC}
                      style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--terrain-bg)', border: '1px solid var(--terrain-bdr)', color: 'var(--terrain)', cursor: 'pointer', whiteSpace: 'nowrap', opacity: loadingUPC ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {loadingUPC ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--terrain-bg)', borderTopColor: 'var(--terrain)', animation: 'spin 0.8s linear infinite' }} /> Looking...</> : '🔍 Lookup'}
                    </button>
                  </div>
                </div>
                <div>
                  <LBL>Category <span style={{ color: 'var(--terrain)', fontSize: 9, fontWeight: 400 }}>auto-detected from name</span></LBL>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
                    <option value="">Select category...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <LBL>Image URL</LBL>
                  <input type="text" style={inp} value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div style={{ padding: '14px 24px', borderTop: '1px solid var(--parch-line)', background: 'var(--parch-warm)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={closeDialog} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: 'var(--ink-faded)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'var(--ink)', color: 'var(--gold)', border: 'none', cursor: 'pointer', fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ BULK UPC IMPORT MODAL ════════════════════════════════════════════ */}
      {importOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => { if (!lookingUp && !importing) { setImportOpen(false); setImportRows([]); setUpcInput(''); } }} style={{ position: 'absolute', inset: 0, background: 'rgba(26,22,18,0.5)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 780, maxHeight: '88vh', background: 'var(--parch-card)', borderRadius: 16, border: '1px solid var(--parch-line)', boxShadow: '0 24px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--parch-line)', background: 'var(--parch-warm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif", fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>Import UPCs</h2>
                <p style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 2 }}>Best Buy preferred · category auto-detected · duplicates skipped</p>
              </div>
              <button onClick={() => { setImportOpen(false); setImportRows([]); setUpcInput(''); }} style={{ background: 'none', border: 'none', color: 'var(--ink-dim)', cursor: 'pointer', padding: 4 }}><X style={{ width: 16, height: 16 }} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
              {importRows.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <LBL>Paste UPCs (one per line or comma separated · max 60)</LBL>
                  <textarea value={upcInput} onChange={e => setUpcInput(e.target.value)} placeholder={'840268963422\n195949836251\n045496885311\n...'} rows={10} style={{ ...inp, resize: 'vertical', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }} />
                  <div style={{ fontSize: 11, color: 'var(--ink-dim)' }}>Tries UPCitemdb → Best Buy → Google · category auto-detected · you can override before importing</div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    {newCount  > 0 && <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'var(--terrain-bg)', color: 'var(--terrain)', border: '1px solid var(--terrain-bdr)' }}>✓ {newCount} new</span>}
                    {dupCount  > 0 && <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'var(--gold-bg)', color: 'var(--gold2)', border: '1px solid var(--gold-border)' }}>⚠ {dupCount} already exist</span>}
                    {failCount > 0 && <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'var(--crimson-bg)', color: 'var(--crimson)', border: '1px solid var(--crimson-bdr)' }}>✕ {failCount} not found</span>}
                    {lookingUp && <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'var(--ocean-bg)', color: 'var(--ocean)', border: '1px solid var(--ocean-bdr)' }}>Looking up...</span>}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
                    <colgroup><col style={{ width: 32 }} /><col style={{ width: 44 }} /><col /><col style={{ width: 120 }} /><col style={{ width: 110 }} /><col style={{ width: 70 }} /><col style={{ width: 70 }} /></colgroup>
                    <thead>
                      <tr style={{ background: 'var(--parch-warm)' }}>
                        <th style={{ ...th, padding: '6px 8px' }}><input type="checkbox" onChange={toggleAll} checked={importRows.filter(r => r.status === 'new').every(r => r.selected) && newCount > 0} style={{ accentColor: 'var(--gold)' }} /></th>
                        <th style={th}>img</th>
                        <th style={th}>name</th>
                        <th style={th}>upc</th>
                        <th style={th}>category</th>
                        <th style={th}>source</th>
                        <th style={th}>status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map(row => {
                        const isNew = row.status === 'new', isDup = row.status === 'duplicate', isFail = row.status === 'not_found', isLoad = row.status === 'loading';
                        return (
                          <tr key={row.upc} style={{ opacity: (isDup || isFail) ? 0.4 : 1 }}>
                            <td style={{ ...tdS, textAlign: 'center' }}>{isNew && <input type="checkbox" checked={row.selected} onChange={() => toggleRow(row.upc)} style={{ accentColor: 'var(--gold)' }} />}</td>
                            <td style={tdS}>
                              {isLoad ? <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--parch-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader style={{ width: 14, height: 14, color: 'var(--ocean)', animation: 'spin 1s linear infinite' }} /></div>
                                : <ProductThumb src={row.image} name={row.name} size={32} />}
                            </td>
                            <td style={tdS}>
                              {isNew ? <input value={row.name} onChange={e => updateImportRow(row.upc, 'name', e.target.value)} style={{ ...inp, padding: '4px 8px', fontSize: 11 }} />
                                : <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>{row.name || '—'}</span>}
                            </td>
                            <td style={tdS}><span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--ink-ghost)' }}>{row.upc}</span></td>
                            <td style={tdS}>
                              {isNew ? <select value={row.category} onChange={e => updateImportRow(row.upc, 'category', e.target.value)} style={{ ...inp, padding: '4px 6px', fontSize: 11, cursor: 'pointer' }}>
                                  <option value="">—</option>
                                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select> : null}
                            </td>
                            <td style={tdS}>{row.source && <SourceBadge source={row.source} />}</td>
                            <td style={tdS}>
                              {isLoad && <span style={{ fontSize: 10, color: 'var(--ocean)' }}>Looking...</span>}
                              {isNew  && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--terrain)' }}>✓ New</span>}
                              {isDup  && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold2)' }}>⚠ Exists</span>}
                              {isFail && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--crimson)' }}>✕ Not found</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--parch-line)', background: 'var(--parch-warm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-dim)' }}>{importRows.length > 0 && !lookingUp && `${selCount} product${selCount !== 1 ? 's' : ''} selected`}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {importRows.length > 0 && !lookingUp && <button onClick={() => { setImportRows([]); setUpcInput(''); }} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: 'var(--ink-faded)', cursor: 'pointer' }}>← Back</button>}
                {importRows.length === 0 && <button onClick={handleBulkLookup} disabled={!upcInput.trim() || lookingUp} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: upcInput.trim() ? 'var(--ink)' : 'var(--parch-warm)', border: upcInput.trim() ? 'none' : '1px solid var(--parch-line)', color: upcInput.trim() ? 'var(--gold)' : 'var(--ink-ghost)', cursor: upcInput.trim() ? 'pointer' : 'not-allowed' }}>Look up UPCs →</button>}
                {importRows.length > 0 && !lookingUp && selCount > 0 && <button onClick={handleBulkImport} disabled={importing} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--ink)', color: 'var(--gold)', border: 'none', cursor: 'pointer', opacity: importing ? 0.7 : 1 }}>{importing ? 'Importing...' : `Import ${selCount} product${selCount !== 1 ? 's' : ''}`}</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
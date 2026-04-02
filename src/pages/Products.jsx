import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Package, ImageOff, Upload, X, Check, AlertTriangle, Loader } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['phones', 'tablets', 'laptops', 'gaming', 'accessories', 'wearables', 'audio', 'other'];

// ─── style tokens ─────────────────────────────────────────────────────────────
const inp = {
  background: '#0d1117',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: 'white',
  padding: '8px 12px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
};

const LBL = ({ children }) => (
  <label style={{
    fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: '#94a3b8',
    display: 'block', marginBottom: 4,
  }}>
    {children}
  </label>
);

// ─── category badge ───────────────────────────────────────────────────────────
const CAT_COLORS = {
  phones:      { bg: 'rgba(96,165,250,0.12)',  color: '#60a5fa',  border: 'rgba(96,165,250,0.25)'  },
  tablets:     { bg: 'rgba(16,185,129,0.12)',  color: '#10b981',  border: 'rgba(16,185,129,0.25)'  },
  laptops:     { bg: 'rgba(168,85,247,0.12)',  color: '#c084fc',  border: 'rgba(168,85,247,0.25)'  },
  gaming:      { bg: 'rgba(239,68,68,0.10)',   color: '#f87171',  border: 'rgba(239,68,68,0.2)'    },
  accessories: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b',  border: 'rgba(245,158,11,0.25)'  },
  wearables:   { bg: 'rgba(6,182,212,0.12)',   color: '#06b6d4',  border: 'rgba(6,182,212,0.25)'   },
  audio:       { bg: 'rgba(236,72,153,0.10)',  color: '#f472b6',  border: 'rgba(236,72,153,0.2)'   },
  other:       { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8',  border: 'rgba(255,255,255,0.1)'  },
};

function CategoryBadge({ category }) {
  if (!category) return <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>—</span>;
  const s = CAT_COLORS[category] || CAT_COLORS.other;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 99,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {category}
    </span>
  );
}

// ─── product thumbnail ────────────────────────────────────────────────────────
function ProductThumb({ src, name, size = 38 }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return (
      <img src={src} alt={name} onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: size * 0.38, fontWeight: 700, color: '#10b981' }}>
        {name?.charAt(0)?.toUpperCase() || '?'}
      </span>
    </div>
  );
}

// ─── product row ──────────────────────────────────────────────────────────────
function ProductRow({ product, td, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? 'rgba(255,255,255,0.02)' : 'transparent', transition: 'background 0.1s' }}
    >
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ProductThumb src={product.image} name={product.name} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {product.name}
            </div>
          </div>
        </div>
      </td>
      <td style={td}>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          {product.upc || '—'}
        </span>
      </td>
      <td style={td}><CategoryBadge category={product.category} /></td>
      <td style={{ ...td, textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <button onClick={onEdit} title="Edit"
            style={{ padding: 6, borderRadius: 6, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
            <Pencil style={{ width: 14, height: 14 }} />
          </button>
          <button onClick={onDelete} title="Delete"
            style={{ padding: 6, borderRadius: 6, background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer' }}>
            <Trash2 style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function Products() {
  const queryClient = useQueryClient();
  const [search, setSearch]               = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOrder, setSortOrder]         = useState('name-asc');
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loadingUPC, setLoadingUPC]       = useState(false);
  const [formData, setFormData]           = useState({ name: '', upc: '', image: '', category: '' });

  // bulk import state
  const [importOpen, setImportOpen]       = useState(false);
  const [upcInput, setUpcInput]           = useState('');
  const [importRows, setImportRows]       = useState([]);
  const [importing, setImporting]         = useState(false);
  const [lookingUp, setLookingUp]         = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', sortOrder],
    queryFn: async () => {
      let data = await base44.entities.Product.list();
      if (sortOrder === 'name-asc')       data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      else if (sortOrder === 'name-desc') data.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      else if (sortOrder === 'cat-asc')   data.sort((a, b) => (a.category || 'zzz').localeCompare(b.category || 'zzz'));
      else if (sortOrder === 'cat-desc')  data.sort((a, b) => (b.category || 'zzz').localeCompare(a.category || 'zzz'));
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Product created'); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Product updated'); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Product deleted'); },
  });

  const openDialog = (product = null) => {
    setEditingProduct(product);
    setFormData(product
      ? { name: product.name || '', upc: product.upc || '', image: product.image || '', category: product.category || '' }
      : { name: '', upc: '', image: '', category: '' }
    );
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditingProduct(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProduct) updateMutation.mutate({ id: editingProduct.id, data: { ...formData } });
    else createMutation.mutate({ ...formData });
  };

  const handleDelete = (product) => {
    if (confirm(`Delete "${product.name}"?`)) deleteMutation.mutate(product.id);
  };

  // ── UPC single lookup ─────────────────────────────────────────────────────
  const lookupSingleUPC = async () => {
    if (!formData.upc) { toast.error('Enter a UPC first'); return; }
    setLoadingUPC(true);
    try {
      const { data } = await base44.functions.invoke('lookupUPC', { upc: formData.upc });
      if (data.title || data.image) {
        setFormData(prev => ({ ...prev, name: data.title || prev.name, image: data.image || prev.image }));
        toast.success('Product info found!');
      } else {
        toast.error('No info found for this UPC');
      }
    } catch { toast.error('Lookup failed. Enter manually.'); }
    finally { setLoadingUPC(false); }
  };

  // ── Bulk UPC lookup ───────────────────────────────────────────────────────
  const handleBulkLookup = async () => {
    const rawUpcs = upcInput
      .split(/[\n,]+/)
      .map(s => s.trim().replace(/\D/g, ''))
      .filter(s => s.length >= 6);

    if (rawUpcs.length === 0) { toast.error('Paste at least one UPC'); return; }
    if (rawUpcs.length > 60)  { toast.error('Max 60 UPCs at a time'); return; }

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
        const row = { upc, name: data.title || '', image: data.image || '', category: '', status: data.title ? 'new' : 'not_found', selected: !!data.title };
        setImportRows(prev => prev.map(r => r.upc === upc ? row : r));
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
    for (const row of toImport) {
      try {
        await base44.entities.Product.create({ name: row.name, upc: row.upc, image: row.image, category: row.category || '' });
        created++;
      } catch { /* skip failed */ }
    }
    queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success(`Imported ${created} product${created !== 1 ? 's' : ''}`);
    setImporting(false);
    setImportOpen(false);
    setUpcInput('');
    setImportRows([]);
  };

  const toggleRow = (upc) => setImportRows(prev => prev.map(r => r.upc === upc ? { ...r, selected: !r.selected } : r));
  const toggleAll = () => {
    const newRows = importRows.filter(r => r.status === 'new');
    const allSelected = newRows.every(r => r.selected);
    setImportRows(prev => prev.map(r => r.status === 'new' ? { ...r, selected: !allSelected } : r));
  };

  const updateImportRow = (upc, field, value) =>
    setImportRows(prev => prev.map(r => r.upc === upc ? { ...r, [field]: value } : r));

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.upc?.toLowerCase().includes(search.toLowerCase());
    const matchCat    = categoryFilter === 'all' || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const th = {
    color: 'rgba(255,255,255,0.28)', fontSize: 9, textTransform: 'uppercase',
    letterSpacing: '0.06em', padding: '8px 12px', textAlign: 'left',
    borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 600, whiteSpace: 'nowrap',
  };
  const td = {
    padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.75)', verticalAlign: 'middle', fontSize: 13,
  };

  const newCount  = importRows.filter(r => r.status === 'new').length;
  const dupCount  = importRows.filter(r => r.status === 'duplicate').length;
  const failCount = importRows.filter(r => r.status === 'not_found').length;
  const selCount  = importRows.filter(r => r.selected && r.status === 'new').length;

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#080c12' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.95)', margin: 0 }}>Products</h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>Master product catalog</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setImportOpen(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
          }}>
            <Upload style={{ width: 14, height: 14 }} /> Import UPCs
          </button>
          <button onClick={() => openDialog()} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: 'linear-gradient(135deg,#10b981,#06b6d4)', border: 'none',
            color: 'white', cursor: 'pointer',
          }}>
            <Plus style={{ width: 14, height: 14 }} /> Add Product
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10, padding: '8px 12px', flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'rgba(255,255,255,0.3)' }} />
          <input type="text" placeholder="Search products or UPC..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inp, paddingLeft: 32 }} />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          style={{ ...inp, width: 'auto', background: '#0d1117', cursor: 'pointer' }}>
          <option value="all">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}
          style={{ ...inp, width: 'auto', background: '#0d1117', cursor: 'pointer' }}>
          <option value="name-asc">Name A → Z</option>
          <option value="name-desc">Name Z → A</option>
          <option value="cat-asc">Category A → Z</option>
          <option value="cat-desc">Category Z → A</option>
        </select>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>
          {filtered.length} product{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(16,185,129,0.2)', borderTopColor: '#10b981', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
          <Package style={{ width: 36, height: 36, color: 'rgba(255,255,255,0.1)', margin: '0 auto 12px' }} />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>No products found.</p>
        </div>
      ) : (
        <div style={{ background: '#111827', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '48%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '18%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={th}>Product</th>
                <th style={th}>UPC</th>
                <th style={th}>Category</th>
                <th style={{ ...th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(product => (
                <ProductRow key={product.id} product={product} td={td}
                  onEdit={() => openDialog(product)}
                  onDelete={() => handleDelete(product)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ══ ADD / EDIT MODAL ══════════════════════════════════════════════════ */}
      {dialogOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={closeDialog} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 440, background: '#111827', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', color: 'white', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={closeDialog} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {formData.image && (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <ProductThumb src={formData.image} name={formData.name} size={72} />
                  </div>
                )}
                <div>
                  <LBL>Product Name *</LBL>
                  <input style={inp} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g. Fire TV Stick 4K Max" />
                </div>
                <div>
                  <LBL>UPC</LBL>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...inp, flex: 1 }} value={formData.upc} onChange={e => setFormData({ ...formData, upc: e.target.value })} placeholder="Barcode number" />
                    <button type="button" disabled={loadingUPC} onClick={lookupSingleUPC}
                      style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {loadingUPC ? 'Looking...' : '🔍 Lookup'}
                    </button>
                  </div>
                </div>
                <div>
                  <LBL>Category</LBL>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                    style={{ ...inp, background: '#0d1117', cursor: 'pointer' }}>
                    <option value="">Select category...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <LBL>Image URL</LBL>
                  <input type="url" style={inp} value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={closeDialog} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#10b981,#06b6d4)', border: 'none', color: 'white', cursor: 'pointer' }}>
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ BULK UPC IMPORT MODAL ═════════════════════════════════════════════ */}
      {importOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => { if (!lookingUp && !importing) { setImportOpen(false); setImportRows([]); setUpcInput(''); } }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />

          <div style={{
            position: 'relative', width: '100%', maxWidth: 720,
            maxHeight: '88vh', background: '#111827', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
            display: 'flex', flexDirection: 'column', color: 'white', overflow: 'hidden',
          }}>
            {/* header */}
            <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Import UPCs</h2>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Paste UPCs — we'll look them up and skip duplicates</p>
              </div>
              <button onClick={() => { setImportOpen(false); setImportRows([]); setUpcInput(''); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
              {importRows.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <LBL>Paste UPCs (one per line or comma separated)</LBL>
                  <textarea
                    value={upcInput}
                    onChange={e => setUpcInput(e.target.value)}
                    placeholder={'840268963422\n195949836251\n045496885311\n...'}
                    rows={10}
                    style={{ ...inp, resize: 'vertical', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}
                  />
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                    Max 60 UPCs at a time · Duplicates in your catalog will be automatically skipped
                  </div>
                </div>
              )}

              {importRows.length > 0 && (
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    {newCount > 0  && <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>✓ {newCount} new</span>}
                    {dupCount > 0  && <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'rgba(245,158,11,0.10)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>⚠ {dupCount} already exist</span>}
                    {failCount > 0 && <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}>✕ {failCount} not found</span>}
                    {lookingUp    && <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>Looking up...</span>}
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ ...th, width: 32, padding: '6px 8px' }}>
                          <input type="checkbox" onChange={toggleAll}
                            checked={importRows.filter(r => r.status === 'new').every(r => r.selected) && newCount > 0}
                            style={{ accentColor: '#10b981' }} />
                        </th>
                        <th style={{ ...th, width: 48 }}>Img</th>
                        <th style={th}>Name</th>
                        <th style={{ ...th, width: 130 }}>UPC</th>
                        <th style={{ ...th, width: 120 }}>Category</th>
                        <th style={{ ...th, width: 90 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map(row => {
                        const isNew  = row.status === 'new';
                        const isDup  = row.status === 'duplicate';
                        const isFail = row.status === 'not_found';
                        const isLoad = row.status === 'loading';
                        return (
                          <tr key={row.upc} style={{ opacity: (isDup || isFail) ? 0.45 : 1 }}>
                            <td style={{ ...td, padding: '8px', textAlign: 'center' }}>
                              {isNew && (
                                <input type="checkbox" checked={row.selected} onChange={() => toggleRow(row.upc)}
                                  style={{ accentColor: '#10b981' }} />
                              )}
                            </td>
                            <td style={{ ...td, padding: '8px' }}>
                              {isLoad
                                ? <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader style={{ width: 14, height: 14, color: '#60a5fa', animation: 'spin 1s linear infinite' }} /></div>
                                : <ProductThumb src={row.image} name={row.name} size={32} />}
                            </td>
                            <td style={{ ...td, padding: '8px' }}>
                              {isNew ? (
                                <input
                                  value={row.name}
                                  onChange={e => updateImportRow(row.upc, 'name', e.target.value)}
                                  style={{ ...inp, padding: '4px 8px', fontSize: 11 }}
                                />
                              ) : (
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{row.name || '—'}</span>
                              )}
                            </td>
                            <td style={{ ...td, padding: '8px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{row.upc}</span>
                            </td>
                            <td style={{ ...td, padding: '8px' }}>
                              {isNew ? (
                                <select value={row.category} onChange={e => updateImportRow(row.upc, 'category', e.target.value)}
                                  style={{ ...inp, padding: '4px 8px', fontSize: 11, background: '#0d1117', cursor: 'pointer' }}>
                                  <option value="">—</option>
                                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              ) : null}
                            </td>
                            <td style={{ ...td, padding: '8px' }}>
                              {isLoad && <span style={{ fontSize: 10, color: '#60a5fa' }}>Looking up...</span>}
                              {isNew  && <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981' }}>✓ New</span>}
                              {isDup  && <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>⚠ Exists</span>}
                              {isFail && <span style={{ fontSize: 10, fontWeight: 700, color: '#f87171' }}>✕ Not found</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                {importRows.length > 0 && !lookingUp && `${selCount} product${selCount !== 1 ? 's' : ''} selected to import`}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {importRows.length > 0 && !lookingUp && (
                  <button onClick={() => { setImportRows([]); setUpcInput(''); }}
                    style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer' }}>
                    ← Back
                  </button>
                )}
                {importRows.length === 0 && (
                  <button onClick={handleBulkLookup} disabled={!upcInput.trim()}
                    style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: upcInput.trim() ? 'linear-gradient(135deg,#10b981,#06b6d4)' : 'rgba(255,255,255,0.05)', border: 'none', color: upcInput.trim() ? 'white' : '#64748b', cursor: upcInput.trim() ? 'pointer' : 'not-allowed' }}>
                    Look up UPCs →
                  </button>
                )}
                {importRows.length > 0 && !lookingUp && selCount > 0 && (
                  <button onClick={handleBulkImport} disabled={importing}
                    style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#10b981,#06b6d4)', border: 'none', color: 'white', cursor: 'pointer', opacity: importing ? 0.7 : 1 }}>
                    {importing ? 'Importing...' : `Import ${selCount} product${selCount !== 1 ? 's' : ''}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
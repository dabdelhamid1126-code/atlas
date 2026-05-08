import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, Pencil, ChevronDown, ChevronUp, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

/* ── Design tokens ─────────────────────────────────────────────────────────── */
const INP = {
  background: 'var(--parch-warm)',
  border: '1px solid var(--parch-line)',
  borderRadius: 8,
  color: 'var(--ink)',
  padding: '8px 10px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  fontFamily: 'var(--font-sans)',
};

const EXPENSE_CATEGORIES = [
  { id: 'shipping',  label: 'Shipping',       color: 'var(--ocean)',    bg: 'var(--ocean-bg)',    bdr: 'var(--ocean-bdr)'   },
  { id: 'storage',   label: 'Storage',         color: 'var(--gold)',     bg: 'var(--gold-bg)',     bdr: 'var(--gold-bdr)'    },
  { id: 'supplies',  label: 'Supplies',        color: 'var(--terrain)',  bg: 'var(--terrain-bg)', bdr: 'var(--terrain-bdr)' },
  { id: 'software',  label: 'Software/Tools',  color: 'var(--violet)',   bg: 'var(--violet-bg)',  bdr: 'var(--violet-bdr)'  },
  { id: 'marketing', label: 'Marketing',       color: 'var(--crimson)',  bg: 'var(--crimson-bg)', bdr: 'var(--crimson-bdr)' },
  { id: 'other',     label: 'Other',           color: 'var(--ink-faded)',bg: 'var(--parch-warm)', bdr: 'var(--parch-line)'  },
];

const STATUS_META = {
  pending:  { label: 'Pending',  color: 'var(--ink-faded)', bg: 'var(--parch-warm)',  bdr: 'var(--parch-line)'  },
  approved: { label: 'Approved', color: 'var(--terrain)',   bg: 'var(--terrain-bg)', bdr: 'var(--terrain-bdr)' },
  paid:     { label: 'Paid',     color: 'var(--ocean)',     bg: 'var(--ocean-bg)',   bdr: 'var(--ocean-bdr)'   },
  rejected: { label: 'Rejected', color: 'var(--crimson)',   bg: 'var(--crimson-bg)', bdr: 'var(--crimson-bdr)' },
};

const fmt$    = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;
const fmtDate = (d) => { try { return d ? format(new Date(d), 'MMM d, yyyy') : '—'; } catch { return '—'; } };

/* ── Micro components ────────────────────────────────────────────────────── */
function LBL({ children }) {
  return (
    <label style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 4 }}>
      {children}
    </label>
  );
}

function SectionDivider({ label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color, whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${color}40,${color}10,transparent)` }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, fontFamily: 'var(--font-serif)', background: m.bg, color: m.color, border: `1px solid ${m.bdr}` }}>
      {m.label}
    </span>
  );
}

function CategoryBadge({ categoryId }) {
  const cat = EXPENSE_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: cat.bg, color: cat.color, border: `1px solid ${cat.bdr}` }}>
      {cat.label}
    </span>
  );
}

/* ── Default expense form ──────────────────────────────────────────────────── */
const defaultForm = () => ({
  description:  '',
  amount:       '',
  category:     'other',
  status:       'pending',
  expense_date: format(new Date(), 'yyyy-MM-dd'),
  notes:        '',
});

const formFromExpense = (exp) => ({
  description:  exp.description  || '',
  amount:       exp.amount       || '',
  category:     exp.category     || 'other',
  status:       exp.status       || 'pending',
  expense_date: exp.expense_date || '',
  notes:        exp.notes        || '',
});

/* ── Main ──────────────────────────────────────────────────────────────────── */
export default function Expenses() {
  const queryClient = useQueryClient();
  const [search,         setSearch]         = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [sortBy,         setSortBy]         = useState('date_desc');
  const [formOpen,       setFormOpen]       = useState(false);
  const [editingExp,     setEditingExp]     = useState(null);
  const [formData,       setFormData]       = useState(defaultForm);
  const [expandedIds,    setExpandedIds]    = useState(new Set());

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn:  () => base44.entities.Expense?.list?.('-created_date') || [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Expense created'); setFormOpen(false); setFormData(defaultForm()); },
    onError:    () => toast.error('Failed to create expense'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Expense updated'); setFormOpen(false); },
    onError:    () => toast.error('Failed to update expense'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Expense deleted'); },
    onError:    () => toast.error('Failed to delete expense'),
  });

  const set       = (f, v) => setFormData(p => ({ ...p, [f]: v }));
  const openCreate = () => { setEditingExp(null); setFormData(defaultForm()); setFormOpen(true); };
  const openEdit   = (exp) => { setEditingExp(exp); setFormData(formFromExpense(exp)); setFormOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim())                     { toast.error('Description required'); return; }
    if (!formData.amount || parseFloat(formData.amount) <= 0) { toast.error('Valid amount required'); return; }
    const data = { ...formData, amount: parseFloat(formData.amount) };
    if (editingExp) updateMutation.mutate({ id: editingExp.id, data });
    else            createMutation.mutate(data);
  };

  const filtered = useMemo(() => {
    let list = [...expenses];
    if (categoryFilter !== 'all') list = list.filter(e => e.category === categoryFilter);
    if (statusFilter   !== 'all') list = list.filter(e => e.status   === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(e => e.description?.toLowerCase().includes(s) || e.notes?.toLowerCase().includes(s));
    }
    list.sort((a, b) => {
      if (sortBy === 'date_desc')   return new Date(b.expense_date || b.created_date) - new Date(a.expense_date || a.created_date);
      if (sortBy === 'date_asc')    return new Date(a.expense_date || a.created_date) - new Date(b.expense_date || b.created_date);
      if (sortBy === 'amount_desc') return (b.amount || 0) - (a.amount || 0);
      if (sortBy === 'amount_asc')  return (a.amount || 0) - (b.amount || 0);
      return 0;
    });
    return list;
  }, [expenses, categoryFilter, statusFilter, search, sortBy]);

  const stats = useMemo(() => {
    const total    = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const approved = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + (e.amount || 0), 0);
    const pending  = expenses.filter(e => e.status === 'pending' ).reduce((s, e) => s + (e.amount || 0), 0);
    const paid     = expenses.filter(e => e.status === 'paid'    ).reduce((s, e) => s + (e.amount || 0), 0);
    return { total, approved, pending, paid };
  }, [expenses]);

  return (
    <div style={{ paddingBottom: 40 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .exp-actions { display: flex; flex-wrap: wrap; gap: 6px; }
        @media (max-width: 640px) {
          .exp-header { flex-direction: column !important; align-items: flex-start !important; }
          .exp-actions button { flex: 1; min-width: 70px; }
          .modal-panel { max-width: 100% !important; border-left: none !important; border-radius: 16px 16px 0 0 !important; position: fixed; bottom: 0; top: auto !important; height: 95vh !important; }
          .form-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div className="exp-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track and manage business expenses</p>
        </div>
        <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--ink)', color: 'var(--ne-cream)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>
          <Plus style={{ width: 14, height: 14 }} /> New Expense
        </button>
      </div>

      {/* KPIs */}
      <SectionDivider label="Overview" color="var(--gold)" />
      <div className="grid-kpi" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Expenses', val: fmt$(stats.total),    accent: 'var(--crimson)'  },
          { label: 'Pending',        val: fmt$(stats.pending),  accent: 'var(--ink-faded)' },
          { label: 'Approved',       val: fmt$(stats.approved), accent: 'var(--ocean)'    },
          { label: 'Paid',           val: fmt$(stats.paid),     accent: 'var(--terrain)'  },
        ].map(k => (
          <div key={k.label} className="kpi-card fade-up" style={{ borderTopColor: k.accent }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.accent }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <SectionDivider label="Filters" color="var(--ocean)" />
      <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 160, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search style={{ position: 'absolute', left: 10, color: 'var(--ink-ghost)', pointerEvents: 'none', width: 14, height: 14 }} />
            <input style={{ width: '100%', padding: '7px 10px 7px 32px', borderRadius: 8, fontSize: 12, border: '1px solid var(--parch-line)', background: 'var(--parch-warm)', color: 'var(--ink)', outline: 'none' }} placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12, border: '1px solid var(--parch-line)', background: 'var(--parch-warm)', color: 'var(--ink-dim)', outline: 'none' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="all">All categories</option>
            {EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12, border: '1px solid var(--parch-line)', background: 'var(--parch-warm)', color: 'var(--ink-dim)', outline: 'none' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12, border: '1px solid var(--parch-line)', background: 'var(--parch-warm)', color: 'var(--ink-dim)', outline: 'none' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="amount_desc">Highest amount</option>
            <option value="amount_asc">Lowest amount</option>
          </select>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--ink-dim)', marginBottom: 12 }}>
        Showing <strong style={{ color: 'var(--ink)' }}>{filtered.length}</strong> expense{filtered.length !== 1 ? 's' : ''}
      </div>

      {/* Expense list */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-ghost)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 20px', background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 12 }}>
          <Receipt style={{ width: 36, height: 36, color: 'var(--ink-ghost)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 6, fontFamily: 'var(--font-serif)' }}>No expenses found</p>
          <p style={{ fontSize: 12, color: 'var(--ink-faded)', marginBottom: 16 }}>Create one to start tracking</p>
          <button onClick={openCreate} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--ink)', color: 'var(--ne-cream)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>+ New Expense</button>
        </div>
      ) : filtered.map(exp => {
        const expanded = expandedIds.has(exp.id);
        const cat = EXPENSE_CATEGORIES.find(c => c.id === exp.category);
        return (
          <div key={exp.id} style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: expanded ? '1px solid var(--parch-line)' : 'none', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-serif)' }}>{exp.description}</span>
                  <CategoryBadge categoryId={exp.category} />
                  <StatusBadge status={exp.status} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                  <span>{fmtDate(exp.expense_date)}</span>
                  {exp.notes && <span style={{ marginLeft: 8 }}>· {exp.notes}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginRight: 4 }}>{fmt$(exp.amount)}</span>
                <div className="exp-actions">
                  <button onClick={() => openEdit(exp)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, border: '1px solid var(--parch-line)', background: 'transparent', color: 'var(--ink-faded)', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>
                    <Pencil style={{ width: 11, height: 11 }} /> Edit
                  </button>
                  <button onClick={() => { if (confirm(`Delete ${exp.description}?`)) deleteMutation.mutate(exp.id); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, border: '1px solid var(--crimson-bdr)', background: 'var(--crimson-bg)', color: 'var(--crimson)', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>
                    <Trash2 style={{ width: 11, height: 11 }} /> Delete
                  </button>
                  <button onClick={() => { const n = new Set(expandedIds); n.has(exp.id) ? n.delete(exp.id) : n.add(exp.id); setExpandedIds(n); }} style={{ padding: 4, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--ink-ghost)', cursor: 'pointer' }}>
                    {expanded ? <ChevronUp style={{ width: 15, height: 15 }} /> : <ChevronDown style={{ width: 15, height: 15 }} />}
                  </button>
                </div>
              </div>
            </div>

            {expanded && (
              <div style={{ padding: '10px 16px', background: 'var(--parch-warm)', borderTop: '1px solid var(--parch-line)', fontSize: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: 9, fontWeight: 700, color: 'var(--ink-faded)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Category</p>
                    <p style={{ color: 'var(--ink)', margin: 0, fontSize: 12, fontFamily: 'var(--font-serif)' }}>{cat?.label}</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: 9, fontWeight: 700, color: 'var(--ink-faded)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Status</p>
                    <p style={{ color: 'var(--ink)', margin: 0, fontSize: 12, fontFamily: 'var(--font-serif)' }}>{STATUS_META[exp.status]?.label}</p>
                  </div>
                  {exp.notes && (
                    <div style={{ gridColumn: '1/-1' }}>
                      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 9, fontWeight: 700, color: 'var(--ink-faded)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Notes</p>
                      <p style={{ color: 'var(--ink-dim)', margin: 0, fontStyle: 'italic', fontSize: 12, fontFamily: 'var(--font-serif)' }}>{exp.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Side panel modal */}
      {formOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={() => setFormOpen(false)} style={{ position: 'absolute', inset: 0, background: 'var(--overlay-bg)' }} />
          <div className="modal-panel" style={{ position: 'relative', width: '100%', maxWidth: 480, height: '100%', background: 'var(--parch-card)', borderLeft: '1px solid var(--parch-line)', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

            {/* Panel header */}
            <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--parch-line)', background: 'var(--parch-warm)', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>{editingExp ? 'Edit Expense' : 'New Expense'}</h2>
                <button onClick={() => setFormOpen(false)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: 'var(--ink-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <LBL>Description *</LBL>
                <input style={INP} value={formData.description} onChange={e => set('description', e.target.value)} placeholder="Office supplies, shipping, etc." required />
              </div>

              <div className="form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <LBL>Amount *</LBL>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 12 }}>$</span>
                    <input style={{ ...INP, paddingLeft: 20 }} type="number" step="0.01" min="0" value={formData.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" required />
                  </div>
                </div>
                <div>
                  <LBL>Date</LBL>
                  <input type="date" style={INP} value={formData.expense_date} onChange={e => set('expense_date', e.target.value)} />
                </div>
              </div>

              <div className="form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <LBL>Category</LBL>
                  <select style={{ ...INP, cursor: 'pointer' }} value={formData.category} onChange={e => set('category', e.target.value)}>
                    {EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <LBL>Status</LBL>
                  <select style={{ ...INP, cursor: 'pointer' }} value={formData.status} onChange={e => set('status', e.target.value)}>
                    {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <LBL>Notes</LBL>
                <textarea style={{ ...INP, resize: 'vertical' }} rows={3} value={formData.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional details..." />
              </div>
            </form>

            {/* Panel footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--parch-line)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--parch-warm)', position: 'sticky', bottom: 0 }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{fmt$(parseFloat(formData.amount) || 0)}</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setFormOpen(false)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--ink-faded)', background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', cursor: 'pointer' }}>Cancel</button>
                <button type="button" onClick={handleSubmit} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, color: 'var(--ne-cream)', background: 'var(--ink)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>
                  {editingExp ? 'Save changes' : 'Create expense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
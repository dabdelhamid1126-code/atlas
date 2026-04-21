import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, X, DollarSign, TrendingUp, Receipt, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CATEGORIES = ['inventory', 'shipping', 'software', 'marketing', 'office', 'fees', 'taxes', 'other'];
const STATUSES   = ['pending', 'paid', 'reimbursed'];

const CAT_COLORS = {
  inventory:  { bg: 'var(--ocean-bg)',   color: 'var(--ocean)',   bdr: 'var(--ocean-bdr)'   },
  shipping:   { bg: 'var(--violet-bg)',  color: 'var(--violet)',  bdr: 'var(--violet-bdr)'  },
  software:   { bg: 'var(--terrain-bg)', color: 'var(--terrain)', bdr: 'var(--terrain-bdr)' },
  marketing:  { bg: 'var(--gold-bg)',    color: 'var(--gold)',    bdr: 'var(--gold-bdr)'    },
  office:     { bg: 'var(--parch-warm)', color: 'var(--ink-dim)', bdr: 'var(--parch-line)'  },
  fees:       { bg: 'var(--crimson-bg)', color: 'var(--crimson)', bdr: 'var(--crimson-bdr)' },
  taxes:      { bg: 'var(--crimson-bg)', color: 'var(--crimson)', bdr: 'var(--crimson-bdr)' },
  other:      { bg: 'var(--parch-warm)', color: 'var(--ink-faded)', bdr: 'var(--parch-line)'},
};

const STATUS_COLORS = {
  pending:    { bg: 'var(--gold-bg)',     color: 'var(--gold)',    bdr: 'var(--gold-bdr)'    },
  paid:       { bg: 'var(--terrain-bg)', color: 'var(--terrain)', bdr: 'var(--terrain-bdr)' },
  reimbursed: { bg: 'var(--ocean-bg)',   color: 'var(--ocean)',   bdr: 'var(--ocean-bdr)'   },
};

const fmt$ = (v) => `$${(parseFloat(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => { try { return d ? format(new Date(d), 'MMM d, yyyy') : '—'; } catch { return '—'; } };

const INP = { background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', borderRadius: 8, color: 'var(--ink)', padding: '8px 10px', fontSize: 13, outline: 'none', width: '100%' };

function LBL({ children }) {
  return <label style={{ fontFamily: 'var(--font-serif)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 4 }}>{children}</label>;
}

function CategoryBadge({ category }) {
  const c = CAT_COLORS[category] || CAT_COLORS.other;
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: c.bg, color: c.color, border: `1px solid ${c.bdr}`, textTransform: 'capitalize' }}>{category}</span>;
}

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.paid;
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: c.bg, color: c.color, border: `1px solid ${c.bdr}`, textTransform: 'capitalize' }}>{status}</span>;
}

const defaultForm = () => ({
  title: '', amount: '', category: 'other', date: format(new Date(), 'yyyy-MM-dd'),
  vendor: '', payment_method: '', credit_card_id: '', status: 'paid', notes: '',
});

export default function Expenses() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [formData, setFormData]     = useState(defaultForm());
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userEmail, setUserEmail]   = useState(null);

  useEffect(() => { base44.auth.me().then(u => setUserEmail(u?.email)).catch(() => {}); }, []);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', userEmail],
    queryFn: () => userEmail ? base44.entities.Expense.filter({ created_by: userEmail }, '-date') : [],
    enabled: userEmail !== null,
  });

  const { data: creditCards = [] } = useQuery({
    queryKey: ['creditCards', userEmail],
    queryFn: () => userEmail ? base44.entities.CreditCard.filter({ created_by: userEmail }) : [],
    enabled: userEmail !== null,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Expense added'); setFormOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Expense updated'); setFormOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Deleted'); },
  });

  const set = (f, v) => setFormData(p => ({ ...p, [f]: v }));

  const openCreate = () => { setEditing(null); setFormData(defaultForm()); setFormOpen(true); };
  const openEdit   = (exp) => {
    setEditing(exp);
    setFormData({ title: exp.title || '', amount: exp.amount || '', category: exp.category || 'other', date: exp.date || '', vendor: exp.vendor || '', payment_method: exp.payment_method || '', credit_card_id: exp.credit_card_id || '', status: exp.status || 'paid', notes: exp.notes || '' });
    setFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const card = creditCards.find(c => c.id === formData.credit_card_id);
    const data = { ...formData, amount: parseFloat(formData.amount) || 0, payment_method: card ? card.card_name : formData.payment_method };
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      const matchSearch = !search || e.title?.toLowerCase().includes(search.toLowerCase()) || e.vendor?.toLowerCase().includes(search.toLowerCase());
      const matchCat    = catFilter    === 'all' || e.category === catFilter;
      const matchStatus = statusFilter === 'all' || e.status   === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [expenses, search, catFilter, statusFilter]);

  const stats = useMemo(() => {
    const total    = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const thisMonth = expenses.filter(e => { try { const d = new Date(e.date); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); } catch { return false; } }).reduce((s, e) => s + (e.amount || 0), 0);
    const pending  = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + (e.amount || 0), 0);
    const byCategory = CATEGORIES.map(cat => ({ cat, total: expenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0) })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
    return { total, thisMonth, pending, byCategory };
  }, [expenses]);

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track and manage business expenses</p>
        </div>
        <button onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--ink)', color: 'var(--ne-cream)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>
          <Plus style={{ width: 14, height: 14 }} /> Add Expense
        </button>
      </div>

      {/* KPIs */}
      <div className="grid-kpi" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Expenses',  val: fmt$(stats.total),     color: 'var(--crimson)',  sub: 'all time'       },
          { label: 'This Month',      val: fmt$(stats.thisMonth), color: 'var(--ocean)',    sub: 'current month'  },
          { label: 'Pending',         val: fmt$(stats.pending),   color: 'var(--gold)',     sub: 'awaiting payment'},
          { label: 'Transactions',    val: expenses.length,       color: 'var(--terrain)',  sub: 'total records'  },
        ].map(k => (
          <div key={k.label} className="kpi-card fade-up" style={{ borderTopColor: k.color }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}>{k.val}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      {stats.byCategory.length > 0 && (
        <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faded)', marginBottom: 12 }}>Spending by Category</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.byCategory.map(({ cat, total }) => {
              const pct = stats.total > 0 ? (total / stats.total) * 100 : 0;
              const c = CAT_COLORS[cat] || CAT_COLORS.other;
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 80, fontSize: 11, color: 'var(--ink-dim)', textTransform: 'capitalize', flexShrink: 0 }}>{cat}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--parch-warm)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: c.color, transition: 'width 0.3s ease' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)', width: 80, textAlign: 'right', flexShrink: 0 }}>{fmt$(total)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 10, padding: '12px 14px', marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 160, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search style={{ position: 'absolute', left: 10, color: 'var(--ink-ghost)', pointerEvents: 'none', width: 14, height: 14 }} />
          <input style={{ ...INP, paddingLeft: 32 }} placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={{ ...INP, width: 'auto', cursor: 'pointer' }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
        </select>
        <select style={{ ...INP, width: 'auto', cursor: 'pointer' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
        </select>
      </div>

      <div style={{ fontSize: 11, color: 'var(--ink-dim)', marginBottom: 12 }}>
        Showing <strong style={{ color: 'var(--ink)' }}>{filtered.length}</strong> expense{filtered.length !== 1 ? 's' : ''}
        {filtered.length > 0 && <span style={{ color: 'var(--ink-ghost)' }}> · Total: <strong style={{ color: 'var(--crimson)', fontFamily: 'var(--font-mono)' }}>{fmt$(filtered.reduce((s, e) => s + (e.amount || 0), 0))}</strong></span>}
      </div>

      {/* Expense list */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-ghost)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 20px', background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 12 }}>
          <Receipt style={{ width: 36, height: 36, color: 'var(--ink-ghost)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>No expenses found</p>
          <p style={{ fontSize: 12, color: 'var(--ink-faded)', marginBottom: 16 }}>Start tracking your business expenses</p>
          <button onClick={openCreate} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--ink)', color: 'var(--ne-cream)', border: 'none', cursor: 'pointer' }}>+ Add Expense</button>
        </div>
      ) : (
        <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 120px 80px 70px', gap: 8, padding: '8px 16px', background: 'var(--parch-warm)', borderBottom: '1px solid var(--parch-line)' }}>
            {['Expense', 'Category', 'Vendor', 'Payment', 'Date', 'Amount', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-ghost)', textAlign: i >= 5 ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>
          {filtered.map((exp, idx) => (
            <div key={exp.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 120px 80px 70px', gap: 8, padding: '11px 16px', borderBottom: idx < filtered.length - 1 ? '1px solid var(--parch-line)' : 'none', alignItems: 'center' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--parch-warm)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{exp.title}</div>
                {exp.notes && <div style={{ fontSize: 10, color: 'var(--ink-ghost)', marginTop: 2 }}>{exp.notes}</div>}
                <StatusBadge status={exp.status || 'paid'} />
              </div>
              <div><CategoryBadge category={exp.category || 'other'} /></div>
              <div style={{ fontSize: 12, color: 'var(--ink-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.vendor || '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-ghost)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.payment_method || '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-ghost)', fontFamily: 'var(--font-mono)' }}>{fmtDate(exp.date)}</div>
              <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: 'var(--crimson)', fontFamily: 'var(--font-mono)' }}>{fmt$(exp.amount)}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                <button onClick={() => openEdit(exp)} style={{ padding: 5, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-ghost)' }}><Pencil style={{ width: 13, height: 13 }} /></button>
                <button onClick={() => { if (confirm('Delete this expense?')) deleteMutation.mutate(exp.id); }} style={{ padding: 5, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--crimson)' }}><Trash2 style={{ width: 13, height: 13 }} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {formOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={() => setFormOpen(false)} style={{ position: 'absolute', inset: 0, background: 'var(--overlay-bg)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 480, height: '100%', background: 'var(--parch-card)', borderLeft: '1px solid var(--parch-line)', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--parch-line)', background: 'var(--parch-warm)', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>{editing ? 'Edit Expense' : 'New Expense'}</h2>
              <button onClick={() => setFormOpen(false)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: 'var(--ink-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <LBL>Title *</LBL>
                <input style={INP} value={formData.title} onChange={e => set('title', e.target.value)} placeholder="e.g. AWS monthly bill" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <LBL>Amount ($) *</LBL>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 12 }}>$</span>
                    <input style={{ ...INP, paddingLeft: 22 }} type="number" step="0.01" min="0" value={formData.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" required />
                  </div>
                </div>
                <div>
                  <LBL>Date *</LBL>
                  <input type="date" style={INP} value={formData.date} onChange={e => set('date', e.target.value)} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <LBL>Category</LBL>
                  <select style={{ ...INP, cursor: 'pointer' }} value={formData.category} onChange={e => set('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <LBL>Status</LBL>
                  <select style={{ ...INP, cursor: 'pointer' }} value={formData.status} onChange={e => set('status', e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <LBL>Vendor / Merchant</LBL>
                <input style={INP} value={formData.vendor} onChange={e => set('vendor', e.target.value)} placeholder="e.g. Amazon, FedEx..." />
              </div>
              <div>
                <LBL>Credit Card (optional)</LBL>
                <select style={{ ...INP, cursor: 'pointer' }} value={formData.credit_card_id || ''} onChange={e => set('credit_card_id', e.target.value)}>
                  <option value="">Cash / Other</option>
                  {creditCards.map(c => <option key={c.id} value={c.id}>{c.card_name}</option>)}
                </select>
              </div>
              {!formData.credit_card_id && (
                <div>
                  <LBL>Payment Method</LBL>
                  <input style={INP} value={formData.payment_method} onChange={e => set('payment_method', e.target.value)} placeholder="e.g. Cash, PayPal..." />
                </div>
              )}
              <div>
                <LBL>Notes</LBL>
                <textarea style={{ ...INP, resize: 'vertical' }} rows={2} value={formData.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes..." />
              </div>

              <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
                <button type="button" onClick={() => setFormOpen(false)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--ink-faded)', background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 2, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, color: 'var(--ne-cream)', background: 'var(--ink)', border: 'none', cursor: 'pointer' }}>
                  {editing ? 'Save Changes' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
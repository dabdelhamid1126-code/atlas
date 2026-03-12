import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';

function cardLabel(card) {
  return card.last_four ? `${card.card_name} (${card.last_four})` : card.card_name;
}
import {
  DollarSign, TrendingUp, Receipt, Clock, Search, Plus,
  Crown, Pencil, Trash2, X, CheckCircle2, Circle, Zap
} from 'lucide-react';
import { format, addMonths, addWeeks, addDays, addQuarters, addYears, parseISO, isWithinInterval } from 'date-fns';

const BG = '#0d0f1e';
const CARD_BG = '#1a1d2e';
const BORDER = '#2a2d3e';
const MUTED = '#6b7280';

const CATEGORIES = ['Credit Card Fee', 'Membership', 'Platform Fee', 'Shipping', 'Software / Tools', 'Other'];
const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual', 'One-time'];

const CATEGORY_COLORS = {
  'Credit Card Fee': '#f472b6',
  'Membership': '#f59e0b',
  'Platform Fee': '#60a5fa',
  'Shipping': '#34d399',
  'Software / Tools': '#a78bfa',
  'Other': '#9ca3af',
};

const PRESET_EXPENSES = [
  { name: 'Amazon Prime', category: 'Membership', frequency: 'Annual', amount: 139.00 },
  { name: 'Costco Gold Star', category: 'Membership', frequency: 'Annual', amount: 65.00 },
  { name: 'Costco Executive', category: 'Membership', frequency: 'Annual', amount: 130.00 },
  { name: 'Walmart+', category: 'Membership', frequency: 'Annual', amount: 98.00 },
  { name: "Sam's Club", category: 'Membership', frequency: 'Annual', amount: 50.00 },
  { name: "Sam's Club Plus", category: 'Membership', frequency: 'Annual', amount: 110.00 },
  { name: "BJ's Inner Circle", category: 'Membership', frequency: 'Annual', amount: 55.00 },
  { name: 'eBay Store Basic', category: 'Platform Fee', frequency: 'Monthly', amount: 21.95 },
  { name: 'Amazon Seller Individual', category: 'Platform Fee', frequency: 'Monthly', amount: 0.99 },
  { name: 'Amazon Seller Professional', category: 'Platform Fee', frequency: 'Monthly', amount: 39.99 },
  { name: 'Pirate Ship', category: 'Software / Tools', frequency: 'Monthly', amount: 0.00 },
];

const INPUT_STYLE = {
  background: BG, border: `1px solid ${BORDER}`, borderRadius: 8,
  color: '#e5e7eb', padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%'
};
const LABEL_STYLE = { color: MUTED, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 4, display: 'block' };

function calcNextDue(startDate, frequency) {
  if (!startDate) return null;
  const today = new Date();
  let d = parseISO(startDate);
  if (frequency === 'One-time') return format(d, 'yyyy-MM-dd');
  let next = d;
  while (next <= today) {
    if (frequency === 'Daily') next = addDays(next, 1);
    else if (frequency === 'Weekly') next = addWeeks(next, 1);
    else if (frequency === 'Monthly') next = addMonths(next, 1);
    else if (frequency === 'Quarterly') next = addQuarters(next, 1);
    else if (frequency === 'Annual') next = addYears(next, 1);
    else break;
  }
  return format(next, 'yyyy-MM-dd');
}

function toMonthly(amount, frequency) {
  if (!amount) return 0;
  const a = parseFloat(amount);
  switch (frequency) {
    case 'Daily': return a * 30;
    case 'Weekly': return a * 4.33;
    case 'Monthly': return a;
    case 'Quarterly': return a / 3;
    case 'Annual': return a / 12;
    default: return 0;
  }
}

function toAnnual(amount, frequency) {
  return toMonthly(amount, frequency) * 12;
}

const EMPTY_FORM = {
  name: '', category: 'Other', frequency: 'Monthly', amount: '',
  start_date: format(new Date(), 'yyyy-MM-dd'), payment_method: '',
  linked_account: '', is_active: true, auto_renew: true, notes: ''
};

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const [creditCards, setCreditCards] = useState([]);

  const load = async () => {
    setLoading(true);
    const [data, cards] = await Promise.all([
      base44.entities.Expense.list('-created_date'),
      base44.entities.CreditCard.list(),
    ]);
    setExpenses(data);
    setCreditCards(cards.filter(c => c.active !== false));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (search && !e.name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory && e.category !== filterCategory) return false;
      if (filterStatus === 'active') return e.is_active;
      if (filterStatus === 'inactive') return !e.is_active;
      return true;
    });
  }, [expenses, search, filterCategory, filterStatus]);

  const monthlyCost = useMemo(() =>
    expenses.filter(e => e.is_active).reduce((s, e) => s + toMonthly(e.amount, e.frequency), 0), [expenses]);

  const annualCost = useMemo(() =>
    expenses.filter(e => e.is_active).reduce((s, e) => s + toAnnual(e.amount, e.frequency), 0), [expenses]);

  const activeCount = useMemo(() => expenses.filter(e => e.is_active).length, [expenses]);

  const dueSoon = useMemo(() => {
    const today = new Date();
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);
    return expenses.filter(e => {
      if (!e.next_due_date) return false;
      const d = parseISO(e.next_due_date);
      return isWithinInterval(d, { start: today, end: in30 });
    }).length;
  }, [expenses]);

  const handleSubmit = async () => {
    if (!form.name || !form.amount) return;
    const next_due_date = calcNextDue(form.start_date, form.frequency);
    const payload = { ...form, amount: parseFloat(form.amount), next_due_date };
    if (editingId) {
      await base44.entities.Expense.update(editingId, payload);
    } else {
      await base44.entities.Expense.create(payload);
    }
    setShowAddModal(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.Expense.delete(id);
    load();
  };

  const handleToggle = async (exp) => {
    const newActive = !exp.is_active;
    // Optimistic update for instant recalculation
    setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, is_active: newActive } : e));
    await base44.entities.Expense.update(exp.id, { is_active: newActive });
  };

  const handleEdit = (e) => {
    setForm({
      name: e.name, category: e.category, frequency: e.frequency,
      amount: e.amount, start_date: e.start_date || format(new Date(), 'yyyy-MM-dd'),
      payment_method: e.payment_method || '', linked_account: e.linked_account || '',
      is_active: e.is_active ?? true, auto_renew: e.auto_renew ?? true, notes: e.notes || ''
    });
    setEditingId(e.id);
    setShowAddModal(true);
  };

  const handleQuickAdd = async (preset) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const next_due_date = calcNextDue(today, preset.frequency);
    await base44.entities.Expense.create({
      name: preset.name, category: preset.category,
      frequency: preset.frequency, amount: preset.amount,
      start_date: today, next_due_date,
      is_active: true, auto_renew: true
    });
    load();
  };

  const filteredPresets = PRESET_EXPENSES.filter(p =>
    !quickSearch || p.name.toLowerCase().includes(quickSearch.toLowerCase())
  );

  const SummaryCard = ({ label, icon, value, sub, color }) => (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px' }}>
      <div className="flex items-start justify-between">
        <div>
          <p style={{ color: MUTED, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>{label}</p>
          <p style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{value}</p>
          {sub && <p style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{sub}</p>}
        </div>
        <div style={{ background: '#12152a', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 8 }}>
          {React.cloneElement(icon, { size: 16, color })}
        </div>
      </div>
    </div>
  );

  const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: MUTED }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  const Field = ({ label, required, children }) => (
    <div className="flex flex-col">
      <label style={LABEL_STYLE}>{label}{required && <span style={{ color: '#a855f7' }}> *</span>}</label>
      {children}
    </div>
  );

  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#e5e7eb' }}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p style={{ color: MUTED, fontSize: 14, marginTop: 2 }}>Track recurring fees, memberships, and business costs</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowQuickModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: '#12152a', border: '1px solid #6366f1', color: '#e5e7eb', cursor: 'pointer' }}
          >
            <Zap size={14} /> Quick Add
          </button>
          <button
            onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <Plus size={14} /> Add Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="MONTHLY COST" icon={<DollarSign />} value={`$${monthlyCost.toFixed(2)}`} sub="Active expenses" color="#a855f7" />
        <SummaryCard label="ANNUAL COST" icon={<TrendingUp />} value={`$${annualCost.toFixed(2)}`} sub="Projected yearly" color="#60a5fa" />
        <SummaryCard label="ACTIVE EXPENSES" icon={<Receipt />} value={activeCount} sub="Currently tracked" color="#4ade80" />
        <SummaryCard label="DUE NEXT 30 DAYS" icon={<Clock />} value={dueSoon} sub="Upcoming renewals" color="#f59e0b" />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2 flex-1 min-w-48" style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 12px' }}>
          <Search size={14} color={MUTED} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses..." style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e5e7eb', fontSize: 13, flex: 1 }} />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ ...INPUT_STYLE, width: 'auto', minWidth: 160 }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...INPUT_STYLE, width: 'auto', minWidth: 160 }}>
          <option value="">Active & Inactive</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Expense List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <Receipt size={36} color={MUTED} />
          </div>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No expenses found</p>
          <p style={{ color: MUTED, fontSize: 13, marginBottom: 16 }}>Start tracking your business expenses and recurring fees.</p>
          <button onClick={() => setShowQuickModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: 'transparent', border: '1px solid #6366f1', color: '#a78bfa', cursor: 'pointer' }}>
            <Zap size={14} /> Quick Add Common Expenses
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(exp => {
            const inactive = !exp.is_active;
            const catColor = inactive ? MUTED : CATEGORY_COLORS[exp.category];
            return (
              <div key={exp.id}
                style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 18px', opacity: inactive ? 0.55 : 1, transition: 'opacity 0.2s' }}
                className="flex items-center gap-4"
              >
                {/* Icon */}
                <div style={{ background: '#12152a', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 8, flexShrink: 0 }}>
                  <Crown size={16} color={inactive ? MUTED : '#f59e0b'} />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p style={{ color: inactive ? MUTED : '#fff', fontWeight: 600, fontSize: 14 }}>{exp.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span style={{ background: catColor + '22', color: catColor, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, letterSpacing: '0.04em' }}>
                      {exp.category}
                    </span>
                    <span style={{ color: MUTED, fontSize: 12 }}>· {exp.frequency}</span>
                    {exp.payment_method && <span style={{ color: MUTED, fontSize: 12 }}>· {exp.payment_method}</span>}
                    {exp.next_due_date && <span style={{ color: MUTED, fontSize: 12 }}>· Next: {format(parseISO(exp.next_due_date), 'MMM d, yyyy')}</span>}
                  </div>
                </div>
                {/* Amount */}
                <div className="text-right">
                  <p style={{ color: inactive ? MUTED : '#fff', fontWeight: 700, fontSize: 15 }}>${parseFloat(exp.amount || 0).toFixed(2)}</p>
                  <p style={{ color: MUTED, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {inactive ? 'INACTIVE' : exp.frequency}
                  </p>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <button onClick={() => handleToggle(exp)} title={inactive ? 'Activate' : 'Deactivate'} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
                    {inactive ? <Circle size={16} color={MUTED} /> : <CheckCircle2 size={16} color="#4ade80" />}
                  </button>
                  <button onClick={() => handleEdit(exp)} title="Edit" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <Pencil size={14} color={MUTED} />
                  </button>
                  <button onClick={() => handleDelete(exp.id)} title="Delete" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <Trash2 size={14} color="#f87171" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <Modal title={editingId ? 'Edit Expense' : 'Add Expense'} onClose={() => { setShowAddModal(false); setEditingId(null); }}>
          <div className="flex flex-col gap-3">
            <Field label="Name" required>
              <input style={INPUT_STYLE} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Amazon Prime, Chase Sapphire Fee" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category" required>
                <select style={INPUT_STYLE} value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Frequency" required>
                <select style={INPUT_STYLE} value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount ($)" required>
                <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: BG }}>
                  <span style={{ padding: '8px 10px', color: MUTED, fontSize: 13 }}>$</span>
                  <input style={{ background: 'transparent', outline: 'none', color: '#e5e7eb', fontSize: 13, flex: 1, padding: '8px 8px 8px 0' }} type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
                </div>
              </Field>
              <Field label="Start Date" required>
                <input style={INPUT_STYLE} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              </Field>
            </div>
            <Field label="Payment Method">
              <select style={INPUT_STYLE} value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                <option value="">None</option>
                {creditCards.map(c => (
                  <option key={c.id} value={cardLabel(c)}>{cardLabel(c)}</option>
                ))}
              </select>
            </Field>
            <Field label="Linked Account">
              <select style={INPUT_STYLE} value={form.linked_account} onChange={e => set('linked_account', e.target.value)}>
                <option value="">None</option>
                <option value="Amazon">Amazon</option>
                <option value="eBay">eBay</option>
                <option value="Walmart">Walmart</option>
                <option value="Costco">Costco</option>
              </select>
            </Field>
            <div className="flex gap-6">
              {[['is_active', 'Active'], ['auto_renew', 'Auto-renew']].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 13, color: '#e5e7eb' }}>
                  <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)} style={{ accentColor: '#6366f1', width: 14, height: 14 }} />
                  {label}
                </label>
              ))}
            </div>
            <Field label="Notes">
              <textarea style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit' }} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." />
            </Field>
            <button onClick={handleSubmit} className="w-full py-3 rounded-xl text-white font-semibold text-sm" style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', border: 'none', cursor: 'pointer', marginTop: 4 }}>
              {editingId ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </Modal>
      )}

      {/* Quick Add Modal */}
      {showQuickModal && (
        <Modal title="Quick Add Expense" onClose={() => setShowQuickModal(false)}>
          <div className="flex items-center gap-2 mb-4" style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 12px' }}>
            <Search size={14} color={MUTED} />
            <input value={quickSearch} onChange={e => setQuickSearch(e.target.value)} placeholder="Search common expenses..." style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e5e7eb', fontSize: 13, flex: 1 }} />
          </div>
          <div className="flex flex-col gap-2" style={{ maxHeight: 420, overflowY: 'auto' }}>
            {filteredPresets.map((p, i) => (
              <button
                key={i}
                onClick={() => { handleQuickAdd(p); }}
                className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-xl transition-all hover:opacity-80"
                style={{ background: '#12152a', border: `1px solid ${BORDER}`, cursor: 'pointer' }}
              >
                <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 7, flexShrink: 0 }}>
                  <Crown size={13} color="#f59e0b" />
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{p.name}</p>
                  <p style={{ color: MUTED, fontSize: 11, marginTop: 1 }}>{p.category} · {p.frequency}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: '#e5e7eb', fontWeight: 600, fontSize: 14 }}>${p.amount.toFixed(2)}</span>
                  <Plus size={13} color="#6366f1" />
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
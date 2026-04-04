import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye, EyeOff, Pencil, Trash2, Barcode, CreditCard, Gift, Zap, LayoutGrid, List, SlidersHorizontal, Star } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import DataTable from '@/components/shared/DataTable';
import CardVisual from '@/components/payment-methods/CardVisual';
import YACashbackTab from '@/components/payment-methods/YACashbackTab';
import QuickAddModal from '@/components/payment-methods/QuickAddModal';
import CustomCardModal from '@/components/payment-methods/CustomCardModal';
import CardAnalyticsView from '@/components/payment-methods/CardAnalyticsView';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import ReactBarcode from 'react-barcode';

const GC_BRANDS = ['Amazon', 'Apple', 'Google Play', 'Target', 'Walmart', 'Best Buy', 'eBay', 'Visa', 'Mastercard', 'Other'];

export default function PaymentMethods() {
  const [tab, setTab] = useState('credit-cards');
  const queryClient = useQueryClient();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Payment Methods</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage cards, cashback rates, and per-store rate overrides</p>
      </div>

      <div className="flex items-center gap-0.5 rounded-xl p-1 mb-6 w-fit" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={() => setTab('credit-cards')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'credit-cards' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <CreditCard className="h-4 w-4" /> Credit Cards
        </button>
        <button
          onClick={() => setTab('gift-cards')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'gift-cards' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <Gift className="h-4 w-4" /> Gift Cards
        </button>
        <button
          onClick={() => setTab('ya-cashback')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'ya-cashback' ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <Star className="h-4 w-4" /> YA Cashback
        </button>
      </div>

      {tab === 'credit-cards' && <CreditCardsTab queryClient={queryClient} />}
      {tab === 'gift-cards' && <GiftCardsTab queryClient={queryClient} />}
      {tab === 'ya-cashback' && <YACashbackTab />}
    </div>
  );
}

// ─── CREDIT CARDS TAB ──────────────────────────────────────────────────────────

function CreditCardsTab({ queryClient }) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [customCardOpen, setCustomCardOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [search, setSearch] = useState('');
  const [issuerFilter, setIssuerFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [activeView, setActiveView] = useState('cards');

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['creditCards'],
    queryFn: () => base44.entities.CreditCard.list(),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CreditCard.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['creditCards'] }); toast.success('Card added!'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CreditCard.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['creditCards'] }); toast.success('Card updated!'); setCustomCardOpen(false); setEditingCard(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CreditCard.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['creditCards'] }); toast.success('Card deleted'); },
  });

  const handleCreate = async (data) => { await createMutation.mutateAsync(data); };

  const handleEdit = (card) => { setEditingCard(card); setCustomCardOpen(true); };

  const handleSaveCustom = (data) => {
    if (editingCard) { updateMutation.mutate({ id: editingCard.id, data }); }
    else { createMutation.mutate(data); setCustomCardOpen(false); }
  };

  const handleInlineUpdate = (id, data) => { updateMutation.mutate({ id, data }); };

  const handleDelete = (card) => { if (confirm(`Delete "${card.card_name}"?`)) deleteMutation.mutate(card.id); };

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const activeCards = cards.filter(c => c.active !== false);
  const monthOrders = orders.filter(o => {
    const d = o.order_date ? parseISO(o.order_date) : null;
    return d && d >= monthStart && d <= monthEnd;
  });
  const monthSpent = monthOrders.reduce((s, o) => s + (o.final_cost || o.total_cost || 0), 0);
  const cardsWithRate = activeCards.filter(c => c.cashback_rate);
  const avgCashback = cardsWithRate.length ? cardsWithRate.reduce((s, c) => s + (c.cashback_rate || 0), 0) / cardsWithRate.length : 0;

  const nameCounts = cards.reduce((acc, c) => {
    const key = (c.card_name || '').toLowerCase().trim();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const duplicateNames = new Set(Object.keys(nameCounts).filter(k => nameCounts[k] > 1));

  const issuers = [...new Set(cards.map(c => c.issuer).filter(Boolean))];
  const filtered = useMemo(() => cards.filter(c => {
    const matchSearch = !search || c.card_name?.toLowerCase().includes(search.toLowerCase()) || c.issuer?.toLowerCase().includes(search.toLowerCase());
    const matchIssuer = issuerFilter === 'all' || c.issuer === issuerFilter;
    const matchType = typeFilter === 'all' || c.reward_type === typeFilter;
    return matchSearch && matchIssuer && matchType;
  }), [cards, search, issuerFilter, typeFilter]);

  const inp = { background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: 13 };

  return (
    <>
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border p-5" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Active Cards</p>
          <p className="text-3xl font-bold text-blue-400">{activeCards.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">{cards.length} total</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">Spent This Month</p>
          <p className="text-3xl font-bold text-cyan-400">${monthSpent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-slate-500 mt-0.5">{monthOrders.length} orders</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Avg Cashback</p>
          <p className="text-3xl font-bold text-emerald-400">{avgCashback.toFixed(1)}%</p>
          <p className="text-xs text-slate-500 mt-0.5">across active cards</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            placeholder="Search cards..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 w-full rounded-lg text-sm"
            style={inp}
          />
        </div>

        <select value={issuerFilter} onChange={e => setIssuerFilter(e.target.value)} className="h-9 px-3 rounded-lg text-sm" style={inp}>
          <option value="all">All Issuers</option>
          {issuers.map(i => <option key={i} value={i}>{i}</option>)}
        </select>

        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-9 px-3 rounded-lg text-sm" style={inp}>
          <option value="all">All Types</option>
          <option value="cashback">Cashback</option>
          <option value="points">Points</option>
        </select>

        {/* View toggle */}
        <div className="flex items-center rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition ${viewMode === 'grid' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition ${viewMode === 'list' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Cards / Analytics toggle */}
        <div className="flex items-center rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => setActiveView('cards')} className={`px-3 py-1.5 rounded text-xs font-semibold transition ${activeView === 'cards' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            Cards View
          </button>
          <button onClick={() => setActiveView('analytics')} className={`px-3 py-1.5 rounded text-xs font-semibold transition ${activeView === 'analytics' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            Analytics
          </button>
        </div>

        <div className="flex gap-2 ml-auto">
          <button onClick={() => setQuickAddOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-amber-400 transition"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Zap className="h-4 w-4" /> Quick Add
          </button>
          <button onClick={() => { setEditingCard(null); setCustomCardOpen(true); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white transition"
            style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)', border: 'none' }}>
            <Plus className="h-4 w-4" /> Custom Card
          </button>
        </div>
      </div>

      {/* Analytics View */}
      {activeView === 'analytics' && <CardAnalyticsView cards={cards} orders={orders} />}

      {/* Cards */}
      {activeView === 'cards' && (isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
          <CreditCard className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No cards found</p>
          <p className="text-sm text-slate-500 mt-1">Try adjusting filters or add a new card</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(card => (
            <CardVisual
              key={card.id}
              card={card}
              orders={orders}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUpdate={handleInlineUpdate}
              isDuplicate={duplicateNames.has((card.card_name || '').toLowerCase().trim())}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <tr>
                {['Card', 'Issuer', 'Type', 'Base Rate', 'Store Rates', 'Monthly Spend', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(card => {
                const spent = orders.filter(o => o.credit_card_id === card.id && (() => { const d = o.order_date ? parseISO(o.order_date) : null; return d && d >= monthStart && d <= monthEnd; })()).reduce((s, o) => s + (o.final_cost || o.total_cost || 0), 0);
                return (
                  <tr key={card.id} className="border-b transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td className="px-4 py-3 font-semibold text-slate-200">{card.card_name}</td>
                    <td className="px-4 py-3 text-slate-400">{card.issuer || '—'}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium capitalize">{card.reward_type}</span></td>
                    <td className="px-4 py-3 font-bold text-emerald-400">{card.cashback_rate || 0}%</td>
                    <td className="px-4 py-3 text-slate-400">{(card.store_rates || []).length} rates</td>
                    <td className="px-4 py-3 font-semibold text-slate-200">${spent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${card.active !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                        {card.active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(card)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(card)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} existingCards={cards} onCreate={handleCreate} />
      <CustomCardModal open={customCardOpen} onClose={() => { setCustomCardOpen(false); setEditingCard(null); }} editCard={editingCard} onSave={handleSaveCustom} />
    </>
  );
}

// ─── GIFT CARDS TAB ──────────────────────────────────────────────────────────────

function GiftCardsTab({ queryClient }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [showCode, setShowCode] = useState({});
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  const emptyForm = {
    brand: '', retailer: '', category: 'other', value: '', code: '', pin: '',
    purchase_cost: '', purchase_date: format(new Date(), 'yyyy-MM-dd'),
    credit_card_id: '', status: 'available', used_order_number: '', notes: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['giftCards'],
    queryFn: async () => {
      const data = await base44.entities.GiftCard.list('-created_date');
      return data.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''));
    }
  });

  const { data: creditCards = [] } = useQuery({
    queryKey: ['creditCards'],
    queryFn: () => base44.entities.CreditCard.list()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const newCard = await base44.entities.GiftCard.create(data);
      if (data.credit_card_id && data.purchase_cost) {
        await createRewardForGiftCard(newCard, data.credit_card_id, data.purchase_cost, creditCards);
      }
      return newCard;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['giftCards'] }); queryClient.invalidateQueries({ queryKey: ['rewards'] }); toast.success('Gift card added'); setDialogOpen(false); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GiftCard.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['giftCards'] }); toast.success('Gift card updated'); setDialogOpen(false); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GiftCard.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['giftCards'] }); toast.success('Deleted'); }
  });

  const createRewardForGiftCard = async (giftCard, creditCardId, purchaseAmount, allCards) => {
    const card = allCards.find(c => c.id === creditCardId);
    if (!card) return;
    let rewardAmount = 0, rewardType = 'cashback', currency = 'USD';
    if (card.reward_type === 'cashback' && card.cashback_rate) {
      rewardAmount = (purchaseAmount * card.cashback_rate / 100).toFixed(2);
    } else if (card.reward_type === 'points' && card.points_rate) {
      rewardAmount = Math.round(purchaseAmount * card.points_rate); rewardType = 'points'; currency = 'points';
    }
    if (rewardAmount > 0) {
      await base44.entities.Reward.create({
        credit_card_id: creditCardId, card_name: card.card_name, source: `${card.card_name} (Gift Card)`,
        type: rewardType, purchase_amount: purchaseAmount, amount: parseFloat(rewardAmount), currency,
        date_earned: format(new Date(), 'yyyy-MM-dd'), status: 'earned',
        notes: `Gift card purchase: ${giftCard.brand} $${giftCard.value}`
      });
      toast.success(`Reward tracked: ${currency === 'USD' ? `$${rewardAmount}` : `${rewardAmount} pts`}`);
    }
  };

  const openDialog = (card = null) => {
    if (card) {
      setEditingCard(card);
      setFormData({ brand: card.brand || '', retailer: card.retailer || '', category: card.category || 'other', value: card.value || '', code: card.code || '', pin: card.pin || '', purchase_cost: card.purchase_cost || '', purchase_date: card.purchase_date || '', credit_card_id: card.credit_card_id || '', status: card.status || 'available', used_order_number: card.used_order_number || '', notes: card.notes || '' });
    } else {
      setEditingCard(null);
      setFormData(emptyForm);
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const ccCard = creditCards.find(c => c.id === formData.credit_card_id);
    const data = { ...formData, value: parseFloat(formData.value), purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : null, card_name: ccCard?.card_name || null };
    if (editingCard) updateMutation.mutate({ id: editingCard.id, data });
    else createMutation.mutate(data);
  };

  const markAsUsed = async (card) => {
    const orderNumber = prompt('Enter order number where this card was used:');
    if (orderNumber) {
      await base44.entities.GiftCard.delete(card.id);
      queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      toast.success('Gift card removed from inventory');
    }
  };

  const handleBulkAdd = async () => {
    const lines = bulkInput.trim().split('\n').filter(l => l.trim());
    const newCards = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 3) throw new Error('Invalid format');
      return { brand: parts[0], retailer: parts[1], value: parseFloat(parts[2]), code: parts[3] || '', pin: parts[4] || '', purchase_cost: parts[5] ? parseFloat(parts[5]) : null, status: 'available' };
    });
    await base44.entities.GiftCard.bulkCreate(newCards);
    queryClient.invalidateQueries({ queryKey: ['giftCards'] });
    toast.success(`Added ${newCards.length} gift cards`);
    setBulkDialogOpen(false);
    setBulkInput('');
  };

  const filteredCards = cards.filter(card => {
    const matchesSearch = !search || card.brand?.toLowerCase().includes(search.toLowerCase()) || card.retailer?.toLowerCase().includes(search.toLowerCase()) || card.code?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || card.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const maskCode = (code) => !code ? '-' : code.slice(0, 4) + '****' + code.slice(-4);
  const toggleShowCode = (id) => setShowCode(p => ({ ...p, [id]: !p[id] }));

  const totalValue = filteredCards.filter(c => c.status === 'available').reduce((s, c) => s + (c.value || 0), 0);
  const totalProfit = filteredCards.filter(c => c.purchase_cost).reduce((s, c) => s + (c.value - c.purchase_cost), 0);

  const inp = { background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: 13 };

  const columns = [
    { header: 'Brand', accessor: 'brand', cell: r => <span className="font-medium text-slate-200">{r.brand}</span> },
    { header: 'Retailer', accessor: 'retailer', cell: r => <span className="text-sm text-slate-400">{r.retailer || '—'}</span> },
    { header: 'Value', accessor: 'value', cell: r => <span className="font-semibold text-slate-200">${r.value?.toFixed(2)}</span> },
    { header: 'Cost', accessor: 'purchase_cost', cell: r => <span className="text-sm text-slate-400">{r.purchase_cost ? `$${r.purchase_cost.toFixed(2)}` : '—'}</span> },
    { header: 'Profit', cell: r => {
      if (!r.purchase_cost) return <span className="text-slate-500">—</span>;
      const p = r.value - r.purchase_cost;
      return <span className={`font-semibold ${p > 0 ? 'text-emerald-400' : 'text-red-400'}`}>${p.toFixed(2)}</span>;
    }},
    { header: 'Code', accessor: 'code', cell: r => (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-slate-300">{showCode[r.id] ? r.code : maskCode(r.code)}</span>
        <button className="h-6 w-6 flex items-center justify-center text-slate-500 hover:text-slate-300 transition" onClick={() => toggleShowCode(r.id)}>
          {showCode[r.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </button>
      </div>
    )},
    { header: 'Status', cell: r => <StatusBadge status={r.status} /> },
    { header: 'Added', cell: r => <span className="text-slate-400">{format(new Date(r.created_date), 'MMM d, yyyy')}</span> },
    { header: '', cell: r => (
      <div className="flex items-center gap-1">
        <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition" onClick={() => { setSelectedCard(r); setBarcodeDialogOpen(true); }}><Barcode className="h-4 w-4" /></button>
        {r.status === 'available' && <button className="px-2 py-1 rounded-lg text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition" onClick={() => markAsUsed(r)}>Mark Used</button>}
        <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition" onClick={() => openDialog(r)}><Pencil className="h-4 w-4" /></button>
        <button className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(r.id); }}><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ];

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Cards', value: filteredCards.length, color: 'text-slate-200' },
            { label: 'Available', value: filteredCards.filter(c => c.status === 'available').length, color: 'text-emerald-400' },
            { label: 'Available Value', value: `$${totalValue.toLocaleString()}`, color: 'text-cyan-400' },
            { label: 'Total Profit', value: `$${totalProfit.toFixed(2)}`, color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border p-4" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setBulkDialogOpen(true)}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-300 transition"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            Bulk Add
          </button>
          <button onClick={() => openDialog()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white transition"
            style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)' }}>
            <Plus className="h-4 w-4" /> Add Card
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input placeholder="Search gift cards..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9 w-full rounded-lg text-sm" style={inp} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 px-3 rounded-lg text-sm w-40" style={inp}>
          {['all','available','reserved','exported','used','invalid'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <DataTable columns={columns} data={filteredCards} loading={isLoading} emptyMessage="No gift cards found" />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCard ? 'Edit Gift Card' : 'Add Gift Card'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Brand *</Label>
                <Select value={formData.brand} onValueChange={v => setFormData(p => ({ ...p, brand: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                  <SelectContent>{GC_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Retailer</Label>
                <Input value={formData.retailer} onChange={e => setFormData(p => ({ ...p, retailer: e.target.value }))} placeholder="Where purchased" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Value ($) *</Label>
                <Input type="number" step="0.01" value={formData.value} onChange={e => setFormData(p => ({ ...p, value: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Purchase Cost ($)</Label>
                <Input type="number" step="0.01" value={formData.purchase_cost} onChange={e => setFormData(p => ({ ...p, purchase_cost: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input type="date" value={formData.purchase_date} onChange={e => setFormData(p => ({ ...p, purchase_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Credit Card Used</Label>
                <Select value={formData.credit_card_id || ''} onValueChange={v => setFormData(p => ({ ...p, credit_card_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select card" /></SelectTrigger>
                  <SelectContent>
                    {creditCards.filter(c => c.active !== false).map(c => <SelectItem key={c.id} value={c.id}>{c.card_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Card Code *</Label>
                <Input value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>PIN</Label>
                <Input value={formData.pin} onChange={e => setFormData(p => ({ ...p, pin: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['available','reserved','exported','used','invalid'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {formData.status === 'used' && (
              <div className="space-y-2">
                <Label>Order Number Used</Label>
                <Input value={formData.used_order_number} onChange={e => setFormData(p => ({ ...p, used_order_number: e.target.value }))} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">{editingCard ? 'Update' : 'Add'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Barcode Dialog */}
      <Dialog open={barcodeDialogOpen} onOpenChange={setBarcodeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Gift Card Barcode</DialogTitle></DialogHeader>
          {selectedCard && (
            <div className="space-y-4 text-center">
              <p className="font-bold text-lg">{selectedCard.brand} — ${selectedCard.value}</p>
              <div className="flex justify-center bg-white p-8 rounded-lg border-2 border-slate-300">
                <ReactBarcode value={selectedCard.code} format="CODE128" displayValue height={120} width={3} fontSize={18} margin={10} />
              </div>
              <div className="p-4 bg-slate-50 rounded">
                <p className="text-xs text-slate-500 uppercase">Card Code</p>
                <p className="font-mono font-bold text-lg mt-1">{selectedCard.code}</p>
              </div>
              {selectedCard.pin && (
                <div className="p-4 bg-slate-50 rounded">
                  <p className="text-xs text-slate-500 uppercase">PIN</p>
                  <p className="font-mono font-bold text-lg mt-1">{selectedCard.pin}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>Print</Button>
            <Button onClick={() => setBarcodeDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Bulk Add Gift Cards</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800 rounded-lg text-sm border border-slate-700">
              <p className="font-medium mb-1 text-slate-300">Format (one per line):</p>
              <code className="text-xs text-slate-400">Brand, Retailer, Value, Code, PIN, PurchaseCost</code>
            </div>
            <Textarea value={bulkInput} onChange={e => setBulkInput(e.target.value)} rows={8} placeholder="Amazon, Target, 100, AMZN1234, 5678, 92" className="font-mono text-xs" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">Add Cards</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
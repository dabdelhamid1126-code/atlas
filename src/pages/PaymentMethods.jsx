import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye, EyeOff, Pencil, Trash2, Filter, Barcode, CreditCard, Gift, Check } from 'lucide-react';
import CardBenefitsEditor from '@/components/payment-methods/CardBenefitsEditor';
import CreditCardCard from '@/components/payment-methods/CreditCardCard';
import StatusBadge from '@/components/shared/StatusBadge';
import DataTable from '@/components/shared/DataTable';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ReactBarcode from 'react-barcode';

const GC_BRANDS = ['Amazon', 'Apple', 'Google Play', 'Target', 'Walmart', 'Best Buy', 'eBay', 'Visa', 'Mastercard', 'Other'];

export default function PaymentMethods() {
  const [tab, setTab] = useState('credit-cards');
  const queryClient = useQueryClient();

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Payment Methods</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage credit cards and gift cards</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-6 w-fit shadow-sm">
        <button
          onClick={() => setTab('credit-cards')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'credit-cards' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <CreditCard className="h-4 w-4" /> Credit Cards
        </button>
        <button
          onClick={() => setTab('gift-cards')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'gift-cards' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Gift className="h-4 w-4" /> Gift Cards
        </button>
      </div>

      {tab === 'credit-cards' && <CreditCardsTab queryClient={queryClient} />}
      {tab === 'gift-cards' && <GiftCardsTab queryClient={queryClient} />}
    </div>
  );
}

// ─── CREDIT CARDS TAB ──────────────────────────────────────────────────────────

// Known card templates for Quick Add
const CARD_TEMPLATES = [
  { card_name: 'Chase Sapphire Preferred', issuer: 'Chase', reward_type: 'points', points_rate: 1, dining_points_rate: 3, travel_points_rate: 2 },
  { card_name: 'Chase Sapphire Reserve', issuer: 'Chase', reward_type: 'points', points_rate: 1, dining_points_rate: 3, travel_points_rate: 3 },
  { card_name: 'Chase Freedom Unlimited', issuer: 'Chase', reward_type: 'cashback', cashback_rate: 1.5, dining_cashback_rate: 3, travel_cashback_rate: 5 },
  { card_name: 'Chase Freedom Flex', issuer: 'Chase', reward_type: 'cashback', cashback_rate: 1, dining_cashback_rate: 3 },
  { card_name: 'Amex Gold', issuer: 'American Express', reward_type: 'points', points_rate: 1, dining_points_rate: 4, groceries_points_rate: 4, travel_points_rate: 3 },
  { card_name: 'Amex Platinum', issuer: 'American Express', reward_type: 'points', points_rate: 1, travel_points_rate: 5 },
  { card_name: 'Amex Blue Cash Preferred', issuer: 'American Express', reward_type: 'cashback', cashback_rate: 1, groceries_cashback_rate: 6, streaming_cashback_rate: 6, gas_cashback_rate: 3 },
  { card_name: 'Amex Blue Cash Everyday', issuer: 'American Express', reward_type: 'cashback', cashback_rate: 1, groceries_cashback_rate: 3 },
  { card_name: 'Capital One Venture X', issuer: 'Capital One', reward_type: 'points', points_rate: 2, travel_points_rate: 10 },
  { card_name: 'Capital One Venture', issuer: 'Capital One', reward_type: 'points', points_rate: 2 },
  { card_name: 'Citi Double Cash', issuer: 'Citi', reward_type: 'cashback', cashback_rate: 2 },
  { card_name: 'Discover it Cash Back', issuer: 'Discover', reward_type: 'cashback', cashback_rate: 1 },
  { card_name: 'Wells Fargo Active Cash', issuer: 'Wells Fargo', reward_type: 'cashback', cashback_rate: 2 },
  { card_name: 'Bank of America Customized Cash', issuer: 'Bank of America', reward_type: 'cashback', cashback_rate: 1 },
];

function IssuerLogoSmall({ issuer }) {
  const [err, setErr] = useState(false);
  const domain = issuer ? issuer.toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'') + '.com' : null;
  const overrides = { 'americanexpress': 'americanexpress.com', 'bankofamerica': 'bankofamerica.com', 'capitalone': 'capitalone.com', 'wellsfargo': 'wellsfargo.com' };
  const finalDomain = overrides[issuer?.toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'')] || domain;
  const url = finalDomain ? `https://cdn.brandfetch.io/${finalDomain}/w/48/h/48` : null;
  const initials = (issuer || '?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  if (err || !url) return <div className="h-10 w-10 rounded-lg bg-blue-700 flex items-center justify-center shrink-0"><span className="text-white font-bold text-xs">{initials}</span></div>;
  return <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0"><img src={url} alt={issuer} className="h-10 w-10 object-cover" onError={() => setErr(true)} /></div>;
}

function CreditCardsTab({ queryClient }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('quick'); // 'quick' | 'full'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [quickLast4, setQuickLast4] = useState('');
  const [quickSearch, setQuickSearch] = useState('');
  const [quickIssuerFilter, setQuickIssuerFilter] = useState('all');
  const [applyPresetRates, setApplyPresetRates] = useState(true);
  const [editingCard, setEditingCard] = useState(null);
  const [privacyMode, setPrivacyMode] = useState(false);
  const emptyForm = {
    card_name: '', last_4_digits: '', issuer: '', reward_type: 'cashback',
    cashback_rate: '', points_rate: '',
    dining_cashback_rate: '', dining_points_rate: '',
    travel_cashback_rate: '', travel_points_rate: '',
    groceries_cashback_rate: '', groceries_points_rate: '',
    gas_cashback_rate: '', gas_points_rate: '',
    streaming_cashback_rate: '', streaming_points_rate: '',
    annual_credits: [], benefits: '', notes: '', active: true,
  };
  const [formData, setFormData] = useState(emptyForm);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['creditCards'],
    queryFn: () => base44.entities.CreditCard.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CreditCard.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['creditCards'] }); toast.success('Card added'); setDialogOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CreditCard.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['creditCards'] }); toast.success('Card updated'); setDialogOpen(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CreditCard.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['creditCards'] }); toast.success('Card deleted'); },
  });

  const openDialog = (card = null) => {
    if (card) {
      setEditingCard(card);
      setDialogMode('full');
      setFormData({
        card_name: card.card_name || '', last_4_digits: card.last_4_digits || '', issuer: card.issuer || '',
        reward_type: card.reward_type || 'cashback',
        cashback_rate: card.cashback_rate || '', points_rate: card.points_rate || '',
        dining_cashback_rate: card.dining_cashback_rate || '', dining_points_rate: card.dining_points_rate || '',
        travel_cashback_rate: card.travel_cashback_rate || '', travel_points_rate: card.travel_points_rate || '',
        groceries_cashback_rate: card.groceries_cashback_rate || '', groceries_points_rate: card.groceries_points_rate || '',
        gas_cashback_rate: card.gas_cashback_rate || '', gas_points_rate: card.gas_points_rate || '',
        streaming_cashback_rate: card.streaming_cashback_rate || '', streaming_points_rate: card.streaming_points_rate || '',
        annual_credits: card.annual_credits || [], benefits: card.benefits || '', notes: card.notes || '', active: card.active !== false,
      });
    } else {
      setEditingCard(null);
      setDialogMode('quick');
      setSelectedTemplate(null);
      setQuickLast4('');
      setQuickSearch('');
      setQuickIssuerFilter('all');
      setFormData(emptyForm);
    }
    setDialogOpen(true);
  };

  const handleQuickAdd = (e) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    const t = selectedTemplate;
    createMutation.mutate({
      card_name: t.card_name, issuer: t.issuer, last_4_digits: quickLast4,
      reward_type: t.reward_type,
      cashback_rate: t.cashback_rate || null, points_rate: t.points_rate || null,
      dining_cashback_rate: t.dining_cashback_rate || null, dining_points_rate: t.dining_points_rate || null,
      travel_cashback_rate: t.travel_cashback_rate || null, travel_points_rate: t.travel_points_rate || null,
      groceries_cashback_rate: t.groceries_cashback_rate || null, groceries_points_rate: t.groceries_points_rate || null,
      gas_cashback_rate: t.gas_cashback_rate || null, gas_points_rate: t.gas_points_rate || null,
      streaming_cashback_rate: t.streaming_cashback_rate || null, streaming_points_rate: t.streaming_points_rate || null,
      annual_credits: [], active: true,
    });
  };

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      cashback_rate: formData.cashback_rate !== '' ? parseFloat(formData.cashback_rate) : null,
      points_rate: formData.points_rate !== '' ? parseFloat(formData.points_rate) : null,
      dining_cashback_rate: formData.dining_cashback_rate !== '' ? parseFloat(formData.dining_cashback_rate) : null,
      dining_points_rate: formData.dining_points_rate !== '' ? parseFloat(formData.dining_points_rate) : null,
      travel_cashback_rate: formData.travel_cashback_rate !== '' ? parseFloat(formData.travel_cashback_rate) : null,
      travel_points_rate: formData.travel_points_rate !== '' ? parseFloat(formData.travel_points_rate) : null,
      groceries_cashback_rate: formData.groceries_cashback_rate !== '' ? parseFloat(formData.groceries_cashback_rate) : null,
      groceries_points_rate: formData.groceries_points_rate !== '' ? parseFloat(formData.groceries_points_rate) : null,
      gas_cashback_rate: formData.gas_cashback_rate !== '' ? parseFloat(formData.gas_cashback_rate) : null,
      gas_points_rate: formData.gas_points_rate !== '' ? parseFloat(formData.gas_points_rate) : null,
      streaming_cashback_rate: formData.streaming_cashback_rate !== '' ? parseFloat(formData.streaming_cashback_rate) : null,
      streaming_points_rate: formData.streaming_points_rate !== '' ? parseFloat(formData.streaming_points_rate) : null,
    };
    if (editingCard) updateMutation.mutate({ id: editingCard.id, data });
    else createMutation.mutate(data);
  };

  const isCashback = formData.reward_type === 'cashback' || formData.reward_type === 'both';
  const isPoints = formData.reward_type === 'points' || formData.reward_type === 'both';

  const { data: orders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list(),
  });
  const { data: rewards = [] } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => base44.entities.Reward.list(),
  });

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setPrivacyMode(p => !p)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition ${privacyMode ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
        >
          {privacyMode ? '🙈 Privacy On' : '👁️ Privacy Off'}
        </button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Total Cards</p>
            <p className="text-2xl font-bold">{cards.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Active</p>
            <p className="text-2xl font-bold text-green-600">{cards.filter(c => c.active !== false).length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Avg Cashback</p>
            <p className="text-2xl font-bold text-purple-600">
              {cards.length ? (cards.filter(c => c.cashback_rate).reduce((s, c) => s + (c.cashback_rate || 0), 0) / (cards.filter(c => c.cashback_rate).length || 1)).toFixed(1) : 0}%
            </p>
          </div>
        </div>
        <Button onClick={() => openDialog()} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Card
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <p className="text-sm text-slate-400 col-span-3">Loading...</p>
        ) : cards.length === 0 ? (
          <p className="text-sm text-slate-400 col-span-3">No credit cards yet</p>
        ) : cards.map(card => (
          <CreditCardCard
            key={card.id}
            card={card}
            orders={orders}
            rewards={rewards}
            privacyMode={privacyMode}
            onEdit={openDialog}
            onDelete={(c) => { if (confirm('Delete card?')) deleteMutation.mutate(c.id); }}
          />
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Edit Credit Card' : 'Add Credit Card'}</DialogTitle>
          </DialogHeader>

          {/* Mode Toggle (only for new cards) */}
          {!editingCard && (
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              <button type="button" onClick={() => setDialogMode('quick')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${dialogMode === 'quick' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                ⚡ Quick Add
              </button>
              <button type="button" onClick={() => setDialogMode('full')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${dialogMode === 'full' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                ➕ Add New Card
              </button>
            </div>
          )}

          <>{/* QUICK ADD MODE */}
          {!editingCard && dialogMode === 'quick' && (
            <form onSubmit={handleQuickAdd} className="space-y-4">
              <p className="text-xs text-slate-500">Select your card — rates & benefits are pre-filled. Just enter your last 4 digits.</p>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                {CARD_TEMPLATES.map(t => (
                  <button key={t.card_name} type="button"
                    onClick={() => setSelectedTemplate(t)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition ${selectedTemplate?.card_name === t.card_name ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                    <div>
                      <p className="font-medium text-sm text-slate-900">{t.card_name}</p>
                      <p className="text-xs text-slate-500">{t.issuer}</p>
                    </div>
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      {t.reward_type === 'cashback' ? `${t.cashback_rate}% back` : `${t.points_rate}x pts`}
                    </span>
                  </button>
                ))}
              </div>
              {selectedTemplate && (
                <div className="space-y-1">
                  <Label>Last 4 Digits</Label>
                  <Input value={quickLast4} onChange={e => setQuickLast4(e.target.value.slice(0, 4))} placeholder="e.g. 1234" maxLength="4" />
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={!selectedTemplate} className="bg-purple-600 hover:bg-purple-700 text-white">Add Card</Button>
              </DialogFooter>
            </form>
          )}

          {/* FULL FORM MODE */}
          {(editingCard || dialogMode === 'full') && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Card Name *</Label>
                <Input value={formData.card_name} onChange={e => set('card_name', e.target.value)} required placeholder="e.g. Amex Blue Cash" />
              </div>
              <div className="space-y-1">
                <Label>Last 4 Digits</Label>
                <Input value={formData.last_4_digits} onChange={e => set('last_4_digits', e.target.value.slice(0, 4))} placeholder="e.g. 1234" maxLength="4" />
              </div>
              <div className="space-y-1">
                <Label>Issuer</Label>
                <Input value={formData.issuer} onChange={e => set('issuer', e.target.value)} placeholder="e.g. American Express" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Reward Type</Label>
              <Select value={formData.reward_type} onValueChange={v => set('reward_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashback">Cashback</SelectItem>
                  <SelectItem value="points">Points</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Base Rates</p>
              <div className="grid grid-cols-2 gap-3">
                {isCashback && (
                  <div className="space-y-1">
                    <Label className="text-xs">Cashback Rate (%)</Label>
                    <Input type="number" step="0.01" value={formData.cashback_rate} onChange={e => set('cashback_rate', e.target.value)} placeholder="e.g. 1.5" />
                  </div>
                )}
                {isPoints && (
                  <div className="space-y-1">
                    <Label className="text-xs">Points Rate (x)</Label>
                    <Input type="number" step="0.1" value={formData.points_rate} onChange={e => set('points_rate', e.target.value)} placeholder="e.g. 1" />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-500">Category Rates (optional)</p>
              {[
                { label: 'Dining', key: 'dining' },
                { label: 'Travel', key: 'travel' },
                { label: 'Groceries', key: 'groceries' },
                { label: 'Gas', key: 'gas' },
                { label: 'Streaming', key: 'streaming' },
              ].map(cat => (
                <div key={cat.key} className="grid grid-cols-3 gap-2 items-center">
                  <Label className="text-xs text-slate-600">{cat.label}</Label>
                  {isCashback && <Input type="number" step="0.01" placeholder="% cashback" value={formData[`${cat.key}_cashback_rate`]} onChange={e => set(`${cat.key}_cashback_rate`, e.target.value)} className="text-xs h-8" />}
                  {isPoints && <Input type="number" step="0.1" placeholder="x points" value={formData[`${cat.key}_points_rate`]} onChange={e => set(`${cat.key}_points_rate`, e.target.value)} className="text-xs h-8" />}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={formData.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes..." />
            </div>

            <CardBenefitsEditor
              benefits={formData.annual_credits || []}
              onChange={(benefits) => set('annual_credits', benefits)}
            />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={formData.active} onChange={e => set('active', e.target.checked)} className="rounded" />
              <Label htmlFor="active" className="cursor-pointer">Card is active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                {editingCard ? 'Update' : 'Add Card'}
              </Button>
            </DialogFooter>
          </form>
          )}</>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── GIFT CARDS TAB ────────────────────────────────────────────────────────────

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
    let pointsMultiplier = card.points_rate || 1;
    const category = giftCard.category || 'other';
    if (category === 'dining' && card.dining_points_rate) pointsMultiplier = card.dining_points_rate;
    else if (category === 'travel' && card.travel_points_rate) pointsMultiplier = card.travel_points_rate;
    else if (category === 'groceries' && card.groceries_points_rate) pointsMultiplier = card.groceries_points_rate;
    else if (category === 'gas' && card.gas_points_rate) pointsMultiplier = card.gas_points_rate;
    else if (category === 'streaming' && card.streaming_points_rate) pointsMultiplier = card.streaming_points_rate;

    if (card.reward_type === 'cashback' && card.cashback_rate) {
      rewardAmount = (purchaseAmount * card.cashback_rate / 100).toFixed(2); rewardType = 'cashback'; currency = 'USD';
    } else if (card.reward_type === 'points' && pointsMultiplier) {
      rewardAmount = Math.round(purchaseAmount * pointsMultiplier); rewardType = 'points'; currency = 'points';
    } else if (card.reward_type === 'both') {
      if (card.cashback_rate) { rewardAmount = (purchaseAmount * card.cashback_rate / 100).toFixed(2); rewardType = 'cashback'; currency = 'USD'; }
      else if (pointsMultiplier) { rewardAmount = Math.round(purchaseAmount * pointsMultiplier); rewardType = 'points'; currency = 'points'; }
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

  const columns = [
    { header: 'Brand', accessor: 'brand', cell: r => <span className="font-medium">{r.brand}</span> },
    { header: 'Retailer', accessor: 'retailer', cell: r => <span className="text-sm">{r.retailer || '—'}</span> },
    { header: 'Value', accessor: 'value', cell: r => <span className="font-semibold">${r.value?.toFixed(2)}</span> },
    { header: 'Cost', accessor: 'purchase_cost', cell: r => <span className="text-sm">{r.purchase_cost ? `$${r.purchase_cost.toFixed(2)}` : '—'}</span> },
    { header: 'Profit', cell: r => {
      if (!r.purchase_cost) return <span className="text-slate-400">—</span>;
      const p = r.value - r.purchase_cost;
      return <span className={`font-semibold ${p > 0 ? 'text-green-600' : 'text-red-600'}`}>${p.toFixed(2)}</span>;
    }},
    { header: 'Code', accessor: 'code', cell: r => (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">{showCode[r.id] ? r.code : maskCode(r.code)}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleShowCode(r.id)}>
          {showCode[r.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
      </div>
    )},
    { header: 'Status', cell: r => <StatusBadge status={r.status} /> },
    { header: 'Added', cell: r => format(new Date(r.created_date), 'MMM d, yyyy') },
    { header: '', cell: r => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => { setSelectedCard(r); setBarcodeDialogOpen(true); }}><Barcode className="h-4 w-4" /></Button>
        {r.status === 'available' && <Button variant="ghost" size="sm" onClick={() => markAsUsed(r)} className="text-emerald-600 hover:bg-emerald-50">Mark Used</Button>}
        <Button variant="ghost" size="icon" onClick={() => openDialog(r)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(r.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
      </div>
    )},
  ];

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Cards', value: filteredCards.length },
            { label: 'Available', value: filteredCards.filter(c => c.status === 'available').length },
            { label: 'Available Value', value: `$${totalValue.toLocaleString()}` },
            { label: 'Total Profit', value: `$${totalProfit.toFixed(2)}`, color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-xl font-bold ${s.color || ''}`}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button onClick={() => setBulkDialogOpen(true)} variant="outline">Bulk Add</Button>
          <Button onClick={() => openDialog()} className="bg-purple-600 hover:bg-purple-700 text-white"><Plus className="h-4 w-4 mr-2" /> Add Card</Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search gift cards..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            {['all','available','reserved','exported','used','invalid'].map(s => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['dining','travel','groceries','gas','streaming','other'].map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
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
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">{editingCard ? 'Update' : 'Add'}</Button>
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
            <div className="p-4 bg-gray-50 rounded-lg text-sm">
              <p className="font-medium mb-1">Format (one per line):</p>
              <code className="text-xs">Brand, Retailer, Value, Code, PIN, PurchaseCost</code>
            </div>
            <Textarea value={bulkInput} onChange={e => setBulkInput(e.target.value)} rows={8} placeholder="Amazon, Target, 100, AMZN1234, 5678, 92" className="font-mono text-xs" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkAdd} className="bg-purple-600 hover:bg-purple-700 text-white">Add Cards</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
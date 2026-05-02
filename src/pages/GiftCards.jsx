import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Eye, EyeOff, Pencil, Trash2, Filter, Barcode } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ReactBarcode from 'react-barcode';

const BRANDS = ['Amazon', 'Apple', 'Google Play', 'Target', 'Walmart', 'Best Buy', 'eBay', 'Visa', 'Mastercard', 'Other'];

export default function GiftCards() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [showCode, setShowCode] = useState({});
  const [formData, setFormData] = useState({
    brand: '',
    retailer: '',
    category: 'other',
    value: '',
    code: '',
    pin: '',
    purchase_cost: '',
    purchase_date: '',
    credit_card_id: '',
    status: 'available',
    used_order_number: '',
    notes: ''
  });
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

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
        await createRewardForGiftCard(newCard, data.credit_card_id, data.purchase_cost);
      }
      return newCard;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast.success('Gift card added');
      setDialogOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GiftCard.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      toast.success('Gift card updated');
      setDialogOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GiftCard.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      toast.success('Gift card deleted');
    }
  });

  const createRewardForGiftCard = async (giftCard, creditCardId, purchaseAmount) => {
    const allCards = await base44.entities.CreditCard.list();
    const card = allCards.find(c => c.id === creditCardId);
    if (!card) return;

    let rewardAmount = 0;
    let rewardType = 'cashback';
    let currency = 'USD';

    let pointsMultiplier = card.points_rate || 1;
    const category = giftCard.category || 'other';
    if (category === 'dining' && card.dining_points_rate) pointsMultiplier = card.dining_points_rate;
    else if (category === 'travel' && card.travel_points_rate) pointsMultiplier = card.travel_points_rate;
    else if (category === 'groceries' && card.groceries_points_rate) pointsMultiplier = card.groceries_points_rate;
    else if (category === 'gas' && card.gas_points_rate) pointsMultiplier = card.gas_points_rate;
    else if (category === 'streaming' && card.streaming_points_rate) pointsMultiplier = card.streaming_points_rate;

    if (card.reward_type === 'cashback' && card.cashback_rate) {
      rewardAmount = (purchaseAmount * card.cashback_rate / 100).toFixed(2);
      rewardType = 'cashback'; currency = 'USD';
    } else if (card.reward_type === 'points' && pointsMultiplier) {
      rewardAmount = Math.round(purchaseAmount * pointsMultiplier);
      rewardType = 'points'; currency = 'points';
    } else if (card.reward_type === 'both') {
      if (card.cashback_rate) {
        rewardAmount = (purchaseAmount * card.cashback_rate / 100).toFixed(2);
        rewardType = 'cashback'; currency = 'USD';
      } else if (pointsMultiplier) {
        rewardAmount = Math.round(purchaseAmount * pointsMultiplier);
        rewardType = 'points'; currency = 'points';
      }
    }

    if (rewardAmount > 0) {
      await base44.entities.Reward.create({
        credit_card_id: creditCardId,
        card_name: card.card_name,
        source: `${card.card_name} (Gift Card)`,
        type: rewardType,
        purchase_amount: purchaseAmount,
        amount: parseFloat(rewardAmount),
        currency,
        date_earned: format(new Date(), 'yyyy-MM-dd'),
        status: 'earned',
        notes: `Gift card purchase: ${giftCard.brand} $${giftCard.value}`
      });
      toast.success(`Reward tracked: ${currency === 'USD' ? `$${rewardAmount}` : `${rewardAmount} pts`}`);
    }
  };

  const openDialog = (card = null) => {
    if (card) {
      setEditingCard(card);
      setFormData({
        brand: card.brand || '',
        retailer: card.retailer || '',
        category: card.category || 'other',
        value: card.value || '',
        code: card.code || '',
        pin: card.pin || '',
        purchase_cost: card.purchase_cost || '',
        purchase_date: card.purchase_date || '',
        credit_card_id: card.credit_card_id || '',
        status: card.status || 'available',
        used_order_number: card.used_order_number || '',
        notes: card.notes || ''
      });
    } else {
      setEditingCard(null);
      setFormData({
        brand: '', retailer: '', category: 'other', value: '', code: '', pin: '',
        purchase_cost: '', purchase_date: format(new Date(), 'yyyy-MM-dd'),
        credit_card_id: '', status: 'available', used_order_number: '', notes: ''
      });
    }
    setDialogOpen(true);
  };

  const markAsUsed = async (card) => {
    const orderNumber = prompt('Enter order number where this card was used:');
    if (orderNumber) {
      await base44.entities.GiftCard.delete(card.id);
      queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      toast.success('Gift card removed from inventory');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cc = creditCards.find(c => c.id === formData.credit_card_id);
    const data = {
      ...formData,
      value: parseFloat(formData.value),
      purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : null,
      card_name: cc?.card_name || null
    };
    if (editingCard) updateMutation.mutate({ id: editingCard.id, data });
    else createMutation.mutate(data);
  };

  const handleDelete = (card) => {
    if (confirm('Are you sure you want to delete this gift card?')) {
      deleteMutation.mutate(card.id);
    }
  };

  const toggleShowCode = (id) => setShowCode(p => ({ ...p, [id]: !p[id] }));

  const maskCode = (code) => {
    if (!code) return '-';
    return code.slice(0, 4) + '****' + code.slice(-4);
  };

  const openBarcodeDialog = (card) => { setSelectedCard(card); setBarcodeDialogOpen(true); };

  const handleBulkAdd = async () => {
    const lines = bulkInput.trim().split('\n').filter(l => l.trim());
    const newCards = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 3) throw new Error('Invalid format');
      return {
        brand: parts[0], retailer: parts[1], value: parseFloat(parts[2]),
        code: parts[3] || '', pin: parts[4] || '',
        purchase_cost: parts[5] ? parseFloat(parts[5]) : null, status: 'available'
      };
    });
    await Promise.all(newCards.map(card => base44.entities.GiftCard.create(card)));
    queryClient.invalidateQueries({ queryKey: ['giftCards'] });
    toast.success(`Added ${newCards.length} gift cards`);
    setBulkDialogOpen(false); setBulkInput('');
  };

  const filteredCards = cards.filter(card => {
    const matchesSearch =
      card.brand?.toLowerCase().includes(search.toLowerCase()) ||
      card.retailer?.toLowerCase().includes(search.toLowerCase()) ||
      card.code?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || card.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    { header: 'Brand', accessor: 'brand', cell: (row) => <span className="font-medium">{row.brand}</span> },
    { header: 'Retailer', accessor: 'retailer', cell: (row) => <span className="text-sm">{row.retailer || '-'}</span> },
    { header: 'Value', accessor: 'value', cell: (row) => <span className="font-semibold">${row.value?.toFixed(2)}</span> },
    { header: 'Cost', accessor: 'purchase_cost', cell: (row) => <span className="text-sm">{row.purchase_cost ? `$${row.purchase_cost.toFixed(2)}` : '-'}</span> },
    { header: 'Profit', accessor: 'profit', cell: (row) => {
      if (!row.purchase_cost) return <span className="text-sm text-slate-400">-</span>;
      const profit = row.value - row.purchase_cost;
      return <span className={`font-semibold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>${profit.toFixed(2)}</span>;
    }},
    { header: 'Code', accessor: 'code', cell: (row) => (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">{showCode[row.id] ? row.code : maskCode(row.code)}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleShowCode(row.id)}>
          {showCode[row.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
      </div>
    )},
    { header: 'Status', accessor: 'status', cell: (row) => <StatusBadge status={row.status} /> },
    { header: 'Added', accessor: 'created_date', cell: (row) => format(new Date(row.created_date), 'MMM d, yyyy') },
    { header: '', cell: (row) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => openBarcodeDialog(row)} title="View Barcode">
          <Barcode className="h-4 w-4" />
        </Button>
        {row.status === 'available' && (
          <Button variant="ghost" size="sm" onClick={() => markAsUsed(row)} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
            Mark Used
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => openDialog(row)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => handleDelete(row)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
      </div>
    )}
  ];

  const totalValue = filteredCards.filter(c => c.status === 'available').reduce((s, c) => s + (c.value || 0), 0);
  const totalProfit = filteredCards.filter(c => c.purchase_cost).reduce((s, c) => s + (c.value - c.purchase_cost), 0);

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 className="page-title">Gift Cards</h1>
        <p className="page-subtitle">Manage gift card inventory</p>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, justifyContent: 'flex-end' }}>
        <Button onClick={() => setBulkDialogOpen(true)} variant="outline">Bulk Add</Button>
        <Button onClick={() => openDialog()} style={{ background: 'var(--ink)', color: 'var(--ne-cream)', border: 'none' }}>
          <Plus className="h-4 w-4 mr-2" /> Add Card
        </Button>
      </div>

      <div className="grid-kpi" style={{ marginBottom: 16 }}>
        {[
          { label: 'Total Cards',     value: filteredCards.length,                                       accent: 'var(--gold)',    valColor: 'var(--ink)'      },
          { label: 'Available Cards', value: filteredCards.filter(c => c.status === 'available').length, accent: 'var(--terrain2)',valColor: 'var(--terrain2)' },
          { label: 'Available Value', value: `$${totalValue.toLocaleString()}`,                          accent: 'var(--ocean2)',  valColor: 'var(--ocean2)'   },
          { label: 'Total Profit',    value: `$${totalProfit.toFixed(2)}`,                               accent: 'var(--terrain2)',valColor: 'var(--terrain2)' },
        ].map(s => (
          <div key={s.label} className="kpi-card fade-up" style={{ borderTopColor: s.accent }}>
            <div className="kpi-label">{s.label}</div>
            <div className="kpi-value" style={{ color: s.valColor }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search gift cards..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['all','available','reserved','exported','used','invalid'].map(s => (
              <SelectItem key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
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
                <Select value={formData.brand} onValueChange={(v) => setFormData({ ...formData, brand: v })}>
                  <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                  <SelectContent>{BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Retailer</Label>
                <Input value={formData.retailer} onChange={(e) => setFormData({ ...formData, retailer: e.target.value })} placeholder="Where purchased" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['dining','travel','groceries','gas','streaming','other'].map(c => (
                    <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Value ($) *</Label>
                <Input type="number" step="0.01" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Purchase Cost ($)</Label>
                <Input type="number" step="0.01" value={formData.purchase_cost} onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input type="date" value={formData.purchase_date} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Credit Card Used</Label>
                <Select value={formData.credit_card_id || ''} onValueChange={(v) => setFormData({ ...formData, credit_card_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select card" /></SelectTrigger>
                  <SelectContent>
                    {creditCards.filter(c => c.active !== false).map(card => (
                      <SelectItem key={card.id} value={card.id}>{card.card_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Card Code *</Label>
                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>PIN</Label>
                <Input value={formData.pin} onChange={(e) => setFormData({ ...formData, pin: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['available','reserved','exported','used','invalid'].map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.status === 'used' && (
              <div className="space-y-2">
                <Label>Order Number Used</Label>
                <Input value={formData.used_order_number} onChange={(e) => setFormData({ ...formData, used_order_number: e.target.value })} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" style={{ background: 'var(--ink)', color: 'var(--ne-cream)', border: 'none' }}>{editingCard ? 'Update' : 'Add'}</Button>
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
              <p className="text-lg font-bold">{selectedCard.brand} — ${selectedCard.value}</p>
              <div className="flex justify-center bg-white p-8 rounded-lg border">
                <ReactBarcode value={selectedCard.code} format="CODE128" displayValue height={120} width={3} fontSize={18} margin={10} />
              </div>
              <div className="p-4 bg-slate-50 rounded">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Card Code</p>
                <p className="font-mono font-bold text-lg mt-1">{selectedCard.code}</p>
              </div>
              {selectedCard.pin && (
                <div className="p-4 bg-slate-50 rounded">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">PIN</p>
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
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium mb-1">Format (one per line):</p>
              <code className="text-xs">Brand, Retailer, Value, Code, PIN, PurchaseCost</code>
            </div>
            <Textarea value={bulkInput} onChange={(e) => setBulkInput(e.target.value)} rows={10} placeholder="Paste cards here..." className="font-mono text-xs" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkAdd} style={{ background: 'var(--ink)', color: 'var(--ne-cream)', border: 'none' }}>Add Cards</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
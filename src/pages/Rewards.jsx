import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
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
import { Plus, Search, Filter, Pencil, Trash2, TrendingUp, DollarSign, Award, CreditCard, Package } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Rewards() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [salesSearch, setSalesSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [formData, setFormData] = useState({
    credit_card_id: '',
    purchase_amount: '',
    source: '',
    type: 'cashback',
    amount: '',
    currency: 'USD',
    order_number: '',
    date_earned: format(new Date(), 'yyyy-MM-dd'),
    date_redeemed: '',
    status: 'pending',
    notes: ''
  });
  const [cardFormData, setCardFormData] = useState({
    card_name: '',
    issuer: '',
    cashback_rate: '',
    points_rate: '',
    dining_points_rate: '',
    travel_points_rate: '',
    groceries_points_rate: '',
    gas_points_rate: '',
    streaming_points_rate: '',
    reward_type: 'cashback',
    benefits: '',
    notes: '',
    active: true
  });

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => base44.entities.Reward.list('-date_earned')
  });

  const { data: creditCards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ['creditCards'],
    queryFn: async () => {
      const cards = await base44.entities.CreditCard.list();
      return cards.sort((a, b) => {
        if (a.issuer !== b.issuer) return (a.issuer || '').localeCompare(b.issuer || '');
        return (a.card_name || '').localeCompare(b.card_name || '');
      });
    }
  });



  const createRewardMutation = useMutation({
    mutationFn: (data) => base44.entities.Reward.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast.success('Reward added');
      setDialogOpen(false);
    }
  });

  const updateRewardMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Reward.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast.success('Reward updated');
      setDialogOpen(false);
    }
  });

  const deleteRewardMutation = useMutation({
    mutationFn: (id) => base44.entities.Reward.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast.success('Reward deleted');
    }
  });

  const createCardMutation = useMutation({
    mutationFn: (data) => base44.entities.CreditCard.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards'] });
      toast.success('Credit card added');
      setCardDialogOpen(false);
    }
  });

  const updateCardMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CreditCard.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards'] });
      toast.success('Credit card updated');
      setCardDialogOpen(false);
    }
  });

  const deleteCardMutation = useMutation({
    mutationFn: (id) => base44.entities.CreditCard.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards'] });
      toast.success('Credit card deleted');
    }
  });

  const openDialog = (reward = null) => {
    if (reward) {
      setEditingReward(reward);
      setFormData({
        credit_card_id: reward.credit_card_id || '',
        purchase_amount: reward.purchase_amount || '',
        source: reward.source || '',
        type: reward.type || 'cashback',
        amount: reward.amount || '',
        currency: reward.currency || 'USD',
        order_number: reward.order_number || '',
        date_earned: reward.date_earned || format(new Date(), 'yyyy-MM-dd'),
        date_redeemed: reward.date_redeemed || '',
        status: reward.status || 'pending',
        notes: reward.notes || ''
      });
    } else {
      setEditingReward(null);
      setFormData({
        credit_card_id: '',
        purchase_amount: '',
        source: '',
        type: 'cashback',
        amount: '',
        currency: 'USD',
        order_number: '',
        date_earned: format(new Date(), 'yyyy-MM-dd'),
        date_redeemed: '',
        status: 'pending',
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const openCardDialog = (card = null) => {
    if (card) {
      setEditingCard(card);
      setCardFormData({
        card_name: card.card_name || '',
        issuer: card.issuer || '',
        cashback_rate: card.cashback_rate || '',
        points_rate: card.points_rate || '',
        dining_points_rate: card.dining_points_rate || '',
        travel_points_rate: card.travel_points_rate || '',
        groceries_points_rate: card.groceries_points_rate || '',
        gas_points_rate: card.gas_points_rate || '',
        streaming_points_rate: card.streaming_points_rate || '',
        reward_type: card.reward_type || 'cashback',
        benefits: card.benefits || '',
        notes: card.notes || '',
        active: card.active !== false
      });
    } else {
      setEditingCard(null);
      setCardFormData({
        card_name: '',
        issuer: '',
        cashback_rate: '',
        points_rate: '',
        dining_points_rate: '',
        travel_points_rate: '',
        groceries_points_rate: '',
        gas_points_rate: '',
        streaming_points_rate: '',
        reward_type: 'cashback',
        benefits: '',
        notes: '',
        active: true
      });
    }
    setCardDialogOpen(true);
  };

  const calculateReward = (cardId, purchaseAmount) => {
    const card = creditCards.find(c => c.id === cardId);
    if (!card || !purchaseAmount) return { amount: 0, type: 'cashback', currency: 'USD' };

    const amount = parseFloat(purchaseAmount);
    if (card.reward_type === 'cashback' && card.cashback_rate) {
      return {
        amount: (amount * card.cashback_rate / 100).toFixed(2),
        type: 'cashback',
        currency: 'USD'
      };
    } else if (card.reward_type === 'points' && card.points_rate) {
      return {
        amount: Math.round(amount * card.points_rate),
        type: 'points',
        currency: 'points'
      };
    } else if (card.reward_type === 'both') {
      const cashback = card.cashback_rate ? (amount * card.cashback_rate / 100).toFixed(2) : 0;
      const points = card.points_rate ? Math.round(amount * card.points_rate) : 0;
      return {
        amount: cashback || points,
        type: cashback > 0 ? 'cashback' : 'points',
        currency: cashback > 0 ? 'USD' : 'points'
      };
    }
    return { amount: 0, type: 'cashback', currency: 'USD' };
  };

  const handleCardChange = (cardName) => {
    const card = creditCards.find(c => c.card_name === cardName);
    if (card) {
      const calculated = calculateReward(card.id, formData.purchase_amount);
      setFormData({
        ...formData,
        credit_card_id: card.id,
        card_name: card.card_name,
        source: card.card_name,
        type: calculated.type,
        amount: calculated.amount,
        currency: calculated.currency
      });
    }
  };

  const handlePurchaseAmountChange = (amount) => {
    const calculated = calculateReward(formData.credit_card_id, amount);
    setFormData({
      ...formData,
      purchase_amount: amount,
      amount: calculated.amount,
      type: calculated.type,
      currency: calculated.currency
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      amount: parseFloat(formData.amount),
      purchase_amount: formData.purchase_amount ? parseFloat(formData.purchase_amount) : null,
      date_redeemed: formData.date_redeemed || null
    };

    if (editingReward) {
      updateRewardMutation.mutate({ id: editingReward.id, data });
    } else {
      createRewardMutation.mutate(data);
    }
  };

  const handleCardSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...cardFormData,
      cashback_rate: cardFormData.cashback_rate ? parseFloat(cardFormData.cashback_rate) : null,
      points_rate: cardFormData.points_rate ? parseFloat(cardFormData.points_rate) : null,
      dining_points_rate: cardFormData.dining_points_rate ? parseFloat(cardFormData.dining_points_rate) : null,
      travel_points_rate: cardFormData.travel_points_rate ? parseFloat(cardFormData.travel_points_rate) : null,
      groceries_points_rate: cardFormData.groceries_points_rate ? parseFloat(cardFormData.groceries_points_rate) : null,
      gas_points_rate: cardFormData.gas_points_rate ? parseFloat(cardFormData.gas_points_rate) : null,
      streaming_points_rate: cardFormData.streaming_points_rate ? parseFloat(cardFormData.streaming_points_rate) : null
    };

    if (editingCard) {
      updateCardMutation.mutate({ id: editingCard.id, data });
    } else {
      createCardMutation.mutate(data);
    }
  };

  const handleDelete = (reward) => {
    if (confirm('Are you sure you want to delete this reward?')) {
      deleteRewardMutation.mutate(reward.id);
    }
  };

  const handleDeleteCard = (card) => {
    if (confirm('Are you sure you want to delete this credit card?')) {
      deleteCardMutation.mutate(card.id);
    }
  };

  const markAsRedeemed = async (reward) => {
    await base44.entities.Reward.update(reward.id, {
      status: 'redeemed',
      date_redeemed: format(new Date(), 'yyyy-MM-dd')
    });
    queryClient.invalidateQueries({ queryKey: ['rewards'] });
    toast.success('Reward marked as redeemed');
  };

  const filteredRewards = rewards.filter(reward => {
    const matchesSearch = 
      reward.source?.toLowerCase().includes(search.toLowerCase()) ||
      reward.order_number?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || reward.status === statusFilter;
    const matchesType = typeFilter === 'all' || reward.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const rewardColumns = [
    { header: 'Source', accessor: 'source', cell: (row) => (
      <span className="font-medium">{row.source}</span>
    )},
    { header: 'Type', accessor: 'type', cell: (row) => (
      <div className="flex items-center gap-2">
        {row.type === 'cashback' && <DollarSign className="h-4 w-4 text-green-600" />}
        {row.type === 'points' && <Award className="h-4 w-4 text-blue-600" />}
        {row.type === 'loyalty_rewards' && <TrendingUp className="h-4 w-4 text-purple-600" />}
        <span className="text-sm capitalize">{row.type.replace('_', ' ')}</span>
      </div>
    )},
    { header: 'Purchase', accessor: 'purchase_amount', cell: (row) => (
      <span className="text-sm">{row.purchase_amount ? `$${row.purchase_amount.toFixed(2)}` : '-'}</span>
    )},
    { header: 'Reward', accessor: 'amount', cell: (row) => (
      <span className="font-semibold">
        {row.currency === 'USD' ? `$${row.amount?.toFixed(2)}` : `${row.amount} pts`}
      </span>
    )},
    { header: 'Order #', accessor: 'order_number', cell: (row) => (
      <span className="text-sm">{row.order_number || '-'}</span>
    )},
    { header: 'Date Earned', accessor: 'date_earned', cell: (row) => (
      row.date_earned ? format(new Date(row.date_earned), 'MMM d, yyyy') : '-'
    )},
    { header: 'Status', accessor: 'status', cell: (row) => (
      <StatusBadge status={row.status} />
    )},
    { header: '', cell: (row) => (
      <div className="flex items-center gap-1">
        {row.status === 'earned' && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => markAsRedeemed(row)}
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
          >
            Redeem
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => openDialog(row)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleDelete(row)}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    )}
  ];

  const cardColumns = [
    { header: 'Card Name', accessor: 'card_name', cell: (row) => (
      <span className="font-medium">{row.card_name}</span>
    )},
    { header: 'Issuer', accessor: 'issuer', cell: (row) => (
      <span className="text-sm">{row.issuer || '-'}</span>
    )},
    { header: 'Cashback Rate', accessor: 'cashback_rate', cell: (row) => (
      <span className="text-sm">{row.cashback_rate ? `${row.cashback_rate}%` : '-'}</span>
    )},
    { header: 'Points Rate', accessor: 'points_rate', cell: (row) => (
      <span className="text-sm">{row.points_rate ? `${row.points_rate}x` : '-'}</span>
    )},
    { header: 'Bonus Categories', accessor: 'bonus_categories', cell: (row) => {
      const bonuses = [];
      if (row.dining_points_rate) bonuses.push(`Dining ${row.dining_points_rate}x`);
      if (row.travel_points_rate) bonuses.push(`Travel ${row.travel_points_rate}x`);
      if (row.groceries_points_rate) bonuses.push(`Groceries ${row.groceries_points_rate}x`);
      if (row.gas_points_rate) bonuses.push(`Gas ${row.gas_points_rate}x`);
      if (row.streaming_points_rate) bonuses.push(`Streaming ${row.streaming_points_rate}x`);
      return (
        <div className="text-xs space-y-0.5">
          {bonuses.length > 0 ? bonuses.map((b, i) => (
            <div key={i} className="text-violet-600">{b}</div>
          )) : row.benefits ? (
            <div className="text-blue-600">{row.benefits.substring(0, 50)}{row.benefits.length > 50 ? '...' : ''}</div>
          ) : <span className="text-slate-400">-</span>}
        </div>
      );
    }},
    { header: 'Type', accessor: 'reward_type', cell: (row) => (
      <span className="text-sm capitalize">{row.reward_type}</span>
    )},
    { header: 'Total Earned', accessor: 'total_earned', cell: (row) => {
      const cardRewards = rewards.filter(r => r.credit_card_id === row.id);
      const cashback = cardRewards.filter(r => r.currency === 'USD').reduce((sum, r) => sum + (r.amount || 0), 0);
      const points = cardRewards.filter(r => r.currency === 'points').reduce((sum, r) => sum + (r.amount || 0), 0);
      return (
        <div className="text-sm">
          {cashback > 0 && <div className="text-green-600 font-semibold">${cashback.toFixed(2)}</div>}
          {points > 0 && <div className="text-violet-600 font-semibold">{points.toLocaleString()} pts</div>}
          {cashback === 0 && points === 0 && <span className="text-slate-400">-</span>}
        </div>
      );
    }},
    { header: 'Status', accessor: 'active', cell: (row) => (
      <StatusBadge status={row.active ? 'active' : 'inactive'} />
    )},
    { header: '', cell: (row) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => openCardDialog(row)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleDeleteCard(row)}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    )}
  ];

  const totalEarned = filteredRewards
    .filter(r => r.status === 'earned' && r.currency === 'USD')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const totalRedeemed = filteredRewards
    .filter(r => r.status === 'redeemed' && r.currency === 'USD')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const totalPoints = filteredRewards
    .filter(r => r.status === 'earned' && r.currency === 'points')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-invoice_date')
  });

  // Filter paid invoices for sales data
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  
  const filteredSales = paidInvoices.filter(inv => {
    const matchesSearch = 
      inv.invoice_number?.toLowerCase().includes(salesSearch.toLowerCase()) ||
      inv.buyer?.toLowerCase().includes(salesSearch.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (monthFilter === 'all') return true;
    
    if (!inv.invoice_date) return false;
    
    const invoiceDate = new Date(inv.invoice_date);
    const [year, month] = monthFilter.split('-');
    const filterStart = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const filterEnd = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    
    return invoiceDate >= filterStart && invoiceDate <= filterEnd;
  });

  // Get unique months from invoices for filter
  const availableMonths = [...new Set(
    paidInvoices
      .filter(inv => inv.invoice_date)
      .map(inv => format(new Date(inv.invoice_date), 'yyyy-MM'))
  )].sort().reverse();

  // Calculate sales stats
  const totalSales = filteredSales.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const completedSales = filteredSales.reduce((sum, inv) => sum + (inv.total || 0), 0);

  const salesColumns = [
    { header: 'Invoice #', accessor: 'invoice_number', cell: (row) => (
      <span className="font-medium">#{row.invoice_number}</span>
    )},
    { header: 'Buyer', accessor: 'buyer', cell: (row) => (
      <span className="text-sm">{row.buyer}</span>
    )},
    { header: 'Date', accessor: 'invoice_date', cell: (row) => (
      row.invoice_date ? format(new Date(row.invoice_date), 'MMM d, yyyy') : '-'
    )},
    { header: 'Items', accessor: 'items', cell: (row) => (
      <span className="text-sm">{row.items?.length || 0} items</span>
    )},
    { header: 'Total Value', accessor: 'total', cell: (row) => (
      <span className="font-semibold text-green-600">${(row.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
    )},
  ];

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 className="page-title">Rewards & Cashback</h1>
        <p className="page-subtitle">Track points, cashback, and loyalty rewards</p>
      </div>

      <Tabs defaultValue="rewards" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="cards">Credit Cards</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => openDialog()} style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)', color: 'white', border: 'none' }}>
              <Plus className="h-4 w-4 mr-2" /> Add Reward
            </Button>
          </div>

          <div className="grid-kpi" style={{ marginBottom: 8 }}>
            <div className="kpi-card fade-up" style={{ borderTopColor: 'var(--terrain2)' }}>
              <div className="kpi-label">Cashback Earned</div>
              <div className="kpi-value" style={{ color: 'var(--terrain2)' }}>${totalEarned.toFixed(2)}</div>
            </div>
            <div className="kpi-card fade-up" style={{ borderTopColor: 'var(--violet2)' }}>
              <div className="kpi-label">Points Available</div>
              <div className="kpi-value" style={{ color: 'var(--violet2)' }}>{totalPoints.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search rewards..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="cashback">Cashback</SelectItem>
                <SelectItem value="points">Points</SelectItem>
                <SelectItem value="loyalty_rewards">Loyalty</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="earned">Earned</SelectItem>
                <SelectItem value="redeemed">Redeemed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={rewardColumns}
            data={filteredRewards}
            loading={isLoading}
            emptyMessage="No rewards found"
          />
        </TabsContent>

        <TabsContent value="cards" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => openCardDialog()} style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)', color: 'white', border: 'none' }}>
              <Plus className="h-4 w-4 mr-2" /> Add Credit Card
            </Button>
          </div>

          <DataTable
            columns={cardColumns}
            data={creditCards}
            loading={false}
            emptyMessage="No credit cards found"
          />
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <p className="text-sm text-slate-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
            Sales data is automatically imported from your paid invoices for tax tracking purposes.
          </p>

          <div className="grid-kpi" style={{ marginBottom: 8 }}>
            <div className="kpi-card fade-up" style={{ borderTopColor: 'var(--terrain2)' }}>
              <div className="kpi-label">Total Sales</div>
              <div className="kpi-value" style={{ color: 'var(--terrain2)' }}>${totalSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div className="kpi-card fade-up" style={{ borderTopColor: 'var(--terrain2)' }}>
              <div className="kpi-label">Completed Sales</div>
              <div className="kpi-value" style={{ color: 'var(--terrain2)' }}>${completedSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search sales..."
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {availableMonths.map(month => (
                  <SelectItem key={month} value={month}>
                    {format(new Date(month + '-01'), 'MMMM yyyy')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={salesColumns}
            data={filteredSales}
            loading={isLoading}
            emptyMessage="No sales found - sales are automatically imported from paid invoices"
          />
        </TabsContent>
      </Tabs>

      {/* Reward Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingReward ? 'Edit Reward' : 'Add Reward'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Credit Card</Label>
              <Select 
                value={formData.credit_card_id || ''} 
                onValueChange={(cardId) => {
                  const card = creditCards.find(c => c.id === cardId);
                  if (card) {
                    handleCardChange(cardId);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a card (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {creditCards.filter(c => c.active).map(card => {
                    const lastFour = card.id?.slice(-4) || 'XXXX';
                    return (
                      <SelectItem key={card.id} value={card.id}>
                        {card.card_name} ({lastFour}) - {card.reward_type === 'cashback' && `${card.cashback_rate}% cashback`}
                        {card.reward_type === 'points' && `${card.points_rate}x points`}
                        {card.reward_type === 'both' && `${card.cashback_rate}% / ${card.points_rate}x`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {formData.credit_card_id && (
              <div className="space-y-2">
                <Label>Purchase Amount ($) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.purchase_amount}
                  onChange={(e) => handlePurchaseAmountChange(e.target.value)}
                  placeholder="Enter purchase amount"
                  required
                />
              </div>
            )}

            {!formData.credit_card_id && (
              <div className="space-y-2">
                <Label>Source (Credit Card or Retailer) *</Label>
                <Input
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="e.g., Chase Sapphire, Amazon Rewards"
                  required
                />
              </div>
            )}

            <div style={{ padding: 14, borderRadius: 10, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)' }}>
              <p className="text-sm font-medium mb-2">Calculated Reward:</p>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>
                {formData.currency === 'USD' 
                  ? `$${parseFloat(formData.amount || 0).toFixed(2)}` 
                  : `${formData.amount || 0} points`}
              </p>
            </div>

            {!formData.credit_card_id && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cashback">Cashback</SelectItem>
                        <SelectItem value="points">Points</SelectItem>
                        <SelectItem value="loyalty_rewards">Loyalty Rewards</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency *</Label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="points">Points</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder={formData.currency === 'USD' ? '0.00' : '0'}
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Order Number</Label>
              <Input
                value={formData.order_number}
                onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                placeholder="Optional reference"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date Earned *</Label>
                <Input
                  type="date"
                  value={formData.date_earned}
                  onChange={(e) => setFormData({ ...formData, date_earned: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="earned">Earned</SelectItem>
                    <SelectItem value="redeemed">Redeemed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.status === 'redeemed' && (
              <div className="space-y-2">
                <Label>Date Redeemed</Label>
                <Input
                  type="date"
                  value={formData.date_redeemed}
                  onChange={(e) => setFormData({ ...formData, date_redeemed: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional details..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)', color: 'white', border: 'none' }}>
                {editingReward ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Credit Card Dialog */}
      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Edit Credit Card' : 'Add Credit Card'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCardSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Card Name *</Label>
              <Input
                value={cardFormData.card_name}
                onChange={(e) => setCardFormData({ ...cardFormData, card_name: e.target.value })}
                placeholder="e.g., Chase Sapphire Preferred"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Issuer</Label>
              <Input
                value={cardFormData.issuer}
                onChange={(e) => setCardFormData({ ...cardFormData, issuer: e.target.value })}
                placeholder="e.g., Chase, Amex"
              />
            </div>
            <div className="space-y-2">
              <Label>Reward Type *</Label>
              <Select value={cardFormData.reward_type} onValueChange={(v) => setCardFormData({ ...cardFormData, reward_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashback">Cashback Only</SelectItem>
                  <SelectItem value="points">Points Only</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(cardFormData.reward_type === 'cashback' || cardFormData.reward_type === 'both') && (
              <div className="space-y-2">
                <Label>Cashback Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={cardFormData.cashback_rate}
                  onChange={(e) => setCardFormData({ ...cardFormData, cashback_rate: e.target.value })}
                  placeholder="e.g., 2.5 for 2.5%"
                />
              </div>
            )}
            {(cardFormData.reward_type === 'points' || cardFormData.reward_type === 'both') && (
              <>
                <div className="space-y-2">
                  <Label>Base Points Rate (per $1)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cardFormData.points_rate}
                    onChange={(e) => setCardFormData({ ...cardFormData, points_rate: e.target.value })}
                    placeholder="e.g., 1 for 1x points"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Bonus Category Rates</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Dining (x pts)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={cardFormData.dining_points_rate}
                        onChange={(e) => setCardFormData({ ...cardFormData, dining_points_rate: e.target.value })}
                        placeholder="e.g., 3"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Travel (x pts)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={cardFormData.travel_points_rate}
                        onChange={(e) => setCardFormData({ ...cardFormData, travel_points_rate: e.target.value })}
                        placeholder="e.g., 3"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Groceries (x pts)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={cardFormData.groceries_points_rate}
                        onChange={(e) => setCardFormData({ ...cardFormData, groceries_points_rate: e.target.value })}
                        placeholder="e.g., 2"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Gas (x pts)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={cardFormData.gas_points_rate}
                        onChange={(e) => setCardFormData({ ...cardFormData, gas_points_rate: e.target.value })}
                        placeholder="e.g., 3"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Streaming (x pts)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={cardFormData.streaming_points_rate}
                        onChange={(e) => setCardFormData({ ...cardFormData, streaming_points_rate: e.target.value })}
                        placeholder="e.g., 2"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Benefits & Perks</Label>
              <Textarea
                value={cardFormData.benefits}
                onChange={(e) => setCardFormData({ ...cardFormData, benefits: e.target.value })}
                placeholder="e.g., Airport lounge access, travel insurance, purchase protection"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={cardFormData.notes}
                onChange={(e) => setCardFormData({ ...cardFormData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCardDialogOpen(false)}>Cancel</Button>
              <Button type="submit" style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)', color: 'white', border: 'none' }}>
                {editingCard ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
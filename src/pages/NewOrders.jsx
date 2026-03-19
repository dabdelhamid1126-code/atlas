import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, X, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import TransactionsStatsBar from '@/components/transactions/TransactionsStatsBar.jsx';
import TransactionsFilters from '@/components/transactions/TransactionsFilters.jsx';
import TransactionsTableMerged from '@/components/transactions/TransactionsTableMerged.jsx';
import POFormModal from '@/components/purchase-orders/POFormModal';
import PODetailsModal from '@/components/purchase-orders/PODetailsModal';

export default function NewOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [visibleColumns] = useState([
    'date', 'product', 'vendor', 'qty', 'cost', 'orderNum', 'tracking', 'payment', 'status', 'actions'
  ]);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date')
  });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list() });
  const { data: creditCards = [] } = useQuery({ queryKey: ['creditCards'], queryFn: () => base44.entities.CreditCard.list() });
  const { data: giftCards = [] } = useQuery({ queryKey: ['giftCards'], queryFn: () => base44.entities.GiftCard.list() });
  const { data: rewards = [] } = useQuery({ queryKey: ['rewards'], queryFn: () => base44.entities.Reward.list() });
  const { data: sellers = [] } = useQuery({ queryKey: ['sellers'], queryFn: () => base44.entities.Seller.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PurchaseOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success('Order created');
      setFormOpen(false);
      setEditingOrder(null);
    },
    onError: () => toast.error('Failed to create order'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success('Order updated');
      setFormOpen(false);
      setEditingOrder(null);
    },
    onError: () => toast.error('Failed to update order'),
  });

  const deleteMutation = useMutation({
    mutationFn: (order) => base44.entities.PurchaseOrder.delete(order.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success('Order deleted');
    },
    onError: () => toast.error('Failed to delete order'),
  });

  // Show only pending/ordered (new) orders
  const newOrders = orders.filter(o => {
    const isNew = o.status === 'pending' || o.status === 'ordered';
    const matchesSearch = !search ||
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.retailer?.toLowerCase().includes(search.toLowerCase()) ||
      o.items?.some(i => i.product_name?.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesVendor = vendorFilter === 'all' || o.retailer === vendorFilter;
    const matchesPayment = paymentMethodFilter === 'all' || o.credit_card_id === paymentMethodFilter;
    const matchesCategory = categoryFilter === 'all' || o.category === categoryFilter;

    let matchesDate = true;
    if (fromDate) matchesDate = new Date(o.order_date || o.created_date) >= new Date(fromDate);
    if (toDate && matchesDate) {
      const to = new Date(toDate); to.setHours(23, 59, 59, 999);
      matchesDate = new Date(o.order_date || o.created_date) <= to;
    }

    return isNew && matchesSearch && matchesStatus && matchesVendor && matchesPayment && matchesCategory && matchesDate;
  });

  const sortedOrders = [...newOrders].sort((a, b) => {
    let aVal = sortColumn === 'date' ? new Date(a.order_date || a.created_date) : a[sortColumn];
    let bVal = sortColumn === 'date' ? new Date(b.order_date || b.created_date) : b[sortColumn];
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (colId) => {
    if (sortColumn === colId) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(colId); setSortDirection('asc'); }
  };

  const vendors = [...new Set(orders.map(o => o.retailer).filter(Boolean))].sort();

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pending and recently placed orders awaiting fulfillment</p>
        </div>
        <Button onClick={() => { setEditingOrder(null); setFormOpen(true); }} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> New Order
        </Button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl">
          <span className="font-semibold text-purple-800 text-sm">{selectedIds.size} selected</span>
          <button onClick={() => { if (confirm(`Delete ${selectedIds.size} order(s)?`)) { orders.filter(o => selectedIds.has(o.id)).forEach(o => deleteMutation.mutate(o)); setSelectedIds(new Set()); } }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 transition">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      )}

      <TransactionsStatsBar orders={newOrders} />

      <TransactionsFilters
        search={search} onSearchChange={setSearch}
        statusFilter={statusFilter} onStatusChange={setStatusFilter}
        vendorFilter={vendorFilter} onVendorChange={setVendorFilter}
        fromDate={fromDate} onFromDateChange={setFromDate}
        toDate={toDate} onToDateChange={setToDate}
        paymentMethodFilter={paymentMethodFilter} onPaymentMethodChange={setPaymentMethodFilter}
        categoryFilter={categoryFilter} onCategoryChange={setCategoryFilter}
        accountFilter={accountFilter} onAccountChange={setAccountFilter}
        vendors={vendors}
        creditCards={creditCards}
      />

      <TransactionsTableMerged
        data={sortedOrders}
        visibleColumns={visibleColumns}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        onEdit={(order) => { setEditingOrder(order); setFormOpen(true); }}
        onView={(order) => { setSelectedOrder(order); setDetailsOpen(true); }}
        onDelete={(order) => { if (confirm('Delete this order?')) deleteMutation.mutate(order); }}
        creditCards={creditCards}
        rewards={rewards}
        products={products}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <POFormModal
        open={formOpen} onOpenChange={setFormOpen} order={editingOrder}
        onSubmit={(data) => editingOrder ? updateMutation.mutate({ id: editingOrder.id, data }) : createMutation.mutate(data)}
        products={products} creditCards={creditCards} giftCards={giftCards} sellers={sellers}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <PODetailsModal
        open={detailsOpen} onOpenChange={setDetailsOpen} order={selectedOrder}
        products={products} rewards={rewards} creditCards={creditCards}
      />
    </div>
  );
}
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import TransactionsFilters from '@/components/transactions/TransactionsFilters';
import TransactionsTable from '@/components/transactions/TransactionsTable';
import { Card } from '@/components/ui/card';

export default function Transactions() {
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    vendor: 'all',
    platform: 'all',
    fromDate: '',
    toDate: '',
    paymentMethod: 'all',
    category: 'all',
    account: 'all',
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date')
  });

  const { data: creditCards = [] } = useQuery({
    queryKey: ['creditCards'],
    queryFn: () => base44.entities.CreditCard.list()
  });

  const vendors = useMemo(() => {
    const vendorSet = new Set(purchaseOrders.map(po => po.retailer).filter(Boolean));
    return Array.from(vendorSet).sort();
  }, [purchaseOrders]);

  const platforms = useMemo(() => {
    const platformSet = new Set(purchaseOrders.map(po => po.platform).filter(Boolean));
    return Array.from(platformSet).sort();
  }, [purchaseOrders]);

  const transactionData = useMemo(() => {
    return purchaseOrders
      .map(po => {
        const card = creditCards.find(c => c.id === po.credit_card_id);
        return {
          ...po,
          card_name: card?.card_name || po.card_name || '—'
        };
      })
      .filter(row => {
        // Apply filters
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const matches =
            (row.product_name?.toLowerCase() || '').includes(searchLower) ||
            (row.retailer?.toLowerCase() || '').includes(searchLower) ||
            (row.items?.[0]?.product_name?.toLowerCase() || '').includes(searchLower);
          if (!matches) return false;
        }

        if (filters.status !== 'all' && row.status !== filters.status) return false;
        if (filters.vendor !== 'all' && row.retailer !== filters.vendor) return false;
        if (filters.platform !== 'all' && row.platform !== filters.platform) return false;
        if (filters.paymentMethod !== 'all' && row.credit_card_id !== filters.paymentMethod) return false;
        if (filters.category !== 'all' && row.category !== filters.category) return false;

        if (filters.fromDate) {
          const fromDate = new Date(filters.fromDate);
          const rowDate = new Date(row.order_date || row.created_date);
          if (rowDate < fromDate) return false;
        }

        if (filters.toDate) {
          const toDate = new Date(filters.toDate);
          toDate.setHours(23, 59, 59, 999);
          const rowDate = new Date(row.order_date || row.created_date);
          if (rowDate > toDate) return false;
        }

        return true;
      });
  }, [purchaseOrders, creditCards, filters]);

  return (
    <div>
      <PageHeader 
        title="Transactions" 
        description="All purchase orders and transactions"
      />

      <TransactionsFilters
        vendors={vendors}
        platforms={platforms}
        creditCards={creditCards}
        onFilterChange={setFilters}
      />

      <Card className="p-6">
        <TransactionsTable 
          data={transactionData}
          onEdit={(row) => console.log('Edit:', row)}
          onDelete={(row) => console.log('Delete:', row)}
          onExpand={(row) => console.log('Expand:', row)}
        />
      </Card>
    </div>
  );
}
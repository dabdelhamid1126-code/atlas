import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import TransactionsTable from '@/components/transactions/TransactionsTable';
import { Card } from '@/components/ui/card';

export default function Transactions() {
  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date')
  });

  const { data: creditCards = [] } = useQuery({
    queryKey: ['creditCards'],
    queryFn: () => base44.entities.CreditCard.list()
  });

  const transactionData = purchaseOrders.map(po => {
    const card = creditCards.find(c => c.id === po.credit_card_id);
    return {
      ...po,
      card_name: card?.card_name || po.card_name || '—'
    };
  });

  return (
    <div>
      <PageHeader 
        title="Transactions" 
        description="All purchase orders and transactions"
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
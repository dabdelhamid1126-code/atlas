import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function DelayedOrders() {
  const { data: delayedOrders = [], isLoading } = useQuery({
    queryKey: ['delayedOrders'],
    queryFn: async () => {
      const orders = await base44.entities.PurchaseOrder.list();
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      return orders.filter(o => 
        ['ordered', 'shipped', 'partially_received'].includes(o.status) &&
        o.order_date &&
        new Date(o.order_date) < tenDaysAgo
      );
    }
  });

  const columns = [
    { header: 'Order #', accessor: 'order_number', cell: (row) => (
      <span className="font-mono text-sm font-medium">{row.order_number}</span>
    )},
    { header: 'Retailer', accessor: 'retailer', cell: (row) => (
      <span className="font-medium">{row.retailer}</span>
    )},
    { header: 'Status', accessor: 'status', cell: (row) => (
      <StatusBadge status={row.status} />
    )},
    { header: 'Order Date', accessor: 'order_date', cell: (row) => (
      row.order_date ? format(new Date(row.order_date), 'MMM d, yyyy') : '-'
    )},
    { header: 'Days Delayed', accessor: 'order_date', cell: (row) => {
      if (!row.order_date) return '-';
      const days = Math.floor((new Date() - new Date(row.order_date)) / (1000 * 60 * 60 * 24));
      return (
        <span className={`font-semibold ${days > 20 ? 'text-red-600' : days > 15 ? 'text-orange-600' : 'text-yellow-600'}`}>
          {days} days
        </span>
      );
    }},
    { header: 'Items', accessor: 'items', cell: (row) => {
      const received = row.items?.reduce((sum, item) => sum + (item.quantity_received || 0), 0) || 0;
      const total = row.items?.reduce((sum, item) => sum + item.quantity_ordered, 0) || 0;
      return <span>{received}/{total} received</span>;
    }},
  ];

  return (
    <div>
      <PageHeader 
        title="Delayed Orders" 
        description="Orders over 10 days old that are not complete"
      />

      {delayedOrders.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <AlertTriangle className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Delayed Orders</h3>
          <p className="text-slate-600 text-center max-w-md">
            All orders are on track! No orders are delayed past 10 days.
          </p>
        </div>
      )}

      {delayedOrders.length > 0 && (
        <div className="mb-6 p-6 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-orange-600 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-orange-900">
                {delayedOrders.length} Order{delayedOrders.length !== 1 ? 's' : ''} Delayed
              </h3>
              <p className="text-sm text-orange-700">
                These orders are over 10 days old and not yet complete
              </p>
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={delayedOrders}
        loading={isLoading}
        emptyMessage="No delayed orders"
      />
    </div>
  );
}
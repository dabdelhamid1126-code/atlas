import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Eye, Trash2 } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { format, parseISO } from 'date-fns';

export default function POTable({ orders, onEdit, onView, onDelete, isLoading }) {
  if (isLoading) {
    return <div className="text-center py-8 text-slate-500">Loading...</div>;
  }

  if (orders.length === 0) {
    return <div className="text-center py-8 text-slate-500">No purchase orders found</div>;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Order #</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Retailer</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Items</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Total</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Order Date</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const totalQty = order.items?.reduce((sum, item) => sum + (item.quantity_ordered || 0), 0) || 0;
              const itemTypes = order.items?.length || 0;
              return (
                <tr key={order.id} className="border-b hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-medium">{order.order_number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium capitalize">{order.retailer}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={order.status} />
                      {order.is_pickup && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">📍 Pickup</span>
                      )}
                      {order.is_dropship && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">🚚 Dropship</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {totalQty} item{totalQty !== 1 ? 's' : ''} ({itemTypes} type{itemTypes !== 1 ? 's' : ''})
                  </td>
                  <td className="px-4 py-3">
                    {order.gift_card_value > 0 ? (
                      <div className="text-xs">
                        <div className="line-through text-slate-400">${order.total_cost?.toFixed(2)}</div>
                        <div className="font-semibold text-green-700">${order.final_cost?.toFixed(2)}</div>
                      </div>
                    ) : (
                      <span className="text-sm">${(order.total_cost || 0).toFixed(2)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {order.order_date ? format(parseISO(order.order_date), 'MMM d, yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(order)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onView(order)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(order)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
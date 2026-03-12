import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Eye, Trash2 } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { format, parseISO } from 'date-fns';

export default function POTable({ orders, onEdit, onView, onDelete, isLoading, visibleColumns = [] }) {
  const allColumns = [
    { id: 'retailer', label: 'RETAILER' },
    { id: 'orderNum', label: 'ORDER #' },
    { id: 'tracking', label: 'TRACKING #' },
    { id: 'status', label: 'STATUS' },
    { id: 'total', label: 'TOTAL' },
    { id: 'items', label: 'ITEMS' },
    { id: 'orderDate', label: 'ORDER DATE' },
  ];

  const displayColumns = allColumns.filter(col => visibleColumns.includes(col.id));
  const showActions = visibleColumns.includes('actions');

  if (isLoading) {
    return <div className="text-center py-8 text-slate-500">Loading...</div>;
  }

  if (orders.length === 0) {
    return <div className="text-center py-8 text-slate-500">No purchase orders found</div>;
  }

  return (
    <div>
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" className="rounded" />
                </th>
                {displayColumns.map(col => (
                  <th key={col.id} className={`px-4 py-3 text-xs font-semibold text-slate-600 ${
                    col.id === 'total' || col.id === 'items' ? 'text-right' : 'text-left'
                  }`}>
                    {col.label}
                  </th>
                ))}
                {showActions && <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const totalQty = order.items?.reduce((sum, item) => sum + (item.quantity_ordered || 0), 0) || 0;
                return (
                  <tr key={order.id} className="border-b hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded" />
                    </td>
                    {displayColumns.map(col => {
                      let content = '—';
                      let align = 'text-left';

                      if (col.id === 'retailer') {
                        content = order.retailer || 'Unknown';
                        content = <span className="text-sm font-medium capitalize">{content}</span>;
                      } else if (col.id === 'orderNum') {
                        content = <span className="text-sm font-mono text-slate-600">{order.order_number}</span>;
                      } else if (col.id === 'tracking') {
                        content = <span className="text-sm text-slate-600">{order.tracking_number || '—'}</span>;
                      } else if (col.id === 'status') {
                        content = <StatusBadge status={order.status} />;
                      } else if (col.id === 'total') {
                        align = 'text-right';
                        if (order.gift_card_value > 0) {
                          content = (
                            <div className="text-right">
                              <div className="line-through text-slate-400 text-xs">${order.total_cost?.toFixed(2)}</div>
                              <div className="font-semibold text-green-700 text-sm">${order.final_cost?.toFixed(2)}</div>
                            </div>
                          );
                        } else {
                          content = <span className="font-semibold text-slate-900">${(order.total_cost || 0).toFixed(2)}</span>;
                        }
                      } else if (col.id === 'items') {
                        align = 'text-right';
                        content = <span className="text-sm text-slate-600">{totalQty}</span>;
                      } else if (col.id === 'orderDate') {
                        content = <span className="text-sm text-slate-600">{order.order_date ? new Date(order.order_date).toLocaleDateString() : '—'}</span>;
                      }

                      return (
                        <td key={col.id} className={`px-4 py-3 ${align}`}>
                          {content}
                        </td>
                      );
                    })}
                    {showActions && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => onEdit(order)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="View" onClick={() => onView(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Delete" onClick={() => onDelete(order)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
        <span>Showing 1–{Math.min(orders.length, 10)} of {orders.length}</span>
        <div className="flex items-center gap-2">
          <button className="p-1 hover:bg-slate-100 rounded">&larr;</button>
          <span>Page 1 of 1</span>
          <button className="p-1 hover:bg-slate-100 rounded">&rarr;</button>
        </div>
      </div>
    </div>
  );
}
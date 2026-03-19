import React from 'react';

const statusStyles = {
  ordered:            'bg-blue-100 text-blue-700',
  shipped:            'bg-violet-100 text-violet-700',
  received:           'bg-teal-100 text-teal-700',
  partially_received: 'bg-yellow-100 text-yellow-700',
  cancelled:          'bg-red-100 text-red-700',
  pending:            'bg-slate-100 text-slate-500',
  paid:               'bg-green-100 text-green-700',
  listed:             'bg-orange-100 text-orange-700',
  sold:               'bg-pink-100 text-pink-700',
  completed:          'bg-emerald-100 text-emerald-700',
};

export default function RecentTransactions({ orders = [] }) {
  const recent = orders.slice(0, 10);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-4">Recent Transactions</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {['Product', 'Retailer', 'Cost', 'Cashback', 'Profit', 'Status', 'Date'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider py-2 pr-4 last:pr-0">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400 text-sm">No transactions yet</td></tr>
            )}
            {recent.map(order => {
              const cost = order.final_cost || order.total_cost || 0;
              const cashback = order.cashback_earned || 0;
              const profit = (order.sale_price || 0) - cost;
              const product = order.items?.map(i => i.product_name).join(', ') || order.notes || '—';
              const statusStyle = statusStyles[order.status] || statusStyles.pending;

              return (
                <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-slate-800 max-w-[160px] truncate">{product}</td>
                  <td className="py-3 pr-4 text-slate-500">{order.retailer || '—'}</td>
                  <td className="py-3 pr-4 text-slate-700 font-semibold">${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-3 pr-4 text-green-600 font-semibold">{cashback > 0 ? `$${cashback.toFixed(2)}` : '—'}</td>
                  <td className={`py-3 pr-4 font-bold ${profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    {profit !== 0 ? `$${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusStyle}`}>
                      {order.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 text-slate-400 text-xs">{order.order_date || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
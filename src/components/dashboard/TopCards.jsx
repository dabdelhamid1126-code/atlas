import React from 'react';
import { CreditCard } from 'lucide-react';

export default function TopCards({ cards = [] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-3">Top Cards</h3>
      {cards.length === 0 ? (
        <p className="text-sm text-slate-400">No card data</p>
      ) : (
        <div className="space-y-2">
          {cards.map((card, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-purple-100 flex items-center justify-center">
                  <CreditCard className="h-3.5 w-3.5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{card.name}</p>
                  <p className="text-xs text-slate-400">{card.orders} {card.orders === 1 ? 'order' : 'orders'}</p>
                </div>
              </div>
              <p className="text-sm font-bold text-purple-600">${card.spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import React from 'react';
import { Package, Tag, CheckCircle2, CreditCard, TrendingUp } from 'lucide-react';

export default function TransactionsStatsBar({ orders = [] }) {
  const totalItems = orders.reduce((sum, o) =>
    sum + (o.items?.reduce((s, i) => s + (parseInt(i.quantity_ordered) || 0), 0) || 0), 0);

  const listedCount = orders.filter(o =>
    o.status === 'ordered' || o.status === 'shipped' || o.status === 'processing').length;

  const soldCount = orders.filter(o => o.status === 'received').length;

  const totalCost = orders.reduce((sum, o) => sum + (parseFloat(o.total_cost) || 0), 0);

  const totalProfit = orders.reduce((sum, order) => {
    const itemSaleTotal = (order.items || []).reduce((s, i) =>
      s + (parseFloat(i.sale_price) || 0) * (parseInt(i.quantity_ordered) || 1), 0);
    if (itemSaleTotal > 0) {
      const cost = parseFloat(order.total_cost) || 0;
      return sum + (itemSaleTotal - cost);
    }
    const events = order.sale_events || [];
    if (events.length > 0) {
      const revenue = events.reduce((s, ev) =>
        s + (ev.items || []).reduce((is, item) =>
          is + (parseFloat(item.sale_price) || 0) * (parseInt(item.qty || item.quantity) || 1), 0), 0);
      const cost = parseFloat(order.total_cost) || 0;
      const cb   = parseFloat(order.cashback_amount) || 0;
      return sum + revenue - cost + cb;
    }
    return sum;
  }, 0);

  const totalSale = orders.reduce((sum, order) => {
    const itemSaleTotal = (order.items || []).reduce((s, i) =>
      s + (parseFloat(i.sale_price) || 0) * (parseInt(i.quantity_ordered) || 1), 0);
    if (itemSaleTotal > 0) return sum + itemSaleTotal;
    const events = order.sale_events || [];
    if (events.length > 0) {
      return sum + events.reduce((s, ev) =>
        s + (ev.items || []).reduce((is, item) =>
          is + (parseFloat(item.sale_price) || 0) * (parseInt(item.qty || item.quantity) || 1), 0), 0);
    }
    return sum;
  }, 0);

  const hasAnySales = orders.some(o => {
    const hasItemSale   = (o.items || []).some(i => parseFloat(i.sale_price) > 0);
    const hasSaleEvents = (o.sale_events || []).length > 0;
    return hasItemSale || hasSaleEvents;
  });

  const profitColor = hasAnySales
    ? (totalProfit > 0 ? 'var(--terrain)' : 'var(--crimson)')
    : 'var(--ink-ghost)';

  const stats = [
    { label: 'Items',      value: totalItems.toLocaleString(),                                                                                    icon: Package,      color: 'var(--ocean)'   },
    { label: 'Total Cost', value: `$${totalCost.toFixed(2)}`,                                                                                     icon: CreditCard,   color: 'var(--gold)'    },
    { label: 'Total Sale', value: hasAnySales ? `$${totalSale.toFixed(2)}` : '--',                                                                icon: Tag,          color: 'var(--terrain)' },
    { label: 'Profit',     value: hasAnySales ? `${totalProfit >= 0 ? '' : '-'}$${Math.abs(totalProfit).toFixed(2)}` : '--',                      icon: TrendingUp,   color: profitColor      },
    { label: 'Sold',       value: soldCount.toLocaleString(),                                                                                     icon: CheckCircle2, color: 'var(--violet)'  },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} style={{
            background: 'var(--parch-card)',
            border: '1px solid var(--parch-line)',
            borderRadius: 12,
            padding: 12,
            borderTop: `3px solid ${stat.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: 'var(--parch-warm)', border: '1px solid var(--parch-line)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon style={{ width: 13, height: 13, color: stat.color }}/>
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontFamily: 'var(--font-serif)', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--ink-dim)', marginBottom: 1,
                }}>
                  {stat.label}
                </p>
                <p style={{
                  fontSize: 14, fontWeight: 800, color: stat.color,
                  lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
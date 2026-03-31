import React from 'react';
import { Package, Tag, CheckCircle2, CreditCard, TrendingUp } from 'lucide-react';

export default function TransactionsStatsBar({ orders = [] }) {
  const totalItems = orders.reduce((sum, o) => sum + (o.items?.reduce((s, i) => s + (i.quantity_ordered || 0), 0) || 0), 0);
  const listedCount = orders.filter(o => o.status === 'ordered' || o.status === 'shipped').length;
  const soldCount = orders.filter(o => o.status === 'received').length;
  const totalCost = orders.reduce((sum, o) => sum + (o.total_cost || 0), 0);
  
  const totalProfit = orders.reduce((sum, order) => {
    const revenue = order.sale_events?.reduce(
      (s, event) => s + (event.items?.reduce(
        (is, item) => is + ((parseFloat(item.sale_price) || 0) * (parseInt(item.quantity) || 0)), 0
      ) || 0), 0
    ) || 0;
    const cost = parseFloat(order.total_cost || order.final_cost || 0);
    const cashback = parseFloat(order.cashback_amount || 0);
    return sum + (revenue - cost + cashback);
  }, 0);

  const stats = [
    {
      label: 'Total Items',
      value: totalItems.toLocaleString(),
      icon: Package,
      iconBg: 'rgba(96,165,250,0.1)',
      iconColor: '#60a5fa',
      valueColor: '#60a5fa',
    },
    {
      label: 'Listed',
      value: listedCount.toLocaleString(),
      icon: Tag,
      iconBg: 'rgba(168,85,247,0.1)',
      iconColor: '#c084fc',
      valueColor: '#c084fc',
    },
    {
      label: 'Sold / Done',
      value: soldCount.toLocaleString(),
      icon: CheckCircle2,
      iconBg: 'rgba(16,185,129,0.1)',
      iconColor: '#10b981',
      valueColor: '#10b981',
    },
    {
      label: 'Total Cost',
      value: `$${totalCost.toFixed(2)}`,
      icon: CreditCard,
      iconBg: 'rgba(239,68,68,0.1)',
      iconColor: '#f87171',
      valueColor: '#f87171',
    },
    {
      label: 'Total Profit',
      value: `$${totalProfit.toFixed(2)}`,
      icon: TrendingUp,
      iconBg: totalProfit >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
      iconColor: totalProfit >= 0 ? '#10b981' : '#f87171',
      valueColor: totalProfit >= 0 ? '#10b981' : '#f87171',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: stat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon style={{ width: 18, height: 18, color: stat.iconColor }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#64748b', marginBottom: 2 }}>{stat.label}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: stat.valueColor, lineHeight: 1.2 }}>{stat.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
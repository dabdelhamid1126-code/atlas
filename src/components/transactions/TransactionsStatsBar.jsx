import React from 'react';
import { Package, Tag, CheckCircle2, CreditCard, TrendingUp } from 'lucide-react';

export default function TransactionsStatsBar({ orders = [] }) {
  // ✅ FIX: Use qty (not quantity_ordered) for total items
  const totalItems = orders.reduce((sum, o) =>
    sum + (o.items?.reduce((s, i) => s + (parseInt(i.qty || i.quantity_ordered) || 0), 0) || 0), 0);

  const listedCount = orders.filter(o =>
    o.status === 'ordered' || o.status === 'shipped' || o.status === 'processing').length;

  const soldCount = orders.filter(o => o.status === 'received').length;

  const totalCost = orders.reduce((sum, o) => sum + (parseFloat(o.total_cost) || 0), 0);

  // ✅ FIX: Profit calculated ONLY on sold units, not total order cost
  const totalProfit = orders.reduce((sum, order) => {
    const items = order.items || [];
    const saleEvents = order.sale_events || [];

    // Total units ordered
    const totalOrdered = items.reduce((s, i) => s + (parseInt(i.qty || i.quantity_ordered) || 1), 0);
    
    // Total units actually sold
    const totalSold = saleEvents.reduce((s, ev) =>
      s + (ev.items || []).reduce((ss, it) => ss + (parseInt(it.qty) || 1), 0), 0);

    // Total cost for ALL items (per-item cost × qty)
    const totalItemsCost = items.reduce((s, i) =>
      s + (parseFloat(i.unit_cost) || 0) * (parseInt(i.qty || i.quantity_ordered) || 1), 0);

    // Only calculate cost for SOLD units
    const costPerUnit = totalOrdered > 0 ? totalItemsCost / totalOrdered : 0;
    const costForSoldUnits = costPerUnit * totalSold;

    // Revenue from sale events
    const revenue = saleEvents.reduce((s, ev) =>
      s + (ev.items || []).reduce((ss, it) =>
        ss + (parseFloat(it.sale_price) || 0) * (parseInt(it.qty) || 1), 0), 0);

    // Cashback
    const cb = parseFloat(order.cashback_amount) || 0;

    // Profit = revenue - (cost of sold units) + cashback
    if (revenue > 0) {
      return sum + (revenue - costForSoldUnits + cb);
    }

    return sum;
  }, 0);

  const hasAnySales = orders.some(o => {
    const hasSaleEvents = (o.sale_events || []).length > 0;
    return hasSaleEvents;
  });

  const profitColor = hasAnySales
    ? (totalProfit > 0 ? 'var(--terrain)' : 'var(--crimson)')
    : 'var(--ink-ghost)';

  const stats = [
    { label:'Items',      value: totalItems.toLocaleString(),                                    icon: Package,     color:'var(--ocean)'   },
    { label:'Listed',     value: listedCount.toLocaleString(),                                   icon: Tag,         color:'var(--violet)'  },
    { label:'Sold',       value: soldCount.toLocaleString(),                                     icon: CheckCircle2,color:'var(--terrain)' },
    { label:'Cost',       value: `$${totalCost.toFixed(2)}`,                                     icon: CreditCard,  color:'var(--gold)'    },
    { label:'Profit',     value: hasAnySales ? `${totalProfit >= 0 ? '' : '-'}$${Math.abs(totalProfit).toFixed(2)}` : '—', icon: TrendingUp, color: profitColor },
  ];

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:8, marginBottom:20 }}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} style={{
            background:'var(--parch-card)', border:'1px solid var(--parch-line)',
            borderRadius:12, padding:12, borderTop:`3px solid ${stat.color}`,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:7, flexShrink:0, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon style={{ width:13, height:13, color:stat.color }}/>
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{ fontFamily:"'Playfair Display', serif", fontSize:8, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-dim)', marginBottom:1 }}>
                  {stat.label}
                </p>
                <p style={{ fontSize:14, fontWeight:800, color:stat.color, lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
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
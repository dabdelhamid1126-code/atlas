import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';

const CARD_BG = '#1a1d2e';
const CARD_BORDER = '#2a2d3e';
const fmtUSD = v => `$${(v ?? 0).toFixed(2)}`;
const fmtPct = v => `${(v ?? 0).toFixed(2)}%`;

function TableCard({ title, subtitle, badge, children }) {
  return (
    <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-white uppercase">{title}</p>
          {subtitle && <p className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>{subtitle}</p>}
        </div>
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: '#6366f1', color: '#e0e7ff' }}>
            {badge}
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

const thClass = "text-left py-2.5 px-3 text-[10px] font-bold tracking-widest text-white/40 uppercase whitespace-nowrap";
const tdClass = "py-3 px-3 text-sm text-white/70 whitespace-nowrap";
const tdBoldClass = "py-3 px-3 text-sm font-bold text-white whitespace-nowrap";

export default function DetailTablesTab({ orders, invoices, rewards }) {
  // ── Store Breakdown ──────────────────────────────────────────────
  const storeRows = useMemo(() => {
    const map = {};
    const paidInvoices = invoices.filter(i => i.status === 'paid');

    orders.forEach(o => {
      const store = o.retailer || 'Unknown';
      if (!map[store]) map[store] = { store, purchases: 0, sales: 0, cashback: 0, txns: 0 };
      map[store].purchases += o.final_cost || o.total_cost || 0;
      map[store].txns += 1;
    });

    paidInvoices.forEach(inv => {
      const store = inv.buyer || 'Unknown';
      if (!map[store]) map[store] = { store, purchases: 0, sales: 0, cashback: 0, txns: 0 };
      map[store].sales += inv.total || 0;
    });

    rewards.filter(r => r.currency === 'USD').forEach(r => {
      const po = orders.find(o => o.id === r.purchase_order_id);
      const store = po?.retailer || 'Unknown';
      if (!map[store]) map[store] = { store, purchases: 0, sales: 0, cashback: 0, txns: 0 };
      map[store].cashback += r.amount || 0;
    });

    return Object.values(map).map(d => ({
      ...d,
      profit: d.sales - d.purchases + d.cashback,
      spread: d.sales - d.purchases,
      roi: d.purchases > 0 ? ((d.sales - d.purchases + d.cashback) / d.purchases) * 100 : 0,
    }));
  }, [orders, invoices, rewards]);

  const storeTotals = useMemo(() => ({
    purchases: storeRows.reduce((s, r) => s + r.purchases, 0),
    sales: storeRows.reduce((s, r) => s + r.sales, 0),
    profit: storeRows.reduce((s, r) => s + r.profit, 0),
    cashback: storeRows.reduce((s, r) => s + r.cashback, 0),
    spread: storeRows.reduce((s, r) => s + r.spread, 0),
    txns: storeRows.reduce((s, r) => s + r.txns, 0),
    roi: storeRows.length
      ? storeRows.reduce((s, r) => s + r.roi, 0) / storeRows.length
      : 0,
  }), [storeRows]);

  // ── Platform Breakdown ───────────────────────────────────────────
  const platformRows = useMemo(() => {
    const map = {};
    const paidInvoices = invoices.filter(i => i.status === 'paid');

    orders.forEach(o => {
      const platform = o.retailer || 'Unknown';
      if (!map[platform]) map[platform] = { platform, purchases: 0, sales: 0, cashback: 0, buys: 0, salesCount: 0 };
      map[platform].purchases += o.final_cost || o.total_cost || 0;
      map[platform].buys += 1;
    });

    paidInvoices.forEach(inv => {
      const platform = inv.buyer || 'Unknown';
      if (!map[platform]) map[platform] = { platform, purchases: 0, sales: 0, cashback: 0, buys: 0, salesCount: 0 };
      map[platform].sales += inv.total || 0;
      map[platform].salesCount += 1;
    });

    rewards.filter(r => r.currency === 'USD').forEach(r => {
      const po = orders.find(o => o.id === r.purchase_order_id);
      const platform = po?.retailer || 'Unknown';
      if (!map[platform]) map[platform] = { platform, purchases: 0, sales: 0, cashback: 0, buys: 0, salesCount: 0 };
      map[platform].cashback += r.amount || 0;
    });

    return Object.values(map).map(d => ({
      ...d,
      profit: d.sales - d.purchases + d.cashback,
      margin: d.sales > 0 ? ((d.sales - d.purchases + d.cashback) / d.sales) * 100 : 0,
    }));
  }, [orders, invoices, rewards]);

  // ── Period-by-Period ─────────────────────────────────────────────
  const periodRows = useMemo(() => {
    const map = {};
    const paidInvoices = invoices.filter(i => i.status === 'paid');

    orders.forEach(o => {
      if (!o.order_date) return;
      const period = o.order_date.slice(0, 7); // YYYY-MM
      if (!map[period]) map[period] = { period, purchases: 0, sales: 0, cashback: 0 };
      map[period].purchases += o.final_cost || o.total_cost || 0;
    });

    paidInvoices.forEach(inv => {
      if (!inv.invoice_date) return;
      const period = inv.invoice_date.slice(0, 7);
      if (!map[period]) map[period] = { period, purchases: 0, sales: 0, cashback: 0 };
      map[period].sales += inv.total || 0;
    });

    rewards.filter(r => r.currency === 'USD').forEach(r => {
      if (!r.date_earned) return;
      const period = r.date_earned.slice(0, 7);
      if (!map[period]) map[period] = { period, purchases: 0, sales: 0, cashback: 0 };
      map[period].cashback += r.amount || 0;
    });

    return Object.values(map)
      .sort((a, b) => a.period.localeCompare(b.period))
      .map(d => ({
        ...d,
        netProfit: d.sales - d.purchases + d.cashback,
        margin: d.sales > 0 ? ((d.sales - d.purchases + d.cashback) / d.sales) * 100 : 0,
      }));
  }, [orders, invoices, rewards]);

  return (
    <div className="space-y-4">
      {/* Store Breakdown */}
      <TableCard title="Store Breakdown" subtitle="Complete store-by-store analysis" badge={`${storeRows.length} STORES`}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className={thClass}>Store</th>
              <th className={thClass}>Purchases</th>
              <th className={thClass}>Sales</th>
              <th className={thClass}>Profit</th>
              <th className={thClass}>Cashback</th>
              <th className={thClass}>Spread</th>
              <th className={thClass}>ROI</th>
              <th className={thClass}>TXNs</th>
            </tr>
          </thead>
          <tbody>
            {storeRows.map((r, i) => (
              <tr key={r.store} className={`border-b border-white/5 ${i % 2 === 1 ? 'bg-white/[0.02]' : ''}`}>
                <td className={`${tdClass} font-semibold text-white`}>{r.store}</td>
                <td className={tdClass}>{fmtUSD(r.purchases)}</td>
                <td className={tdClass}>{fmtUSD(r.sales)}</td>
                <td className={tdClass}>{fmtUSD(r.profit)}</td>
                <td className={tdClass}>{fmtUSD(r.cashback)}</td>
                <td className={tdClass}>{fmtUSD(r.spread)}</td>
                <td className={tdClass}>{fmtPct(r.roi)}</td>
                <td className={tdClass}>{r.txns}</td>
              </tr>
            ))}
            {/* Total row */}
            <tr className="border-t-2 border-white/20 bg-white/[0.03]">
              <td className={tdBoldClass}>TOTAL</td>
              <td className={tdBoldClass}>{fmtUSD(storeTotals.purchases)}</td>
              <td className={tdBoldClass}>{fmtUSD(storeTotals.sales)}</td>
              <td className={tdBoldClass}>{fmtUSD(storeTotals.profit)}</td>
              <td className={tdBoldClass}>{fmtUSD(storeTotals.cashback)}</td>
              <td className={tdBoldClass}>{fmtUSD(storeTotals.spread)}</td>
              <td className={tdBoldClass}>{fmtPct(storeTotals.roi)}</td>
              <td className={tdBoldClass}>{storeTotals.txns}</td>
            </tr>
            {!storeRows.length && (
              <tr><td colSpan={8} className="py-6 text-center text-white/30 text-xs">No data</td></tr>
            )}
          </tbody>
        </table>
      </TableCard>

      {/* Platform Breakdown */}
      <TableCard title="Platform Breakdown" subtitle="Performance by marketplace platform" badge={`${platformRows.length} PLATFORMS`}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className={thClass}>Platform</th>
              <th className={thClass}>Purchases</th>
              <th className={thClass}>Sales</th>
              <th className={thClass}>Cashback</th>
              <th className={thClass}>Profit</th>
              <th className={thClass}># Buys</th>
              <th className={thClass}># Sales</th>
              <th className={thClass}>Margin</th>
            </tr>
          </thead>
          <tbody>
            {platformRows.map((r, i) => (
              <tr key={r.platform} className={`border-b border-white/5 ${i % 2 === 1 ? 'bg-white/[0.02]' : ''}`}>
                <td className={`${tdClass} font-semibold text-white`}>{r.platform}</td>
                <td className={tdClass}>{fmtUSD(r.purchases)}</td>
                <td className={tdClass}>{fmtUSD(r.sales)}</td>
                <td className={tdClass}>{fmtUSD(r.cashback)}</td>
                <td className={tdClass}>{fmtUSD(r.profit)}</td>
                <td className={tdClass}>{r.buys}</td>
                <td className={tdClass}>{r.salesCount}</td>
                <td className={tdClass}>{fmtPct(r.margin)}</td>
              </tr>
            ))}
            {!platformRows.length && (
              <tr><td colSpan={8} className="py-6 text-center text-white/30 text-xs">No data</td></tr>
            )}
          </tbody>
        </table>
      </TableCard>

      {/* Period-by-Period */}
      <TableCard title="Period-by-Period Data" subtitle="Raw trend numbers for each period">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className={thClass}>Period</th>
              <th className={thClass}>Purchases</th>
              <th className={thClass}>Sales</th>
              <th className={thClass}>Cashback</th>
              <th className={thClass}>Net Profit</th>
              <th className={thClass}>Margin</th>
            </tr>
          </thead>
          <tbody>
            {periodRows.map((r, i) => (
              <tr key={r.period} className={`border-b border-white/5 ${i % 2 === 1 ? 'bg-white/[0.02]' : ''}`}>
                <td className={`${tdClass} font-semibold text-white`}>{r.period}</td>
                <td className={tdClass}>{fmtUSD(r.purchases)}</td>
                <td className={tdClass}>{fmtUSD(r.sales)}</td>
                <td className={tdClass}>{fmtUSD(r.cashback)}</td>
                <td className={tdClass}>{fmtUSD(r.netProfit)}</td>
                <td className={tdClass}>{fmtPct(r.margin)}</td>
              </tr>
            ))}
            {!periodRows.length && (
              <tr><td colSpan={6} className="py-6 text-center text-white/30 text-xs">No data</td></tr>
            )}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
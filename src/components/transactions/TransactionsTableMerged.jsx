import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ExternalLink, Package } from 'lucide-react';
import RetailerLogo from '@/components/shared/BrandLogo';

const ROWS_PER_PAGE = 15;

function getStatusStyles(status) {
  const s = status?.toLowerCase() || '';
  const map = {
    received: { bg: 'bg-green-100', text: 'text-green-700', label: 'Received' },
    shipped: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Shipped' },
    ordered: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Ordered' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
    partially_received: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Partial' },
  };
  return map[s] || { bg: 'bg-slate-100', text: 'text-slate-600', label: status || '—' };
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('T')[0].split('-');
  return `${parseInt(month)}/${parseInt(day)}/${year}`;
}

function getCashbackDisplay(rewards, orderId) {
  const orderRewards = rewards.filter(r => r.purchase_order_id === orderId);
  if (!orderRewards.length) return null;
  const usdTotal = orderRewards.filter(r => r.currency === 'USD').reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const ptsTotal = orderRewards.filter(r => r.currency === 'points').reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  if (usdTotal > 0 && ptsTotal > 0) return `$${usdTotal.toFixed(2)} + ${Math.round(ptsTotal)} pts`;
  if (usdTotal > 0) return `$${usdTotal.toFixed(2)}`;
  if (ptsTotal > 0) return `${Math.round(ptsTotal)} pts`;
  return null;
}

function getTrackingUrl(trackingNumber, carrier) {
  if (!trackingNumber) return null;
  const t = trackingNumber.toUpperCase();
  const c = (carrier || '').toUpperCase();
  if (c.includes('FEDEX') || /^[0-9]{20}/.test(t)) return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  if (c.includes('UPS') || t.startsWith('1Z')) return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  if (c.includes('USPS')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  return `https://www.google.com/search?q=${encodeURIComponent(trackingNumber)}+package+tracking`;
}

function OrderRow({ order, creditCards, rewards, products, onEdit, onDelete, isSelected, onSelectChange }) {
  const [expanded, setExpanded] = useState(false);

  const itemCount = order.items?.length || 0;
  const totalQty = order.items?.reduce((s, i) => s + (parseInt(i.quantity_ordered) || 0), 0) || 0;
  const totalCost = order.total_cost || 0;
  const totalSale = order.items?.reduce((s, i) => s + (parseFloat(i.sale_price) || 0) * (parseInt(i.quantity_ordered) || 1), 0) || 0;
  const profit = totalSale - totalCost;
  const isLoss = profit < 0 && totalSale > 0;

  const cashback = getCashbackDisplay(rewards, order.id);
  const card = creditCards.find(c => c.id === order.credit_card_id);
  const cardName = card?.card_name || order.card_name || '—';
  const statusStyle = getStatusStyles(order.status);

  return (
    <div className={`rounded-xl border mb-2 overflow-hidden transition-all ${isLoss ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-white'} ${isSelected ? 'ring-2 ring-purple-400' : ''}`}>
      {/* Main Row */}
      <div
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition select-none ${expanded ? 'border-b border-slate-100' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Checkbox */}
        <div onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={e => onSelectChange?.(order.id, e.target.checked)}
            className="rounded border-slate-300 accent-purple-600 h-4 w-4"
          />
        </div>

        {/* Vendor Logo / Icon */}
        <RetailerLogo retailer={order.retailer} size={44} />

        {/* Order # + Date */}
        <div className="min-w-0 flex-shrink-0 w-48">
          <p className="font-bold text-slate-900 text-sm truncate">
            {order.order_number ? `#${order.order_number}` : '—'}
          </p>
          <p className="text-xs text-slate-400">{formatDate(order.order_date || order.created_date)}</p>
        </div>

        {/* Items badge */}
        <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold whitespace-nowrap">
          {totalQty} {totalQty === 1 ? 'item' : 'items'}
        </span>

        {/* Spacer */}
        <div className="flex-1 min-w-0" />

        {/* Metrics row */}
        <div className="hidden sm:flex items-center gap-6 flex-shrink-0 text-sm">
          {/* Total Cost */}
          <div className="text-right min-w-[70px]">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Cost</p>
            <p className="font-semibold text-slate-800">${totalCost.toFixed(2)}</p>
          </div>

          {/* Profit */}
          <div className="text-right min-w-[70px]">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Profit</p>
            <p className={`font-bold ${totalSale === 0 ? 'text-slate-400' : profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalSale === 0 ? '—' : `${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`}
            </p>
          </div>

          {/* Cashback */}
          <div className="text-right min-w-[70px]">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Cashback</p>
            <p className="font-semibold text-blue-600">{cashback || '—'}</p>
          </div>

          {/* Payment */}
          <div className="text-right min-w-[110px]">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Payment</p>
            {order.payment_splits?.length > 1 ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                Split ×{order.payment_splits.length}
              </span>
            ) : (
              <p className="font-medium text-slate-700 text-xs truncate max-w-[110px]">{cardName}</p>
            )}
          </div>

          {/* Status */}
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.label}
          </span>
        </div>

        {/* Chevron */}
        <div className="flex-shrink-0 ml-2 text-slate-400">
          {expanded
            ? <ChevronUp className="h-4 w-4 transition-transform duration-200" />
            : <ChevronDown className="h-4 w-4 transition-transform duration-200" />
          }
        </div>
      </div>

      {/* Expanded Section */}
      {expanded && (
        <div className="bg-slate-50 px-4 py-3">
          {/* Items */}
          <div className="space-y-2 mb-3">
            {(order.items || []).length === 0 ? (
              <p className="text-xs text-slate-400 italic">No items recorded</p>
            ) : (order.items || []).map((item, idx) => {
              const itemCost = parseFloat(item.unit_cost) || 0;
              const itemSale = parseFloat(item.sale_price) || 0;
              const itemQty = parseInt(item.quantity_ordered) || 1;
              const itemProfit = (itemSale - itemCost) * itemQty;
              const hasSale = itemSale > 0;
              const trackingUrl = getTrackingUrl(order.tracking_number, order.carrier);
              const productObj = products?.find(p => p.id === item.product_id);
              const imgUrl = productObj?.image || null;

              return (
                <div key={idx} className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                    {imgUrl
                      ? <img src={imgUrl} alt={item.product_name} className="h-10 w-10 object-contain" />
                      : <Package className="h-5 w-5 text-slate-400" />
                    }
                  </div>
                  {/* Product name + tracking */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{item.product_name || '—'}</p>
                    {order.tracking_number && (
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 hover:underline mt-0.5"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {order.tracking_number}
                      </a>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-5 flex-shrink-0 text-xs">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase">Qty</p>
                      <p className="font-semibold text-slate-700">{itemQty}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase">Cost/unit</p>
                      <p className="font-semibold text-slate-700">${itemCost.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase">Sale/unit</p>
                      <p className="font-semibold text-slate-700">{hasSale ? `$${itemSale.toFixed(2)}` : '—'}</p>
                    </div>
                    <div className="text-right min-w-[60px]">
                      <p className="text-[10px] text-slate-400 uppercase">Profit</p>
                      <p className={`font-bold ${!hasSale ? 'text-slate-400' : itemProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {!hasSale ? '—' : `${itemProfit >= 0 ? '+' : ''}$${itemProfit.toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Split payment breakdown */}
          {order.payment_splits?.length > 1 && (
            <div className="bg-purple-50 rounded-xl border border-purple-100 p-3 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-purple-500 mb-2">Split Payment</p>
              <div className="space-y-1">
                {order.payment_splits.map((sp, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">{sp.card_name}</span>
                    <span className="font-bold text-slate-800">${(sp.amount || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Bar + Actions */}
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200 mt-1">
            {/* Mini Summary */}
            <div className="flex items-center gap-5 text-xs">
              <div>
                <span className="text-slate-400">Total Cost: </span>
                <span className="font-bold text-slate-800">${totalCost.toFixed(2)}</span>
              </div>
              {totalSale > 0 && (
                <div>
                  <span className="text-slate-400">Total Sale: </span>
                  <span className="font-bold text-slate-800">${totalSale.toFixed(2)}</span>
                </div>
              )}
              {totalSale > 0 && (
                <div>
                  <span className="text-slate-400">Profit: </span>
                  <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                  </span>
                </div>
              )}
              {cashback && (
                <div>
                  <span className="text-slate-400">Cashback: </span>
                  <span className="font-bold text-blue-600">{cashback}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => onEdit?.(order)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 text-xs font-medium transition"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                onClick={() => onDelete?.(order)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-500 hover:bg-red-50 text-xs font-medium transition"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransactionsTableMerged({
  data = [],
  creditCards = [],
  rewards = [],
  products = [],
  isLoading = false,
  selectedIds = new Set(),
  onSelectionChange,
  onEdit,
  onDelete,
  // kept for API compatibility but not used in new design
  visibleColumns,
  sortColumn,
  sortDirection,
  onSort,
  onView,
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const startIdx = (currentPage - 1) * ROWS_PER_PAGE;
  const paginatedData = data.slice(startIdx, startIdx + ROWS_PER_PAGE);
  const totalPages = Math.ceil(data.length / ROWS_PER_PAGE);

  const handleSelectAll = (checked) => {
    onSelectionChange?.(checked ? new Set(data.map(o => o.id)) : new Set());
  };

  const handleSelectRow = (id, checked) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    onSelectionChange?.(next);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="text-center py-16 text-slate-400 text-sm">No transactions found</div>;
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <div onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={data.length > 0 && data.every(o => selectedIds.has(o.id))}
            onChange={e => handleSelectAll(e.target.checked)}
            className="rounded border-slate-300 accent-purple-600 h-4 w-4"
          />
        </div>
        <div className="w-9 flex-shrink-0" />
        <div className="w-48 flex-shrink-0">Order</div>
        <div className="flex-1" />
        <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
          <div className="text-right w-[70px]">Cost</div>
          <div className="text-right w-[70px]">Profit</div>
          <div className="text-right w-[70px]">Cashback</div>
          <div className="text-right w-[110px]">Payment</div>
          <div className="w-[70px]">Status</div>
        </div>
        <div className="w-4 flex-shrink-0" />
      </div>

      {/* Order rows */}
      {paginatedData.map(order => (
        <OrderRow
          key={order.id}
          order={order}
          creditCards={creditCards}
          rewards={rewards}
          products={products}
          onEdit={onEdit}
          onDelete={onDelete}
          isSelected={selectedIds.has(order.id)}
          onSelectChange={handleSelectRow}
        />
      ))}

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-600 pt-2">
        <span>
          Showing {data.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + ROWS_PER_PAGE, data.length)} of {data.length}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 text-sm">Page {data.length === 0 ? 0 : currentPage} of {totalPages || 1}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages || data.length === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
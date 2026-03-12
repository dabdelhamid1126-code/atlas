import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import StatusBadge from '@/components/shared/StatusBadge';
import { Package } from 'lucide-react';

export default function PODetailsModal({ open, onOpenChange, order, products, rewards, creditCards = [] }) {
  if (!order) return null;

  const orderRewards = rewards.filter(r => r.purchase_order_id === order.id);
  const totalCashback = orderRewards.filter(r => r.currency === 'USD').reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalPoints = orderRewards.filter(r => r.currency === 'points').reduce((sum, r) => sum + (r.amount || 0), 0);
  
  const card = creditCards.find(c => c.id === order.credit_card_id);
  const cardDisplay = card ? `${card.card_name} (${card.id?.slice(-4) || 'XXXX'})` : order.card_name || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-6 pb-4 border-b">
            <div>
              <Label className="text-slate-500 text-sm">Order Number</Label>
              <p className="font-semibold text-lg">{order.order_number}</p>
            </div>
            <div>
              <Label className="text-slate-500 text-sm">Retailer</Label>
              <p className="font-semibold text-lg capitalize">{order.retailer}</p>
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-2 gap-6 pb-4 border-b">
            <div>
              <Label className="text-slate-500 text-sm">Status</Label>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={order.status} />
                {order.is_pickup && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">📍 Pickup</span>
                )}
                {order.is_dropship && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">🚚 Dropship</span>
                )}
              </div>
              {order.is_dropship && order.dropship_to && (
                <p className="text-sm text-slate-600 mt-1">To: {order.dropship_to}</p>
              )}
            </div>
            <div>
              <Label className="text-slate-500 text-sm">Total</Label>
              <p className="font-semibold text-lg">${(order.final_cost || order.total_cost || 0).toFixed(2)}</p>
            </div>
          </div>

          {/* Tracking */}
          {order.tracking_number && (
            <div className="pb-4 border-b">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500 text-xs">Tracking Number</Label>
                  <p className="font-mono text-sm mt-1">{order.tracking_number}</p>
                </div>
                <div>
                  <Label className="text-slate-500 text-xs">Carrier</Label>
                  <p className="font-semibold text-sm mt-1">{order.carrier || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="pb-4">
            <Label className="text-slate-500 text-sm mb-3 block">Items ({order.items?.length || 0})</Label>
            <div className="space-y-3">
              {order.items?.map((item, i) => {
                const product = products.find(p => p.id === item.product_id);
                const lineTotal = (item.quantity_ordered || 0) * (item.unit_cost || 0);
                const displayName = item.product_name && item.product_name.length > 40
                  ? item.product_name.substring(0, 40) + '...'
                  : item.product_name;

                return (
                  <div key={i} className="flex gap-3 py-3 border-b last:border-b-0" title={item.product_name}>
                    <div className="flex-shrink-0">
                      {product?.image ? (
                        <img
                          src={product.image}
                          alt={item.product_name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Package className="h-6 w-6 text-slate-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                        {displayName}
                      </p>
                      {item.upc && (
                        <p className="text-xs text-slate-500 mt-1">UPC: {item.upc}</p>
                      )}
                      {product?.category && (
                        <span className="inline-block mt-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded capitalize">
                          {product.category}
                        </span>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0 whitespace-nowrap">
                      <p className="text-sm font-medium text-slate-900">
                        {item.quantity_ordered} × ${item.unit_cost?.toFixed(2)}
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        ${lineTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rewards */}
          {orderRewards.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <Label className="text-slate-500 text-sm mb-3 block">Reward Earned</Label>
              {totalCashback > 0 && (
                <div>
                  <p className="text-2xl font-semibold text-green-600">${totalCashback.toFixed(2)} cashback</p>
                  <p className="text-xs text-slate-600">{cardDisplay} • {orderRewards[0]?.status || 'pending'}</p>
                </div>
              )}
              {totalPoints > 0 && (
                <div className="mt-2">
                  <p className="text-2xl font-semibold text-green-600">{Math.round(totalPoints)} pts</p>
                  <p className="text-xs text-slate-600">{cardDisplay} • {orderRewards[0]?.status || 'pending'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
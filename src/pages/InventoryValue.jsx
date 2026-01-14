import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Truck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function InventoryValue() {


  const { data: inventory = [], isLoading: loadingInventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.InventoryItem.list()
  });

  const { data: purchaseOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list()
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  // Calculate inventory on hand count
  const inventoryOnHand = inventory
    .filter(item => ['in_stock', 'received'].includes(item.status))
    .reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Calculate on the way count
  const onTheWayOrders = purchaseOrders.filter(po => 
    ['ordered', 'shipped', 'partially_received'].includes(po.status)
  );

  const inventoryOnWay = onTheWayOrders.reduce((sum, order) => {
    return sum + (order.items || []).reduce((itemSum, item) => {
      const remaining = (item.quantity_ordered || 0) - (item.quantity_received || 0);
      return itemSum + remaining;
    }, 0);
  }, 0);

  // Group inventory by product
  const inventoryByProduct = {};
  inventory.filter(item => ['in_stock', 'received'].includes(item.status)).forEach(item => {
    const key = item.product_id;
    if (!inventoryByProduct[key]) {
      inventoryByProduct[key] = {
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: 0
      };
    }
    inventoryByProduct[key].quantity += item.quantity || 0;
  });

  const productList = Object.values(inventoryByProduct).sort((a, b) => b.quantity - a.quantity);



  if (loadingInventory || loadingOrders) {
    return (
      <div>
        <PageHeader title="Inventory Value" description="Current and incoming inventory valuation" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="Inventory Value" 
        description="Current and incoming inventory valuation"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card-modern p-8 animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Inventory On Hand</p>
              <p className="text-4xl font-bold text-slate-900 mt-3">{inventoryOnHand.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-2">units currently in stock</p>
            </div>
            <div className="h-16 w-16 gradient-success rounded-2xl flex items-center justify-center shadow-lg">
              <Package className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        <div className="card-modern p-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Inventory On The Way</p>
              <p className="text-4xl font-bold text-slate-900 mt-3">{inventoryOnWay.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-2">units in transit</p>
            </div>
            <div className="h-16 w-16 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
              <Truck className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Product Breakdown */}
      <Card className="card-modern border-0 animate-slide-up" style={{animationDelay: '0.2s'}}>
        <CardHeader>
          <CardTitle className="text-lg">Inventory Breakdown by Product</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {productList.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No inventory items</p>
            ) : (
              productList.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{item.product_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">{item.quantity}</p>
                    <p className="text-xs text-slate-500">units</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
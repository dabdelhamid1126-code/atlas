import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tantml:react-query';
import PageHeader from '@/components/shared/PageHeader';
import StatsCard from '@/components/shared/StatsCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, TrendingUp, Truck, DollarSign, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function InventoryValue() {
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [customPrice, setCustomPrice] = useState('');

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

  // Calculate current inventory value
  const currentInventoryValue = inventory
    .filter(item => ['in_stock', 'received'].includes(item.status))
    .reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id);
      const price = product?.msrp || item.unit_cost || 0;
      return sum + (price * (item.quantity || 0));
    }, 0);

  const currentInventoryCost = inventory
    .filter(item => ['in_stock', 'received'].includes(item.status))
    .reduce((sum, item) => sum + ((item.unit_cost || 0) * (item.quantity || 0)), 0);

  // Calculate on the way value
  const onTheWayOrders = purchaseOrders.filter(po => 
    ['ordered', 'shipped', 'partially_received'].includes(po.status)
  );

  const onTheWayValue = onTheWayOrders.reduce((sum, order) => {
    return sum + (order.items || []).reduce((itemSum, item) => {
      const remaining = (item.quantity_ordered || 0) - (item.quantity_received || 0);
      const product = products.find(p => p.id === item.product_id);
      const price = product?.msrp || item.unit_cost || 0;
      return itemSum + (price * remaining);
    }, 0);
  }, 0);

  const onTheWayCost = onTheWayOrders.reduce((sum, order) => {
    return sum + (order.items || []).reduce((itemSum, item) => {
      const remaining = (item.quantity_ordered || 0) - (item.quantity_received || 0);
      return itemSum + ((item.unit_cost || 0) * remaining);
    }, 0);
  }, 0);

  const totalValue = currentInventoryValue + onTheWayValue;
  const totalCost = currentInventoryCost + onTheWayCost;
  const potentialProfit = totalValue - totalCost;

  // Group inventory by product
  const inventoryByProduct = {};
  inventory.filter(item => ['in_stock', 'received'].includes(item.status)).forEach(item => {
    const key = item.product_id;
    if (!inventoryByProduct[key]) {
      inventoryByProduct[key] = {
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        quantity: 0,
        cost: 0,
        value: 0
      };
    }
    const product = products.find(p => p.id === item.product_id);
    const price = product?.msrp || item.unit_cost || 0;
    inventoryByProduct[key].quantity += item.quantity || 0;
    inventoryByProduct[key].cost += (item.unit_cost || 0) * (item.quantity || 0);
    inventoryByProduct[key].value += price * (item.quantity || 0);
  });

  const productList = Object.values(inventoryByProduct).sort((a, b) => b.value - a.value);

  const openPriceDialog = (item) => {
    setSelectedItem(item);
    setCustomPrice('');
    setPriceDialogOpen(true);
  };

  const calculateCustomValue = () => {
    if (!customPrice || !selectedItem) return 0;
    return parseFloat(customPrice) * selectedItem.quantity;
  };

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Current Inventory Value"
          value={`$${currentInventoryValue.toLocaleString()}`}
          icon={Package}
        />
        <StatsCard
          title="On The Way Value"
          value={`$${onTheWayValue.toLocaleString()}`}
          icon={Truck}
        />
        <StatsCard
          title="Total Inventory Value"
          value={`$${totalValue.toLocaleString()}`}
          icon={TrendingUp}
        />
        <StatsCard
          title="Potential Profit"
          value={`$${potentialProfit.toLocaleString()}`}
          icon={DollarSign}
        />
      </div>

      {/* Cost vs Value */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base">Current Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Cost</span>
                <span className="font-semibold">${currentInventoryCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Market Value</span>
                <span className="font-semibold">${currentInventoryValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Profit Margin</span>
                <span className="font-bold text-lg">
                  ${(currentInventoryValue - currentInventoryCost).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base">Inventory On The Way</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Cost</span>
                <span className="font-semibold">${onTheWayCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Market Value</span>
                <span className="font-semibold">${onTheWayValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Expected Profit</span>
                <span className="font-bold text-lg">
                  ${(onTheWayValue - onTheWayCost).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Breakdown */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-base">Inventory Breakdown by Product</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {productList.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No inventory items</p>
            ) : (
              productList.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-gray-600">
                      Qty: {item.quantity} • Cost: ${item.cost.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold">${item.value.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">
                        ${(item.value / item.quantity).toFixed(2)} each
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openPriceDialog(item)}
                      className="text-gray-400 hover:text-black"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Custom Price Calculator Dialog */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom Price Calculator</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedItem.product_name}</p>
                <p className="text-sm text-gray-600">Quantity: {selectedItem.quantity}</p>
                <p className="text-sm text-gray-600">Current Value: ${selectedItem.value.toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label>Custom Price Per Unit ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="Enter custom price"
                  className="text-lg"
                />
              </div>
              {customPrice && (
                <div className="p-4 bg-black text-white rounded-lg">
                  <p className="text-sm opacity-80">Total Value at Custom Price</p>
                  <p className="text-2xl font-bold">${calculateCustomValue().toLocaleString()}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
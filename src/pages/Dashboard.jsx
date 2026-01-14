import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/shared/PageHeader';
import StatsCard from '@/components/shared/StatsCard';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  Package,
  ShoppingCart,
  Upload,
  FileText,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  DollarSign,
  ChevronRight
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    inventory: 0,
    pendingPO: 0,
    pendingExports: 0,
    giftCards: 0,
    damagedItems: 0
  });
  const [productsWithoutPrice, setProductsWithoutPrice] = useState([]);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [priceInput, setPriceInput] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [inventory, purchaseOrders, exports, giftCards, damaged, products] = await Promise.all([
        base44.entities.InventoryItem.filter({ status: 'in_stock' }),
        base44.entities.PurchaseOrder.filter({ status: 'pending' }),
        base44.entities.Export.filter({ status: 'pending' }),
        base44.entities.GiftCard.filter({ status: 'available' }),
        base44.entities.DamagedItem.filter({ status: 'reported' }),
        base44.entities.Product.list()
      ]);

      setStats({
        inventory: inventory.reduce((sum, item) => sum + (item.quantity || 0), 0),
        pendingPO: purchaseOrders.length,
        pendingExports: exports.length,
        giftCards: giftCards.length,
        damagedItems: damaged.length
      });

      const withoutPrice = products.filter(p => !p.price && p.price !== 0);
      setProductsWithoutPrice(withoutPrice);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrice = async () => {
    if (!priceInput || isNaN(parseFloat(priceInput))) return;
    
    const currentProduct = productsWithoutPrice[currentProductIndex];
    await base44.entities.Product.update(currentProduct.id, { price: parseFloat(priceInput) });
    
    setPriceInput('');
    if (currentProductIndex < productsWithoutPrice.length - 1) {
      setCurrentProductIndex(currentProductIndex + 1);
    } else {
      setProductsWithoutPrice([]);
      setCurrentProductIndex(0);
    }
  };

  const handleSkip = () => {
    setPriceInput('');
    if (currentProductIndex < productsWithoutPrice.length - 1) {
      setCurrentProductIndex(currentProductIndex + 1);
    } else {
      setProductsWithoutPrice([]);
      setCurrentProductIndex(0);
    }
  };

  const quickLinks = [
    { name: 'Scan & Receive', page: 'ScanReceive', icon: Package, color: 'gradient-primary' },
    { name: 'Inventory Value', page: 'InventoryValue', icon: TrendingUp, color: 'gradient-success' },
    { name: 'New Invoice', page: 'Invoices', icon: FileText, color: 'gradient-warning' },
    { name: 'Gift Cards', page: 'GiftCards', icon: CreditCard, color: 'gradient-danger' },
  ];

  if (loading) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Overview of your operations" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="Dashboard" 
        description="Overview of your operations"
      />

      {/* Price Entry Section */}
      {productsWithoutPrice.length > 0 && (
        <Card className="mb-8 border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100 shadow-lg animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <DollarSign className="h-5 w-5" />
              Set Product Prices ({currentProductIndex + 1} of {productsWithoutPrice.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-amber-200">
                <div className="flex items-start gap-4">
                  {productsWithoutPrice[currentProductIndex]?.image && (
                    <img 
                      src={productsWithoutPrice[currentProductIndex].image} 
                      alt={productsWithoutPrice[currentProductIndex].name}
                      className="h-20 w-20 object-contain rounded-md border border-slate-200"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">
                      {productsWithoutPrice[currentProductIndex]?.name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      SKU: {productsWithoutPrice[currentProductIndex]?.sku}
                    </p>
                    <p className="text-sm text-slate-500">
                      UPC: {productsWithoutPrice[currentProductIndex]?.upc}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter price"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSetPrice()}
                    className="text-lg"
                  />
                </div>
                <Button onClick={handleSetPrice} disabled={!priceInput} className="px-6">
                  Set Price
                </Button>
                <Button onClick={handleSkip} variant="outline">
                  Skip
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatsCard
          title="Inventory Items"
          value={stats.inventory.toLocaleString()}
          icon={Package}
        />
        <StatsCard
          title="Pending Purchase Orders"
          value={stats.pendingPO}
          icon={ShoppingCart}
        />
        <StatsCard
          title="Pending Exports"
          value={stats.pendingExports}
          icon={Upload}
        />
        <StatsCard
          title="Available Gift Cards"
          value={stats.giftCards}
          icon={CreditCard}
        />
        <StatsCard
          title="Damaged Items"
          value={stats.damagedItems}
          icon={AlertTriangle}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map((link, idx) => (
            <Link key={link.page} to={createPageUrl(link.page)}>
              <div 
                className="card-modern p-5 hover:shadow-xl transition-all cursor-pointer group animate-slide-up"
                style={{animationDelay: `${idx * 0.1}s`}}
              >
                <div className={`h-12 w-12 rounded-2xl ${link.color.replace('bg-', 'gradient-')} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                  <link.icon className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {link.name}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
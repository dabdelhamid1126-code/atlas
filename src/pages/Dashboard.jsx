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
  const [financialStats, setFinancialStats] = useState({
    totalSpent: 0,
    totalCashback: 0,
    totalPoints: 0,
    totalGiftCardSpend: 0,
    giftCardCashback: 0,
    giftCardPoints: 0,
    mostUsedCard: null
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [inventory, purchaseOrders, exports, giftCards, damaged, products, allOrders, rewards, creditCards, allGiftCards] = await Promise.all([
        base44.entities.InventoryItem.filter({ status: 'in_stock' }),
        base44.entities.PurchaseOrder.filter({ status: 'pending' }),
        base44.entities.Export.filter({ status: 'pending' }),
        base44.entities.GiftCard.filter({ status: 'available' }),
        base44.entities.DamagedItem.filter({ status: 'reported' }),
        base44.entities.Product.list(),
        base44.entities.PurchaseOrder.list(),
        base44.entities.Reward.list(),
        base44.entities.CreditCard.list(),
        base44.entities.GiftCard.list()
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

      // Calculate financial stats
      const totalSpent = allOrders.reduce((sum, order) => sum + (order.final_cost || order.total_cost || 0), 0);
      const totalCashback = rewards.filter(r => r.currency === 'USD').reduce((sum, r) => sum + (r.amount || 0), 0);
      const totalPoints = rewards.filter(r => r.currency === 'points').reduce((sum, r) => sum + (r.amount || 0), 0);
      const totalGiftCardSpend = allGiftCards.filter(gc => gc.purchase_cost).reduce((sum, gc) => sum + gc.purchase_cost, 0);
      
      // Calculate rewards from gift card purchases
      const giftCardRewards = rewards.filter(r => 
        (r.source && r.source.includes('(Gift Card)')) || 
        (r.notes && r.notes.toLowerCase().includes('gift card purchase'))
      );
      const giftCardCashback = giftCardRewards.filter(r => r.currency === 'USD').reduce((sum, r) => sum + (r.amount || 0), 0);
      const giftCardPoints = giftCardRewards.filter(r => r.currency === 'points').reduce((sum, r) => sum + (r.amount || 0), 0);

      // Find most used card
      const cardUsage = {};
      allOrders.forEach(order => {
        if (order.credit_card_id) {
          cardUsage[order.credit_card_id] = (cardUsage[order.credit_card_id] || 0) + 1;
        }
      });
      const mostUsedCardId = Object.keys(cardUsage).reduce((a, b) => cardUsage[a] > cardUsage[b] ? a : b, null);
      const mostUsedCard = mostUsedCardId ? creditCards.find(c => c.id === mostUsedCardId) : null;

      setFinancialStats({
        totalSpent,
        totalCashback,
        totalPoints,
        totalGiftCardSpend,
        giftCardCashback,
        giftCardPoints,
        mostUsedCard
      });
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
    { name: 'Scan & Receive', page: 'ScanReceive', icon: Package, gradient: 'from-blue-500 to-indigo-600' },
    { name: 'Inventory Value', page: 'InventoryValue', icon: TrendingUp, gradient: 'from-emerald-500 to-teal-600' },
    { name: 'New Invoice', page: 'Invoices', icon: FileText, gradient: 'from-violet-500 to-purple-600' },
    { name: 'Gift Cards', page: 'GiftCards', icon: CreditCard, gradient: 'from-orange-500 to-red-600' },
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

      {/* Financial Overview */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Financial Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="card-modern overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-500">Total Spent</p>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">${financialStats.totalSpent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </CardContent>
          </Card>

          <Card className="card-modern overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-500">Total Cashback</p>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-emerald-600">${financialStats.totalCashback.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </CardContent>
          </Card>

          <Card className="card-modern overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-500">Total Points</p>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-violet-600">{financialStats.totalPoints.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">points</p>
            </CardContent>
          </Card>

          <Card className="card-modern overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-500">Most Used Card</p>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900 truncate">
                {financialStats.mostUsedCard?.card_name || 'N/A'}
              </p>
              {financialStats.mostUsedCard && (
                <p className="text-xs text-slate-500 mt-1">{financialStats.mostUsedCard.issuer}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gift Card Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Card className="card-modern overflow-hidden border-2 border-pink-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-500">Gift Card Spend</p>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-pink-600">${financialStats.totalGiftCardSpend.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </CardContent>
          </Card>

          <Card className="card-modern overflow-hidden border-2 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-500">GC Cashback Earned</p>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-emerald-600">${financialStats.giftCardCashback.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              <p className="text-xs text-slate-500 mt-1">from gift card purchases</p>
            </CardContent>
          </Card>

          <Card className="card-modern overflow-hidden border-2 border-violet-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-500">GC Points Earned</p>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-violet-600">{financialStats.giftCardPoints.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">points from gift card purchases</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Operations Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map((link, idx) => (
            <Link key={link.page} to={createPageUrl(link.page)}>
              <div 
                className="card-modern p-6 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group animate-slide-up overflow-hidden relative"
                style={{animationDelay: `${idx * 0.1}s`}}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${link.gradient} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${link.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xl relative z-10`}>
                  <link.icon className="h-7 w-7 text-white" />
                </div>
                <p className="text-sm font-bold text-slate-900 relative z-10">
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
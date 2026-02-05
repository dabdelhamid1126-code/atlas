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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';

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
    mostUsedCard: null,
    monthlyProfit: 0,
    monthlySpent: 0,
    roi: 0,
    profitTrend: [],
    mostUsedCardSpend: 0,
    mostUsedCardRewards: { cashback: 0, points: 0 }
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [inventory, purchaseOrders, exports, giftCards, damaged, products, allOrders, rewards, creditCards, allGiftCards, allExports] = await Promise.all([
        base44.entities.InventoryItem.filter({ status: 'in_stock' }),
        base44.entities.PurchaseOrder.filter({ status: 'pending' }),
        base44.entities.Export.filter({ status: 'pending' }),
        base44.entities.GiftCard.filter({ status: 'available' }),
        base44.entities.DamagedItem.filter({ status: 'reported' }),
        base44.entities.Product.list(),
        base44.entities.PurchaseOrder.list(),
        base44.entities.Reward.list(),
        base44.entities.CreditCard.list(),
        base44.entities.GiftCard.list(),
        base44.entities.Export.list()
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
      
      // Calculate revenue from exports
      const totalRevenue = allExports.reduce((sum, exp) => sum + (exp.total_value || 0), 0);
      
      // Calculate this month's profit
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      
      const monthlyOrders = allOrders.filter(o => {
        const orderDate = o.order_date ? parseISO(o.order_date) : null;
        return orderDate && orderDate >= monthStart && orderDate <= monthEnd;
      });
      const monthlyExports = allExports.filter(e => {
        const exportDate = e.export_date ? parseISO(e.export_date) : null;
        return exportDate && exportDate >= monthStart && exportDate <= monthEnd;
      });
      
      const monthlySpent = monthlyOrders.reduce((sum, order) => sum + (order.final_cost || order.total_cost || 0), 0);
      const monthlyRevenue = monthlyExports.reduce((sum, exp) => sum + (exp.total_value || 0), 0);
      const monthlyProfit = monthlyRevenue - monthlySpent;
      
      // Calculate ROI
      const roi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;
      
      // Calculate profit trend for last 6 months
      const profitTrend = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const mStart = startOfMonth(monthDate);
        const mEnd = endOfMonth(monthDate);
        
        const mOrders = allOrders.filter(o => {
          const orderDate = o.order_date ? parseISO(o.order_date) : null;
          return orderDate && orderDate >= mStart && orderDate <= mEnd;
        });
        const mExports = allExports.filter(e => {
          const exportDate = e.export_date ? parseISO(e.export_date) : null;
          return exportDate && exportDate >= mStart && exportDate <= mEnd;
        });
        
        const mSpent = mOrders.reduce((sum, order) => sum + (order.final_cost || order.total_cost || 0), 0);
        const mRevenue = mExports.reduce((sum, exp) => sum + (exp.total_value || 0), 0);
        const mProfit = mRevenue - mSpent;
        
        profitTrend.push({
          month: format(monthDate, 'MMM yyyy'),
          profit: mProfit
        });
      }

      // Find most used card
      const cardUsage = {};
      allOrders.forEach(order => {
        if (order.credit_card_id) {
          cardUsage[order.credit_card_id] = (cardUsage[order.credit_card_id] || 0) + 1;
        }
      });
      const mostUsedCardId = Object.keys(cardUsage).reduce((a, b) => cardUsage[a] > cardUsage[b] ? a : b, null);
      const mostUsedCard = mostUsedCardId ? creditCards.find(c => c.id === mostUsedCardId) : null;
      
      // Calculate spending and rewards for most used card
      const mostUsedCardSpend = mostUsedCardId 
        ? allOrders.filter(o => o.credit_card_id === mostUsedCardId).reduce((sum, o) => sum + (o.final_cost || o.total_cost || 0), 0)
        : 0;
      const mostUsedCardRewards = mostUsedCardId
        ? {
            cashback: rewards.filter(r => r.credit_card_id === mostUsedCardId && r.currency === 'USD').reduce((sum, r) => sum + (r.amount || 0), 0),
            points: rewards.filter(r => r.credit_card_id === mostUsedCardId && r.currency === 'points').reduce((sum, r) => sum + (r.amount || 0), 0)
          }
        : { cashback: 0, points: 0 };

      setFinancialStats({
        totalSpent,
        totalCashback,
        totalPoints,
        totalGiftCardSpend,
        mostUsedCard,
        monthlyProfit,
        monthlySpent,
        roi,
        profitTrend,
        mostUsedCardSpend,
        mostUsedCardRewards
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
                <p className="text-sm font-medium text-slate-500">Monthly Spent</p>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">${financialStats.monthlySpent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              <p className="text-xs text-slate-500 mt-1">This month</p>
            </CardContent>
          </Card>

          <Card className="card-modern overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-500">Monthly Profit</p>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className={`text-3xl font-bold ${financialStats.monthlyProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ${financialStats.monthlyProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
              <p className="text-xs text-slate-500 mt-1">This month</p>
            </CardContent>
          </Card>

          <Card className="card-modern overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-500">ROI</p>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className={`text-3xl font-bold ${financialStats.roi >= 0 ? 'text-violet-600' : 'text-red-600'}`}>
                {financialStats.roi.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">Return on investment</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-modern overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-500">Total Cashback</p>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
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
                <p className="text-sm font-medium text-slate-500">Gift Card Spend</p>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-pink-600">${financialStats.totalGiftCardSpend.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
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
              <p className="text-lg font-bold text-slate-900 truncate">
                {financialStats.mostUsedCard?.card_name || 'N/A'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Spent: ${financialStats.mostUsedCardSpend.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Profit Trend Chart */}
        <Card className="card-modern mt-4">
          <CardHeader>
            <CardTitle>Profit Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={financialStats.profitTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  formatter={(value) => `$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Total Spend (All Time)</p>
                <p className="text-2xl font-bold text-slate-900">
                  ${financialStats.totalSpent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Most Used Card Rewards */}
        {financialStats.mostUsedCard && (
          <Card className="card-modern mt-4 border-2 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-orange-600" />
                {financialStats.mostUsedCard.card_name} Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Total Spent</p>
                  <p className="text-2xl font-bold text-slate-900">
                    ${financialStats.mostUsedCardSpend.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Cashback Earned</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${financialStats.mostUsedCardRewards.cashback.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Points Earned</p>
                  <p className="text-2xl font-bold text-violet-600">
                    {financialStats.mostUsedCardRewards.points.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stats Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Operations Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
    </div>
  );
}
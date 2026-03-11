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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    cashbackTrend: [],
    pointsTrend: [],
    spentTrend: [],
    mostUsedCardSpend: 0,
    mostUsedCardRewards: { cashback: 0, points: 0 }
  });
  const [selectedMetric, setSelectedMetric] = useState('profit');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [inventory, purchaseOrders, exports, giftCards, damaged, products, allOrders, rewards, creditCards, allGiftCards, allExports, allInvoices] = await Promise.all([
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
        base44.entities.Export.list(),
        base44.entities.Invoice.list()
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

      // Helper function to calculate invoice cost
      const calculateInvoiceCost = (invoice) => {
        let totalCost = 0;
        (invoice.items || []).forEach(item => {
          if (item.product_id) {
            const productOrders = allOrders
              .filter(po => po.items?.some(i => i.product_id === item.product_id))
              .sort((a, b) => new Date(b.order_date || b.created_date) - new Date(a.order_date || a.created_date));
            
            if (productOrders.length > 0) {
              const orderItem = productOrders[0].items.find(i => i.product_id === item.product_id);
              if (orderItem) {
                totalCost += (orderItem.unit_cost || 0) * item.quantity;
              }
            }
          }
        });
        return totalCost;
      };

      // Calculate financial stats
      const totalSpent = allOrders.reduce((sum, order) => sum + (order.final_cost || order.total_cost || 0), 0);
      const totalCashback = rewards.filter(r => r.currency === 'USD').reduce((sum, r) => sum + (r.amount || 0), 0);
      const totalPoints = rewards.filter(r => r.currency === 'points').reduce((sum, r) => sum + (r.amount || 0), 0);
      const totalGiftCardSpend = allGiftCards.filter(gc => gc.purchase_cost).reduce((sum, gc) => sum + gc.purchase_cost, 0);
      
      // Calculate revenue from paid invoices
      const paidInvoices = allInvoices.filter(inv => inv.status === 'paid');
      const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const totalInvoiceCost = paidInvoices.reduce((sum, inv) => sum + calculateInvoiceCost(inv), 0);
      const totalProfit = totalRevenue - totalInvoiceCost;
      
      // Calculate this month's profit
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      
      const monthlyOrders = allOrders.filter(o => {
        const orderDate = o.order_date ? parseISO(o.order_date) : null;
        return orderDate && orderDate >= monthStart && orderDate <= monthEnd;
      });
      const monthlyInvoices = paidInvoices.filter(inv => {
        const invoiceDate = inv.invoice_date ? parseISO(inv.invoice_date) : null;
        return invoiceDate && invoiceDate >= monthStart && invoiceDate <= monthEnd;
      });
      
      const monthlySpent = monthlyOrders.reduce((sum, order) => sum + (order.final_cost || order.total_cost || 0), 0);
      const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const monthlyInvoiceCost = monthlyInvoices.reduce((sum, inv) => sum + calculateInvoiceCost(inv), 0);
      const monthlyProfit = monthlyRevenue - monthlyInvoiceCost;
      
      // Calculate ROI
      const roi = totalInvoiceCost > 0 ? (totalProfit / totalInvoiceCost) * 100 : 0;
      
      // Calculate trends for last 6 months
      const profitTrend = [];
      const cashbackTrend = [];
      const pointsTrend = [];
      const spentTrend = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const mStart = startOfMonth(monthDate);
        const mEnd = endOfMonth(monthDate);
        
        const mOrders = allOrders.filter(o => {
          const orderDate = o.order_date ? parseISO(o.order_date) : null;
          return orderDate && orderDate >= mStart && orderDate <= mEnd;
        });
        const mInvoices = paidInvoices.filter(inv => {
          const invoiceDate = inv.invoice_date ? parseISO(inv.invoice_date) : null;
          return invoiceDate && invoiceDate >= mStart && invoiceDate <= mEnd;
        });
        const mRewards = rewards.filter(r => {
          const rewardDate = r.date_earned ? parseISO(r.date_earned) : null;
          return rewardDate && rewardDate >= mStart && rewardDate <= mEnd;
        });
        
        const mSpent = mOrders.reduce((sum, order) => sum + (order.final_cost || order.total_cost || 0), 0);
        const mRevenue = mInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const mInvoiceCost = mInvoices.reduce((sum, inv) => sum + calculateInvoiceCost(inv), 0);
        const mProfit = mRevenue - mInvoiceCost;
        const mCashback = mRewards.filter(r => r.currency === 'USD').reduce((sum, r) => sum + (r.amount || 0), 0);
        const mPoints = mRewards.filter(r => r.currency === 'points').reduce((sum, r) => sum + (r.amount || 0), 0);
        
        const monthLabel = format(monthDate, 'MMM yyyy');
        profitTrend.push({ month: monthLabel, value: mProfit });
        cashbackTrend.push({ month: monthLabel, value: mCashback });
        pointsTrend.push({ month: monthLabel, value: mPoints });
        spentTrend.push({ month: monthLabel, value: mSpent });
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
        cashbackTrend,
        pointsTrend,
        spentTrend,
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



      {/* Financial Overview */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-foreground mb-4">Financial Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <Card className="card-modern overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Monthly Spent</p>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">${financialStats.monthlySpent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>

          <Card className="card-modern overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Monthly Profit</p>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className={`text-3xl font-bold ${financialStats.monthlyProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ${financialStats.monthlyProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>

          <Card className="card-modern overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">ROI</p>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className={`text-3xl font-bold ${financialStats.roi >= 0 ? 'text-violet-600' : 'text-red-600'}`}>
                {financialStats.roi.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Return on investment</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-modern overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Total Cashback</p>
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
                <p className="text-sm font-medium text-muted-foreground">Total Points</p>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-violet-600">{financialStats.totalPoints.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">points</p>
            </CardContent>
          </Card>

          <Card className="card-modern overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Gift Card Spend</p>
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
                <p className="text-sm font-medium text-muted-foreground">Most Used Card</p>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-lg font-bold text-foreground truncate">
                {financialStats.mostUsedCard?.card_name || 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Spent: ${financialStats.mostUsedCardSpend.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart with Metric Switcher */}
        <Card className="card-modern mt-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {selectedMetric === 'profit' && 'Profit Trend (Last 6 Months)'}
                {selectedMetric === 'cashback' && 'Cashback Trend (Last 6 Months)'}
                {selectedMetric === 'points' && 'Points Trend (Last 6 Months)'}
                {selectedMetric === 'spent' && 'Spending Trend (Last 6 Months)'}
              </CardTitle>
              <Tabs value={selectedMetric} onValueChange={setSelectedMetric}>
                <TabsList>
                  <TabsTrigger value="profit">Profit</TabsTrigger>
                  <TabsTrigger value="cashback">Cashback</TabsTrigger>
                  <TabsTrigger value="points">Points</TabsTrigger>
                  <TabsTrigger value="spent">Spent</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={
                selectedMetric === 'profit' ? financialStats.profitTrend :
                selectedMetric === 'cashback' ? financialStats.cashbackTrend :
                selectedMetric === 'points' ? financialStats.pointsTrend :
                financialStats.spentTrend
              }>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(258,20%,22%)" />
                <XAxis dataKey="month" stroke="hsl(258,15%,60%)" style={{ fontSize: '12px' }} />
                <YAxis stroke="hsl(258,15%,60%)" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(258,30%,12%)', border: '1px solid hsl(258,20%,22%)', borderRadius: '8px', color: '#f5f5f5' }}
                  formatter={(value) => 
                    selectedMetric === 'points' 
                      ? value.toLocaleString()
                      : `$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                  }
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={
                    selectedMetric === 'profit' ? '#10b981' :
                    selectedMetric === 'cashback' ? '#14b8a6' :
                    selectedMetric === 'points' ? '#8b5cf6' :
                    '#64748b'
                  }
                  strokeWidth={3} 
                  dot={{ 
                    fill: selectedMetric === 'profit' ? '#10b981' :
                          selectedMetric === 'cashback' ? '#14b8a6' :
                          selectedMetric === 'points' ? '#8b5cf6' :
                          '#64748b', 
                    r: 5 
                  }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Most Used Card Rewards */}
        {financialStats.mostUsedCard && (
          <Card className="card-modern mt-4 border-2 border-orange-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-orange-600" />
                {financialStats.mostUsedCard.card_name} Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${financialStats.mostUsedCardSpend.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Cashback Earned</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${financialStats.mostUsedCardRewards.cashback.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Points Earned</p>
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
        <Card className="card-modern overflow-hidden mb-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">${financialStats.totalSpent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </CardContent>
        </Card>

        <h2 className="text-lg font-bold text-foreground mb-4">Operations Overview</h2>
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
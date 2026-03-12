import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatsCard from '@/components/shared/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Upload, FileText, DollarSign, TrendingUp, ShoppingCart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [data, setData] = useState({
    totalInventory: 0,
    itemsOnWay: 0,
    inventoryValue: 0,
    totalExports: 0,
    totalRevenue: 0,
    totalInvoices: 0,
    exportsByDay: [],
    categoryBreakdown: [],
    topProducts: []
  });

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [inventory, exports, invoices, products, purchaseOrders] = await Promise.all([
        base44.entities.InventoryItem.list(),
        base44.entities.Export.list('-created_date'),
        base44.entities.Invoice.list(),
        base44.entities.Product.list(),
        base44.entities.PurchaseOrder.list()
      ]);

      const daysAgo = parseInt(period);
      const startDate = subDays(new Date(), daysAgo);

      // Filter exports by period
      const recentExports = exports.filter(e => new Date(e.created_date) >= startDate);

      // Calculate items on the way
      const pendingOrders = purchaseOrders.filter(po => ['ordered', 'shipped', 'partially_received'].includes(po.status));
      const itemsOnWay = pendingOrders.reduce((sum, po) => {
        const ordered = po.items?.reduce((s, i) => s + (i.quantity_ordered || 0), 0) || 0;
        const received = po.items?.reduce((s, i) => s + (i.quantity_received || 0), 0) || 0;
        return sum + (ordered - received);
      }, 0);

      // Calculate totals
      const totalInventory = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const totalRevenue = recentExports.reduce((sum, e) => sum + (e.total_value || 0), 0);
      const paidInvoices = invoices.filter(i => i.status === 'paid');
      const totalPaid = paidInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
      
      // Calculate total inventory value
      const inventoryValue = inventory.reduce((sum, item) => {
        const product = products.find(p => p.id === item.product_id);
        const price = product?.price || item.unit_cost || 0;
        return sum + (price * (item.quantity || 0));
      }, 0);

      // Exports by day
      const days = eachDayOfInterval({ start: startDate, end: new Date() });
      const exportsByDay = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayExports = recentExports.filter(e => 
          format(new Date(e.created_date), 'yyyy-MM-dd') === dayStr
        );
        return {
          date: format(day, 'MMM d'),
          exports: dayExports.length,
          value: dayExports.reduce((sum, e) => sum + (e.total_value || 0), 0)
        };
      });

      // Category breakdown
      const categoryMap = {};
      inventory.forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        const category = product?.category || 'other';
        categoryMap[category] = (categoryMap[category] || 0) + (item.quantity || 0);
      });
      const categoryBreakdown = Object.entries(categoryMap).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value
      }));

      // Top products
      const productMap = {};
      inventory.forEach(item => {
        const name = item.product_name || 'Unknown';
        productMap[name] = (productMap[name] || 0) + (item.quantity || 0);
      });
      const topProducts = Object.entries(productMap)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, quantity]) => ({ name, quantity }));

      setData({
        totalInventory,
        itemsOnWay,
        inventoryValue,
        totalExports: recentExports.length,
        totalRevenue,
        totalInvoices: totalPaid,
        exportsByDay,
        categoryBreakdown,
        topProducts
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Analytics" description="Business intelligence and metrics" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="Analytics" 
        description="Business intelligence and metrics"
        actions={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="card-modern p-6 animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Inventory On Hand</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{data.totalInventory.toLocaleString()}</p>
              <p className="text-sm text-emerald-600 font-semibold mt-1">${(data.inventoryValue || 0).toLocaleString()}</p>
            </div>
            <div className="h-14 w-14 gradient-success rounded-2xl flex items-center justify-center">
              <Package className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="card-modern p-6 animate-slide-up" style={{animationDelay: '0.1s'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Items On The Way</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{data.itemsOnWay.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">From pending orders</p>
            </div>
            <div className="h-14 w-14 gradient-primary rounded-2xl flex items-center justify-center">
              <ShoppingCart className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="card-modern p-6 animate-slide-up" style={{animationDelay: '0.2s'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Export Value</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">${data.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">{data.totalExports} exports</p>
            </div>
            <div className="h-14 w-14 gradient-warning rounded-2xl flex items-center justify-center">
              <TrendingUp className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Export Value Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Export Value Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.exportsByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`$${value}`, 'Value']}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {data.categoryBreakdown.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-slate-600 capitalize">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Products by Quantity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={120}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="quantity" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
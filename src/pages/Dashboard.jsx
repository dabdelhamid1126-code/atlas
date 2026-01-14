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
  CheckSquare,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  ArrowRight,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    inventory: 0,
    pendingPO: 0,
    pendingExports: 0,
    pendingTasks: 0,
    giftCards: 0,
    damagedItems: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [inventory, purchaseOrders, exports, tasks, giftCards, damaged, activity] = await Promise.all([
        base44.entities.InventoryItem.filter({ status: 'in_stock' }),
        base44.entities.PurchaseOrder.filter({ status: 'pending' }),
        base44.entities.Export.filter({ status: 'pending' }),
        base44.entities.Task.filter({ status: 'pending' }),
        base44.entities.GiftCard.filter({ status: 'available' }),
        base44.entities.DamagedItem.filter({ status: 'reported' }),
        base44.entities.ActivityLog.list('-created_date', 5)
      ]);

      setStats({
        inventory: inventory.reduce((sum, item) => sum + (item.quantity || 0), 0),
        pendingPO: purchaseOrders.length,
        pendingExports: exports.length,
        pendingTasks: tasks.length,
        giftCards: giftCards.length,
        damagedItems: damaged.length
      });

      setRecentActivity(activity);
      setPendingTasks(tasks.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickLinks = [
    { name: 'Scan & Receive', page: 'ScanReceive', icon: Package, color: 'bg-black' },
    { name: 'Inventory Value', page: 'InventoryValue', icon: TrendingUp, color: 'bg-gray-700' },
    { name: 'New Invoice', page: 'Invoices', icon: FileText, color: 'bg-gray-600' },
    { name: 'View Tasks', page: 'Tasks', icon: CheckSquare, color: 'bg-gray-500' },
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
          title="Pending Tasks"
          value={stats.pendingTasks}
          icon={CheckSquare}
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
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link key={link.page} to={createPageUrl(link.page)}>
              <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer group">
                <div className={`h-10 w-10 rounded-lg ${link.color} flex items-center justify-center mb-3`}>
                  <link.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm font-medium text-slate-900 group-hover:text-black transition-colors">
                  {link.name}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              <Link to={createPageUrl('ActivityLog')}>
                <Button variant="ghost" size="sm" className="text-black hover:text-gray-700">
                  View all <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 truncate">{activity.action}</p>
                      <p className="text-xs text-slate-500">
                        {activity.user_name || activity.user_email} • {format(new Date(activity.created_date), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Pending Tasks</CardTitle>
              <Link to={createPageUrl('Tasks')}>
                <Button variant="ghost" size="sm" className="text-black hover:text-gray-700">
                  View all <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTasks.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No pending tasks</p>
              ) : (
                pendingTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-slate-500">Due: {format(new Date(task.due_date), 'MMM d')}</p>
                      )}
                    </div>
                    <StatusBadge status={task.priority} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
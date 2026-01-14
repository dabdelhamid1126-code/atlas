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
  TrendingUp
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    inventory: 0,
    pendingPO: 0,
    pendingExports: 0,
    giftCards: 0,
    damagedItems: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [inventory, purchaseOrders, exports, giftCards, damaged] = await Promise.all([
        base44.entities.InventoryItem.filter({ status: 'in_stock' }),
        base44.entities.PurchaseOrder.filter({ status: 'pending' }),
        base44.entities.Export.filter({ status: 'pending' }),
        base44.entities.GiftCard.filter({ status: 'available' }),
        base44.entities.DamagedItem.filter({ status: 'reported' })
      ]);

      setStats({
        inventory: inventory.reduce((sum, item) => sum + (item.quantity || 0), 0),
        pendingPO: purchaseOrders.length,
        pendingExports: exports.length,
        giftCards: giftCards.length,
        damagedItems: damaged.length
      });
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
    { name: 'Gift Cards', page: 'GiftCards', icon: CreditCard, color: 'bg-gray-500' },
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
    </div>
  );
}
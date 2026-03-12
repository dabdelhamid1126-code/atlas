import React, { useState, useEffect } from 'react';
import { initTheme } from '@/components/ThemeProvider';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  PackageCheck,
  CreditCard,
  TrendingUp,
  FileText,
  BarChart3,
  Search,
  HelpCircle,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Settings,
  ArrowLeftRight,
  PlusCircle,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


const navigationGroups = [
  {
    label: 'OVERVIEW',
    items: [
      { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
      { name: 'Analytics & Insights', page: 'Analytics', icon: BarChart3, roles: ['admin', 'manager'] },
    ]
  },
  {
    label: 'TRANSACTIONS',
    items: [
      { name: 'Transactions', page: 'Transactions', icon: ArrowLeftRight },
      { name: 'Add Transaction', page: 'AddTransaction', icon: PlusCircle },
      { name: 'Bulk Upload', page: 'BulkUpload', icon: Upload },
    ]
  },
  {
    label: 'ORDERS',
    items: [
      { name: 'Purchase Orders', page: 'PurchaseOrders', icon: PackageCheck },
      { name: 'Import from Email', page: 'EmailImport', icon: Search },
      { name: 'Order Lookup', page: 'OrderLookup', icon: HelpCircle },
    ]
  },
  {
    label: 'INVENTORY',
    items: [
      { name: 'Inventory', page: 'Inventory', icon: Package },
      { name: 'Products', page: 'Products', icon: ShoppingCart },
      { name: 'Inventory Value', page: 'InventoryValue', icon: TrendingUp },
    ]
  },
  {
    label: 'FINANCE',
    items: [
      { name: 'Gift Cards', page: 'GiftCards', icon: CreditCard },
      { name: 'Rewards & Cashback', page: 'Rewards', icon: TrendingUp },
      { name: 'Invoices', page: 'Invoices', icon: FileText },
    ]
  },
  {
    label: 'ACCOUNT',
    items: [
      { name: 'Settings', page: 'Settings', icon: Settings },
    ]
  },
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    initTheme();
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const userRole = user?.role || 'user';

  const filteredGroups = navigationGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !item.roles || item.roles.includes(userRole))
  })).filter(group => group.items.length > 0);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-white">Dalia Distro LLC</span>
        </div>
        {user && (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-black text-white text-xs">
              {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 border-r border-white/10 transition-transform duration-300 lg:translate-x-0 shadow-xl",
          "bg-[#0e0e1e]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">DD</span>
              </div>
              <div>
                <span className="font-bold text-white tracking-tight block text-sm">Dalia Distro LLC</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="px-3 space-y-4">
              {filteredGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-3 mb-1 text-xs font-semibold tracking-widest text-muted-foreground/60 uppercase">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = currentPageName === item.page;
                      return (
                        <Link
                          key={item.page}
                          to={createPageUrl(item.page)}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                            isActive
                              ? "bg-gradient-to-r from-purple-600 to-violet-700 text-white shadow-lg shadow-purple-900/40"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )}
                        >
                          <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-400")} />
                          {item.name}
                          {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </ScrollArea>

          {/* User Section */}
          {user && (
            <div className="border-t border-border p-4">
              <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-secondary">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-violet-700 text-white text-sm font-semibold">
                    {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user.full_name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-14 lg:pt-0">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
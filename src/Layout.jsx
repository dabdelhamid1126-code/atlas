import React, { useState, useEffect, useCallback } from 'react';
import CommandPalette from '@/components/CommandPalette';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BarChart3,
  Package,
  CirclePlus,
  Inbox,
  Truck,
  ArrowLeftRight,
  Hash,
  Receipt,
  Calculator,
  FileText,
  TrendingUp,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
  Search,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard',  page: 'Dashboard', icon: LayoutDashboard },
      { name: 'Analytics',  page: 'Analytics',  icon: BarChart3, roles: ['admin','manager'] },
      { name: 'Forecast',   page: 'Forecast',   icon: TrendingUp },
    ],
  },
  {
    label: 'Workflow',
    items: [
      { name: 'Inventory On Hand',  page: 'Inventory',    icon: Package },
      { name: 'Add Order',          page: 'NewOrders',    icon: CirclePlus },
      { name: 'Products',           page: 'Products',     icon: Inbox },
      { name: 'Import Orders',      page: 'ImportOrders', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { name: 'Deals Dashboard', page: 'Deals', icon: Zap },
    ],
  },
  {
    label: 'Records',
    items: [
      { name: 'Transactions',            page: 'Transactions',   icon: Hash },
      { name: 'Expenses',                page: 'PaymentMethods', icon: Receipt },
      { name: 'Business Tax Calculator', page: 'Analytics',      icon: Calculator },
      { name: 'Receipts',                page: 'Invoices',       icon: FileText },
    ],
  },
];

function LogoMark({ size = 36 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 55%, #ec4899 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.48} height={size * 0.48} viewBox="0 0 20 20" fill="none">
        <path d="M10 2L17 6V14L10 18L3 14V6L10 2Z" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.15)" />
        <path d="M10 6L14 8.5V13.5L10 16L6 13.5V8.5L10 6Z" fill="white" opacity="0.9" />
      </svg>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const [user, setUser]               = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed]     = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cmdOpen, setCmdOpen]         = useState(false);
  const location = useLocation();

  const openCmd = useCallback(() => setCmdOpen(true), []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const userRole     = user?.role || 'user';
  const filteredGroups = NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(i => !i.roles || i.roles.includes(userRole)) }))
    .filter(g => g.items.length > 0);

  const handleLogout = () => base44.auth.logout();

  const SidebarContent = () => (
    <div
      className="flex flex-col h-full"
      style={{ background: '#0d1117', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* ── Logo ── */}
      <div
        className={cn('flex items-center gap-3 px-4 py-4', collapsed && 'justify-center px-2')}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {collapsed ? (
          <button
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
          >
            <PanelLeftOpen className="w-[18px] h-[18px]" />
          </button>
        ) : (
          <>
            <LogoMark size={34} />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold text-emerald-400 tracking-tight leading-tight">Dalia Distro</p>
              <p className="text-[8.5px] text-slate-500 uppercase tracking-[0.14em] mt-0.5 font-semibold">Reselling, Quantified</p>
            </div>
            <button
              onClick={openCmd}
              title="Search (⌘K)"
              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-white/5 transition-colors"
            >
              <Search className="w-[16px] h-[16px]" />
            </button>
            <button
              className="hidden lg:flex p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-white/5 transition-colors"
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-[18px] h-[18px]" />
            </button>
            <button className="lg:hidden text-slate-500" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* ── Search hint ── */}
      {!collapsed && (
        <button
          onClick={openCmd}
          className="mx-3 mt-2 mb-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 hover:border-emerald-500/30 transition-colors text-slate-500 text-xs w-[calc(100%-24px)]"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-[10px] bg-white/10 border border-white/10 rounded px-1 py-0.5 font-medium text-slate-400">⌘K</kbd>
        </button>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 py-2 px-2.5 space-y-3 overflow-y-auto overflow-x-hidden">
        {filteredGroups.map(group => (
          <div key={group.label} className="space-y-0.5">
            {!collapsed && (
              <p className="px-2 pt-1 pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                {group.label}
              </p>
            )}
            {group.items.map(item => {
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={`${group.label}-${item.page}`}
                  to={createPageUrl(item.page)}
                  title={collapsed ? item.name : undefined}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 text-[13px] font-medium rounded-xl transition-all duration-150',
                    collapsed && 'justify-center',
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                  )}
                >
                  <item.icon
                    className={cn(
                      'flex-shrink-0',
                      isActive ? 'text-emerald-400' : 'text-slate-500'
                    )}
                    style={{ width: 16, height: 16 }}
                  />
                  {!collapsed && <span className="truncate flex-1">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>



      {/* ── User profile ── */}
      {user && (
        <div className="p-2.5">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/5 transition-colors',
                collapsed && 'justify-center px-1'
              )}
            >
              <div className="relative flex-shrink-0">
                <Avatar className="h-8 w-8">
                  {user.profile_picture_url && <AvatarImage src={user.profile_picture_url} />}
                  <AvatarFallback className="text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)' }}>
                    {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0d1117]" />
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[13px] font-semibold text-slate-200 truncate leading-tight">
                      {user.full_name || user.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-[11px] text-emerald-400 font-medium leading-tight">Online</p>
                  </div>
                  <ChevronDown className="flex-shrink-0 text-slate-400" style={{ width: 14, height: 14 }} />
                </>
              )}
            </button>

            {userMenuOpen && (
              <div
                className={cn('absolute overflow-hidden mb-1', collapsed ? 'left-full ml-2 bottom-0' : 'bottom-full left-0 right-0')}
                style={{
                  background: '#0d1117',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  minWidth: collapsed ? 160 : undefined,
                }}
              >
                <Link
                  to={createPageUrl('Settings')}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-emerald-400 transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <SettingsIcon style={{ width: 15, height: 15 }} />
                  Settings
                </Link>
                <button
                  onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut style={{ width: 15, height: 15 }} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: '#080c12' }}>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'lg:w-[72px]' : 'lg:w-[260px]',
          'w-[260px]'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main */}
      <main className={cn('flex-1 flex flex-col min-w-0', collapsed ? 'lg:ml-0' : 'lg:ml-0')}>
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.06)' }}>
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <LogoMark size={26} />
            <span className="font-bold text-emerald-400 text-sm">Dalia Distro</span>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
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
  ArrowLeftRight,
  Hash,
  Receipt,
  FileText,
  TrendingUp,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeftOpen,
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
    label: 'Records',
    items: [
      { name: 'Transactions',            page: 'Transactions',   icon: Hash },
      { name: 'Expenses',                page: 'PaymentMethods', icon: Receipt },
      { name: 'Business Tax Calculator', page: 'Analytics',      icon: BarChart3 },
      { name: 'Receipts',                page: 'Invoices',       icon: FileText },
    ],
  },
];

// ── Atlas Compass Logo ───────────────────────────────────────────────────────
function AtlasLogo({ size = 34 }) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.36;
  const arrowN = s * 0.08;
  const arrowE = s * 0.09;

  const hex = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }).map(p => p.join(',')).join(' ');

  return (
    <svg
      width={s} height={s} viewBox={`0 0 ${s} ${s}`}
      style={{ flexShrink: 0 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={s} height={s} rx={s * 0.24} fill="#0d1a12"/>
      <rect width={s} height={s} rx={s * 0.24} fill="none" stroke="#10b981" strokeWidth="0.8" opacity="0.3"/>
      <polygon points={hex} fill="none" stroke="#10b981" strokeWidth={s * 0.054}/>
      <line x1={cx} y1={cy - r + 2} x2={cx} y2={cy + r - 2} stroke="#10b981" strokeWidth={s * 0.03} strokeDasharray={`${s*0.1} ${s*0.1}`} opacity="0.45"/>
      <line x1={cx - r + 2} y1={cy} x2={cx + r - 2} y2={cy} stroke="#10b981" strokeWidth={s * 0.03} strokeDasharray={`${s*0.1} ${s*0.1}`} opacity="0.45"/>
      <polygon points={`${cx},${cy - r + s*0.04} ${cx - arrowN},${cy - r*0.42} ${cx + arrowN},${cy - r*0.42}`} fill="#10b981"/>
      <polygon points={`${cx},${cy + r - s*0.04} ${cx - arrowN},${cy + r*0.42} ${cx + arrowN},${cy + r*0.42}`} fill="#10b981" opacity="0.2"/>
      <polygon points={`${cx + r - s*0.04},${cy} ${cx + r*0.42},${cy - arrowE} ${cx + r*0.42},${cy + arrowE}`} fill="#06b6d4"/>
      <polygon points={`${cx - r + s*0.04},${cy} ${cx - r*0.42},${cy - arrowE} ${cx - r*0.42},${cy + arrowE}`} fill="#06b6d4" opacity="0.2"/>
      <circle cx={cx} cy={cy} r={s * 0.13} fill="#0d1a12" stroke="#10b981" strokeWidth={s * 0.04}/>
      <circle cx={cx} cy={cy} r={s * 0.055} fill="#10b981"/>
    </svg>
  );
}

export default function Layout({ children, currentPageName }) {
  const [user, setUser]                 = useState(null);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [collapsed, setCollapsed]       = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cmdOpen, setCmdOpen]           = useState(false);
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

  const userRole = user?.role || 'user';
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
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-white/5 transition-colors"
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
          >
            <PanelLeftOpen className="w-[18px] h-[18px]" />
          </button>
        ) : (
          <>
            <AtlasLogo size={34} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-emerald-400 tracking-tight leading-tight">Atlas</p>
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
          className="mx-3 mt-2 mb-1 flex items-center gap-2 px-3 py-2 rounded-xl text-slate-500 text-xs w-[calc(100%-24px)] transition-colors hover:border-emerald-500/30"
          style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-[10px] rounded px-1 py-0.5 font-medium text-slate-500"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}>
            ⌘K
          </kbd>
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
                    className={cn('flex-shrink-0', isActive ? 'text-emerald-400' : 'text-slate-500')}
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
                  <AvatarFallback className="text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)' }}>
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

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

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

      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b"
          style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.06)' }}>
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <AtlasLogo size={26} />
            <span className="font-bold text-emerald-400 text-sm">Atlas</span>
          </div>
        </div>

        <div className="flex-1 p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
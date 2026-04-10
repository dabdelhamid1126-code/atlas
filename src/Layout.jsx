import React, { useState, useEffect, useCallback } from 'react';
import CommandPalette from '@/components/CommandPalette';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, BarChart3, Package, CirclePlus,
  Inbox, ArrowLeftRight, Hash, Receipt, TrendingUp,
  Menu, X, LogOut, ChevronDown, Settings as SettingsIcon,
  PanelLeftClose, PanelLeftOpen, Search, FileText,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const NAV_GROUPS = [
  {
    label: 'Territory',
    items: [
      { name: 'Dashboard',  page: 'Dashboard',  icon: LayoutDashboard },
      { name: 'Analytics',  page: 'Analytics',  icon: BarChart3 },
      { name: 'Forecast',   page: 'Forecast',   icon: TrendingUp },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Inventory On Hand', page: 'Inventory',    icon: Package },
      { name: 'Add Order',         page: 'NewOrders',    icon: CirclePlus },
      { name: 'Products',          page: 'Products',     icon: Inbox },
      { name: 'Import Orders',     page: 'ImportOrders', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Ledger',
    items: [
      { name: 'Transactions', page: 'Transactions',   icon: Hash },
      { name: 'Invoices',     page: 'Invoices',       icon: FileText },
      { name: 'Expenses',     page: 'PaymentMethods', icon: Receipt },
    ],
  },
];

function AtlasLogo({ size = 36 }) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r  = s * 0.38;
  const arrowN = s * 0.09;
  const arrowE = s * 0.1;
  const hex = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }).map(p => p.join(',')).join(' ');

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ flexShrink: 0 }}>
      <rect width={s} height={s} rx={s * 0.25} fill="#1e1a14"/>
      <rect width={s} height={s} rx={s * 0.25} fill="none" stroke="#c9a84c" strokeWidth="0.8" opacity="0.5"/>
      <polygon points={hex} fill="none" stroke="#c9a84c" strokeWidth={s * 0.048}/>
      <line x1={cx} y1={cy - r + 2} x2={cx} y2={cy + r - 2} stroke="#c9a84c" strokeWidth={s * 0.028} strokeDasharray={`${s*0.1} ${s*0.1}`} opacity="0.4"/>
      <line x1={cx - r + 2} y1={cy} x2={cx + r - 2} y2={cy} stroke="#c9a84c" strokeWidth={s * 0.028} strokeDasharray={`${s*0.1} ${s*0.1}`} opacity="0.4"/>
      <polygon points={`${cx},${cy - r + s*0.04} ${cx - arrowN},${cy - r*0.42} ${cx + arrowN},${cy - r*0.42}`} fill="#c9a84c"/>
      <polygon points={`${cx},${cy + r - s*0.04} ${cx - arrowN},${cy + r*0.42} ${cx + arrowN},${cy + r*0.42}`} fill="#c9a84c" opacity="0.2"/>
      <polygon points={`${cx + r - s*0.04},${cy} ${cx + r*0.42},${cy - arrowE} ${cx + r*0.42},${cy + arrowE}`} fill="#f5e09a"/>
      <polygon points={`${cx - r + s*0.04},${cy} ${cx - r*0.42},${cy - arrowE} ${cx - r*0.42},${cy + arrowE}`} fill="#c9a84c" opacity="0.2"/>
      <circle cx={cx} cy={cy} r={s * 0.14} fill="#1e1a14" stroke="#c9a84c" strokeWidth={s * 0.038}/>
      <circle cx={cx} cy={cy} r={s * 0.06} fill="#c9a84c"/>
    </svg>
  );
}

// ── Sidebar color tokens ─────────────────────────────────────────────────────
const SIDEBAR_BG     = '#2a2218';
const SIDEBAR_BORDER = 'rgba(201,168,76,0.22)';
const SIDEBAR_GRID   = 'none';

const NAV_LABEL_COLOR  = '#7a6a4e';
const NAV_ITEM_COLOR   = '#c4a96a';
const NAV_ITEM_HOVER   = '#e0c878';
const NAV_ACTIVE_COLOR = '#f0d070';
const NAV_ICON_OPACITY = 0.65;

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
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleLogout = () => base44.auth.logout();

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: SIDEBAR_BG, backgroundImage: SIDEBAR_GRID, borderRight: `1px solid ${SIDEBAR_BORDER}` }}>
      {/* Logo */}
      <div
        className={cn('flex items-center gap-3 px-4 py-4 relative', collapsed && 'justify-center px-2')}
        style={{ borderBottom: `1px solid ${SIDEBAR_BORDER}` }}
      >
        {collapsed ? (
          <button className="hidden lg:flex p-1.5 rounded-lg transition-colors" style={{ color: NAV_ITEM_COLOR }}
            onClick={() => setCollapsed(false)} title="Expand sidebar">
            <PanelLeftOpen className="w-[18px] h-[18px]" />
          </button>
        ) : (
          <>
            <AtlasLogo size={36} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[17px] font-black leading-tight" style={{
                background: 'linear-gradient(135deg, #c9a84c, #f5e09a, #c9a84c)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>Atlas</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mt-0.5" style={{ color: '#8a7a5e' }}>Reselling, Quantified</p>
            </div>
            <button onClick={openCmd} title="Search (⌘K)" className="p-1.5 rounded-lg transition-colors" style={{ color: NAV_ITEM_COLOR }}>
              <Search className="w-[15px] h-[15px]" />
            </button>
            <button className="hidden lg:flex p-1.5 rounded-lg transition-colors" style={{ color: NAV_ITEM_COLOR }}
              onClick={() => setCollapsed(true)} title="Collapse sidebar">
              <PanelLeftClose className="w-[17px] h-[17px]" />
            </button>
            <button className="lg:hidden" style={{ color: NAV_ITEM_COLOR }} onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Search hint */}
      {!collapsed && (
        <button onClick={openCmd}
          className="mx-3 mt-2 mb-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs w-[calc(100%-24px)] transition-colors"
          style={{ border: '1px solid rgba(201,168,76,0.18)', background: 'rgba(201,168,76,0.06)', color: NAV_ITEM_COLOR }}>
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-left">Search the map...</span>
          <kbd className="text-[10px] rounded px-1 py-0.5 font-medium" style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.15)', color: NAV_LABEL_COLOR }}>⌘K</kbd>
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2.5 overflow-y-auto overflow-x-hidden space-y-3">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="space-y-0.5">
            {!collapsed && (
              <p className="px-2 pt-1 pb-1 font-display text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: NAV_LABEL_COLOR }}>
                {group.label}
              </p>
            )}
            {group.items.map(item => {
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  title={collapsed ? item.name : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '7px 10px',
                    borderRadius: 8, fontSize: 14, fontWeight: 500,
                    marginBottom: 1, cursor: 'pointer', textDecoration: 'none',
                    justifyContent: collapsed ? 'center' : undefined,
                    borderLeft: isActive ? '2px solid #c9a84c' : '2px solid transparent',
                    background: isActive ? 'linear-gradient(90deg, rgba(201,168,76,0.18), transparent)' : 'transparent',
                    color: isActive ? NAV_ACTIVE_COLOR : NAV_ITEM_COLOR,
                    transition: 'color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = NAV_ITEM_HOVER; e.currentTarget.style.background = 'rgba(201,168,76,0.07)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = NAV_ITEM_COLOR; e.currentTarget.style.background = 'transparent'; }}
                >
                  <item.icon style={{ width: 14, height: 14, flexShrink: 0, opacity: isActive ? 1 : NAV_ICON_OPACITY }} />
                  {!collapsed && <span className="truncate flex-1">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User profile */}
      {user && (
        <div className="p-2.5" style={{ borderTop: `1px solid rgba(201,168,76,0.18)` }}>
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={cn('w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors', collapsed && 'justify-center px-1')}
              style={{ border: '1px solid rgba(201,168,76,0.18)', background: 'rgba(201,168,76,0.07)', cursor: 'pointer' }}
            >
              <div className="relative flex-shrink-0">
                <Avatar className="h-8 w-8">
                  {user.profile_picture_url && <AvatarImage src={user.profile_picture_url} />}
                  <AvatarFallback className="text-xs font-black font-display" style={{ background: 'linear-gradient(135deg,#8b6914,#c9a84c)', color: '#0a0800' }}>
                    {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2" style={{ background: '#4a8c42', borderColor: SIDEBAR_BG }} />
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-display text-[14px] font-bold leading-tight truncate" style={{ color: '#c9a84c' }}>
                      {user.full_name || user.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-[11px] leading-tight" style={{ color: '#8a7a5e', letterSpacing: '0.04em' }}>● Charting</p>
                  </div>
                  <ChevronDown style={{ width: 13, height: 13, color: NAV_ITEM_COLOR, flexShrink: 0 }} />
                </>
              )}
            </button>

            {userMenuOpen && (
              <div
                className={cn('absolute overflow-hidden mb-1', collapsed ? 'left-full ml-2 bottom-0' : 'bottom-full left-0 right-0')}
                style={{ background: '#1a1712', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: collapsed ? 160 : undefined }}
              >
                <Link to={createPageUrl('Settings')} onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-sm transition-colors"
                  style={{ borderBottom: '1px solid rgba(201,168,76,0.12)', color: NAV_ITEM_COLOR, textDecoration: 'none' }}>
                  <SettingsIcon style={{ width: 14, height: 14 }} /> Settings
                </Link>
                <button onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors"
                  style={{ color: '#922b21', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <LogOut style={{ width: 14, height: 14 }} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--parch-bg)' }}>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — fixed height, never scrolls with page */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        collapsed ? 'lg:w-[72px]' : 'lg:w-[248px]',
        'w-[248px]',
        'h-screen flex-shrink-0'
      )}>
        <SidebarContent />
      </aside>

      {/* Main content — scrolls independently */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{ background: SIDEBAR_BG, borderColor: SIDEBAR_BORDER }}>
          <button onClick={() => setSidebarOpen(true)} style={{ color: NAV_ITEM_COLOR }}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <AtlasLogo size={26} />
            <span className="font-display font-black text-sm" style={{
              background: 'linear-gradient(135deg, #c9a84c, #f5e09a)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Atlas</span>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto" style={{
          background: 'var(--parch-bg)',
          backgroundImage: `
            radial-gradient(ellipse at 15% 40%, rgba(184,134,11,0.04) 0%, transparent 50%),
            radial-gradient(ellipse at 85% 70%, rgba(45,90,39,0.03) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 10%, rgba(26,82,118,0.03) 0%, transparent 40%)
          `,
          fontSize: '16px',
        }}>
          <div className="p-5 lg:p-7" style={{ maxWidth: 1320, margin: '0 auto', width: '100%' }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
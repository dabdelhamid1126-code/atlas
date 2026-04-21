import React, { useState, useEffect, useCallback } from 'react';
import CommandPalette from '@/components/CommandPalette';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, BarChart3, TrendingUp,
  Boxes, PlusCircle, Package, Download,
  ArrowLeftRight, FileText, Receipt, CreditCard,
  Settings as SettingsIcon, Star, User,
  Menu, X, LogOut, ChevronDown,
  PanelLeftClose, PanelLeftOpen, Search,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/* ────────────────────────────────────────────────────────────────── */
/*  NAV STRUCTURE                                                       */
/* ────────────────────────────────────────────────────────────────── */
const NAV_GROUPS = [
  {
    label: 'Home',
    items: [
      { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
      { name: 'Analytics', page: 'Analytics', icon: BarChart3       },
      { name: 'Forecast',  page: 'Forecast',  icon: TrendingUp      },
    ],
  },
  {
    label: 'Manage',
    items: [
      { name: 'Inventory',   page: 'Inventory',    icon: Boxes                        },
      { name: 'New Order',   page: 'NewOrders',    icon: PlusCircle, accent: true      },
      { name: 'Products',    page: 'Products',     icon: Package                      },
      { name: 'Import',      page: 'ImportOrders', icon: Download                     },
    ],
  },
  {
    label: 'Finance',
    items: [
      { name: 'Transactions',    page: 'Transactions',   icon: ArrowLeftRight },
      { name: 'Invoices',        page: 'Invoices',       icon: FileText       },
      { name: 'Payment Methods', page: 'PaymentMethods', icon: CreditCard     },
      { name: 'Expenses',        page: 'Expenses',        icon: Receipt        },
    ],
  },
];

/* ────────────────────────────────────────────────────────────────── */
/*  ATLAS LOGO SVG                                                      */
/* ────────────────────────────────────────────────────────────────── */
function AtlasLogo({ size = 82 }) {
  const s = size;
  const scale = s / 512;
  const p = (x, y) => `${x * scale},${y * scale}`;
  const cx = s / 2, cy = s / 2;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width={s} height={s} rx={s * 0.195} fill="#1e1a14"/>
      <rect width={s} height={s} rx={s * 0.195} fill="none" stroke="#C4922E" strokeWidth={s * 0.008} opacity="0.4"/>
      <polygon
        points={[p(256,60),p(420,155),p(420,345),p(256,440),p(92,345),p(92,155)].join(' ')}
        fill="none" stroke="#C4922E" strokeWidth={s * 0.023} opacity="0.9"
      />
      <polygon
        points={[p(256,110),p(375,175),p(375,305),p(256,370),p(137,305),p(137,175)].join(' ')}
        fill="none" stroke="#C4922E" strokeWidth={s * 0.008} opacity="0.3"
      />
      <line x1={p(256,80).split(',')[0]} y1={p(256,80).split(',')[1]} x2={p(256,432).split(',')[0]} y2={p(256,432).split(',')[1]}
        stroke="#C4922E" strokeWidth={s * 0.006} strokeDasharray={`${s*0.035} ${s*0.035}`} opacity="0.35"/>
      <line x1={p(80,256).split(',')[0]} y1={p(80,256).split(',')[1]} x2={p(432,256).split(',')[0]} y2={p(432,256).split(',')[1]}
        stroke="#C4922E" strokeWidth={s * 0.006} strokeDasharray={`${s*0.035} ${s*0.035}`} opacity="0.35"/>
      <line x1={p(112,112).split(',')[0]} y1={p(112,112).split(',')[1]} x2={p(400,400).split(',')[0]} y2={p(400,400).split(',')[1]}
        stroke="#C4922E" strokeWidth={s * 0.004} strokeDasharray={`${s*0.023} ${s*0.035}`} opacity="0.18"/>
      <line x1={p(400,112).split(',')[0]} y1={p(400,112).split(',')[1]} x2={p(112,400).split(',')[0]} y2={p(112,400).split(',')[1]}
        stroke="#C4922E" strokeWidth={s * 0.004} strokeDasharray={`${s*0.023} ${s*0.035}`} opacity="0.18"/>
      <polygon points={[p(256,82),p(238,168),p(256,152),p(274,168)].join(' ')} fill="#C4922E"/>
      <polygon points={[p(256,430),p(238,344),p(256,360),p(274,344)].join(' ')} fill="#C4922E" opacity="0.25"/>
      <polygon points={[p(430,256),p(344,238),p(360,256),p(344,274)].join(' ')} fill="#f5e09a"/>
      <polygon points={[p(82,256),p(168,238),p(152,256),p(168,274)].join(' ')} fill="#C4922E" opacity="0.25"/>
      <circle cx={cx} cy={cy} r={s * 0.1015} fill="#1e1a14" stroke="#C4922E" strokeWidth={s * 0.0195}/>
      <circle cx={cx} cy={cy} r={s * 0.043} fill="#C4922E"/>
      <circle cx={cx} cy={cy} r={s * 0.0195} fill="#f5e09a"/>
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/*  LAYOUT                                                              */
/* ────────────────────────────────────────────────────────────────── */
export default function Layout({ children, currentPageName }) {
  const [user,         setUser]         = useState(null);
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [collapsed,    setCollapsed]    = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cmdOpen,      setCmdOpen]      = useState(false);
  const location = useLocation();

  const openCmd = useCallback(() => setCmdOpen(true), []);

  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleLogout = () => base44.auth.logout();

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: 'var(--sidebar-bg)', borderRight: `1px solid var(--sidebar-border)` }}>

      {/*    Logo    */}
      <div
        className={cn('flex items-center gap-3 px-4 py-4', collapsed && 'justify-center px-2')}
        style={{ borderBottom: `1px solid var(--sidebar-border)` }}
      >
        {collapsed ? (
          <button
            className="hidden lg:flex p-1.5 rounded-lg"
            style={{ color: 'var(--sidebar-text)' }}
            onClick={() => setCollapsed(false)}
            title="Expand"
          >
            <PanelLeftOpen className="w-[18px] h-[18px]" />
          </button>
        ) : (
          <>
            <AtlasLogo size={36} />
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-black leading-tight" style={{
                fontFamily: 'var(--font-serif)',
                background: 'linear-gradient(135deg,#c9a84c,#f5e09a,#c9a84c)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Atlas</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mt-0.5" style={{ color: 'var(--sidebar-label)' }}>
                Reselling, Quantified
              </p>
            </div>
            <button onClick={openCmd} title="Search (Cmd+K)" className="p-1.5 rounded-lg" style={{ color: 'var(--sidebar-text)' }}>
              <Search className="w-[15px] h-[15px]" />
            </button>
            <button className="hidden lg:flex p-1.5 rounded-lg" style={{ color: 'var(--sidebar-text)' }} onClick={() => setCollapsed(true)} title="Collapse">
              <PanelLeftClose className="w-[17px] h-[17px]" />
            </button>
            <button className="lg:hidden" style={{ color: 'var(--sidebar-text)' }} onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/*    Search bar    */}
      {!collapsed && (
        <button
          onClick={openCmd}
          className="mx-3 mt-2 mb-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs w-[calc(100%-24px)]"
          style={{ 
            border: 'rgba(201,168,76,0.18) 1px solid',
            background: 'rgba(201,168,76,0.06)',
            color: 'var(--sidebar-text)' 
          }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-left">Search the map...</span>
          <kbd className="text-[10px] rounded px-1 py-0.5" style={{
            background: 'rgba(201,168,76,0.12)',
            border: '1px solid rgba(201,168,76,0.15)',
            color: 'var(--sidebar-label)',
          }}>Cmd+K</kbd>
        </button>
      )}

      {/*    Nav    */}
      <nav className="flex-1 py-2 px-2.5 overflow-y-auto overflow-x-hidden">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && !collapsed && (
              <div style={{ height: 1, background: 'rgba(201,168,76,0.1)', margin: '4px 8px 2px' }} />
            )}
            <div style={{ paddingBottom: 2 }}>
              {!collapsed && (
                <p
                  className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: 'var(--sidebar-label)' }}
                >
                  {group.label}
                </p>
              )}
              {group.items.map(item => {
                const active  = currentPageName === item.page;
                const isAccent = item.accent && !active;

                const itemColor  = active ? 'var(--sidebar-active)' : 'var(--sidebar-text)';
                const itemBg     = active
                  ? 'linear-gradient(90deg,rgba(201,168,76,0.18),transparent)'
                  : 'transparent';
                const itemBorder = active
                  ? '2px solid #c9a84c'
                  : '2px solid transparent';

                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    title={collapsed ? item.name : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '7px 10px',
                      borderRadius: 8,
                      fontSize: 13.5,
                      fontWeight: active ? 600 : 500,
                      marginBottom: 1,
                      cursor: 'pointer',
                      textDecoration: 'none',
                      justifyContent: collapsed ? 'center' : undefined,
                      borderLeft: itemBorder,
                      background: itemBg,
                      color: itemColor,
                      transition: 'color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.color = isAccent ? 'var(--sidebar-accent-hover)' : 'var(--sidebar-hover)';
                        e.currentTarget.style.background = 'rgba(201,168,76,0.07)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.color = itemColor;
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <item.icon style={{ width: 14, height: 14, flexShrink: 0, opacity: active ? 1 : 'var(--sidebar-icon-opacity)' }} />
                    {!collapsed && (
                      <span className="truncate flex-1">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/*    User strip    */}
      {user && (
        <div className="p-2.5" style={{ borderTop: '1px solid rgba(201,168,76,0.18)' }}>
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={cn('w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl', collapsed && 'justify-center px-1')}
              style={{ 
                border: '1px solid rgba(201,168,76,0.18)',
                background: 'rgba(201,168,76,0.07)',
                cursor: 'pointer' 
              }}
            >
              <div className="relative flex-shrink-0">
                <Avatar className="h-8 w-8">
                  {user.profile_picture_url && <AvatarImage src={user.profile_picture_url} />}
                  <AvatarFallback className="text-xs font-black" style={{ background: 'linear-gradient(135deg,#8b6914,#c9a84c)', color: '#0a0800' }}>
                    {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                  style={{ background: '#4a7a35', borderColor: 'var(--sidebar-bg)' }} />
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[13px] font-bold leading-tight truncate" style={{ color: 'var(--sidebar-accent)' }}>
                      {user.full_name || user.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--sidebar-label)', letterSpacing: '0.04em' }}>
                      Charting
                    </p>
                  </div>
                  <ChevronDown style={{ width: 13, height: 13, color: 'var(--sidebar-text)', flexShrink: 0 }} />
                </>
              )}
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div
                className={cn(
                  'absolute overflow-hidden mb-1',
                  collapsed ? 'left-full ml-2 bottom-0' : 'bottom-full left-0 right-0'
                )}
                style={{
                  background: '#1a1712',
                  border: '1px solid rgba(201,168,76,0.2)',
                  borderRadius: 12,
                  boxShadow: 'var(--shadow-lg)',
                  minWidth: collapsed ? 160 : undefined,
                  zIndex: 50,
                }}
              >
                <Link
                  to={createPageUrl('Settings')}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-sm"
                  style={{ borderBottom: '1px solid rgba(201,168,76,0.12)', color: 'var(--sidebar-text)', textDecoration: 'none' }}
                >
                  <SettingsIcon style={{ width: 14, height: 14 }} /> Settings
                </Link>
                <Link
                  to={createPageUrl('Profile')}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-sm"
                  style={{ borderBottom: '1px solid rgba(201,168,76,0.12)', color: 'var(--sidebar-text)', textDecoration: 'none' }}
                >
                  <User style={{ width: 14, height: 14 }} /> Profile
                </Link>
                <button
                  onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm"
                  style={{ color: 'var(--crimson)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
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

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out',
        'lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        collapsed ? 'lg:w-[72px]' : 'lg:w-[248px]',
        'w-[248px] h-screen flex-shrink-0',
      )}>
        <SidebarContent />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* Mobile topbar */}
        <div
          className="lg:hidden flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}
        >
          <button onClick={() => setSidebarOpen(true)} style={{ color: 'var(--sidebar-text)' }}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <AtlasLogo size={26} />
            <span className="text-sm font-black" style={{
              fontFamily: 'var(--font-serif)',
              background: 'linear-gradient(135deg,#c9a84c,#f5e09a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Atlas</span>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto" style={{
          background: 'var(--parch-bg)',
          backgroundImage: `
            radial-gradient(ellipse at 15% 40%, rgba(160,114,42,0.04) 0%, transparent 50%),
            radial-gradient(ellipse at 85% 70%, rgba(74,122,53,0.03) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 10%, rgba(42,92,122,0.03) 0%, transparent 40%)
          `,
        }}>
          <div className="p-5 lg:p-7" style={{ maxWidth: 1320, margin: '0 auto', width: '100%' }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
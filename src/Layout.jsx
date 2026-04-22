import React, { useState, useEffect, useCallback } from 'react';
import CommandPalette from '@/components/CommandPalette';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, BarChart3, TrendingUp,
  Boxes, PlusCircle, Package, Download,
  ArrowLeftRight, FileText, Receipt,
  Settings as SettingsIcon, CreditCard,
  Menu, LogOut, ChevronDown,
  PanelLeftClose, PanelLeftOpen, Search,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/* ── Nav config ──────────────────────────────────────────────────── */
const NAV_GROUPS = [
  {
    label: 'Home',
    items: [
      { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
      { name: 'Analytics', page: 'Analytics', icon: BarChart3 },
      { name: 'Forecast',  page: 'Forecast',  icon: TrendingUp },
    ],
  },
  {
    label: 'Manage',
    items: [
      { name: 'Inventory', page: 'Inventory',    icon: Boxes },
      { name: 'New Order', page: 'NewOrders',    icon: PlusCircle },
      { name: 'Products',  page: 'Products',     icon: Package },
      { name: 'Import',    page: 'ImportOrders', icon: Download },
    ],
  },
  {
    label: 'Finance',
    items: [
      { name: 'Transactions', page: 'Transactions', icon: ArrowLeftRight },
      { name: 'Invoices',     page: 'Invoices',     icon: FileText },
      { name: 'Expenses',     page: 'Expenses',     icon: Receipt },
    ],
  },
];

/* ── Atlas Logo ──────────────────────────────────────────────────── */
function AtlasLogo({ size = 36 }) {
  const s = size;
  const scale = s / 512;
  const p = (x, y) => `${x * scale},${y * scale}`;
  const cx = s / 2, cy = s / 2;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width={s} height={s} rx={s * 0.195} fill="#1e1a14"/>
      <rect width={s} height={s} rx={s * 0.195} fill="none" stroke="#C4922E" strokeWidth={s * 0.008} opacity="0.4"/>
      <polygon points={[p(256,60),p(420,155),p(420,345),p(256,440),p(92,345),p(92,155)].join(' ')} fill="none" stroke="#C4922E" strokeWidth={s * 0.023} opacity="0.9"/>
      <polygon points={[p(256,110),p(375,175),p(375,305),p(256,370),p(137,305),p(137,175)].join(' ')} fill="none" stroke="#C4922E" strokeWidth={s * 0.008} opacity="0.3"/>
      <line x1={p(256,80).split(',')[0]} y1={p(256,80).split(',')[1]} x2={p(256,432).split(',')[0]} y2={p(256,432).split(',')[1]} stroke="#C4922E" strokeWidth={s * 0.006} strokeDasharray={`${s*0.035} ${s*0.035}`} opacity="0.35"/>
      <line x1={p(80,256).split(',')[0]} y1={p(80,256).split(',')[1]} x2={p(432,256).split(',')[0]} y2={p(432,256).split(',')[1]} stroke="#C4922E" strokeWidth={s * 0.006} strokeDasharray={`${s*0.035} ${s*0.035}`} opacity="0.35"/>
      <line x1={p(112,112).split(',')[0]} y1={p(112,112).split(',')[1]} x2={p(400,400).split(',')[0]} y2={p(400,400).split(',')[1]} stroke="#C4922E" strokeWidth={s * 0.004} strokeDasharray={`${s*0.023} ${s*0.035}`} opacity="0.18"/>
      <line x1={p(400,112).split(',')[0]} y1={p(400,112).split(',')[1]} x2={p(112,400).split(',')[0]} y2={p(112,400).split(',')[1]} stroke="#C4922E" strokeWidth={s * 0.004} strokeDasharray={`${s*0.023} ${s*0.035}`} opacity="0.18"/>
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

/* ── Layout ──────────────────────────────────────────────────────── */
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

  const isActive = (page) => currentPageName === page;

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '12px 6px' : '12px 14px', justifyContent: collapsed ? 'center' : 'space-between', borderBottom: '1px solid var(--sidebar-border)' }}>
        {collapsed ? (
          <button onClick={() => setCollapsed(false)} title="Expand" style={{ background: 'none', border: 'none', color: 'var(--sidebar-text)', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <PanelLeftOpen style={{ width: 18, height: 18 }} />
          </button>
        ) : (
          <>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <AtlasLogo size={30} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 900, margin: 0, lineHeight: 1, fontFamily: 'var(--font-serif)', background: 'linear-gradient(135deg,#c9a84c,#f5e09a,#c9a84c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Atlas</p>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sidebar-label)', margin: '2px 0 0' }}>Reselling, Quantified</p>
              </div>
            </Link>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={openCmd} title="Search (Cmd+K)" style={{ background: 'none', border: 'none', color: 'var(--sidebar-text)', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <Search style={{ width: 15, height: 15 }} />
              </button>
              <button onClick={() => setCollapsed(true)} title="Collapse" style={{ background: 'none', border: 'none', color: 'var(--sidebar-text)', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <PanelLeftClose style={{ width: 17, height: 17 }} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Search shortcut bar */}
      {!collapsed && (
        <button onClick={openCmd} style={{ margin: '8px 8px 2px', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 10, border: '1px solid rgba(201,168,76,0.18)', background: 'rgba(201,168,76,0.06)', color: 'var(--sidebar-text)', cursor: 'pointer', fontSize: 12 }}>
          <Search style={{ width: 13, height: 13, flexShrink: 0 }} />
          <span style={{ flex: 1, textAlign: 'left' }}>Search the map...</span>
          <kbd style={{ fontSize: 10, borderRadius: 4, padding: '1px 5px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.15)', color: 'var(--sidebar-label)' }}>Cmd+K</kbd>
        </button>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && !collapsed && <div style={{ height: 1, background: 'rgba(201,168,76,0.1)', margin: '4px 8px 2px' }} />}
            <div style={{ paddingBottom: 2 }}>
              {!collapsed && (
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--sidebar-label)', padding: '6px 8px 3px', margin: 0 }}>
                  {group.label}
                </p>
              )}
              {group.items.map(item => {
                const active = isActive(item.page);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    title={collapsed ? item.name : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '6px 8px', borderRadius: 7,
                      fontSize: 12.5, fontWeight: active ? 600 : 500,
                      marginBottom: 1, cursor: 'pointer', textDecoration: 'none',
                      justifyContent: collapsed ? 'center' : undefined,
                      borderLeft: active ? '2px solid #c9a84c' : '2px solid transparent',
                      background: active ? 'linear-gradient(90deg,rgba(201,168,76,0.18),transparent)' : 'transparent',
                      color: active ? 'var(--sidebar-active)' : 'var(--sidebar-text)',
                      transition: 'color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.color = 'var(--sidebar-hover)'; e.currentTarget.style.background = 'rgba(201,168,76,0.07)'; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.color = 'var(--sidebar-text)'; e.currentTarget.style.background = 'transparent'; } }}
                  >
                    <Icon style={{ width: 14, height: 14, flexShrink: 0, opacity: active ? 1 : 0.65 }} />
                    {!collapsed && <span style={{ flex: 1 }}>{item.name}</span>}
                    {item.accent && !collapsed && (
                      <span style={{ fontSize: 9, background: 'var(--gold)', color: 'var(--ne-cream)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>NEW</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User strip */}
      {user && (
        <div style={{ padding: '8px', borderTop: '1px solid rgba(201,168,76,0.18)', position: 'relative' }}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '8px 4px' : '8px 10px', borderRadius: 10, border: '1px solid rgba(201,168,76,0.18)', background: 'rgba(201,168,76,0.07)', cursor: 'pointer', justifyContent: collapsed ? 'center' : undefined }}
          >
            <Avatar style={{ width: 32, height: 32, flexShrink: 0 }}>
              {user.profile_picture_url && <AvatarImage src={user.profile_picture_url} />}
              <AvatarFallback style={{ fontSize: 12, fontWeight: 800, background: 'linear-gradient(135deg,#8b6914,#c9a84c)', color: '#0a0800' }}>
                {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--sidebar-accent)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.full_name || user.email?.split('@')[0] || 'User'}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--sidebar-label)', margin: 0 }}>Charting</p>
                </div>
                <ChevronDown style={{ width: 13, height: 13, color: 'var(--sidebar-text)', flexShrink: 0 }} />
              </>
            )}
          </button>

          {userMenuOpen && (
            <div style={{ position: 'absolute', bottom: '100%', left: 8, right: 8, marginBottom: 4, background: '#1a1712', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', zIndex: 50 }}>
              {[
                { to: '/Settings',       icon: SettingsIcon, label: 'Settings'        },
                { to: '/PaymentMethods', icon: CreditCard,   label: 'Payment Methods' },
              ].map(({ to, icon: Icon, label }) => (
                <Link key={to} to={to} onClick={() => setUserMenuOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 13, color: 'var(--sidebar-text)', textDecoration: 'none', borderBottom: '1px solid rgba(201,168,76,0.12)' }}>
                  <Icon style={{ width: 13, height: 13 }} /> {label}
                </Link>
              ))}
              <button onClick={() => { setUserMenuOpen(false); base44.auth.logout(); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 13, color: 'var(--crimson)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <LogOut style={{ width: 13, height: 13 }} /> Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--parch-bg)' }}>
      <style>{`
        @media (max-width: 1023px) {
          .layout-sidebar { transform: translateX(-100%) !important; position: fixed !important; z-index: 50; }
          .layout-sidebar.open { transform: translateX(0) !important; }
          .layout-main { margin-left: 0 !important; width: 100% !important; }
          .layout-topbar-mobile { display: flex !important; }
          .page-content-wrap { padding: 14px !important; }
        }
        @media (min-width: 1024px) {
          .layout-sidebar { transform: translateX(0) !important; position: fixed !important; }
          .layout-topbar-mobile { display: none !important; }
        }
      `}</style>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.35)' }} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`layout-sidebar${sidebarOpen ? ' open' : ''}`}
        style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, width: collapsed ? 56 : 200, transition: 'width 0.3s ease, transform 0.3s ease', flexShrink: 0 }}>
        <SidebarContent />
      </aside>

      {/* Main content — offset by sidebar width */}
      <main className="layout-main"
        style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', width: `calc(100% - ${collapsed ? 56 : 200}px)`, marginLeft: collapsed ? 56 : 200, transition: 'width 0.3s ease, margin-left 0.3s ease' }}>

        {/* Mobile topbar */}
        <div className="layout-topbar-mobile"
          style={{ alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--sidebar-border)', flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--sidebar-text)', cursor: 'pointer' }}>
            <Menu style={{ width: 20, height: 20 }} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AtlasLogo size={26} />
            <span style={{ fontSize: 14, fontWeight: 900, fontFamily: 'var(--font-serif)', background: 'linear-gradient(135deg,#c9a84c,#f5e09a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Atlas</span>
          </div>
        </div>

        {/* Page content — centered with max width */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--parch-bg)', width: '100%' }}>
          <div className="page-content-wrap" style={{ padding: '20px 24px 32px', width: '100%', maxWidth: 1440, margin: '0 auto', boxSizing: 'border-box' }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
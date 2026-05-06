import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Menu, X } from 'lucide-react';

const AtlasLogo = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="256,60 420,155 420,345 256,440 92,345 92,155" fill="none" stroke="#C4922E" strokeWidth="12" opacity="0.9"/>
    <polygon points="256,110 375,175 375,305 256,370 137,305 137,175" fill="none" stroke="#C4922E" strokeWidth="4" opacity="0.3"/>
    <line x1="256" y1="80" x2="256" y2="432" stroke="#C4922E" strokeWidth="3" strokeDasharray="18 18" opacity="0.35"/>
    <line x1="80" y1="256" x2="432" y2="256" stroke="#C4922E" strokeWidth="3" strokeDasharray="18 18" opacity="0.35"/>
    <polygon points="256,82 238,168 256,152 274,168" fill="#C4922E"/>
    <polygon points="256,430 238,344 256,360 274,344" fill="#C4922E" opacity="0.25"/>
    <polygon points="430,256 344,238 360,256 344,274" fill="#f5e09a"/>
    <polygon points="82,256 168,238 152,256 168,274" fill="#C4922E" opacity="0.25"/>
    <circle cx="256" cy="256" r="52" fill="#1e1a14" stroke="#C4922E" strokeWidth="10"/>
    <circle cx="256" cy="256" r="22" fill="#C4922E"/>
    <circle cx="256" cy="256" r="10" fill="#f5e09a"/>
  </svg>
);

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Inventory', path: '/inventory', icon: '📦' },
    { label: 'Transactions', path: '/transactions', icon: '💳' },
    { label: 'Analytics', path: '/analytics', icon: '📈' },
    { label: 'Rewards', path: '/rewards', icon: '⭐' },
    { label: 'Gift Cards', path: '/gift-cards', icon: '🎁' },
    { label: 'Forecast', path: '/forecast', icon: '🔮' },
    { label: 'Invoices', path: '/invoices', icon: '📄' },
    { label: 'Import Orders', path: '/import-orders', icon: '📨' },
    { label: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0d0b08', color: '#f0ece4' }}>
      {/* Sidebar */}
      <aside style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: sidebarOpen ? '240px' : '60px',
        background: '#1a1610',
        borderRight: '1px solid #C4922E22',
        transition: 'width 0.3s ease',
        zIndex: 40,
        overflowY: 'auto',
        padding: '20px 0',
      }}>
        <div style={{ padding: sidebarOpen ? '0 16px' : '0 12px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AtlasLogo size={36}/>
            {sidebarOpen && (
              <span style={{ fontFamily: "'Marcellus', serif", fontSize: 16, fontWeight: 400, letterSpacing: '0.05em', color: '#f5e09a' }}>
                ATLAS
              </span>
            )}
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => (
            <a
              key={item.path}
              href={item.path}
              style={{
                padding: sidebarOpen ? '12px 16px' : '12px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: '#7a7060',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 500,
                transition: 'all 0.2s',
                borderLeft: '2px solid transparent',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#C4922E';
                e.currentTarget.style.background = '#C4922E11';
                e.currentTarget.style.borderLeftColor = '#C4922E';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#7a7060';
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderLeftColor = 'transparent';
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </a>
          ))}
        </nav>

        {/* Logout button */}
        <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, padding: sidebarOpen ? '0 16px' : '0 12px' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              background: '#C4922E1a',
              border: '1px solid #C4922E44',
              borderRadius: 6,
              color: '#C4922E',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#C4922E22';
              e.currentTarget.style.borderColor = '#C4922E88';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#C4922E1a';
              e.currentTarget.style.borderColor = '#C4922E44';
            }}
          >
            {sidebarOpen ? 'Log Out' : '←'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{
        marginLeft: sidebarOpen ? '240px' : '60px',
        flex: 1,
        transition: 'margin-left 0.3s ease',
      }}>
        {/* Top bar */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: '#0d0b08',
          borderBottom: '1px solid #C4922E22',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: '#C4922E',
              cursor: 'pointer',
              fontSize: 20,
            }}
          >
            {sidebarOpen ? '←' : '→'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#C4922E22',
                  border: '1px solid #C4922E44',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                }}>
                  {user.email?.[0]?.toUpperCase() || '👤'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{user.email?.split('@')[0]}</div>
                  <div style={{ fontSize: 11, color: '#4a4238' }}>{user.email}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
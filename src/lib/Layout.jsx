import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{
        width: '240px',
        backgroundColor: 'var(--color-background-secondary)',
        borderRight: '1px solid var(--color-border-tertiary)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <h2 style={{ margin: '0 0 32px 0' }}>Atlas</h2>
        
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <NavLink href="/Dashboard">Dashboard</NavLink>
          <NavLink href="/Inventory">Inventory</NavLink>
          <NavLink href="/Forecast">Forecast</NavLink>
          <NavLink href="/Transactions">Transactions</NavLink>
          <NavLink href="/Analytics">Analytics</NavLink>
          <NavLink href="/Rewards">Rewards</NavLink>
          <NavLink href="/Invoices">Invoices</NavLink>
          <NavLink href="/ImportOrders">Import Orders</NavLink>
        </nav>

        <div style={{ borderTop: '1px solid var(--color-border-tertiary)', paddingTop: '16px' }}>
          <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            {user?.email || 'User'}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: 'var(--color-text-danger)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'center',
              fontSize: '14px',
            }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-background-primary)',
      }}>
        <main style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({ href, children }) {
  const isActive = typeof window !== 'undefined' && window.location.pathname === href;
  
  return (
    <a
      href={href}
      style={{
        padding: '10px 12px',
        color: 'var(--color-text-primary)',
        textDecoration: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        backgroundColor: isActive ? 'var(--color-background-tertiary)' : 'transparent',
      }}
    >
      {children}
    </a>
  );
}

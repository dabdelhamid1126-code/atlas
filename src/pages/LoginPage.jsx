import { useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';

export default function LoginPage() {
  const { login, user } = useAuth();

  useEffect(() => {
    if (user) {
      window.location.href = '/Dashboard';
    }
  }, [user]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-background-primary)',
    }}>
      <div style={{
        padding: '40px',
        borderRadius: '12px',
        border: '1px solid var(--color-border-tertiary)',
        maxWidth: '400px',
        width: '100%',
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '32px' }}>Login to Atlas</h1>
        <button
          onClick={login}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: 'var(--color-text-info)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          Login with Base44
        </button>
      </div>
    </div>
  );
}

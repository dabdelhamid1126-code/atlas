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
      backgroundColor: 'var(--parch-bg)',
      padding: '20px',
    }}>
      <div style={{
        padding: '40px',
        borderRadius: '12px',
        border: `1px solid var(--color-border-tertiary)`,
        backgroundColor: 'var(--parch-card)',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '32px',
          color: 'var(--color-text-primary)',
          fontSize: '24px',
        }}>
          Login to Atlas
        </h1>
        
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
            fontWeight: '500',
            marginBottom: '12px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.opacity = '0.9'}
          onMouseLeave={(e) => e.target.style.opacity = '1'}
        >
          Login with Base44
        </button>

        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
          marginTop: '16px',
        }}>
          Secure login powered by Base44 OAuth
        </p>
      </div>
    </div>
  );
}
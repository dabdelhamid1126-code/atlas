import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate('/Dashboard');
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--parch-bg)',
      padding: '20px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '600px' }}>
        <h1 style={{ 
          fontSize: '48px', 
          marginBottom: '16px',
          color: 'var(--color-text-primary)',
          fontWeight: '600',
        }}>
          Atlas
        </h1>
        <p style={{ 
          fontSize: '18px', 
          color: 'var(--color-text-secondary)', 
          marginBottom: '32px',
          lineHeight: '1.6',
        }}>
          Reselling Management Dashboard
        </p>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '12px 32px',
            backgroundColor: 'var(--color-text-info)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.opacity = '0.9'}
          onMouseLeave={(e) => e.target.style.opacity = '1'}
        >
          Login
        </button>
      </div>
    </div>
  );
}
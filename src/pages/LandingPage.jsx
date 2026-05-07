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
      backgroundColor: 'var(--color-background-primary)',
      padding: '20px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>Atlas</h1>
        <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
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
          }}
        >
          Login
        </button>
      </div>
    </div>
  );
}

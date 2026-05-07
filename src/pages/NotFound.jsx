import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-background-primary)',
      flexDirection: 'column',
      gap: '24px',
    }}>
      <h1 style={{ fontSize: '48px' }}>404</h1>
      <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)' }}>
        Page not found
      </p>
      <button
        onClick={() => navigate('/Dashboard')}
        style={{
          padding: '10px 16px',
          backgroundColor: 'var(--color-text-info)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}

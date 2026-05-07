import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--parch-bg)',
      flexDirection: 'column',
      gap: '24px',
      padding: '20px',
    }}>
      <h1 style={{
        fontSize: '64px',
        margin: '0',
        color: 'var(--color-text-danger)',
        fontWeight: '600',
      }}>
        404
      </h1>
      
      <p style={{
        fontSize: '18px',
        color: 'var(--color-text-secondary)',
        margin: '0',
        textAlign: 'center',
      }}>
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
          fontSize: '16px',
          fontWeight: '500',
          marginTop: '16px',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => e.target.style.opacity = '0.9'}
        onMouseLeave={(e) => e.target.style.opacity = '1'}
      >
        Back to Dashboard
      </button>
    </div>
  );
}
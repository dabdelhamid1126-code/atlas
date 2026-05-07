import { useAuth } from '../lib/AuthContext';

export default function Settings() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: '24px' }}>
      <h1>Settings</h1>
      <div style={{ marginBottom: '24px' }}>
        <p><strong>Email:</strong> {user?.email}</p>
      </div>
      <button
        onClick={logout}
        style={{
          padding: '10px 16px',
          backgroundColor: 'var(--color-text-danger)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        Logout
      </button>
    </div>
  );
}

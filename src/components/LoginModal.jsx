import React from 'react';
import { useAuth } from '@/lib/AuthContext';

export default function LoginModal({ isOpen, onClose }) {
  const { navigateToLogin } = useAuth();

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0e0b06', border: '1px solid rgba(196,146,46,0.35)',
          borderRadius: 18, padding: '40px 36px', width: '100%', maxWidth: 400,
          textAlign: 'center', position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 16, background: 'none',
            border: 'none', color: '#7a7060', fontSize: 22, cursor: 'pointer', lineHeight: 1,
          }}
        >×</button>

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: '#C4922E', textTransform: 'uppercase', marginBottom: 12 }}>
            Welcome Back
          </p>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 32, fontWeight: 600, color: '#f0ece4', marginBottom: 8 }}>
            Sign In to Atlas
          </h2>
          <p style={{ fontSize: 13, color: '#7a7060', fontWeight: 300, lineHeight: 1.6 }}>
            Access your reselling dashboard and continue where you left off.
          </p>
        </div>

        <button
          onClick={() => navigateToLogin()}
          style={{
            width: '100%', padding: '13px', borderRadius: 10, fontSize: 14,
            fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            background: '#C4922E', color: '#080706', border: 'none',
            transition: 'all 0.2s', marginBottom: 12,
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#d9a43a'}
          onMouseLeave={e => e.currentTarget.style.background = '#C4922E'}
        >
          Continue to Login →
        </button>

        <p style={{ fontSize: 11, color: '#3a342c', fontWeight: 300 }}>
          Don't have an account?{' '}
          <span
            onClick={() => navigateToLogin()}
            style={{ color: '#C4922E', cursor: 'pointer', fontWeight: 500 }}
          >
            Join the Beta
          </span>
        </p>
      </div>
    </div>
  );
}
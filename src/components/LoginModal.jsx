import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

const AtlasLogo = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="100" fill="#1e1a14"/>
    <rect width="512" height="512" rx="100" fill="none" stroke="#C4922E" stroke-width="4" opacity="0.3"/>
    <polygon points="256,60 420,155 420,345 256,440 92,345 92,155" fill="none" stroke="#C4922E" stroke-width="12" opacity="0.9"/>
    <polygon points="256,110 375,175 375,305 256,370 137,305 137,175" fill="none" stroke="#C4922E" stroke-width="4" opacity="0.3"/>
    <line x1="256" y1="80" x2="256" y2="432" stroke="#C4922E" stroke-width="3" stroke-dasharray="18 18" opacity="0.35"/>
    <line x1="80" y1="256" x2="432" y2="256" stroke="#C4922E" stroke-width="3" stroke-dasharray="18 18" opacity="0.35"/>
    <polygon points="256,82 238,168 256,152 274,168" fill="#C4922E"/>
    <polygon points="256,430 238,344 256,360 274,344" fill="#C4922E" opacity="0.25"/>
    <polygon points="430,256 344,238 360,256 344,274" fill="#f5e09a"/>
    <polygon points="82,256 168,238 152,256 168,274" fill="#C4922E" opacity="0.25"/>
    <circle cx="256" cy="256" r="52" fill="#1e1a14" stroke="#C4922E" stroke-width="10"/>
    <circle cx="256" cy="256" r="22" fill="#C4922E"/>
    <circle cx="256" cy="256" r="10" fill="#f5e09a"/>
  </svg>
);

export default function LoginModal({ isOpen, onClose }) {
  const { signInWithDiscord, signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleDiscordSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithDiscord();
    } catch (err) {
      setError(err.message || 'Failed to sign in with Discord');
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      setError(err.message || 'Failed to sign in');
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: '#f5f1ea',
          borderRadius: '16px',
          padding: '48px 40px',
          maxWidth: '420px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '28px',
            color: '#1a1610',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#C4922E'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#1a1610'}
        >
          ×
        </button>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <AtlasLogo size={56}/>
        </div>

        {/* Header */}
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: '#1a1610',
          textAlign: 'center',
          marginBottom: '12px',
          lineHeight: 1.1,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Welcome to Atlas
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#4a4238',
          textAlign: 'center',
          marginBottom: '36px',
          fontWeight: 300,
        }}>
          Sign in or create your account to continue
        </p>

        {/* Error message */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '24px',
            fontSize: '13px',
            color: '#991b1b',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Discord button */}
        <button
          onClick={handleDiscordSignIn}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '14px 16px',
            background: '#5865F2',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.2s',
            marginBottom: '12px',
            opacity: isLoading ? 0.7 : 1,
          }}
          onMouseEnter={(e) => !isLoading && (e.currentTarget.style.background = '#4752C4')}
          onMouseLeave={(e) => !isLoading && (e.currentTarget.style.background = '#5865F2')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.3671a19.8062 19.8062 0 00-4.8850-1.5152.074.074 0 00-.0787.0366c-.2113.3934-.4447.9042-.6083 1.3062a18.7427 18.7427 0 00-5.6588 0c-.2137-.4022-.3972-.9128-.6084-1.3062a.077.077 0 00-.0787-.0366 19.7892 19.7892 0 00-4.8850 1.5151.07.07 0 00-.0330.0280C.5891 9.5961-.3217 14.8276.9999 19.7347a.082.082 0 00.0314.0553c5.4909 4.0476 10.7895 4.9722 15.9525 4.9722.3派.006.6591-.0031.9844-.0121a.08.08 0 00.0645-.0036c2.7165-2.1184 4.1002-5.0874 4.6556-7.9181.5604-2.8307.5313-5.4762-.213-8.7839a.083.083 0 00-.0359-.0275zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
          </svg>
          Continue with Discord
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '24px 0',
        }}>
          <div style={{ flex: 1, height: '1px', background: '#C4922E44' }}/>
          <span style={{ fontSize: '12px', color: '#4a4238', fontWeight: 500 }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: '#C4922E44' }}/>
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Email input */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#1a1610',
              marginBottom: '6px',
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #C4922E44',
                borderRadius: '8px',
                fontSize: '13px',
                fontFamily: "'DM Sans', sans-serif",
                color: '#1a1610',
                background: '#fff',
                transition: 'all 0.2s',
                cursor: isLoading ? 'not-allowed' : 'text',
                opacity: isLoading ? 0.7 : 1,
              }}
              onFocus={(e) => !isLoading && (e.currentTarget.style.borderColor = '#C4922E88')}
              onBlur={(e) => !isLoading && (e.currentTarget.style.borderColor = '#C4922E44')}
            />
          </div>

          {/* Password input */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#1a1610',
              marginBottom: '6px',
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #C4922E44',
                borderRadius: '8px',
                fontSize: '13px',
                fontFamily: "'DM Sans', sans-serif",
                color: '#1a1610',
                background: '#fff',
                transition: 'all 0.2s',
                cursor: isLoading ? 'not-allowed' : 'text',
                opacity: isLoading ? 0.7 : 1,
              }}
              onFocus={(e) => !isLoading && (e.currentTarget.style.borderColor = '#C4922E88')}
              onBlur={(e) => !isLoading && (e.currentTarget.style.borderColor = '#C4922E44')}
            />
          </div>

          {/* Sign in button */}
          <button
            type="submit"
            disabled={isLoading || !email || !password}
            style={{
              padding: '12px 16px',
              background: '#1a1610',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isLoading || !email || !password ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              marginTop: '8px',
              opacity: isLoading || !email || !password ? 0.6 : 1,
            }}
            onMouseEnter={(e) => !isLoading && !(!email || !password) && (e.currentTarget.style.background = '#2a2420')}
            onMouseLeave={(e) => !isLoading && !(!email || !password) && (e.currentTarget.style.background = '#1a1610')}
          >
            {isLoading ? 'Signing in...' : 'Sign In with Email'}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          fontSize: '12px',
          color: '#4a4238',
          textAlign: 'center',
          marginTop: '24px',
          fontWeight: 300,
        }}>
          By continuing, you agree to Atlas's Terms of Service
        </p>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';

export default function LoginModal({ isOpen, onClose }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const handleDiscord = () => {
    setIsAuthenticating(true);
    // Redirect to Discord OAuth
    window.location.href = 'https://discord.com/api/oauth2/authorize?client_id=1496994011427377222&redirect_uri=https%3A%2F%2Fatlasresellhub.base44.app%2Fapi%2Fauth%2Fdiscord%2Fcallback&response_type=code&scope=identify%20email';
  };

  const handleGoogle = () => {
    setIsAuthenticating(true);
    // Redirect to Google OAuth
    window.location.href = '/api/auth/google';
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsAuthenticating(true);

    try {
      const response = await fetch('/api/auth/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        setLoginError(error.message || 'Login failed. Please check your credentials.');
        setIsAuthenticating(false);
        return;
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        window.location.href = '/Dashboard';
      }
    } catch (err) {
      setLoginError('Connection error. Please try again.');
      setIsAuthenticating(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={!isAuthenticating ? onClose : undefined}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.3)',
          zIndex: 999,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#FDF5EC',
        borderRadius: 16,
        padding: isMobile ? '32px 24px' : '48px 40px',
        maxWidth: isMobile ? 'calc(100vw - 32px)' : 420,
        maxHeight: '90vh',
        overflowY: 'auto',
        zIndex: 1000,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
      }}>

        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isAuthenticating}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            fontSize: 24,
            cursor: isAuthenticating ? 'not-allowed' : 'pointer',
            color: '#3D2B1A',
            opacity: isAuthenticating ? 0.5 : 1,
          }}
        >
          ×
        </button>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <svg width="56" height="56" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <polygon points="256,60 420,155 420,345 256,440 92,345 92,155" fill="none" stroke="#C4922E" strokeWidth="12" opacity="0.9"/>
            <circle cx="256" cy="256" r="52" fill="none" stroke="#C4922E" strokeWidth="10"/>
            <circle cx="256" cy="256" r="22" fill="#C4922E"/>
            <circle cx="256" cy="256" r="10" fill="#f5e09a"/>
          </svg>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: isMobile ? 30 : 34,
            fontWeight: 700,
            color: '#3D2B1A',
            margin: '0 0 8px',
            lineHeight: 1.2,
          }}>
            Welcome to Atlas
          </h2>
          <p style={{ fontSize: 13, color: '#8a7a6f', margin: 0 }}>
            Sign in or create your account to continue
          </p>
        </div>

        {/* Error message */}
        {loginError && (
          <div style={{
            background: '#ffe6e6',
            border: '1px solid #ff6b6b',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 16,
            fontSize: 12,
            color: '#c92a2a',
          }}>
            {loginError}
          </div>
        )}

        {/* Sign in with Discord */}
        <button
          onClick={handleDiscord}
          disabled={isAuthenticating}
          style={{
            width: '100%',
            padding: '13px 14px',
            border: '1px solid #5865F2',
            borderRadius: 8,
            background: isAuthenticating ? '#e6e9ff' : '#5865F2',
            fontSize: 14,
            fontWeight: 600,
            cursor: isAuthenticating ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            color: isAuthenticating ? '#999' : 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 12,
            transition: 'all 0.2s',
            opacity: isAuthenticating ? 0.6 : 1,
          }}
          onMouseEnter={e => !isAuthenticating && (e.currentTarget.style.background = '#4752c4')}
          onMouseLeave={e => !isAuthenticating && (e.currentTarget.style.background = '#5865F2')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.369c-1.52-.766-3.15-1.332-4.842-1.681-.046.062-.098.136-.134.187-1.27-.191-2.53-.191-3.777 0-.036-.05-.09-.125-.134-.187-1.692.349-3.322.915-4.842 1.681-3.227 5.283-4.099 10.411-3.668 15.405 1.565 1.227 3.076 1.98 4.565 2.476 1.09-.752 2.154-1.631 3.163-2.652-1.164-.44-2.268-1.086-3.204-1.913.268-.202.528-.418.78-.651 2.882 1.396 6.047 1.396 8.929 0 .252.233.512.449.78.651-.936.827-2.04 1.473-3.204 1.913 1.009 1.021 2.073 1.9 3.163 2.652 1.489-.496 3-.249 4.565-2.476.434-4.994-.435-10.122-3.668-15.405zM8.678 13.678c-1.351 0-2.458-1.187-2.458-2.646s1.084-2.646 2.458-2.646c1.374 0 2.472 1.187 2.458 2.646 0 1.459-1.084 2.646-2.458 2.646zm6.644 0c-1.35 0-2.458-1.187-2.458-2.646s1.084-2.646 2.458-2.646c1.374 0 2.472 1.187 2.458 2.646 0 1.459-1.084 2.646-2.458 2.646z"/>
          </svg>
          Continue with Discord
        </button>

        {/* OR divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: '#d9ccc0' }}></div>
          <span style={{ fontSize: 12, color: '#8a7a6f', fontWeight: 600, textTransform: 'uppercase' }}>OR</span>
          <div style={{ flex: 1, height: 1, background: '#d9ccc0' }}></div>
        </div>

        {/* Email input */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#3D2B1A', marginBottom: 6 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isAuthenticating}
            placeholder="your@email.com"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 6,
              border: '1px solid #d9ccc0',
              fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
              background: isAuthenticating ? '#f5f5f5' : 'white',
              color: '#3D2B1A',
              opacity: isAuthenticating ? 0.6 : 1,
              cursor: isAuthenticating ? 'not-allowed' : 'text',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Password input */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#3D2B1A', marginBottom: 6 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={isAuthenticating}
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 6,
              border: '1px solid #d9ccc0',
              fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
              background: isAuthenticating ? '#f5f5f5' : 'white',
              color: '#3D2B1A',
              opacity: isAuthenticating ? 0.6 : 1,
              cursor: isAuthenticating ? 'not-allowed' : 'text',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Sign in button */}
        <button
          onClick={handleEmailLogin}
          disabled={isAuthenticating || !email || !password}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 8,
            border: 'none',
            background: isAuthenticating || !email || !password ? '#d9ccc0' : '#3D2B1A',
            color: '#FDF5EC',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            cursor: isAuthenticating || !email || !password ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            opacity: isAuthenticating || !email || !password ? 0.6 : 1,
          }}
          onMouseEnter={e => {
            if (!isAuthenticating && email && password) {
              e.currentTarget.style.background = '#2a1f16';
            }
          }}
          onMouseLeave={e => {
            if (!isAuthenticating && email && password) {
              e.currentTarget.style.background = '#3D2B1A';
            }
          }}
        >
          {isAuthenticating ? 'Signing in...' : 'Sign in with Email'}
        </button>

        {/* Footer */}
        <p style={{
          fontSize: 11,
          color: '#8a7a6f',
          textAlign: 'center',
          margin: '16px 0 0',
          lineHeight: 1.4,
        }}>
          By continuing, you agree to Atlas's <a href="#" style={{ color: '#C4922E', textDecoration: 'none' }}>Terms of Service</a>
        </p>
      </div>
    </>
  );
}
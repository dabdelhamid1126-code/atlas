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
    // Redirect to Discord OAuth (just open app login)
    window.location.href = 'https://atlasresellhub.base44.app';
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
      // For now, just redirect to the app after a short delay to show loading
      setTimeout(() => {
        window.location.href = '/Dashboard';
      }, 800);
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
          <svg width="56" height="56" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="256,60 420,155 420,345 256,440 92,345 92,155" fill="none" stroke="#C4922E" strokeWidth="12" opacity="0.9"/>
            <polygon points="256,110 375,175 375,305 256,370 137,305 137,175" fill="none" stroke="#C4922E" strokeWidth="4" opacity="0.3"/>
            <line x1="256" y1="80" x2="256" y2="432" stroke="#C4922E" strokeWidth="3" strokeDasharray="18 18" opacity="0.35"/>
            <line x1="80" y1="256" x2="432" y2="256" stroke="#C4922E" strokeWidth="3" strokeDasharray="18 18" opacity="0.35"/>
            <polygon points="256,82 238,168 256,152 274,168" fill="#C4922E"/>
            <polygon points="256,430 238,344 256,360 274,344" fill="#C4922E" opacity="0.25"/>
            <polygon points="430,256 344,238 360,256 344,274" fill="#f5e09a"/>
            <polygon points="82,256 168,238 152,256 168,274" fill="#C4922E" opacity="0.25"/>
            <circle cx="256" cy="256" r="52" fill="#1e1a14" stroke="#C4922E" strokeWidth="10"/>
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
          <svg width="18" height="18" viewBox="0 0 127.14 96.36" fill="white">
            <g>
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A99.68,99.68,0,0,0,58.6,6.2a72.06,72.06,0,0,0-3.36-6.83,105.59,105.59,0,0,0-26.23,8.07C11.4,32.88,8.3,56.75,10.61,80.21a105.48,105.48,0,0,0,32.63,16.25A72.53,72.53,0,0,0,60.6,85.38a72.1,72.1,0,0,0,6.25-3.88,105.59,105.59,0,0,0,32.63-16.25c2.8-23.22-.4-47.85-2.1-71.6ZM42.45,65.69C36.18,65.69,31,60.55,31,53.88s5-11.81,11.43-11.81S54,47.16,53.89,53.88,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60.55,73.25,53.88s5-11.81,11.44-11.81S96.19,47.16,96.13,53.88,91.13,65.69,84.69,65.69Z"/>
            </g>
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
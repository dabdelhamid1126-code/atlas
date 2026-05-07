import React, { useState, useEffect } from 'react';

export default function LoginModal({ isOpen, onClose }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const handleDiscord = () => {
    setIsAuthenticating(true);
    window.location.href = 'https://atlasresellhub.base44.app';
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setTimeout(() => {
      window.location.href = '/Dashboard';
    }, 800);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={!isAuthenticating ? onClose : undefined}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal Overlay */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#FDF5EC',
        borderRadius: 24,
        padding: isMobile ? '32px 24px' : '48px 40px',
        maxWidth: isMobile ? 'calc(100vw - 32px)' : 520,
        maxHeight: '90vh',
        overflowY: 'auto',
        zIndex: 1000,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        width: isMobile ? '100%' : 'auto',
      }}>

        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isAuthenticating}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'none',
            border: 'none',
            fontSize: 28,
            cursor: isAuthenticating ? 'not-allowed' : 'pointer',
            color: '#3D2B1A',
            opacity: isAuthenticating ? 0.5 : 1,
            padding: 0,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
          <svg width="80" height="80" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" rx="100" fill="#1e1a14"/>
            <rect width="512" height="512" rx="100" fill="none" stroke="#C4922E" strokeWidth="4" opacity="0.4"/>
            <polygon points="256,60 420,155 420,345 256,440 92,345 92,155" fill="none" stroke="#C4922E" strokeWidth="12" opacity="0.9"/>
            <polygon points="256,110 375,175 375,305 256,370 137,305 137,175" fill="none" stroke="#C4922E" strokeWidth="4" opacity="0.3"/>
            <line x1="256" y1="80" x2="256" y2="432" stroke="#C4922E" strokeWidth="3" strokeDasharray="18 18" opacity="0.35"/>
            <line x1="80" y1="256" x2="432" y2="256" stroke="#C4922E" strokeWidth="3" strokeDasharray="18 18" opacity="0.35"/>
            <line x1="112" y1="112" x2="400" y2="400" stroke="#C4922E" strokeWidth="2" strokeDasharray="12 18" opacity="0.18"/>
            <line x1="400" y1="112" x2="112" y2="400" stroke="#C4922E" strokeWidth="2" strokeDasharray="12 18" opacity="0.18"/>
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
            fontSize: isMobile ? 32 : 38,
            fontWeight: 700,
            color: '#3D2B1A',
            margin: '0 0 12px',
            lineHeight: 1.2,
          }}>
            Welcome to Atlas
          </h2>
          <p style={{ fontSize: 14, color: '#999999', margin: 0, lineHeight: 1.5 }}>
            Sign in or create your account to continue
          </p>
        </div>

        {/* Discord Button */}
        <button
          onClick={handleDiscord}
          disabled={isAuthenticating}
          style={{
            width: '100%',
            padding: '14px 16px',
            border: 'none',
            borderRadius: 12,
            background: '#5865F2',
            fontSize: 15,
            fontWeight: 600,
            cursor: isAuthenticating ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 20,
            transition: 'all 0.2s',
            opacity: isAuthenticating ? 0.7 : 1,
          }}
          onMouseEnter={e => !isAuthenticating && (e.currentTarget.style.background = '#4752c4')}
          onMouseLeave={e => !isAuthenticating && (e.currentTarget.style.background = '#5865F2')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M20.317 4.369c-1.52-.766-3.15-1.332-4.842-1.681-.046.062-.098.136-.134.187-1.27-.191-2.53-.191-3.777 0-.036-.05-.09-.125-.134-.187-1.692.349-3.322.915-4.842 1.681-3.227 5.283-4.099 10.411-3.668 15.405 1.565 1.227 3.076 1.98 4.565 2.476 1.09-.752 2.154-1.631 3.163-2.652-1.164-.44-2.268-1.086-3.204-1.913.268-.202.528-.418.78-.651 2.882 1.396 6.047 1.396 8.929 0 .252.233.512.449.78.651-.936.827-2.04 1.473-3.204 1.913 1.009 1.021 2.073 1.9 3.163 2.652 1.489-.496 3-.249 4.565-2.476.434-4.994-.435-10.122-3.668-15.405zM8.678 13.678c-1.351 0-2.458-1.187-2.458-2.646s1.084-2.646 2.458-2.646c1.374 0 2.472 1.187 2.458 2.646 0 1.459-1.084 2.646-2.458 2.646zm6.644 0c-1.35 0-2.458-1.187-2.458-2.646s1.084-2.646 2.458-2.646c1.374 0 2.472 1.187 2.458 2.646 0 1.459-1.084 2.646-2.458 2.646z"/>
          </svg>
          Continue with Discord
        </button>

        {/* OR divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: '#D9CCC0' }}></div>
          <span style={{ fontSize: 13, color: '#999999', fontWeight: 500, textTransform: 'uppercase' }}>OR</span>
          <div style={{ flex: 1, height: 1, background: '#D9CCC0' }}></div>
        </div>

        {/* Email input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3D2B1A', marginBottom: 8 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isAuthenticating}
            placeholder="you@example.com"
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #E8DCC8',
              fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
              background: '#FFFBF0',
              color: '#3D2B1A',
              boxSizing: 'border-box',
              opacity: isAuthenticating ? 0.6 : 1,
              cursor: isAuthenticating ? 'not-allowed' : 'text',
            }}
          />
        </div>

        {/* Password input */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3D2B1A', marginBottom: 8 }}>
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
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #E8DCC8',
              fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
              background: '#FFFBF0',
              color: '#3D2B1A',
              boxSizing: 'border-box',
              opacity: isAuthenticating ? 0.6 : 1,
              cursor: isAuthenticating ? 'not-allowed' : 'text',
            }}
          />
        </div>

        {/* Sign in button */}
        <button
          onClick={handleEmailLogin}
          disabled={isAuthenticating || !email || !password}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 12,
            border: 'none',
            background: isAuthenticating || !email || !password ? '#D9CCC0' : '#5A4A3A',
            color: '#FDF5EC',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            cursor: isAuthenticating || !email || !password ? 'not-allowed' : 'pointer',
            marginBottom: 16,
            transition: 'all 0.2s',
            opacity: isAuthenticating || !email || !password ? 0.7 : 1,
          }}
          onMouseEnter={e => {
            if (!isAuthenticating && email && password) {
              e.currentTarget.style.background = '#3D2B1A';
            }
          }}
          onMouseLeave={e => {
            if (!isAuthenticating && email && password) {
              e.currentTarget.style.background = '#5A4A3A';
            }
          }}
        >
          {isAuthenticating ? 'Signing in...' : 'Sign in with Email'}
        </button>

        {/* Footer */}
        <p style={{
          fontSize: 12,
          color: '#999999',
          textAlign: 'center',
          margin: '0 0 16px',
          lineHeight: 1.5,
        }}>
          By continuing, you agree to Atlas's{' '}
          <a href="#" style={{ color: '#C4922E', textDecoration: 'none', fontWeight: 500 }}>Terms of Service</a>
        </p>

        {/* Forgot password and signup */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
          <a href="#" style={{ color: '#999999', textDecoration: 'none' }}>Forgot password?</a>
          <div style={{ color: '#999999' }}>
            Need an account?{' '}
            <a href="#" style={{ color: '#C4922E', textDecoration: 'none', fontWeight: 600 }}>Sign up</a>
          </div>
        </div>
      </div>
    </>
  );
}
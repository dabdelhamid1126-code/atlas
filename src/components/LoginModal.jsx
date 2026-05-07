import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

export default function LoginModal({ isOpen, onClose }) {
  const { navigateToLogin } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const handleDiscordSignIn = () => {
    setIsAuthenticating(true);
    setError('');
    try {
      console.log('🔵 Discord login clicked');
      // Use Base44 SDK method for Discord SSO
      if (base44?.auth?.loginWithProvider) {
        base44.auth.loginWithProvider('sso', '/dashboard');
      } else {
        window.location.href = '/auth/sso';
      }
    } catch (err) {
      console.error('Discord error:', err);
      setError('Failed to start Discord login');
      setIsAuthenticating(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError('');

    if (!email || !password) {
      setError('Please enter email and password');
      setIsAuthenticating(false);
      return;
    }

    try {
      console.log(`📧 Email login attempt: ${email}`);
      
      if (base44?.auth?.loginViaEmailPassword) {
        const result = await base44.auth.loginViaEmailPassword(email, password);
        console.log('Email result:', result);
        
        if (result) {
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 500);
        }
      } else {
        setError('Email authentication not available');
        setIsAuthenticating(false);
      }
    } catch (err) {
      console.error('Email error:', err);
      setError(err.message || 'Login failed');
      setIsAuthenticating(false);
    }
  };

  const handleGoogle = () => {
    setIsAuthenticating(true);
    navigateToLogin();
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

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          right: isMobile ? 'auto' : 0,
          left: isMobile ? 0 : 'auto',
          top: 0,
          bottom: 0,
          height: '100vh',
          width: isMobile ? '100%' : 400,
          background: '#FFF9F3',
          zIndex: 1000,
          boxShadow: isMobile ? 'none' : '-8px 0 30px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: isMobile ? '40px 24px' : '48px 36px',
          overflowY: 'auto',
          animation: isMobile ? 'slideUp 0.3s ease-out' : 'slideInRight 0.3s ease-out',
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
        `}</style>

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
            color: isAuthenticating ? '#ccc' : '#664930',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isAuthenticating ? 0.5 : 1,
          }}
        >
          ×
        </button>

        {/* Atlas logo mark */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <svg width="48" height="48" viewBox="0 0 512 512" fill="none">
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
        {error && (
          <div style={{
            background: '#ffe0e0',
            border: '1px solid #ff9999',
            borderRadius: 6,
            padding: '10px 12px',
            marginBottom: 16,
            fontSize: 12,
            color: '#c00',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Discord button */}
        <button
          onClick={handleDiscordSignIn}
          disabled={isAuthenticating}
          style={{
            width: '100%',
            padding: '13px 14px',
            border: 'none',
            borderRadius: 8,
            background: '#5865F2',
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: isAuthenticating ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 12,
            transition: 'all 0.2s',
            opacity: isAuthenticating ? 0.6 : 1,
          }}
          onMouseEnter={e => !isAuthenticating && (e.currentTarget.style.background = '#4752C4')}
          onMouseLeave={e => !isAuthenticating && (e.currentTarget.style.background = '#5865F2')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.3671C18.7975 3.60784 17.151 3.07249 15.4319 2.81444C15.4007 2.81052 15.3695 2.82681 15.3534 2.85928C15.1424 3.27953 14.9087 3.81359 14.7451 4.22775C12.9004 3.94575 11.0707 3.94575 9.27273 4.22775C9.10951 3.81266 8.87231 3.27953 8.65126 2.85928C8.63512 2.82681 8.60547 2.81052 8.5743 2.81444C6.85499 3.07115 5.20832 3.60652 4.08826 4.3671C4.07367 4.3736 4.06251 4.38217 4.05928 4.39282C2.18537 7.61554 1.71213 10.7582 2.03835 13.8424C2.04248 13.8926 2.07265 13.9379 2.11199 13.9632C3.89188 15.1913 5.59927 16.0218 7.27268 16.5723C7.3015 16.5783 7.33178 16.5703 7.34616 16.5439C7.72624 15.9115 8.06932 15.2502 8.35655 14.5583C8.37267 14.5229 8.35504 14.4845 8.31812 14.4764C7.67147 14.2917 7.05347 14.0492 6.4504 13.7569C6.40895 13.7329 6.40625 13.6781 6.44765 13.6529C6.57267 13.5655 6.6988 13.4763 6.82231 13.3847C6.84275 13.3692 6.8686 13.3638 6.89076 13.3746C9.88328 14.8737 13.2656 14.8737 16.2262 13.3746C16.2484 13.3629 16.2743 13.3682 16.2948 13.3837C16.4183 13.4754 16.5445 13.5655 16.6695 13.6529C16.7109 13.6781 16.7082 13.7329 16.6667 13.7569C16.0636 14.0565 15.4462 14.2917 14.7979 14.4755C14.761 14.4836 14.7434 14.5229 14.7595 14.5583C15.0474 15.2502 15.3905 15.9115 15.7692 16.5439C15.7836 16.5703 15.8139 16.5783 15.8427 16.5723C17.5156 16.0218 19.2231 15.1913 21.003 13.9632C21.0424 13.9379 21.0726 13.8926 21.0767 13.8424C21.4501 10.1771 20.5383 7.13783 18.6915 4.39282C18.6883 4.38217 18.677 4.3736 18.6624 4.3671ZM8.02002 11.3989C7.10625 11.3989 6.33125 10.576 6.33125 9.56662C6.33125 8.55725 7.09086 7.73425 8.02002 7.73425C8.95248 7.73425 9.71625 8.56505 9.71625 9.56662C9.71625 10.576 8.95248 11.3989 8.02002 11.3989ZM15.9775 11.3989C15.0638 11.3989 14.2888 10.576 14.2888 9.56662C14.2888 8.55725 15.0484 7.73425 15.9775 7.73425C16.9099 7.73425 17.6738 8.56505 17.6738 9.56662C17.6738 10.576 16.9099 11.3989 15.9775 11.3989Z"/>
          </svg>
          {isAuthenticating ? 'Connecting...' : 'Continue with Discord'}
        </button>

        {/* Sign in with Google */}
        <button
          onClick={handleGoogle}
          disabled={isAuthenticating}
          style={{
            width: '100%',
            padding: '13px 14px',
            border: '1px solid #D4C4B8',
            borderRadius: 8,
            background: isAuthenticating ? '#f0f0f0' : 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: isAuthenticating ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            color: isAuthenticating ? '#999' : '#3D2B1A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 12,
            transition: 'all 0.2s',
            opacity: isAuthenticating ? 0.6 : 1,
          }}
          onMouseEnter={e => !isAuthenticating && (e.currentTarget.style.background = '#f5f5f5')}
          onMouseLeave={e => !isAuthenticating && (e.currentTarget.style.background = 'white')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M23.766 12.294c0-.817-.066-1.604-.189-2.365H12v4.476h6.844c-.293 1.569-1.223 2.894-2.604 3.778v3.268h4.216c2.464-2.27 3.884-5.612 3.884-9.157z" fill="#4285F4"/>
            <path d="M12 24c3.48 0 6.401-1.147 8.535-3.104l-4.216-3.268c-1.147.786-2.616 1.251-4.319 1.251-3.329 0-6.147-2.247-7.155-5.276H.467v3.372C2.532 21.96 6.847 24 12 24z" fill="#34A853"/>
            <path d="M4.845 14.603c-.254-.786-.381-1.623-.381-2.603s.127-1.817.38-2.603V5.025H.467C.172 6.286 0 7.635 0 9c0 1.365.172 2.714.467 3.975l4.378-3.372z" fill="#FBBC04"/>
            <path d="M12 4.75c1.869 0 3.549.644 4.867 1.909l3.646-3.646C18.401 1.147 15.48 0 12 0 6.847 0 2.532 2.04.467 5.025l4.378 3.372c1.008-3.029 3.826-5.647 7.155-5.647z" fill="#EA4335"/>
          </svg>
          {isAuthenticating ? 'Redirecting...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#D4C4B8' }}/>
          <span style={{ fontSize: 12, color: '#8a7a6f' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: '#D4C4B8' }}/>
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            disabled={isAuthenticating}
            style={{
              padding: '10px 12px',
              border: '1px solid #D4C4B8',
              borderRadius: 6,
              fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
              opacity: isAuthenticating ? 0.6 : 1,
            }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            disabled={isAuthenticating}
            style={{
              padding: '10px 12px',
              border: '1px solid #D4C4B8',
              borderRadius: 6,
              fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
              opacity: isAuthenticating ? 0.6 : 1,
            }}
          />
          <button
            type="submit"
            disabled={isAuthenticating || !email || !password}
            style={{
              width: '100%',
              padding: '11px 14px',
              borderRadius: 6,
              border: 'none',
              background: '#3D2B1A',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: (isAuthenticating || !email || !password) ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'background 0.2s',
              opacity: (isAuthenticating || !email || !password) ? 0.6 : 1,
            }}
            onMouseEnter={e => !isAuthenticating && !(!email || !password) && (e.currentTarget.style.background = '#2a1f15')}
            onMouseLeave={e => !isAuthenticating && !(!email || !password) && (e.currentTarget.style.background = '#3D2B1A')}
          >
            {isAuthenticating ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#b0a090', marginTop: 16 }}>
          By continuing, you agree to Atlas's Terms of Service
        </p>
      </div>
    </>
  );
}
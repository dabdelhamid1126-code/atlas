import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

export default function LoginModal({ isOpen, onClose }) {
  const { navigateToLogin } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const handleSSO = () => {
    setIsAuthenticating(true);
    // Base44 SSO login - redirects to Base44's SSO flow
    window.location.href = '/auth/sso';
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

        {/* Sign in with Base44 SSO (Discord) */}
        <button
          onClick={handleSSO}
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
            <path d="M20.317 4.3671C18.7976 3.5845 17.1152 3.0613 15.3328 2.76242C15.1145 3.1671 14.8968 3.5859 14.7226 4.03297C12.7039 3.71939 10.7189 3.71939 8.75625 4.03297C8.5823 3.5859 8.3626 3.1671 8.1443 2.76242C6.3619 3.0704 4.6795 3.5936 3.1611 4.3761C0.439655 8.9457 -0.267272 13.3903 0.0839798 17.7667C2.2644 19.3047 4.3762 20.1625 6.44531 20.5747C6.94649 19.8684 7.39605 19.1157 7.78563 18.3226C7.07172 18.0669 6.3825 17.7292 5.73438 17.3188C5.87952 17.2189 6.02466 17.1152 6.16492 17.0088C9.90274 18.8349 14.1545 18.8349 17.8738 17.0088C18.0191 17.1169 18.1644 17.2206 18.309 17.3188C17.6609 17.7293 16.9717 18.0669 16.2578 18.3226C16.6473 19.1157 17.0969 19.8684 17.5981 20.5747C19.6672 20.1625 21.7791 19.3047 23.9596 17.7667C24.3953 13.3903 23.4766 8.9457 20.317 4.3671ZM8.02002 14.8457C6.8375 14.8457 5.86313 13.8789 5.86313 12.6471C5.86313 11.4153 6.8186 10.4485 8.02002 10.4485C9.22145 10.4485 10.1779 11.4153 10.1779 12.6471C10.1779 13.8789 9.22145 14.8457 8.02002 14.8457ZM15.9947 14.8457C14.8121 14.8457 13.8377 13.8789 13.8377 12.6471C13.8377 11.4153 14.7932 10.4485 15.9947 10.4485C17.1961 10.4485 18.1526 11.4153 18.1526 12.6471C18.1526 13.8789 17.1961 14.8457 15.9947 14.8457Z"/>
          </svg>
          {isAuthenticating ? 'Redirecting...' : 'Continue with Discord'}
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

        {/* Sign in button */}
        <button
          onClick={navigateToLogin}
          disabled={isAuthenticating}
          style={{
            width: '100%',
            padding: '13px 14px',
            borderRadius: 8,
            border: 'none',
            background: '#3D2B1A',
            color: 'white',
            fontSize: 14,
            fontWeight: 700,
            cursor: isAuthenticating ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'background 0.2s',
            opacity: isAuthenticating ? 0.6 : 1,
          }}
          onMouseEnter={e => !isAuthenticating && (e.currentTarget.style.background = '#2a1f15')}
          onMouseLeave={e => !isAuthenticating && (e.currentTarget.style.background = '#3D2B1A')}
        >
          Sign In with Email
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#b0a090', marginTop: 20 }}>
          By continuing, you agree to Atlas's Terms of Service
        </p>
      </div>
    </>
  );
}
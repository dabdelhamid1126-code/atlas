import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

console.log('LoginPage.jsx loaded');
console.log('base44 object available:', !!base44);
console.log('base44.auth available:', !!base44?.auth);

const AtlasLogo = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="100" fill="#1e1a14"/>
    <rect width="512" height="512" rx="100" fill="none" stroke="#C4922E" strokeWidth="4" opacity="0.3"/>
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
);

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoadingAuth) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  const handleDiscordSignIn = () => {
    setIsLoading(true);
    setError('');
    try {
      // Use Base44 SDK method for Discord SSO
      base44.auth.loginWithProvider('sso', '/dashboard');
    } catch (err) {
      setError('Failed to start Discord login. Please try again.');
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email || !password) {
      setError('Please enter email and password');
      setIsLoading(false);
      return;
    }

    try {
      console.log(`📧 Attempting ${isSignUp ? 'signup' : 'login'} with email: ${email}`);
      
      // Use Base44 SDK method for email/password authentication
      if (base44?.auth?.loginViaEmailPassword) {
        const result = await base44.auth.loginViaEmailPassword(email, password);
        
        console.log('📧 Email login result:', result);

        if (result) {
          // Give Base44 a moment to set the session
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 500);
        }
      } else {
        console.error('🔴 base44.auth.loginViaEmailPassword not available');
        setError('Email authentication not available. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('🔴 Email login error:', err);
      
      // Determine error message
      let errorMessage = 'Failed to sign in. Please try again.';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.statusCode === 401) {
        errorMessage = 'Invalid email or password';
      } else if (err.statusCode === 409) {
        errorMessage = 'Email already exists';
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // Show loading while checking auth
  if (isLoadingAuth) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#060503',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
        }}>
          <AtlasLogo size={56}/>
          <p style={{ color: '#8a7a6a', fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div
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
          onClick={() => navigate('/')}
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
          {isSignUp ? 'Create your account to get started' : 'Sign in or create your account to continue'}
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M20.317 4.3671C18.7975 3.60784 17.151 3.07249 15.4319 2.81444C15.4007 2.81052 15.3695 2.82681 15.3534 2.85928C15.1424 3.27953 14.9087 3.81359 14.7451 4.22775C12.9004 3.94575 11.0707 3.94575 9.27273 4.22775C9.10951 3.81266 8.87231 3.27953 8.65126 2.85928C8.63512 2.82681 8.60547 2.81052 8.5743 2.81444C6.85499 3.07115 5.20832 3.60652 4.08826 4.3671C4.07367 4.3736 4.06251 4.38217 4.05928 4.39282C2.18537 7.61554 1.71213 10.7582 2.03835 13.8424C2.04248 13.8926 2.07265 13.9379 2.11199 13.9632C3.89188 15.1913 5.59927 16.0218 7.27268 16.5723C7.3015 16.5783 7.33178 16.5703 7.34616 16.5439C7.72624 15.9115 8.06932 15.2502 8.35655 14.5583C8.37267 14.5229 8.35504 14.4845 8.31812 14.4764C7.67147 14.2917 7.05347 14.0492 6.4504 13.7569C6.40895 13.7329 6.40625 13.6781 6.44765 13.6529C6.57267 13.5655 6.6988 13.4763 6.82231 13.3847C6.84275 13.3692 6.8686 13.3638 6.89076 13.3746C9.88328 14.8737 13.2656 14.8737 16.2262 13.3746C16.2484 13.3629 16.2743 13.3682 16.2948 13.3837C16.4183 13.4754 16.5445 13.5655 16.6695 13.6529C16.7109 13.6781 16.7082 13.7329 16.6667 13.7569C16.0636 14.0565 15.4462 14.2917 14.7979 14.4755C14.761 14.4836 14.7434 14.5229 14.7595 14.5583C15.0474 15.2502 15.3905 15.9115 15.7692 16.5439C15.7836 16.5703 15.8139 16.5783 15.8427 16.5723C17.5156 16.0218 19.2231 15.1913 21.003 13.9632C21.0424 13.9379 21.0726 13.8926 21.0767 13.8424C21.4501 10.1771 20.5383 7.13783 18.6915 4.39282C18.6883 4.38217 18.677 4.3736 18.6624 4.3671ZM8.02002 11.3989C7.10625 11.3989 6.33125 10.576 6.33125 9.56662C6.33125 8.55725 7.09086 7.73425 8.02002 7.73425C8.95248 7.73425 9.71625 8.56505 9.71625 9.56662C9.71625 10.576 8.95248 11.3989 8.02002 11.3989ZM15.9775 11.3989C15.0638 11.3989 14.2888 10.576 14.2888 9.56662C14.2888 8.55725 15.0484 7.73425 15.9775 7.73425C16.9099 7.73425 17.6738 8.56505 17.6738 9.56662C17.6738 10.576 16.9099 11.3989 15.9775 11.3989Z"/>
          </svg>
          {isLoading ? 'Connecting to Discord...' : 'Continue with Discord'}
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

          {/* Sign in / Sign up button */}
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
            {isLoading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In with Email'}
          </button>
        </form>

        {/* Toggle Sign Up / Sign In */}
        <p style={{
          fontSize: '13px',
          color: '#4a4238',
          textAlign: 'center',
          marginTop: '20px',
          fontWeight: 300,
        }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setEmail('');
              setPassword('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#C4922E',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              transition: 'all 0.2s',
              textDecoration: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>

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
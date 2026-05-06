import React, { useState, useEffect } from ‘react’;
import { useAuth } from ‘@/lib/AuthContext’;

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

export default function LoginModal({ isOpen, onClose }) {
const { checkAppState } = useAuth();
const [email, setEmail] = useState(’’);
const [password, setPassword] = useState(’’);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(’’);

if (!isOpen) return null;

const handleDiscordSignIn = async () => {
setIsLoading(true);
setError(’’);
try {
// Base44 SSO for Discord
// This will handle the full OAuth flow
window.location.href = ‘/auth/sso?provider=discord’;
} catch (err) {
setError(‘Failed to initiate Discord login. Please try again.’);
setIsLoading(false);
}
};

const handleEmailSignIn = async (e) => {
e.preventDefault();
setIsLoading(true);
setError(’’);

```
if (!email || !password) {
  setError('Please enter email and password');
  setIsLoading(false);
  return;
}

try {
  // Email/password auth through Base44
  // This would need to be implemented based on your Base44 configuration
  setError('Email login is currently disabled. Please use Discord.');
  setIsLoading(false);
} catch (err) {
  setError(err.message || 'Failed to sign in');
  setIsLoading(false);
}
```

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
position: ‘fixed’,
inset: 0,
background: ‘rgba(0,0,0,0.5)’,
display: ‘flex’,
alignItems: ‘center’,
justifyContent: ‘center’,
zIndex: 9999,
backdropFilter: ‘blur(4px)’,
}}
>
<div
style={{
background: ‘#f5f1ea’,
borderRadius: ‘16px’,
padding: ‘48px 40px’,
maxWidth: ‘420px’,
width: ‘90%’,
boxShadow: ‘0 20px 60px rgba(0,0,0,0.2)’,
position: ‘relative’,
}}
>
{/* Close button */}
<button
onClick={onClose}
style={{
position: ‘absolute’,
top: ‘16px’,
right: ‘16px’,
background: ‘none’,
border: ‘none’,
fontSize: ‘28px’,
color: ‘#1a1610’,
cursor: ‘pointer’,
padding: ‘4px’,
display: ‘flex’,
alignItems: ‘center’,
justifyContent: ‘center’,
width: ‘36px’,
height: ‘36px’,
transition: ‘all 0.2s’,
}}
onMouseEnter={(e) => e.currentTarget.style.color = ‘#C4922E’}
onMouseLeave={(e) => e.currentTarget.style.color = ‘#1a1610’}
>
×
</button>

```
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
      <svg width="18" height="18" viewBox="0 0 127.14 96.36" fill="currentColor">
        <path d="M107.7 8.07A105.15 105.15 0 0090.2 0a72.06 72.06 0 00-3.36 6.83 97.68 97.68 0 00-14.84 0 72.37 72.37 0 00-3.36-6.83 105.89 105.89 0 00-17.5 8.07 750.85 750.85 0 00-119.88 37.85 83.47 83.47 0 0027.64 55.92 110.35 110.35 0 0033.26 10.7q5.18-7.5 9.84-15.5a67.15 67.15 0 00-10.85-5.3q1.8-1.36 3.54-2.77a75.36 75.36 0 0060.6 0c1.2 1 2.36 2 3.54 2.77a67.82 67.82 0 00-10.88 5.3c4.5 8 9 16 9.86 15.5a110.5 110.5 0 0033.3-10.7 84.29 84.29 0 0027.64-56c0-35.88-30.08-67.92-67.6-67.92zM42.45 65.69c-5.89 0-10.74 5.27-10.74 11.74s4.85 11.74 10.74 11.74c5.88 0 10.73-5.27 10.73-11.74-.02-6.47-4.85-11.74-10.73-11.74zM84.14 65.69c-5.74 0-10.63 5.27-10.63 11.74s4.89 11.74 10.63 11.74c5.9 0 10.75-5.27 10.75-11.74s-4.84-11.74-10.75-11.74z"/>
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
```

);
}
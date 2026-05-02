import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

export default function LoginModal({ isOpen, onClose }) {
  const { navigateToLogin } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.3)',
          zIndex: 999,
        }}
      />

      {/* Right-side sidebar panel (like Chase) */}
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100vh',
          width: 400,
          background: '#FFF9F3',
          zIndex: 1000,
          boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          padding: '40px 32px',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 32,
            fontWeight: 700,
            color: '#3D2B1A',
            margin: '0 0 6px',
            lineHeight: 1.2,
          }}>
            {isSignUp ? 'Join Atlas' : 'Welcome back'}
          </h2>
          <p style={{
            fontSize: 13,
            color: '#8a7a6f',
            margin: 0,
          }}>
            {isSignUp
              ? 'Start tracking your reselling like a pro'
              : 'Sign in to your Atlas account'}
          </p>
        </div>

        {/* Email input */}
        <div style={{ marginBottom: 18 }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            color: '#3D2B1A',
            marginBottom: 8,
          }}>
            Email
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            style={{
              width: '100%',
              padding: '11px 12px',
              border: '1px solid #D4C4B8',
              borderRadius: 6,
              background: 'white',
              fontSize: 14,
              color: '#3D2B1A',
              fontFamily: "'DM Sans', sans-serif",
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* Password input */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}>
            <label style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#3D2B1A',
              margin: 0,
            }}>
              Password
            </label>
            <button
              onClick={() => setShowPassword(!showPassword)}
              style={{
                background: 'none',
                border: 'none',
                color: '#C4922E',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '11px 12px',
              border: '1px solid #D4C4B8',
              borderRadius: 6,
              background: 'white',
              fontSize: 14,
              color: '#3D2B1A',
              fontFamily: "'DM Sans', sans-serif",
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* Remember me */}
        <div style={{
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <input
            type="checkbox"
            id="remember"
            style={{
              width: 16,
              height: 16,
              cursor: 'pointer',
            }}
          />
          <label
            htmlFor="remember"
            style={{
              fontSize: 12,
              color: '#3D2B1A',
              cursor: 'pointer',
              margin: 0,
            }}
          >
            Remember me
          </label>
        </div>

        {/* Sign in button */}
        <button
          onClick={navigateToLogin}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 6,
            border: 'none',
            background: '#3D2B1A',
            color: 'white',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 16,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#2a1f15'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#3D2B1A'}
        >
          {isSignUp ? 'Create Account' : 'Sign in'}
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '16px 0',
        }}>
          <div style={{ flex: 1, height: 0.5, background: '#D4C4B8' }} />
          <span style={{ fontSize: 11, color: '#997E67', fontWeight: 500 }}>OR</span>
          <div style={{ flex: 1, height: 0.5, background: '#D4C4B8' }} />
        </div>

        {/* Google button */}
        <button
          onClick={navigateToLogin}
          style={{
            width: '100%',
            padding: '11px 12px',
            border: '1px solid #D4C4B8',
            borderRadius: 6,
            background: 'white',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            color: '#3D2B1A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 16,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23.766 12.294c0-.817-.066-1.604-.189-2.365H12v4.476h6.844c-.293 1.569-1.223 2.894-2.604 3.778v3.268h4.216c2.464-2.27 3.884-5.612 3.884-9.157z" fill="#4285F4"/>
            <path d="M12 24c3.48 0 6.401-1.147 8.535-3.104l-4.216-3.268c-1.147.786-2.616 1.251-4.319 1.251-3.329 0-6.147-2.247-7.155-5.276H.467v3.372C2.532 21.96 6.847 24 12 24z" fill="#34A853"/>
            <path d="M4.845 14.603c-.254-.786-.381-1.623-.381-2.603s.127-1.817.38-2.603V5.025H.467C.172 6.286 0 7.635 0 9c0 1.365.172 2.714.467 3.975l4.378-3.372z" fill="#FBBC04"/>
            <path d="M12 4.75c1.869 0 3.549.644 4.867 1.909l3.646-3.646C18.401 1.147 15.48 0 12 0 6.847 0 2.532 2.04.467 5.025l4.378 3.372c1.008-3.029 3.826-5.647 7.155-5.647z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Links */}
        <div style={{
          textAlign: 'center',
          fontSize: 12,
          color: '#664930',
          marginTop: 12,
        }}>
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setIsSignUp(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#C4922E',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 'inherit',
                }}
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              <button
                onClick={navigateToLogin}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#C4922E',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 'inherit',
                }}
              >
                Forgot password?
              </button>
              <span> · </span>
              <button
                onClick={() => setIsSignUp(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#C4922E',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 'inherit',
                }}
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
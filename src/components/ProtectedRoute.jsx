import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--parch-bg)' }}>
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ children, fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated && !authError) {
      navigate('/login', { replace: true });
    }
    if (!isLoadingAuth && authError?.type === 'auth_required') {
      navigate('/login', { replace: true });
    }
  }, [isLoadingAuth, isAuthenticated, authError, navigate]);

  if (isLoadingAuth) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    if (authError.type === 'auth_required') {
      return fallback; // will redirect via useEffect
    }
    return unauthenticatedElement || null;
  }

  if (!isAuthenticated) {
    return fallback; // will redirect via useEffect
  }

  return children ?? <Outlet />;
}
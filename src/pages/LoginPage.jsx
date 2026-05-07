import React, { useEffect } from 'react';
import LandingLayout from './LandingLayout';
import LoginModal from '@/components/LoginModal';
import { useAuth } from '@/lib/AuthContext';

export default function LoginPage() {
  const [isOpen, setIsOpen] = React.useState(true);
  const { isAuthenticated, isLoadingAuth } = useAuth();

  useEffect(() => {
    // If already authenticated, redirect to dashboard
    if (isAuthenticated && !isLoadingAuth) {
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated, isLoadingAuth]);

  // Keep modal open, user can only close and return to landing page
  const handleClose = () => {
    window.location.href = '/';
  };

  if (isLoadingAuth) {
    return (
      <LandingLayout currentPage="login">
        <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#9a9080' }}>Loading...</div>
        </section>
      </LandingLayout>
    );
  }

  return (
    <LandingLayout currentPage="login">
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ textAlign: 'center', color: '#9a9080' }}>
          <p style={{ fontSize: 16, marginBottom: 20 }}>
            Sign in to your Atlas account to continue
          </p>
        </div>
      </section>
      
      {/* Modal is always open on this page */}
      <LoginModal isOpen={isOpen} onClose={handleClose} />
    </LandingLayout>
  );
}
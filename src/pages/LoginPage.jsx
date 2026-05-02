import React, { useEffect } from 'react';
import LandingLayout from './LandingLayout';
import LoginModal from '@/components/LoginModal';

export default function LoginPage() {
  const [isOpen, setIsOpen] = React.useState(true);

  // Keep modal open, user can only close and return to landing page
  const handleClose = () => {
    window.location.href = '/';
  };

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

import { createContext, useContext, useState, useEffect } from 'react';
import base44 from '../api/base44Client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setError(null);
    } catch (err) {
      console.error('Auth check failed:', err);
      setUser(null);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Login - uses window.location.origin (DYNAMIC - NOT HARDCODED!)
  const login = async () => {
    try {
      const redirectUrl = window.location.origin + '/Dashboard';
      await base44.auth.redirectToLogin(redirectUrl);
    } catch (err) {
      console.error('Login failed:', err);
      setError('Login failed. Please try again.');
    }
  };

  // Logout - uses window.location.origin (DYNAMIC - NOT HARDCODED!)
  const logout = async () => {
    try {
      const redirectUrl = window.location.origin;
      await base44.auth.logout(redirectUrl);
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Logout failed. Please try again.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

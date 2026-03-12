import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Expenses from './pages/Expenses';
import Stores from './pages/Stores';
import { useEffect } from 'react';

// Theme system initialization
const themes = {
  dark: {
    name: 'Dark',
    colors: {
      'bg-primary': '#060914',
      'bg-card': '#0f1419',
      'bg-hover': '#1a1f2e',
      'border-color': 'rgba(255, 255, 255, 0.08)',
      'text-primary': '#ffffff',
      'text-muted': 'rgba(255, 255, 255, 0.45)',
      'accent-primary': '#7c3aed',
      'accent-success': '#4ade80',
      'accent-danger': '#f87171',
      'accent-warning': '#fbbf24',
      'sidebar-bg': '#0e0e1e',
      'input-bg': 'rgba(255, 255, 255, 0.05)',
      'input-border': 'rgba(255, 255, 255, 0.1)',
    }
  },
  darker: {
    name: 'Darker',
    colors: {
      'bg-primary': '#000000',
      'bg-card': '#0a0a0a',
      'bg-hover': '#1a1a1a',
      'border-color': 'rgba(255, 255, 255, 0.1)',
      'text-primary': '#ffffff',
      'text-muted': 'rgba(255, 255, 255, 0.5)',
      'accent-primary': '#8b5cf6',
      'accent-success': '#22c55e',
      'accent-danger': '#ef4444',
      'accent-warning': '#eab308',
      'sidebar-bg': '#000000',
      'input-bg': 'rgba(255, 255, 255, 0.08)',
      'input-border': 'rgba(255, 255, 255, 0.12)',
    }
  },
  midnight: {
    name: 'Midnight',
    colors: {
      'bg-primary': '#020818',
      'bg-card': '#0f1625',
      'bg-hover': '#1a2840',
      'border-color': 'rgba(100, 150, 255, 0.15)',
      'text-primary': '#e8eef7',
      'text-muted': 'rgba(232, 238, 247, 0.4)',
      'accent-primary': '#6366f1',
      'accent-success': '#10b981',
      'accent-danger': '#ef5350',
      'accent-warning': '#f59e0b',
      'sidebar-bg': '#020818',
      'input-bg': 'rgba(100, 150, 255, 0.06)',
      'input-border': 'rgba(100, 150, 255, 0.15)',
    }
  },
  slate: {
    name: 'Slate',
    colors: {
      'bg-primary': '#0f172a',
      'bg-card': '#1e293b',
      'bg-hover': '#334155',
      'border-color': 'rgba(255, 255, 255, 0.1)',
      'text-primary': '#f1f5f9',
      'text-muted': 'rgba(241, 245, 249, 0.45)',
      'accent-primary': '#8b5cf6',
      'accent-success': '#10b981',
      'accent-danger': '#ef4444',
      'accent-warning': '#f59e0b',
      'sidebar-bg': '#0f172a',
      'input-bg': 'rgba(255, 255, 255, 0.05)',
      'input-border': 'rgba(255, 255, 255, 0.1)',
    }
  },
  light: {
    name: 'Light',
    colors: {
      'bg-primary': '#f8fafc',
      'bg-card': '#ffffff',
      'bg-hover': '#f1f5f9',
      'border-color': '#e2e8f0',
      'text-primary': '#0f172a',
      'text-muted': '#64748b',
      'accent-primary': '#7c3aed',
      'accent-success': '#16a34a',
      'accent-danger': '#dc2626',
      'accent-warning': '#d97706',
      'sidebar-bg': '#ffffff',
      'input-bg': '#ffffff',
      'input-border': '#e2e8f0',
    }
  },
};

export const initTheme = (themeName = 'dark') => {
  const theme = themes[themeName];
  if (!theme) return;
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
  localStorage.setItem('app-theme', themeName);
};

export const applyTheme = (themeName) => {
  initTheme(themeName);
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: themeName } }));
};

export const getActiveTheme = () => {
  return localStorage.getItem('app-theme') || 'dark';
};

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  useEffect(() => {
    const savedTheme = getActiveTheme();
    initTheme(savedTheme);
    
    const handleThemeChange = (e) => {
      initTheme(e.detail.theme);
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Filter out Inventory and InventoryValue from Pages
  const filteredPages = Object.fromEntries(
    Object.entries(Pages).filter(([path]) => path !== 'Inventory' && path !== 'InventoryValue')
  );

  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(filteredPages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/Expenses" element={<LayoutWrapper currentPageName="Expenses"><Expenses /></LayoutWrapper>} />
      <Route path="/Stores" element={<LayoutWrapper currentPageName="Stores"><Stores /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
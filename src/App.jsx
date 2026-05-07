import { ProtectedRoute } from './components/ProtectedRoute';
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/AuthContext';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import Dashboard from '@/pages/Dashboard';
import Inventory from '@/pages/Inventory';
import Analytics from '@/pages/Analytics';
import Transactions from '@/pages/Transactions';
import GiftCards from '@/pages/GiftCards';
import Forecast from '@/pages/Forecast';
import Invoices from '@/pages/Invoices';
import Settings from '@/pages/Settings';
import ImportOrders from '@/pages/ImportOrders';
import NewOrders from '@/pages/NewOrders';
import Goals from '@/pages/Goals';
import Expenses from '@/pages/Expenses';
import Products from '@/pages/Products';
import PurchaseOrders from '@/pages/PurchaseOrders';
import PaymentMethods from '@/pages/PaymentMethods';
import ReceiveItems from '@/pages/ReceiveItems';
import PackageReceiving from '@/pages/PackageReceiving';
import EmailImport from '@/pages/EmailImport';
import AboutPage from '@/pages/AboutPage';
import FeaturesPage from '@/pages/FeaturesPage';
import PricingPage from '@/pages/PricingPage';
import RoadmapPage from '@/pages/RoadmapPage';
import CommandPalette from '@/components/CommandPalette';
import Layout from '@/Layout';

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  useEffect(() => {
    // Import Marcellus font
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Marcellus&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <CommandPalette />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/roadmap" element={<RoadmapPage />} />

            {/* Protected dashboard routes */}
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/inventory" element={<Layout><Inventory /></Layout>} />
            <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
            <Route path="/transactions" element={<Layout><Transactions /></Layout>} />
            <Route path="/gift-cards" element={<Layout><GiftCards /></Layout>} />
            <Route path="/forecast" element={<Layout><Forecast /></Layout>} />
            <Route path="/invoices" element={<Layout><Invoices /></Layout>} />
            <Route path="/settings" element={<Layout><Settings /></Layout>} />
            <Route path="/import-orders" element={<Layout><ImportOrders /></Layout>} />
            <Route path="/email-import" element={<Layout><EmailImport /></Layout>} />
            <Route path="/new-orders" element={<Layout><NewOrders /></Layout>} />
            <Route path="/goals" element={<Layout><Goals /></Layout>} />
            <Route path="/expenses" element={<Layout><Expenses /></Layout>} />
            <Route path="/products" element={<Layout><Products /></Layout>} />
            <Route path="/purchase-orders" element={<Layout><PurchaseOrders /></Layout>} />
            <Route path="/payment-methods" element={<Layout><PaymentMethods /></Layout>} />
            <Route path="/receive-items" element={<Layout><ReceiveItems /></Layout>} />
            <Route path="/package-receiving" element={<Layout><PackageReceiving /></Layout>} />

            {/* Catch all - redirect to landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

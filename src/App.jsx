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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/gift-cards" element={<GiftCards />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/import-orders" element={<ImportOrders />} />
            <Route path="/email-import" element={<EmailImport />} />
            <Route path="/new-orders" element={<NewOrders />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/products" element={<Products />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/payment-methods" element={<PaymentMethods />} />
            <Route path="/receive-items" element={<ReceiveItems />} />
            <Route path="/package-receiving" element={<PackageReceiving />} />

            {/* Catch all - redirect to landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
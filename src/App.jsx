import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import Dashboard from '@/pages/Dashboard';
import Inventory from '@/pages/Inventory';
import Analytics from '@/pages/Analytics';
import Transactions from '@/pages/Transactions';
import Rewards from '@/pages/Rewards';
import GiftCards from '@/pages/GiftCards';
import Forecast from '@/pages/Forecast';
import Invoices from '@/pages/Invoices';
import Settings from '@/pages/Settings';
import ImportOrders from '@/pages/ImportOrders';
import NewOrders from '@/pages/NewOrders';
import CommandPalette from '@/components/CommandPalette';

export default function App() {
  useEffect(() => {
    // Import Marcellus font
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Marcellus&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  return (
    <AuthProvider>
      <Router>
        <CommandPalette />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/gift-cards" element={<GiftCards />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/import-orders" element={<ImportOrders />} />
          <Route path="/new-orders" element={<NewOrders />} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
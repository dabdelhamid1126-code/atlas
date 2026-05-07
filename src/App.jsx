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
  {/* Public routes - no protection */}
  <Route path="/" element={<LandingPage />} />
  <Route path="/login" element={<LoginPage />} />
  
  {/* Protected routes - ISSUE #2 FIX */}
  <Route 
    path="/Dashboard" 
    element={
      <ProtectedRoute>
        <Layout><Dashboard /></Layout>
      </ProtectedRoute>
    } 
  />
  
  <Route 
    path="/Inventory" 
    element={
      <ProtectedRoute>
        <Layout><Inventory /></Layout>
      </ProtectedRoute>
    } 
  />
  
  <Route 
    path="/Forecast" 
    element={
      <ProtectedRoute>
        <Layout><Forecast /></Layout>
      </ProtectedRoute>
    } 
  />
  
  <Route 
    path="/Transactions" 
    element={
      <ProtectedRoute>
        <Layout><Transactions /></Layout>
      </ProtectedRoute>
    } 
  />
  
  <Route 
    path="/Analytics" 
    element={
      <ProtectedRoute>
        <Layout><Analytics /></Layout>
      </ProtectedRoute>
    } 
  />
  
  <Route 
    path="/Rewards" 
    element={
      <ProtectedRoute>
        <Layout><Rewards /></Layout>
      </ProtectedRoute>
    } 
  />
  
  <Route 
    path="/Settings" 
    element={
      <ProtectedRoute>
        <Layout><Settings /></Layout>
      </ProtectedRoute>
    } 
  />
  
  <Route 
    path="/Invoices" 
    element={
      <ProtectedRoute>
        <Layout><Invoices /></Layout>
      </ProtectedRoute>
    } 
  />
  
  <Route 
    path="/ImportOrders" 
    element={
      <ProtectedRoute>
        <Layout><ImportOrders /></Layout>
      </ProtectedRoute>
    } 
  />
  
  {/* Add any other protected routes with same pattern */}
  
  {/* Catch-all for 404 */}
  <Route path="*" element={<NotFound />} />
</Routes>

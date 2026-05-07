import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './Layout';

// Import pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Forecast from './pages/Forecast';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import PaymentMethods from './pages/PaymentMethods';
import Settings from './pages/Settings';
import Invoices from './pages/Invoices';
import ImportOrders from './pages/ImportOrders';
import NewOrders from './pages/NewOrders';
import Goals from './pages/Goals';
import GiftCards from './pages/GiftCards';
import Products from './pages/Products';
import Expenses from './pages/Expenses';
import PurchaseOrders from './pages/PurchaseOrders';
import ReceiveItems from './pages/ReceiveItems';
import PackageReceiving from './pages/PackageReceiving';
import Rewards from './pages/Rewards';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <Routes>
            {/* PUBLIC ROUTES */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* PROTECTED DASHBOARD ROUTES */}
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
              path="/PaymentMethods" 
              element={
                <ProtectedRoute>
                  <Layout><PaymentMethods /></Layout>
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

            <Route 
              path="/NewOrders" 
              element={
                <ProtectedRoute>
                  <Layout><NewOrders /></Layout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/Goals" 
              element={
                <ProtectedRoute>
                  <Layout><Goals /></Layout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/GiftCards" 
              element={
                <ProtectedRoute>
                  <Layout><GiftCards /></Layout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/Products" 
              element={
                <ProtectedRoute>
                  <Layout><Products /></Layout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/Expenses" 
              element={
                <ProtectedRoute>
                  <Layout><Expenses /></Layout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/PurchaseOrders" 
              element={
                <ProtectedRoute>
                  <Layout><PurchaseOrders /></Layout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/ReceiveItems" 
              element={
                <ProtectedRoute>
                  <Layout><ReceiveItems /></Layout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/PackageReceiving" 
              element={
                <ProtectedRoute>
                  <Layout><PackageReceiving /></Layout>
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

            {/* 404 PAGE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </QueryClientProvider>
      </AuthProvider>
    </Router>
  );
}
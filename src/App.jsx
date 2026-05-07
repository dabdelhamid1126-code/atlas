import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Import your page components
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Forecast from './pages/Forecast';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Rewards from './pages/Rewards';
import Settings from './pages/Settings';
import Invoices from './pages/Invoices';
import ImportOrders from './pages/ImportOrders';
import NotFound from './pages/NotFound';
import Layout from './lib/Layout';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes - no protection */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes - ISSUE #2 FIX */}
          <Route 
            path="/Dashboard" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/Inventory" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Inventory />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/Forecast" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Forecast />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/Transactions" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Transactions />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/Analytics" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Analytics />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/Rewards" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Rewards />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/Settings" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/Invoices" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Invoices />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/ImportOrders" 
            element={
              <ProtectedRoute>
                <Layout>
                  <ImportOrders />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          {/* Catch-all for 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Import your page components
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Forecast from './pages/Forecast';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Rewards from './pages/Rewards';
import Settings from './pages/Settings';
import Invoices from './pages/Invoices';
import ImportOrders from './pages/ImportOrders';
import NotFound from './pages/NotFound';
import Layout from './lib/Layout';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes - no protection */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes - ISSUE #2 FIX */}
          <Route 
            path="/Dashboard" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/Inventory" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Inventory />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/Forecast" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Forecast />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/Transactions" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Transactions />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/Analytics" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Analytics />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/Rewards" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Rewards />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/Settings" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/Invoices" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Invoices />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/ImportOrders" 
            element={
              <ProtectedRoute>
                <Layout>
                  <ImportOrders />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          {/* Catch-all for 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

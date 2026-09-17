import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/common/Toast';
import { DesignProvider } from './context/DesignContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

import Layout from './components/layout/Layout';
import Login from './pages/Login';
import POS from './pages/POS';
import Mobiles from './pages/Mobiles';
import Accessories from './pages/Accessories';
import Returns from './pages/Returns';
import Debts from './pages/Debts';
import Installments from './pages/Installments';
import Suppliers from './pages/Suppliers';
import Reports from './pages/Reports';
import ScreenProtectors from './pages/ScreenProtectors';
import RestockAlerts from './pages/RestockAlerts';
import BarcodeStudio from './pages/BarcodeStudio';
import Administration from './pages/admin/Administration';
import AdminDashboard from './pages/admin/AdminDashboard';
import RootDirection from './components/layout/RootDirection';
import IPhoneWidgetsPage from './pages/IPhoneWidgetsPage';

// Setup optimized QueryClient with non-blocking cache
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

// A wrapper to handle permission-based routing with role-aware fallback
function ProtectedRoute({ 
  element, 
  module, 
  action = 'view' 
}: { 
  element: React.ReactNode; 
  module?: string; 
  action?: string; 
}) {
  const { user, loading, hasPermission, isTechnician, isCashier, isAdmin } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  // Default home route based on role
  const fallbackHome = isTechnician 
    ? '/returns' 
    : (isCashier ? '/pos' : (isAdmin ? '/pos' : '/pos'));

  if (module && !hasPermission(module, action)) {
    return <Navigate to={fallbackHome} replace />;
  }
  
  return <>{element}</>;
}

import { ReminderScanner } from './components/notifications/ReminderScanner';

function AppContent() {
  const { user, loading, isTechnician } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-slate-400 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm font-medium tracking-wide">Starting Nali Mobile OS...</div>
      </div>
    );
  }

  const defaultHome = isTechnician ? '/returns' : '/pos';

  return (
    <>
      {user && <ReminderScanner />}
      <BrowserRouter>
        <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to={defaultHome} replace />} />
        <Route path="/widgets" element={<IPhoneWidgetsPage />} />
        <Route path="/widgets/iphone" element={<IPhoneWidgetsPage />} />
        
        <Route path="/" element={user ? <Layout /> : <Navigate to="/login" replace />}>
          <Route index element={<Navigate to={defaultHome} replace />} />
          
          <Route path="pos" element={<ProtectedRoute element={<POS />} module="sales" action="view" />} />
          <Route path="returns" element={<ProtectedRoute element={<Returns />} module="rma_returns" action="view" />} />
          <Route path="mobiles" element={<ProtectedRoute element={<Mobiles />} module="inventory_mobiles" action="view" />} />
          <Route path="accessories" element={<ProtectedRoute element={<Accessories />} module="inventory_accessories" action="view" />} />
          <Route path="restock-alerts" element={<ProtectedRoute element={<RestockAlerts />} module="inventory_accessories" action="view" />} />
          <Route path="debts" element={<ProtectedRoute element={<Debts />} module="debts_installments" action="view" />} />
          <Route path="installments" element={<ProtectedRoute element={<Installments />} module="debts_installments" action="view" />} />
          <Route path="suppliers" element={<ProtectedRoute element={<Suppliers />} module="suppliers" action="view" />} />
          <Route path="reports" element={<ProtectedRoute element={<Reports />} module="reports_finance" action="view" />} />
          <Route path="screen-protectors" element={<ProtectedRoute element={<ScreenProtectors />} module="inventory_accessories" action="view" />} />
          <Route path="barcodes" element={<ProtectedRoute element={<BarcodeStudio />} module="inventory_accessories" action="view" />} />
          
          {/* Admin routes */}
          <Route path="admin" element={<ProtectedRoute element={<Administration />} module="admin_users" action="view" />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<ProtectedRoute element={<AdminDashboard initialTab="users" />} module="admin_users" action="view" />} />
            <Route path="users" element={<ProtectedRoute element={<AdminDashboard initialTab="users" />} module="admin_users" action="view" />} />
            <Route path="roles" element={<ProtectedRoute element={<AdminDashboard initialTab="roles" />} module="admin_users" action="edit" />} />
            <Route path="security" element={<ProtectedRoute element={<AdminDashboard initialTab="security" />} module="admin_security" action="view" />} />
            <Route path="devices" element={<ProtectedRoute element={<AdminDashboard initialTab="devices" />} module="admin_security" action="view" />} />
            <Route path="sessions" element={<ProtectedRoute element={<AdminDashboard initialTab="devices" />} module="admin_security" action="view" />} />
            <Route path="audit" element={<ProtectedRoute element={<AdminDashboard initialTab="audit" />} module="admin_security" action="view" />} />
          </Route>
          
          <Route path="*" element={<Navigate to={defaultHome} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </>
  );
}

export default function App() {
  return (
    <DesignProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <NotificationProvider>
              <RootDirection />
              <AppContent />
            </NotificationProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </DesignProvider>
  );
}

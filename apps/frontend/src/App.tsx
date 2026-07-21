import React, { Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';

import { DashboardLayout } from './components/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { GuestRoute } from './components/GuestRoute';
import { KeyboardShortcutsProvider } from './components/KeyboardShortcutsProvider';
import { BackendHealthCheck } from './components/BackendHealthCheck';
import { ConfirmProvider } from './components/ConfirmProvider';
import { useTokenRefresh } from './hooks/useTokenRefresh';

// Lazy loading pages with Default Export
const ProductsPage = React.lazy(() => import('./pages/products/ProductsPage'));
const CustomersPage = React.lazy(() => import('./pages/customers/CustomersPage'));
const SuppliersPage = React.lazy(() => import('./pages/suppliers/SuppliersPage'));
const ExpensesPage = React.lazy(() => import('./pages/expenses/ExpensesPage'));
const PurchasesPage = React.lazy(() => import('./pages/purchases/PurchasesPage'));
const SalesPage = React.lazy(() => import('./pages/sales/SalesPage'));
const SettingsPage = React.lazy(() => import('./pages/settings/SettingsPage'));
const UsersManagementPage = React.lazy(() => import('./pages/settings/UsersManagementPage'));
const BackupPage = React.lazy(() => import('./pages/settings/BackupPage'));
const FiscalConfigPage = React.lazy(() => import('./pages/configuration/FiscalConfigPage'));
const IncomesPage = React.lazy(() => import('./pages/incomes/IncomesPage'));

// Lazy loading pages with Named Export
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const CashRegisterPage = React.lazy(() => import('./pages/CashRegisterPage').then(module => ({ default: module.CashRegisterPage })));
const CustomerAccountsPage = React.lazy(() => import('./features/customer-accounts').then(module => ({ default: module.CustomerAccountsPage })));
const AccountStatementPage = React.lazy(() => import('./features/customer-accounts').then(module => ({ default: module.AccountStatementPage })));
const ReportsPage = React.lazy(() => import('./features/reports').then(module => ({ default: module.ReportsPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  // Hook para renovar automáticamente el refresh token
  useTokenRefresh();

  return (
    <BackendHealthCheck>
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          {/* Usamos HashRouter en lugar de BrowserRouter para compatibilidad con file:// URLs en Electron */}
          <HashRouter>
            <KeyboardShortcutsProvider>
              <Suspense fallback={
                <div className="flex h-screen w-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }>
                <Routes>
                  {/* Rutas públicas (solo para no logueados) */}
                  <Route path="/login" element={
                    <GuestRoute>
                      <LoginPage />
                    </GuestRoute>
                  } />

                  {/* Rutas protegidas */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="products" element={<ProductsPage />} />
                    <Route path="customers" element={<CustomersPage />} />
                    <Route path="suppliers" element={<SuppliersPage />} />
                    <Route path="purchases" element={<PurchasesPage />} />
                    <Route path="sales" element={<SalesPage />} />
                    <Route path="expenses" element={<ExpensesPage />} />
                    <Route path="incomes" element={<IncomesPage />} />
                    <Route path="cash-register" element={<CashRegisterPage />} />
                    <Route path="customer-accounts" element={<CustomerAccountsPage />} />
                    <Route path="customer-accounts/:customerId" element={<AccountStatementPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="settings/fiscal" element={<FiscalConfigPage />} />
                    <Route path="settings/users" element={<UsersManagementPage />} />
                    <Route path="settings/backup" element={<BackupPage />} />
                  </Route>

                  {/* Ruta 404 */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </KeyboardShortcutsProvider>
          </HashRouter>

          {/* Toast notifications */}
          <Toaster position="top-center" richColors />
        </ConfirmProvider>
      </QueryClientProvider>
    </BackendHealthCheck>
  );
}

export default App;

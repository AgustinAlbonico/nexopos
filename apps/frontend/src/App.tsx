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
const LocationsPage = React.lazy(() => import('./features/locations').then(module => ({ default: module.LocationsPage })));
const ActivationWizardPage = React.lazy(() => import('./features/locations').then(module => ({ default: module.ActivationWizardPage })));
const ReplenishmentPage = React.lazy(() => import('./features/locations').then(module => ({ default: module.ReplenishmentPage })));

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
                  >                    <Route index element={<ProtectedRoute requiredCapability="dashboard"><Navigate to="/dashboard" replace /></ProtectedRoute>} />
                    <Route path="dashboard" element={<ProtectedRoute requiredCapability="dashboard" requiredRoles={['admin', 'manager', 'cashier']}><DashboardPage /></ProtectedRoute>} />
                    <Route path="products" element={<ProtectedRoute requiredCapability="products" requiredRoles={['admin', 'manager']}><ProductsPage /></ProtectedRoute>} />
                    <Route path="customers" element={<ProtectedRoute requiredCapability="customers" requiredRoles={['admin', 'manager', 'cashier']}><CustomersPage /></ProtectedRoute>} />
                    <Route path="suppliers" element={<ProtectedRoute requiredCapability="suppliers" requiredRoles={['admin', 'manager']}><SuppliersPage /></ProtectedRoute>} />
                    <Route path="purchases" element={<ProtectedRoute requiredCapability="purchases" requiredRoles={['admin', 'manager']}><PurchasesPage /></ProtectedRoute>} />
                    <Route path="sales" element={<ProtectedRoute requiredCapability="sales" requiredRoles={['admin', 'manager', 'cashier']}><SalesPage /></ProtectedRoute>} />
                    <Route path="expenses" element={<ProtectedRoute requiredCapability="expenses" requiredRoles={['admin', 'manager']}><ExpensesPage /></ProtectedRoute>} />
                    <Route path="incomes" element={<ProtectedRoute requiredCapability="incomes" requiredRoles={['admin', 'manager']}><IncomesPage /></ProtectedRoute>} />
                    <Route path="cash-register" element={<ProtectedRoute requiredCapability="cash-register" requiredRoles={['admin', 'manager', 'cashier']}><CashRegisterPage /></ProtectedRoute>} />
                    <Route path="customer-accounts" element={<ProtectedRoute requiredCapability="customer-accounts" requiredRoles={['admin', 'manager']}><CustomerAccountsPage /></ProtectedRoute>} />
                    <Route path="customer-accounts/:customerId" element={<ProtectedRoute requiredCapability="customer-accounts" requiredRoles={['admin', 'manager']}><AccountStatementPage /></ProtectedRoute>} />
                    <Route path="reports" element={<ProtectedRoute requiredCapability="reports" requiredRoles={['admin', 'manager']}><ReportsPage /></ProtectedRoute>} />
                    <Route path="settings" element={<ProtectedRoute requiredCapability="settings" requiredRoles={['admin']}><SettingsPage /></ProtectedRoute>} />
                    <Route path="settings/fiscal" element={<ProtectedRoute requiredCapability="settings/fiscal" requiredRoles={['admin']}><FiscalConfigPage /></ProtectedRoute>} />
                    <Route path="settings/users" element={<ProtectedRoute requiredCapability="settings/users" requiredRoles={['admin']}><UsersManagementPage /></ProtectedRoute>} />
                    <Route path="settings/backup" element={<ProtectedRoute requiredCapability="settings/backup" requiredRoles={['admin']}><BackupPage /></ProtectedRoute>} />
                    <Route path="inventory/locations" element={<ProtectedRoute requiredCapability="inventory/locations" requiredRoles={['admin', 'manager']}><LocationsPage /></ProtectedRoute>} />
                    <Route path="inventory/locations/activate" element={<ProtectedRoute requiredCapability="inventory/locations/activate" requiredRoles={['admin', 'manager']}><ActivationWizardPage /></ProtectedRoute>} />
                    <Route path="inventory/replenishment" element={<ProtectedRoute requiredCapability="inventory/replenishment" requiredRoles={['admin', 'manager']}><ReplenishmentPage /></ProtectedRoute>} />
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

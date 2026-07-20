import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from './DashboardPage';
import type { DashboardSummary } from '@/features/reports/types';
import type { BackupStatusResponse } from '@/features/backup/types';

type DashboardQueryState = {
    readonly data: DashboardSummary | undefined;
    readonly isLoading: boolean;
    readonly error: Error | null;
};

const mocks = vi.hoisted(() => ({
    navigate: vi.fn(),
    useDashboard: vi.fn<[], DashboardQueryState>(),
    getBackupStatus: vi.fn<[], Promise<BackupStatusResponse>>(),
}));

vi.mock('react-router-dom', () => ({
    useNavigate: vi.fn(() => mocks.navigate),
    Link: ({ children, to }: { readonly children: ReactNode; readonly to: string }) => (
        <a href={to}>{children}</a>
    ),
}));

vi.mock('../stores/auth.store', () => ({
    useAuthStore: (selector: (state: { readonly user: { readonly firstName: string } }) => unknown) =>
        selector({ user: { firstName: 'Agustín' } }),
}));

vi.mock('@/features/reports/hooks/useDashboard', () => ({
    useDashboard: mocks.useDashboard,
}));

vi.mock('@/features/backup/api/backup.api', () => ({
    backupApi: {
        getStatus: mocks.getBackupStatus,
    },
}));

function createDashboardSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
    const base: DashboardSummary = {
        today: {
            sales: { revenue: 750000, count: 50 },
            expenses: { amount: 10000, count: 2 },
            purchases: { amount: 25000, count: 1 },
            netCashFlow: 715000,
        },
        week: {
            sales: { revenue: 900000, count: 80, growth: 5.5 },
            expenses: { amount: 30000, count: 6, growth: -2.1 },
        },
        month: {
            sales: { revenue: 1500000, count: 100, growth: 12.5 },
            expenses: { amount: 200000, count: 12, growth: 3.2 },
            netProfit: 1000000,
            netMargin: 66.7,
        },
        inventory: {
            totalProducts: 500,
            lowStock: 15,
            outOfStock: 3,
            totalValue: 1250000,
        },
        accounts: {
            totalDebt: 45000,
            overdueAccounts: 2,
        },
        cashRegister: {
            isOpen: true,
            balance: 125000,
            openedBy: 'Agustín',
            openedAt: '2026-07-20T09:30:00.000Z',
        },
        charts: {
            last7Days: [
                { date: '2026-07-14', revenue: 100000, salesCount: 10 },
                { date: '2026-07-15', revenue: 120000, salesCount: 12 },
            ],
        },
        topProducts: [
            { productId: 'product-1', productName: 'Producto Test', quantitySold: 8, revenue: 80000 },
        ],
        alerts: {
            cashClosed: false,
            lowStockCount: 15,
            outOfStockCount: 3,
            overdueAccountsCount: 2,
        },
    };

    return { ...base, ...overrides };
}

function createBackupStatus(overrides: Partial<BackupStatusResponse> = {}): BackupStatusResponse {
    return {
        hasBackupThisMonth: true,
        lastBackupDate: '2026-07-15T10:00:00.000Z',
        lastBackupMonth: 'julio 2026',
        needsBackup: false,
        ...overrides,
    };
}

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    return function Wrapper({ children }: { readonly children: ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
}

function mockDashboardSuccess(summary: DashboardSummary = createDashboardSummary()): void {
    mocks.useDashboard.mockReturnValue({ data: summary, isLoading: false, error: null });
}

describe('DashboardPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDashboardSuccess();
        mocks.getBackupStatus.mockResolvedValue(createBackupStatus());
    });

    describe('renderizado inicial', () => {
        it('debe mostrar indicador visual de carga mientras carga los datos', () => {
            mocks.useDashboard.mockReturnValue({ data: undefined, isLoading: true, error: null });

            const { container } = render(<DashboardPage />, { wrapper: createWrapper() });

            expect(container.querySelector('.animate-spin')).toBeInTheDocument();
        });

        it('debe renderizar el saludo del dashboard cuando cargan los datos', async () => {
            render(<DashboardPage />, { wrapper: createWrapper() });

            expect(await screen.findByText(/¡Hola, Agustín!/i)).toBeInTheDocument();
        });
    });

    describe('métricas de ventas', () => {
        it('debe mostrar las métricas de ventas cuando cargan', async () => {
            render(<DashboardPage />, { wrapper: createWrapper() });

            expect(await screen.findByText(/Ventas Hoy/i)).toBeInTheDocument();
            expect(screen.getAllByText(/50 ventas/i).length).toBeGreaterThan(0);
        });

        it('debe mostrar el monto total de ventas del mes formateado', async () => {
            render(<DashboardPage />, { wrapper: createWrapper() });

            expect(await screen.findByText(/Ventas Mes/i)).toBeInTheDocument();
            expect(screen.getByText(/\$\s?1\.500\.000/i)).toBeInTheDocument();
        });
    });

    describe('métricas de productos', () => {
        it('debe mostrar alerta de stock bajo cuando hay productos con poco stock', async () => {
            render(<DashboardPage />, { wrapper: createWrapper() });

            expect(await screen.findByText(/15 producto\(s\) con stock bajo/i)).toBeInTheDocument();
        });

        it('debe mostrar el total de productos activos', async () => {
            render(<DashboardPage />, { wrapper: createWrapper() });

            expect(await screen.findByText(/500 productos activos/i)).toBeInTheDocument();
        });
    });

    describe('estado de caja', () => {
        it('debe mostrar el monto actual de la caja abierta', async () => {
            render(<DashboardPage />, { wrapper: createWrapper() });

            expect(await screen.findByText(/Caja Abierta/i)).toBeInTheDocument();
            expect(screen.getByText(/\$\s?125\.000/i)).toBeInTheDocument();
        });

        it('debe mostrar alerta si no hay caja abierta', async () => {
            mockDashboardSuccess(createDashboardSummary({
                cashRegister: { isOpen: false, balance: 0, openedBy: null, openedAt: null },
                alerts: {
                    cashClosed: true,
                    lowStockCount: 0,
                    outOfStockCount: 0,
                    overdueAccountsCount: 0,
                },
            }));

            render(<DashboardPage />, { wrapper: createWrapper() });

            expect(await screen.findByText(/Caja Cerrada/i)).toBeInTheDocument();
            expect(screen.getByText(/Debe abrir caja para comenzar a operar/i)).toBeInTheDocument();
            expect(screen.getByText(/No hay caja abierta/i)).toBeInTheDocument();
        });
    });

    describe('backup', () => {
        it('debe mostrar alerta de backup cuando el estado lo requiere', async () => {
            mocks.getBackupStatus.mockResolvedValue(createBackupStatus({
                hasBackupThisMonth: false,
                lastBackupDate: null,
                lastBackupMonth: null,
                needsBackup: true,
            }));

            render(<DashboardPage />, { wrapper: createWrapper() });

            expect(await screen.findByText(/No hay ningún backup realizado/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Crear Backup/i })).toBeInTheDocument();
        });
    });

    describe('manejo de errores', () => {
        it('debe mostrar mensaje de error si falla la carga de datos', async () => {
            mocks.useDashboard.mockReturnValue({
                data: undefined,
                isLoading: false,
                error: new Error('Error al cargar'),
            });

            render(<DashboardPage />, { wrapper: createWrapper() });

            expect(await screen.findByText(/Error al cargar el dashboard/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument();
        });
    });

    describe('acciones rápidas', () => {
        it('debe tener botón para iniciar una nueva venta', async () => {
            render(<DashboardPage />, { wrapper: createWrapper() });

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Nueva Venta/i })).toBeInTheDocument();
            });
        });
    });
});

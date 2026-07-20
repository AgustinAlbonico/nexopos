/**
 * Página principal del Dashboard
 * Muestra KPIs, estado de caja, gráficos y alertas
 */
import { useAuthStore } from '../stores/auth.store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    ShoppingCart,
    Users,
    Package,
    AlertTriangle,
    Clock,
    Wallet,
    Plus,
    ArrowRight,
    Trophy,
    Database,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useDashboard } from '@/features/reports/hooks/useDashboard';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { backupApi } from '@/features/backup/api/backup.api';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

/**
 * Formatea un número como moneda argentina
 */
function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

/**
 * Formatea un porcentaje con signo
 */
function formatGrowth(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
}

export function DashboardPage() {
    const user = useAuthStore((state) => state.user);
    const navigate = useNavigate();
    const { data: dashboard, isLoading, error } = useDashboard();

    // Query para obtener estado del backup
    const { data: backupStatus } = useQuery({
        queryKey: ['backup-status'],
        queryFn: backupApi.getStatus,
        staleTime: 1000 * 60 * 5, // 5 minutos
    });

    // Estado de carga
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-64 xl:min-h-80 2xl:min-h-96">
                <div className="animate-spin rounded-full h-10 w-10 xl:h-12 xl:w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Estado de error
    if (error || !dashboard) {
        return (
            <div className="flex flex-col items-center justify-center min-h-64 xl:min-h-80 2xl:min-h-96 space-y-4">
                <AlertTriangle className="h-12 w-12 xl:h-16 xl:w-16 text-destructive" />
                <p className="text-lg text-muted-foreground">Error al cargar el dashboard</p>
                <Button onClick={() => globalThis.location.reload()}>Reintentar</Button>
            </div>
        );
    }

    const hasAlerts = dashboard.alerts.cashClosed ||
        dashboard.alerts.lowStockCount > 0 ||
        dashboard.alerts.outOfStockCount > 0 ||
        dashboard.alerts.overdueAccountsCount > 0 ||
        backupStatus?.needsBackup;

    return (
        <div className="space-y-4 xl:space-y-6">
            {/* Header con saludo y acciones rápidas */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 wide:gap-4">
                <div>
                    <h1 className="text-2xl xl:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                        ¡Hola, {user?.firstName}!
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {new Date().toLocaleDateString('es-AR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={() => {
                            if (dashboard.alerts.cashClosed) {
                                toast.error('Debe abrir la caja antes de registrar una venta');
                                return;
                            }
                            navigate('/sales');
                        }}
                        className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Venta
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            if (dashboard.alerts.cashClosed) {
                                toast.error('Debe abrir la caja antes de registrar un ingreso');
                                return;
                            }
                            navigate('/incomes');
                        }}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Registrar Ingreso
                    </Button>
                </div>
            </div>

            {/* Panel de Alertas */}
            {hasAlerts && (
                <Card className="border-yellow-500/50 bg-gradient-to-r from-yellow-500/5 to-orange-500/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                            <AlertTriangle className="h-5 w-5" />
                            Alertas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {dashboard.alerts.cashClosed && (
                            <div className="flex items-center justify-between p-2 rounded-lg bg-destructive/10">
                                <span className="text-sm text-destructive font-medium">
                                    ⚠️ No hay caja abierta - No podrás registrar ventas
                                </span>
                                <Button size="sm" variant="destructive" onClick={() => navigate('/cash-register')}>
                                    Abrir Caja
                                </Button>
                            </div>
                        )}
                        {backupStatus?.needsBackup && (
                            <div className="flex items-center justify-between p-2 rounded-lg bg-cyan-500/10">
                                <span className="text-sm text-cyan-700 dark:text-cyan-400 flex items-center gap-2">
                                    <Database className="h-4 w-4" />
                                    {backupStatus.lastBackupMonth
                                        ? `Backup última vez realizado en ${backupStatus.lastBackupMonth}`
                                        : 'No hay ningún backup realizado - Se recomienda crear uno'}
                                </span>
                                <Button size="sm" variant="ghost" onClick={() => navigate('/settings/backup')}>
                                    Crear Backup
                                </Button>
                            </div>
                        )}
                        {dashboard.alerts.outOfStockCount > 0 && (
                            <div className="flex items-center justify-between p-2 rounded-lg bg-destructive/10">
                                <span className="text-sm text-destructive">
                                    📦 {dashboard.alerts.outOfStockCount} producto(s) sin stock
                                </span>
                                <Button size="sm" variant="ghost" onClick={() => navigate('/products')}>
                                    Ver
                                </Button>
                            </div>
                        )}
                        {dashboard.alerts.lowStockCount > 0 && (
                            <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10">
                                <span className="text-sm text-yellow-700 dark:text-yellow-400">
                                    📦 {dashboard.alerts.lowStockCount} producto(s) con stock bajo
                                </span>
                                <Button size="sm" variant="ghost" onClick={() => navigate('/products')}>
                                    Ver
                                </Button>
                            </div>
                        )}
                        {dashboard.alerts.overdueAccountsCount > 0 && (
                            <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10">
                                <span className="text-sm text-yellow-700 dark:text-yellow-400">
                                    💳 {dashboard.alerts.overdueAccountsCount} cuenta(s) vencidas
                                </span>
                                <Button size="sm" variant="ghost" onClick={() => navigate('/customer-accounts')}>
                                    Ver
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* KPIs principales */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 wide:grid-cols-5 2xl:gap-4">
                {/* Ventas del día */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 wide:w-20 wide:h-20 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-bl-full" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs xl:text-sm font-medium text-muted-foreground">Ventas Hoy</CardTitle>
                        <ShoppingCart className="h-3 w-3 xl:h-4 xl:w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl xl:text-2xl font-bold text-emerald-600">
                            {formatCurrency(dashboard.today.sales.revenue)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {dashboard.today.sales.count} {dashboard.today.sales.count === 1 ? 'venta' : 'ventas'}
                        </p>
                    </CardContent>
                </Card>

                {/* Ventas del mes */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 wide:w-20 wide:h-20 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs xl:text-sm font-medium text-muted-foreground">Ventas Mes</CardTitle>
                        <TrendingUp className="h-3 w-3 xl:h-4 xl:w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl xl:text-2xl font-bold text-blue-600">
                            {formatCurrency(dashboard.month.sales.revenue)}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            {dashboard.month.sales.growth >= 0 ? (
                                <TrendingUp className="h-3 w-3 text-emerald-600" />
                            ) : (
                                <TrendingDown className="h-3 w-3 text-destructive" />
                            )}
                            <span className={`text-xs font-medium ${dashboard.month.sales.growth >= 0 ? 'text-emerald-600' : 'text-destructive'
                                }`}>
                                {formatGrowth(dashboard.month.sales.growth)} vs mes anterior
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Resultado neto */}
                <Card className="relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-12 h-12 wide:w-20 wide:h-20 bg-gradient-to-br ${dashboard.month.netProfit >= 0 ? 'from-emerald-500/20' : 'from-destructive/20'
                        } to-transparent rounded-bl-full`} />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs xl:text-sm font-medium text-muted-foreground">Resultado Mes</CardTitle>
                        <DollarSign className={`h-3 w-3 xl:h-4 xl:w-4 ${dashboard.month.netProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-xl xl:text-2xl font-bold ${dashboard.month.netProfit >= 0 ? 'text-emerald-600' : 'text-destructive'
                            }`}>
                            {formatCurrency(dashboard.month.netProfit)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Margen: {dashboard.month.netMargin.toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>

                {/* Deudores */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 wide:w-20 wide:h-20 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-full" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs xl:text-sm font-medium text-muted-foreground">Deudores</CardTitle>
                        <Users className="h-3 w-3 xl:h-4 xl:w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl xl:text-2xl font-bold text-purple-600">
                            {formatCurrency(dashboard.accounts.totalDebt)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {dashboard.accounts.overdueAccounts > 0 && (
                                <span className="text-destructive">{dashboard.accounts.overdueAccounts} vencidas</span>
                            )}
                            {dashboard.accounts.overdueAccounts === 0 && 'Sin cuentas vencidas'}
                        </p>
                    </CardContent>
                </Card>

                {/* Inventario */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 wide:w-20 wide:h-20 bg-gradient-to-br from-orange-500/20 to-transparent rounded-bl-full" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs xl:text-sm font-medium text-muted-foreground">Inventario</CardTitle>
                        <Package className="h-3 w-3 xl:h-4 xl:w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl xl:text-2xl font-bold text-orange-600">
                            {formatCurrency(dashboard.inventory.totalValue)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {dashboard.inventory.totalProducts} productos activos
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Estado de Caja + Gráfico */}
            <div className="grid gap-4 xl:gap-6 xl:grid-cols-3">
                {/* Estado de Caja */}
                <Card className={`xl:col-span-1 ${dashboard.cashRegister.isOpen
                    ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-500/5 to-transparent'
                    : 'border-destructive/50 bg-gradient-to-br from-destructive/5 to-transparent'
                    }`}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {dashboard.cashRegister.isOpen ? (
                                <>
                                    <div className="h-3 w-3 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-emerald-700 dark:text-emerald-400">Caja Abierta</span>
                                </>
                            ) : (
                                <>
                                    <Clock className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-muted-foreground">Caja Cerrada</span>
                                </>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {dashboard.cashRegister.isOpen ? (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-2xl xl:text-3xl font-bold text-emerald-600">
                                        {formatCurrency(dashboard.cashRegister.balance)}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Abierta por {dashboard.cashRegister.openedBy}
                                        {dashboard.cashRegister.openedAt && (
                                            <> a las {new Date(dashboard.cashRegister.openedAt).toLocaleTimeString('es-AR', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}</>
                                        )}
                                    </p>
                                </div>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => navigate('/cash-register')}
                                >
                                    <Wallet className="h-4 w-4 mr-2" />
                                    Ver Caja
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-muted-foreground">
                                    Debe abrir caja para comenzar a operar
                                </p>
                                <Button
                                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500"
                                    onClick={() => navigate('/cash-register')}
                                >
                                    <Wallet className="h-4 w-4 mr-2" />
                                    Abrir Caja
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Gráfico de ventas */}
                <Card className="xl:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Ventas Últimos 7 Días
                        </CardTitle>
                        <CardDescription>Ingresos diarios de la última semana</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={dashboard.charts.last7Days}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(date) => new Date(date + 'T12:00:00').toLocaleDateString('es-AR', {
                                        day: '2-digit',
                                        month: '2-digit'
                                    })}
                                    className="text-xs"
                                />
                                <YAxis
                                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                    className="text-xs"
                                />
                                <Tooltip
                                    formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                                    labelFormatter={(date) => new Date(date + 'T12:00:00').toLocaleDateString('es-AR', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long'
                                    })}
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px',
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Top Productos del Mes */}
            {dashboard.topProducts.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-yellow-500" />
                                <CardTitle>Top 5 Productos del Mes</CardTitle>
                            </div>
                            <Link to="/reports" className="text-sm text-primary hover:underline flex items-center gap-1">
                                Ver más <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <CardDescription>Los productos más vendidos este mes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {dashboard.topProducts.map((product, index) => (
                                <div key={product.productId} className="flex items-center gap-4">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-white
                                        ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                                                index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                                                    'bg-gradient-to-br from-primary/60 to-primary'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{product.productName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {product.quantitySold} {product.quantitySold === 1 ? 'unidad vendida' : 'unidades vendidas'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-primary">{formatCurrency(product.revenue)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Flujo de caja del día */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Hoy</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl xl:text-2xl font-bold text-emerald-600">
                            {formatCurrency(dashboard.today.sales.revenue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {dashboard.today.sales.count} ventas completadas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs xl:text-sm font-medium text-muted-foreground">Egresos Hoy</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl xl:text-2xl font-bold text-destructive">
                            {formatCurrency(dashboard.today.expenses.amount + dashboard.today.purchases.amount)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {dashboard.today.expenses.count + dashboard.today.purchases.count} movimientos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs xl:text-sm font-medium text-muted-foreground">Flujo Neto Hoy</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-xl xl:text-2xl font-bold ${dashboard.today.netCashFlow >= 0 ? 'text-emerald-600' : 'text-destructive'
                            }`}>
                            {formatCurrency(dashboard.today.netCashFlow)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {dashboard.today.netCashFlow >= 0 ? 'Balance positivo' : 'Balance negativo'}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

/**
 * Página de Configuración del Sistema
 * - % de ganancia por defecto
 * - Stock mínimo global para alertas
 * - Enlaces a configuraciones adicionales
 * - Estado del servidor y base de datos
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    Settings,
    Percent,
    Save,
    RefreshCw,
    Package,
    FileText,
    ChevronRight,
    Users,
    TrendingUp,
    AlertTriangle,
    Loader2,
    Database,
    Activity,
    CheckCircle,
    XCircle,
    Server,
    Scan,
    ShoppingCart,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { BarcodeScannerTest } from './components/BarcodeScannerTest';

interface SystemConfiguration {
    id: string;
    defaultProfitMargin: number;
    minStockAlert: number;
    barcodeScannerEnabled: boolean;
    barcodeScannerTimeoutMs: number;
    allowOutOfStockSale: boolean;
    createdAt: string;
    updatedAt: string;
}

interface HealthStatus {
    status: 'ok' | 'error';
    timestamp: string;
    uptime: number;
    services: {
        api: { status: 'up' | 'down' };
        database: { status: 'up' | 'down' };
    };
}

export default function SettingsPage() {
    const queryClient = useQueryClient();
    const [profitMargin, setProfitMargin] = useState('');
    const [minStock, setMinStock] = useState('');
    const [barcodeScannerEnabled, setBarcodeScannerEnabled] = useState(false);
    const [barcodeScannerTimeoutMs, setBarcodeScannerTimeoutMs] = useState('100');
    const [allowOutOfStockSale, setAllowOutOfStockSale] = useState(false);
    const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
    const [isCheckingHealth, setIsCheckingHealth] = useState(false);

    // Obtener configuración actual
    const { data: config, isLoading } = useQuery({
        queryKey: ['configuration'],
        queryFn: async (): Promise<SystemConfiguration> => {
            const res = await api.get('/api/configuration');
            return res.data;
        },
    });

    // Actualizar cuando se carga la configuración
    useEffect(() => {
        if (config) {
            setProfitMargin(Number(config.defaultProfitMargin).toString());
            setMinStock(Number(config.minStockAlert).toString());
            setBarcodeScannerEnabled(config.barcodeScannerEnabled);
            setBarcodeScannerTimeoutMs(Number(config.barcodeScannerTimeoutMs).toString());
            setAllowOutOfStockSale(config.allowOutOfStockSale);
        }
    }, [config]);

    // Mutation para guardar configuración
    const saveMutation = useMutation({
        mutationFn: async (data: { defaultProfitMargin?: number; minStockAlert?: number; barcodeScannerEnabled?: boolean; barcodeScannerTimeoutMs?: number; allowOutOfStockSale?: boolean }) => {
            const res = await api.patch('/api/configuration', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['configuration'] });
            queryClient.invalidateQueries({ queryKey: ['inventory', 'low-stock'] });
            toast.success('Configuración guardada');
        },
        onError: () => {
            toast.error('Error al guardar');
        },
    });

    // Mutation para actualizar todos los precios
    const updatePricesMutation = useMutation({
        mutationFn: async (margin: number) => {
            const res = await api.post('/api/configuration/update-all-prices', { defaultProfitMargin: margin });
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['configuration'] });
            toast.success(`¡${data.updated} productos actualizados al ${data.margin}% de ganancia!`);
        },
        onError: () => {
            toast.error('Error al actualizar precios');
        },
    });

    const handleSave = () => {
        const margin = Number.parseFloat(profitMargin);
        const stock = Number.parseInt(minStock);
        const timeout = Number.parseInt(barcodeScannerTimeoutMs);

        if (Number.isNaN(margin) || margin < 0) {
            toast.error('Ingrese un % de ganancia válido');
            return;
        }
        if (Number.isNaN(stock) || stock < 0) {
            toast.error('Ingrese un stock mínimo válido');
            return;
        }
        if (Number.isNaN(timeout) || timeout < 0) {
            toast.error('Ingrese un timeout de scanner válido');
            return;
        }

        saveMutation.mutate({
            defaultProfitMargin: margin,
            minStockAlert: stock,
            barcodeScannerEnabled,
            barcodeScannerTimeoutMs: timeout,
            allowOutOfStockSale,
        });
    };

    // Función para verificar estado del servidor y BD
    const checkHealth = async () => {
        setIsCheckingHealth(true);
        setHealthStatus(null);

        try {
            const res = await api.get('/api/health');
            const health: HealthStatus = res.data;
            setHealthStatus(health);

            if (health.status === 'ok') {
                toast.success('✅ Servidor y base de datos funcionando correctamente');
            } else {
                toast.error('⚠️ Hay problemas con algún servicio');
            }
        } catch {
            setHealthStatus({
                status: 'error',
                timestamp: new Date().toISOString(),
                uptime: 0,
                services: {
                    api: { status: 'down' },
                    database: { status: 'down' },
                },
            });
            toast.error('❌ No se pudo conectar al servidor');
        } finally {
            setIsCheckingHealth(false);
        }
    };

    // Formatear tiempo de uptime
    const formatUptime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const calculatedPrice = (100 * (1 + (Number.parseFloat(profitMargin) || 0) / 100)).toFixed(2);

    return (
        <div className="flex justify-center">
            <div className="w-full max-w-3xl space-y-8 py-4">
                {/* Header con gradiente */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border p-8">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                    <div className="relative flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center shadow-lg shadow-primary/10">
                            <Settings className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                Configuración
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Ajustes generales del sistema
                            </p>
                        </div>
                    </div>
                </div>

                {/* Grid de configuraciones principales */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Card: Margen de Ganancia */}
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="p-5 bg-gradient-to-r from-green-500/10 to-emerald-500/5 border-b">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-green-500/15 flex items-center justify-center">
                                    <Percent className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">% de Ganancia</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Margen sobre el costo
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <Label htmlFor="profitMargin" className="text-sm font-medium">
                                    Porcentaje por defecto
                                </Label>
                                <div className="flex gap-2 items-center mt-2">
                                    <NumericInput
                                        id="profitMargin"
                                        value={profitMargin}
                                        onChange={(e) => setProfitMargin(e.target.value)}
                                        className="w-24 text-center font-semibold"
                                    />
                                    <span className="text-muted-foreground font-medium text-lg">%</span>
                                </div>
                            </div>

                            {/* Preview visual */}
                            <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 p-4 border border-green-200/50 dark:border-green-900/50">
                                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    Vista previa
                                </p>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="text-center">
                                        <p className="text-muted-foreground text-xs">Costo</p>
                                        <p className="font-semibold">$100</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-green-600 font-medium">
                                        <span>+{profitMargin || 0}%</span>
                                        <ChevronRight className="h-4 w-4" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-muted-foreground text-xs">Venta</p>
                                        <p className="font-bold text-green-600 text-lg">${calculatedPrice}</p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={() => {
                                    const margin = Number.parseFloat(profitMargin);
                                    if (Number.isNaN(margin) || margin < 0) {
                                        toast.error('Ingrese un % de ganancia válido');
                                        return;
                                    }
                                    updatePricesMutation.mutate(margin);
                                }}
                                disabled={updatePricesMutation.isPending}
                                variant="outline"
                                size="sm"
                                className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-950"
                            >
                                {updatePricesMutation.isPending ? (
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                ) : (
                                    <RefreshCw className="mr-2 h-3 w-3" />
                                )}
                                Aplicar a todos los productos
                            </Button>
                        </div>
                    </div>

                    {/* Card: Stock Mínimo */}
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="p-5 bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border-b">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                                    <Package className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Stock Mínimo</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Umbral para alertas
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <Label htmlFor="minStock" className="text-sm font-medium">
                                    Cantidad mínima
                                </Label>
                                <div className="flex gap-2 items-center mt-2">
                                    <NumericInput
                                        id="minStock"
                                        allowDecimals={false}
                                        value={minStock}
                                        onChange={(e) => setMinStock(e.target.value)}
                                        className="w-24 text-center font-semibold"
                                    />
                                    <span className="text-muted-foreground font-medium">unidades</span>
                                </div>
                            </div>

                            {/* Info visual */}
                            <div className="rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 p-4 border border-amber-200/50 dark:border-amber-900/50">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium text-amber-800 dark:text-amber-300">
                                            Alerta de stock bajo
                                        </p>
                                        <p className="text-muted-foreground text-xs mt-1">
                                            Te notificaremos cuando un producto tenga
                                            <strong className="text-amber-700 dark:text-amber-400"> {minStock || 0} o menos </strong>
                                            unidades
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Placeholder para alinear altura */}
                            <div className="h-9" />
                        </div>
                    </div>

                    {/* Card: Lector de Códigos de Barras */}
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="p-5 bg-gradient-to-r from-blue-500/10 to-indigo-500/5 border-b">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                                    <Scan className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Lector de Barras</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Configuración del scanner
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-medium">Habilitar scanner</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Permite usar lector de códigos de barras en ventas
                                    </p>
                                </div>
                                <Switch
                                    checked={barcodeScannerEnabled}
                                    onCheckedChange={setBarcodeScannerEnabled}
                                />
                            </div>

                            <div>
                                <Label htmlFor="scannerTimeout" className="text-sm font-medium">
                                    Timeout entre teclas (ms)
                                </Label>
                                <div className="flex gap-2 items-center mt-2">
                                    <NumericInput
                                        id="scannerTimeout"
                                        allowDecimals={false}
                                        value={barcodeScannerTimeoutMs}
                                        onChange={(e) => setBarcodeScannerTimeoutMs(e.target.value)}
                                        className="w-24 text-center font-semibold"
                                    />
                                    <span className="text-muted-foreground font-medium">ms</span>
                                </div>
                            </div>

                            {/* Info visual */}
                            <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 p-4 border border-blue-200/50 dark:border-blue-900/50">
                                <div className="text-sm">
                                    <p className="font-medium text-blue-800 dark:text-blue-300">
                                        Detección de scanner
                                    </p>
                                    <p className="text-muted-foreground text-xs mt-1">
                                        Si el tiempo entre teclas es menor a <strong className="text-blue-700 dark:text-blue-400">{barcodeScannerTimeoutMs || 0}ms</strong>, se considera entrada de scanner
                                    </p>
                                </div>
                            </div>

                            <BarcodeScannerTest timeoutMs={Number.parseInt(barcodeScannerTimeoutMs) || 100} />
                        </div>
                    </div>

                    {/* Card: Venta sin Stock */}
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="p-5 bg-gradient-to-r from-rose-500/10 to-red-500/5 border-b">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-rose-500/15 flex items-center justify-center">
                                    <ShoppingCart className="h-5 w-5 text-rose-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Venta sin Stock</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Permitir ventas con stock en cero
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-medium">Permitir venta sin stock</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Cargar y vender productos aunque no tengan stock disponible
                                    </p>
                                </div>
                                <Switch
                                    checked={allowOutOfStockSale}
                                    onCheckedChange={setAllowOutOfStockSale}
                                />
                            </div>

                            <div className="rounded-xl bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/20 p-4 border border-rose-200/50 dark:border-rose-900/50">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium text-rose-800 dark:text-rose-300">
                                            {allowOutOfStockSale ? 'Habilitado' : 'Deshabilitado (por defecto)'}
                                        </p>
                                        <p className="text-muted-foreground text-xs mt-1">
                                            {allowOutOfStockSale
                                                ? 'Los productos aparecen en el buscador aunque su stock sea cero. Al vender, el stock queda negativo.'
                                                : 'Los productos con stock en cero o negativo no aparecen en el buscador de ventas.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="h-9" />
                        </div>
                    </div>
                </div>

                {/* Botón Guardar */}
                <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20"
                    size="lg"
                >
                    {saveMutation.isPending ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-5 w-5" />
                    )}
                    {saveMutation.isPending ? 'Guardando...' : 'Guardar Configuración'}
                </Button>

                {/* Separador */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-4 text-muted-foreground font-medium">
                            Más opciones
                        </span>
                    </div>
                </div>

                {/* Cards de navegación */}
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Facturación Fiscal */}
                    <Link to="/settings/fiscal" className="block group">
                        <div className="rounded-xl border bg-card shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer overflow-hidden">
                            <div className="p-5 flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        Facturación Fiscal
                                    </h3>
                                    <p className="text-sm text-muted-foreground truncate">
                                        AFIP, certificados y entorno
                                    </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    </Link>

                    {/* Usuarios del Sistema */}
                    <Link to="/settings/users" className="block group">
                        <div className="rounded-xl border bg-card shadow-sm hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer overflow-hidden">
                            <div className="p-5 flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-base group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                        Usuarios del Sistema
                                    </h3>
                                    <p className="text-sm text-muted-foreground truncate">
                                        Gestionar accesos y permisos
                                    </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    </Link>

                    {/* Copias de Seguridad */}
                    <Link to="/settings/backup" className="block group">
                        <div className="rounded-xl border bg-card shadow-sm hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-700 transition-all cursor-pointer overflow-hidden">
                            <div className="p-5 flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <Database className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-base group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                        Copias de Seguridad
                                    </h3>
                                    <p className="text-sm text-muted-foreground truncate">
                                        Backups de la base de datos
                                    </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-cyan-600 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    </Link>

                    {/* Estado del Sistema */}
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden md:col-span-2">
                        <div className="p-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border-b">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                                        <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">Estado del Sistema</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Verificar conexión al servidor y base de datos
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    onClick={checkHealth}
                                    disabled={isCheckingHealth}
                                    variant="outline"
                                    size="sm"
                                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950"
                                >
                                    {isCheckingHealth ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                    )}
                                    Verificar Estado
                                </Button>
                            </div>
                        </div>

                        {healthStatus && (
                            <div className="p-5">
                                <div className="grid grid-cols-3 gap-4">
                                    {/* API Status */}
                                    <div className="rounded-lg bg-muted/50 p-4 text-center">
                                        <div className="flex items-center justify-center mb-2">
                                            <Server className="h-5 w-5 text-muted-foreground mr-2" />
                                            <span className="text-sm font-medium">API</span>
                                        </div>
                                        <div className="flex items-center justify-center gap-2">
                                            {healthStatus.services.api.status === 'up' ? (
                                                <>
                                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                                    <span className="text-green-600 dark:text-green-400 font-semibold">Online</span>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="h-5 w-5 text-red-500" />
                                                    <span className="text-red-600 dark:text-red-400 font-semibold">Offline</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Database Status */}
                                    <div className="rounded-lg bg-muted/50 p-4 text-center">
                                        <div className="flex items-center justify-center mb-2">
                                            <Database className="h-5 w-5 text-muted-foreground mr-2" />
                                            <span className="text-sm font-medium">Base de Datos</span>
                                        </div>
                                        <div className="flex items-center justify-center gap-2">
                                            {healthStatus.services.database.status === 'up' ? (
                                                <>
                                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                                    <span className="text-green-600 dark:text-green-400 font-semibold">Online</span>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="h-5 w-5 text-red-500" />
                                                    <span className="text-red-600 dark:text-red-400 font-semibold">Offline</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Uptime */}
                                    <div className="rounded-lg bg-muted/50 p-4 text-center">
                                        <div className="flex items-center justify-center mb-2">
                                            <Activity className="h-5 w-5 text-muted-foreground mr-2" />
                                            <span className="text-sm font-medium">Uptime</span>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <span className="text-lg font-bold text-foreground">
                                                {formatUptime(healthStatus.uptime)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Página de Configuración del Sistema
 * Organizada por secciones claras: Parámetros comerciales, Hardware/Periféricos, Navegación y Perfil/Capacidades.
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
    SlidersHorizontal,
    HardDrive,
    Boxes,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarcodeScannerTest } from './components/BarcodeScannerTest';
import { CapabilitiesTab } from './CapabilitiesTab';
import { ActivationBanner } from '@/features/locations';
import { TicketConfigForm } from '@/features/configuration/components/TicketConfigForm';
import { Printer } from 'lucide-react';

interface SystemConfiguration {
    id: string;
    defaultProfitMargin: number;
    minStockAlert: number;
    barcodeScannerEnabled: boolean;
    barcodeScannerTimeoutMs: number;
    allowOutOfStockSale: boolean;
    stockSectorizado?: boolean;
    primarySaleLocationId?: string | null;
    defaultReceiveLocationId?: string | null;
    stockMinimoVenta?: number;
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
            toast.success('Configuración guardada exitosamente');
        },
        onError: () => {
            toast.error('Error al guardar la configuración');
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
            <div className="w-full max-w-4xl space-y-8 py-4">
                {/* Header Principal */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Settings className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Configuración del Sistema
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Parámetros generales, rubro y capacidades operativas
                            </p>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="general" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3 max-w-xl mx-auto">
                        <TabsTrigger value="general" className="flex items-center gap-2">
                            <SlidersHorizontal className="h-4 w-4" />
                            Ajustes Generales
                        </TabsTrigger>
                        <TabsTrigger value="ticket" className="flex items-center gap-2">
                            <Printer className="h-4 w-4" />
                            Tiquetera y Tickets
                        </TabsTrigger>
                        <TabsTrigger value="capabilities" className="flex items-center gap-2">
                            <SlidersHorizontal className="h-4 w-4" />
                            Rubro y Capacidades
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-8">
                        {/* Sección 1: Parámetros Comerciales */}
                        <div className="space-y-4">
                            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                                <Percent className="h-4 w-4 text-primary" />
                                Parámetros Comerciales y Stock
                            </h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Card: Margen de Ganancia */}
                                <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col justify-between">
                                    <div className="p-5 border-b bg-muted/20">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-green-500/15 flex items-center justify-center">
                                                <Percent className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-sm">% de Ganancia General</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    Margen por defecto sobre el costo
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 space-y-4 flex-1">
                                        <div>
                                            <Label htmlFor="profitMargin" className="text-xs font-medium">
                                                Porcentaje por defecto
                                            </Label>
                                            <div className="flex gap-2 items-center mt-1.5">
                                                <NumericInput
                                                    id="profitMargin"
                                                    value={profitMargin}
                                                    onChange={(e) => setProfitMargin(e.target.value)}
                                                    className="w-24 text-center font-semibold"
                                                />
                                                <span className="text-muted-foreground font-medium text-sm">%</span>
                                            </div>
                                        </div>

                                        {/* Preview visual */}
                                        <div className="rounded-lg bg-emerald-500/10 p-3 border border-emerald-500/20 text-xs">
                                            <p className="text-muted-foreground mb-2 flex items-center gap-1 font-medium">
                                                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                                                Ejemplo de cálculo
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span>Costo: $100</span>
                                                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                                    + {profitMargin || 0}% ➔ Venta: ${calculatedPrice}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 border-t bg-muted/10">
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
                                            className="w-full text-xs border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-300"
                                        >
                                            {updatePricesMutation.isPending ? (
                                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                            )}
                                            Aplicar % a todos los productos
                                        </Button>
                                    </div>
                                </div>

                                {/* Card: Stock Mínimo y Alertas */}
                                <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col justify-between">
                                    <div className="p-5 border-b bg-muted/20">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center">
                                                <Package className="h-5 w-5 text-amber-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-sm">Alerta de Stock Mínimo</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    Umbral para avisos de reposición
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 space-y-4 flex-1">
                                        <div>
                                            <Label htmlFor="minStock" className="text-xs font-medium">
                                                Cantidad mínima global
                                            </Label>
                                            <div className="flex gap-2 items-center mt-1.5">
                                                <NumericInput
                                                    id="minStock"
                                                    allowDecimals={false}
                                                    value={minStock}
                                                    onChange={(e) => setMinStock(e.target.value)}
                                                    className="w-24 text-center font-semibold"
                                                />
                                                <span className="text-muted-foreground font-medium text-xs">unidades</span>
                                            </div>
                                        </div>

                                        <div className="rounded-lg bg-amber-500/10 p-3 border border-amber-500/20 text-xs">
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                                <p className="text-muted-foreground">
                                                    Alerta automática cuando el stock sea menor o igual a <strong className="text-amber-800 dark:text-amber-300">{minStock || 0} unidades</strong>.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sección 2: Hardware y Reglas de Caja */}
                        <div className="space-y-4 pt-2">
                            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                                <HardDrive className="h-4 w-4 text-primary" />
                                Periféricos y Operativa de Venta
                            </h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Card: Lector de Código de Barras */}
                                <div className="rounded-xl border bg-card shadow-sm p-5 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-blue-500/15 flex items-center justify-center">
                                            <Scan className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-sm">Lector de Código de Barras</h3>
                                            <p className="text-xs text-muted-foreground">Configuración del scanner USB/Bluetooth</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <Label className="text-xs font-medium">Habilitar scanner en caja</Label>
                                        <Switch
                                            checked={barcodeScannerEnabled}
                                            onCheckedChange={setBarcodeScannerEnabled}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="scannerTimeout" className="text-xs font-medium">
                                            Timeout detección (ms)
                                        </Label>
                                        <div className="flex gap-2 items-center mt-1.5">
                                            <NumericInput
                                                id="scannerTimeout"
                                                allowDecimals={false}
                                                value={barcodeScannerTimeoutMs}
                                                onChange={(e) => setBarcodeScannerTimeoutMs(e.target.value)}
                                                className="w-24 text-center font-semibold"
                                            />
                                            <span className="text-muted-foreground text-xs font-medium">ms</span>
                                        </div>
                                    </div>

                                    <BarcodeScannerTest timeoutMs={Number.parseInt(barcodeScannerTimeoutMs) || 100} />
                                </div>

                                {/* Card: Venta sin Stock */}
                                <div className="rounded-xl border bg-card shadow-sm p-5 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-rose-500/15 flex items-center justify-center">
                                            <ShoppingCart className="h-5 w-5 text-rose-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-sm">Venta sin Stock Disponible</h3>
                                            <p className="text-xs text-muted-foreground">Permitir vender con stock cero o negativo</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <Label className="text-xs font-medium">Permitir vender sin stock</Label>
                                        <Switch
                                            checked={allowOutOfStockSale}
                                            onCheckedChange={setAllowOutOfStockSale}
                                        />
                                    </div>

                                    <div className="rounded-lg bg-rose-500/10 p-3 border border-rose-500/20 text-xs">
                                        <p className="text-muted-foreground">
                                            {allowOutOfStockSale
                                                ? '⚠️ Habilitado: Los productos se pueden vender aunque tengan stock en cero (queda negativo).'
                                                : '🔒 Deshabilitado: Los productos con stock en cero se ocultan del buscador de ventas.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Card: Múltiples Depósitos / Sucursales */}
                                <div className="rounded-xl border bg-card shadow-sm p-5 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                                            <Boxes className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-sm">Control por Múltiples Depósitos</h3>
                                            <p className="text-xs text-muted-foreground">Gestión sectorizada y reposición entre depósito y salón</p>
                                        </div>
                                    </div>

                                    {config?.stockSectorizado ? (
                                        <div className="space-y-3 pt-2">
                                            <div className="rounded-lg bg-emerald-500/10 p-3 border border-emerald-500/20 text-xs flex items-center justify-between">
                                                <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                                                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                                                    Modo Sectorizado Activo
                                                </span>
                                                <Link to="/inventory/locations">
                                                    <Button variant="outline" size="sm" className="h-7 text-xs">
                                                        Gestionar Ubicaciones
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 pt-2">
                                            <p className="text-xs text-muted-foreground">
                                                Por defecto el sistema opera en modo depósito único. Si tu comercio requiere gestionar depósitos adicionales o sucursales, podés habilitarlo.
                                            </p>
                                            <Link to="/inventory/locations/activate" className="block">
                                                <Button variant="outline" size="sm" className="w-full text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300">
                                                    <Boxes className="mr-2 h-3.5 w-3.5" />
                                                    Habilitar Múltiples Depósitos
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Botón Guardar Cambios */}
                        <div className="pt-4">
                            <Button
                                onClick={handleSave}
                                disabled={saveMutation.isPending}
                                className="w-full h-11 text-sm font-semibold shadow-md"
                                size="lg"
                            >
                                {saveMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                {saveMutation.isPending ? 'Guardando...' : 'Guardar Ajustes Generales'}
                            </Button>
                        </div>

                        {/* Accesos Rápidos adicionales */}
                        <div className="space-y-4 pt-4 border-t">
                            <h2 className="text-base font-semibold text-foreground">
                                Accesos Rápidos de Administración
                            </h2>

                            <div className="grid md:grid-cols-3 gap-4">
                                <Link to="/settings/fiscal" className="block group">
                                    <div className="rounded-xl border bg-card p-4 hover:shadow-md hover:border-blue-500/40 transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-5 w-5 text-blue-600" />
                                                <span className="font-semibold text-xs">Facturación Fiscal</span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>
                                </Link>

                                <Link to="/settings/users" className="block group">
                                    <div className="rounded-xl border bg-card p-4 hover:shadow-md hover:border-purple-500/40 transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Users className="h-5 w-5 text-purple-600" />
                                                <span className="font-semibold text-xs">Usuarios y Permisos</span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>
                                </Link>

                                <Link to="/settings/backup" className="block group">
                                    <div className="rounded-xl border bg-card p-4 hover:shadow-md hover:border-cyan-500/40 transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Database className="h-5 w-5 text-cyan-600" />
                                                <span className="font-semibold text-xs">Copias de Seguridad</span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>
                                </Link>
                            </div>

                            {/* Card Diagnóstico de Estado */}
                            <div className="rounded-xl border bg-card shadow-sm p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Activity className="h-5 w-5 text-emerald-600" />
                                        <div>
                                            <h3 className="font-semibold text-sm">Estado del Servidor y Base de Datos</h3>
                                            <p className="text-xs text-muted-foreground">Verificar salud de conexión</p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={checkHealth}
                                        disabled={isCheckingHealth}
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                    >
                                        {isCheckingHealth ? (
                                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                        )}
                                        Verificar Estado
                                    </Button>
                                </div>

                                {healthStatus && (
                                    <div className="grid grid-cols-3 gap-3 pt-2">
                                        <div className="rounded-lg bg-muted/40 p-3 text-center text-xs">
                                            <span className="text-muted-foreground block mb-1">API Backend</span>
                                            {healthStatus.services.api.status === 'up' ? (
                                                <span className="text-green-600 font-bold flex items-center justify-center gap-1">
                                                    <CheckCircle className="h-3.5 w-3.5" /> Online
                                                </span>
                                            ) : (
                                                <span className="text-red-600 font-bold flex items-center justify-center gap-1">
                                                    <XCircle className="h-3.5 w-3.5" /> Offline
                                                </span>
                                            )}
                                        </div>

                                        <div className="rounded-lg bg-muted/40 p-3 text-center text-xs">
                                            <span className="text-muted-foreground block mb-1">Base de Datos</span>
                                            {healthStatus.services.database.status === 'up' ? (
                                                <span className="text-green-600 font-bold flex items-center justify-center gap-1">
                                                    <CheckCircle className="h-3.5 w-3.5" /> Online
                                                </span>
                                            ) : (
                                                <span className="text-red-600 font-bold flex items-center justify-center gap-1">
                                                    <XCircle className="h-3.5 w-3.5" /> Offline
                                                </span>
                                            )}
                                        </div>

                                        <div className="rounded-lg bg-muted/40 p-3 text-center text-xs">
                                            <span className="text-muted-foreground block mb-1">Tiempo de Actividad</span>
                                            <span className="font-bold text-foreground">
                                                {formatUptime(healthStatus.uptime)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="ticket">
                        <TicketConfigForm />
                    </TabsContent>

                    <TabsContent value="capabilities">
                        <CapabilitiesTab />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

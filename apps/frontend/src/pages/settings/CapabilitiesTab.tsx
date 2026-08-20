import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ChevronLeft,
    ChevronRight,
    Loader2,
    Lock,
    Search,
    SlidersHorizontal,
    Store,
    Unlock,
} from 'lucide-react';
import { toast } from 'sonner';

import { BusinessOnboardingModal, BUSINESS_TYPES } from '@/components/BusinessOnboardingModal';
import { TechnicianKeyModal } from '@/components/TechnicianKeyModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCapabilities } from '@/hooks/useCapabilities';
import { api } from '@/lib/axios';

// Diccionario de traducciones, descripciones claras y categorías para cada capacidad
export const CAPABILITY_METADATA: Record<string, { label: string; description: string; category: string }> = {
    // Estructural
    'STRUCTURAL.decimal_quantities': { label: 'Cantidades Decimales / Fraccionadas', description: 'Permite ingresar cantidades no enteras (ej: 0.350 kg, 1.5 metros de cable).', category: 'Estructural' },
    'STRUCTURAL.weight_scale': { label: 'Conexión con Balanza Comercial', description: 'Habilita la integración directa y lectura automática del peso en balanzas.', category: 'Estructural' },
    'STRUCTURAL.variants': { label: 'Matriz de Variantes (Talle, Color, Material)', description: 'Permite administrar productos con combinaciones de talle, color y modelo.', category: 'Estructural' },
    'STRUCTURAL.lot_expiry': { label: 'Control de Lotes y Fechas de Vencimiento', description: 'Registra trazabilidad por número de lote y fecha de expiración de artículos.', category: 'Estructural' },
    'STRUCTURAL.serial_warranty': { label: 'Números de Serie e IMEI', description: 'Registra identificadores únicos por unidad para seguimiento de garantía.', category: 'Estructural' },
    'STRUCTURAL.consignment': { label: 'Gestión de Consignación', description: 'Administra inventario consignado de terceros.', category: 'Estructural' },
    'STRUCTURAL.wholesale_price_lists': { label: 'Listas de Precio Mayorista', description: 'Habilita precios diferenciados por tipo de cliente o volumen de compra.', category: 'Estructural' },
    'STRUCTURAL.unit_pack': { label: 'Presentaciones por Unidad y Bulto', description: 'Maneja equivalencias entre unidades sueltas, cajas o paquetes.', category: 'Estructural' },
    'STRUCTURAL.sellable_pack': { label: 'Packs y Combos Vendibles', description: 'Permite armar kits o conjuntos de productos agrupados.', category: 'Estructural' },
    'STRUCTURAL.bundle': { label: 'Bundles / Ofertas Empaquetadas', description: 'Permite la agrupación promocional de artículos.', category: 'Estructural' },
    'STRUCTURAL.acopio_management': { label: 'Gestión de Acopios y Entregas Parciales', description: 'Permite congelar precio con cobro anticipado y despachar en entregas parciales por remito.', category: 'Estructural' },
    'STRUCTURAL.lazy_serial_scan': { label: 'Asignación Tardía de Serial en Cobro', description: 'Pide el escaneo de número de serie/IMEI recién en la pantalla final de cobro.', category: 'Estructural' },

    // Herramientas
    'TOOLING.catalog_import': { label: 'Importación Masiva de Catálogos (Excel/CSV)', description: 'Permite cargar miles de productos y actualizar precios desde planillas.', category: 'Herramientas' },
    'TOOLING.product_labels': { label: 'Impresión de Etiquetas de Código de Barras', description: 'Genera etiquetas térmicas o de góndola con precio y código.', category: 'Herramientas' },
    'TOOLING.stocktake': { label: 'Toma e Inventario Asistido', description: 'Proceso de conteo físico guiado para ajustar diferencias de stock.', category: 'Herramientas' },
    'TOOLING.inventory_audit': { label: 'Auditoría e Historial de Stock', description: 'Registro detallado de quién y cuándo modificó las existencias de productos.', category: 'Herramientas' },
    'TOOLING.restore_safety': { label: 'Protección para Restauración de Copias', description: 'Resguardo de seguridad al restaurar bases de datos.', category: 'Herramientas' },
    'TOOLING.updater_recovery': { label: 'Recuperación de Actualizaciones', description: 'Mecanismo de recuperación ante fallos de versión.', category: 'Herramientas' },
    'TOOLING.peripheral_diagnostics': { label: 'Diagnóstico de Periféricos', description: 'Pruebas de conexión con lectores de barras, impresoras y balanzas.', category: 'Herramientas' },
    'TOOLING.blind_cash_closing': { label: 'Cierre Ciego de Caja', description: 'Obliga al cajero a contar el dinero sin mostrar el saldo esperado para evitar manipulación.', category: 'Herramientas' },
    'TOOLING.park_sales': { label: 'Ventas en Espera / Multi-carrito', description: 'Permite pausar carritos de clientes y atender a otros en fila sin perder la venta.', category: 'Herramientas' },
    'TOOLING.quick_cash_pay': { label: 'Botones de Billetes Rápidos y Vuelto Gigante', description: 'Botonera táctil de cobro exprés en efectivo con vuelto automático.', category: 'Herramientas' },

    // Comercial
    'COMMERCIAL.quantity_breaks': { label: 'Descuento Escalonado por Cantidad', description: 'Aplica precios especiales automáticamente al superar umbrales de cantidad.', category: 'Comercial' },
    'COMMERCIAL.time_bound_promotion': { label: 'Promociones por Tiempo y Fecha', description: 'Ofertas programadas entre fechas y horas específicas.', category: 'Comercial' },
    'COMMERCIAL.coupon': { label: 'Cupones de Descuento', description: 'Códigos alfanuméricos promocionales para aplicar en caja.', category: 'Comercial' },
    'COMMERCIAL.loyalty': { label: 'Programa de Fidelización y Puntos', description: 'Acumulación de puntos por compras canjeables por descuentos.', category: 'Comercial' },
    'COMMERCIAL.store_credit': { label: 'Crédito en Tienda / Vales a Favor', description: 'Saldos a favor del cliente utilizables en compras futuras.', category: 'Comercial' },
    'COMMERCIAL.customer_credit_limit': { label: 'Límite de Crédito en Cuenta Corriente', description: 'Control de saldo máximo para compras fiadas con alerta de sobregiro.', category: 'Comercial' },
    'COMMERCIAL.volume_discount_rules': { label: 'Reglas de Volumen Comercial', description: 'Descuentos por bultos o escalas de compra.', category: 'Comercial' },

    // Políticas
    'POLICY.manual_discount_reason': { label: 'Exigir Motivo para Descuentos Manuales', description: 'Solicita al vendedor justificar por escrito cualquier descuento aplicado.', category: 'Políticas' },
    'POLICY.price_override_reason': { label: 'Exigir Motivo para Cambio de Precio', description: 'Solicita justificación al modificar el precio unitario en la caja.', category: 'Políticas' },
    'POLICY.whole_sale_only_cancellation': { label: 'Restricción de Anulación de Ventas', description: 'Limita la anulación de tickets solo a usuarios con rol administrador.', category: 'Políticas' },

    // Fiscal
    'FISCALITY.credit_notes_a': { label: 'Notas de Crédito A (Fiscal ARCA)', description: 'Permite emitir notas de crédito para facturas electrónicas A.', category: 'Fiscal' },
    'FISCALITY.credit_notes_b': { label: 'Notas de Crédito B (Fiscal ARCA)', description: 'Permite emitir notas de crédito para facturas electrónicas B.', category: 'Fiscal' },
    'FISCALITY.credit_notes_c': { label: 'Notas de Crédito C (Fiscal ARCA)', description: 'Permite emitir notas de crédito para facturas electrónicas C.', category: 'Fiscal' },

    // Navegación / Rutas
    'APP_ROUTES.dashboard': { label: 'Módulo: Panel Principal (Dashboard)', description: 'Muestra estadísticas generales e indicadores del negocio.', category: 'Navegación' },
    'APP_ROUTES.products': { label: 'Módulo: Productos e Inventario', description: 'Acceso a la gestión del catálogo de artículos.', category: 'Navegación' },
    'APP_ROUTES.customers': { label: 'Módulo: Clientes', description: 'Acceso a la agenda y fichas de clientes.', category: 'Navegación' },
    'APP_ROUTES.suppliers': { label: 'Módulo: Proveedores', description: 'Acceso a la gestión de proveedores.', category: 'Navegación' },
    'APP_ROUTES.purchases': { label: 'Módulo: Compras', description: 'Acceso al registro de compras y recepción de mercadería.', category: 'Navegación' },
    'APP_ROUTES.sales': { label: 'Módulo: Ventas (Punto de Venta / Caja)', description: 'Acceso al mostrador de cobro y emisión de comprobantes.', category: 'Navegación' },
    'APP_ROUTES.expenses': { label: 'Módulo: Egresos y Gastos', description: 'Registro de gastos operativos del comercio.', category: 'Navegación' },
    'APP_ROUTES.incomes': { label: 'Módulo: Ingresos Varios', description: 'Registro de ingresos extraordinarios no provenientes de ventas.', category: 'Navegación' },
    'APP_ROUTES.cash_register': { label: 'Módulo: Caja y Movimientos de Dinero', description: 'Control de apertura, cierres y arqueos de caja.', category: 'Navegación' },
    'APP_ROUTES.customer_accounts': { label: 'Módulo: Cuentas Corrientes', description: 'Gestión de fiados y cobranzas a clientes.', category: 'Navegación' },
    'APP_ROUTES.reports': { label: 'Módulo: Reportes y Estadísticas', description: 'Informes de ventas, stock y rentabilidad.', category: 'Navegación' },
    'APP_ROUTES.settings': { label: 'Módulo: Configuración del Sistema', description: 'Acceso a los ajustes generales.', category: 'Navegación' },
    'APP_ROUTES.settings_fiscal': { label: 'Módulo: Configuración Fiscal (AFIP/ARCA)', description: 'Ajustes de facturación electrónica y certificados.', category: 'Navegación' },
    'APP_ROUTES.settings_users': { label: 'Módulo: Gestión de Usuarios y Permisos', description: 'Control de cuentas de empleados y roles.', category: 'Navegación' },
    'APP_ROUTES.settings_backup': { label: 'Módulo: Copias de Seguridad', description: 'Creación y restauración de backups de datos.', category: 'Navegación' },
    'APP_ROUTES.inventory_locations': { label: 'Módulo: Depósitos y Ubicaciones', description: 'Gestión de stock sectorizado por depósito o sucursal.', category: 'Navegación' },
    'APP_ROUTES.inventory_locations_activate': { label: 'Módulo: Activación Multi-Ubicación', description: 'Asistente para habilitar depósito sectorizado.', category: 'Navegación' },
    'APP_ROUTES.inventory_replenishment': { label: 'Módulo: Reposición de Salón', description: 'Alertas de reposición desde depósito a salón de ventas.', category: 'Navegación' },
};

const ITEMS_PER_PAGE = 8;

export function CapabilitiesTab() {
    const queryClient = useQueryClient();
    const { data, isLoading, isError } = useCapabilities();

    // Estado técnico y modales
    const [technicianKey, setTechnicianKey] = useState<string | null>(null);
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [showOnboardingModal, setShowOnboardingModal] = useState(false);

    // Estado de filtro y paginación
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
    const [currentPage, setCurrentPage] = useState(1);

    const updateCapabilitiesMutation = useMutation({
        mutationFn: async (capabilities: Record<string, boolean>) => {
            await api.patch('/api/configuration/capabilities', { capabilities });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['configuration', 'capabilities'] });
            toast.success('Capacidad actualizada correctamente');
        },
        onError: () => {
            toast.error('No se pudo actualizar la capacidad');
        },
    });

    // Resetear a página 1 al filtrar
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory]);

    const isUnlocked = Boolean(technicianKey);

    // Filtrar y preparar las capacidades
    const allCapabilitiesList = useMemo(() => {
        if (!data) return [];

        return Object.entries(data.capabilities).map(([key, enabled]) => {
            const meta = CAPABILITY_METADATA[key] ?? {
                label: key,
                description: 'Capacidad técnica de sistema.',
                category: 'General',
            };
            return {
                key,
                enabled,
                label: meta.label,
                description: meta.description,
                category: meta.category,
            };
        });
    }, [data]);

    const categories = useMemo(() => {
        const set = new Set<string>();
        for (const item of allCapabilitiesList) {
            set.add(item.category);
        }
        return ['TODAS', ...Array.from(set).sort()];
    }, [allCapabilitiesList]);

    const filteredCapabilities = useMemo(() => {
        return allCapabilitiesList.filter((item) => {
            const matchesCategory =
                selectedCategory === 'TODAS' || item.category === selectedCategory;
            const term = searchTerm.toLowerCase().trim();
            const matchesSearch =
                !term ||
                item.label.toLowerCase().includes(term) ||
                item.description.toLowerCase().includes(term) ||
                item.key.toLowerCase().includes(term);

            return matchesCategory && matchesSearch;
        });
    }, [allCapabilitiesList, selectedCategory, searchTerm]);

    // Paginación
    const totalPages = Math.ceil(filteredCapabilities.length / ITEMS_PER_PAGE) || 1;
    const paginatedCapabilities = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredCapabilities.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredCapabilities, currentPage]);

    if (isLoading) {
        return (
            <div className="flex h-40 items-center justify-center rounded-xl border bg-card">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
                No se pudo cargar la configuración de capacidades.
            </div>
        );
    }

    const currentType = BUSINESS_TYPES.find((t) => t.key === data.selectedBusinessType);

    const handleOpenChangeRubro = () => {
        if (!isUnlocked) {
            setShowKeyModal(true);
            toast.info('Ingresá la clave técnica para cambiar el rubro de negocio');
            return;
        }
        setShowOnboardingModal(true);
    };

    return (
        <div className="space-y-6">
            {/* Header: Rubro Activo & Candado Técnico */}
            <div className="rounded-xl border bg-card shadow-sm">
                <div className="flex flex-col gap-4 border-b bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                            <SlidersHorizontal className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-lg">Rubro del Negocio</h2>
                            <p className="text-xs text-muted-foreground">
                                Rubro configurado:{' '}
                                <strong className="font-semibold text-foreground">
                                    {currentType?.label ?? 'No configurado (Venta Simple)'}
                                </strong>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleOpenChangeRubro}>
                            <Store className="mr-2 h-4 w-4" />
                            Cambiar Rubro
                        </Button>

                        {isUnlocked ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setTechnicianKey(null)}
                                className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                            >
                                <Unlock className="mr-2 h-4 w-4" />
                                Modo Técnico Activo
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" onClick={() => setShowKeyModal(true)}>
                                <Lock className="mr-2 h-4 w-4 text-amber-500" />
                                Desbloquear Modo Técnico
                            </Button>
                        )}
                    </div>
                </div>

                {!isUnlocked && (
                    <div className="bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300">
                        🔒 <strong>Modo Protegido:</strong> Los interruptores de capacidades y el cambio de rubro están bloqueados. Hacé click en <strong>Desbloquear Modo Técnico</strong> e ingresá la clave técnica para realizar modificaciones.
                    </div>
                )}
            </div>

            {/* Panel de Funcionalidades / Capacidades con Buscador y Paginador */}
            <div className="rounded-xl border bg-card shadow-sm">
                <div className="space-y-4 border-b p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-semibold text-base">Funcionalidades del Sistema</h2>
                            <p className="text-xs text-muted-foreground">
                                Activá o desactivá funciones específicas del punto de venta.
                            </p>
                        </div>
                        {/* Buscador */}
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar funcionalidad..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-9 text-xs"
                            />
                        </div>
                    </div>

                    {/* Filtro por Categorías */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setSelectedCategory(cat)}
                                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                                    selectedCategory === cat
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lista Paginada */}
                <div className="divide-y">
                    {paginatedCapabilities.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            No se encontraron funcionalidades que coincidan con la búsqueda.
                        </div>
                    ) : (
                        paginatedCapabilities.map((item) => (
                            <div
                                key={item.key}
                                className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="space-y-1 pr-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Label
                                            htmlFor={`capability-${item.key}`}
                                            className="font-medium text-sm text-foreground cursor-pointer"
                                        >
                                            {item.label}
                                        </Label>
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                                            {item.category}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center">
                                    <Switch
                                        id={`capability-${item.key}`}
                                        aria-label={item.label}
                                        checked={item.enabled}
                                        disabled={!isUnlocked || updateCapabilitiesMutation.isPending}
                                        onCheckedChange={(checked) =>
                                            updateCapabilitiesMutation.mutate({
                                                ...data.capabilities,
                                                [item.key]: checked,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Control de Paginación */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t p-4 text-xs text-muted-foreground">
                        <span>
                            Mostrando {paginatedCapabilities.length} de {filteredCapabilities.length} capacidades
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                className="h-8 px-2"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="font-medium text-foreground">
                                Página {currentPage} de {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                className="h-8 px-2"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modales */}
            <TechnicianKeyModal
                open={showKeyModal}
                onOpenChange={setShowKeyModal}
                onUnlocked={(key) => setTechnicianKey(key)}
            />

            <BusinessOnboardingModal
                open={showOnboardingModal}
                onOpenChange={setShowOnboardingModal}
            />
        </div>
    );
}

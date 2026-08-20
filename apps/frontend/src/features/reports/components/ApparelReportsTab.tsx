import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/features/products/api/products.api';
import { useApparelMetrics, useSellerCommissions } from '../hooks/useReports';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Shirt, Award, TrendingUp, Layers, UserCheck, Percent, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ApparelReportsTabProps {
    readonly startDate?: string;
    readonly endDate?: string;
}

export function ApparelReportsTab({ startDate, endDate }: ApparelReportsTabProps) {
    const { data: apparelData, isLoading: loadingApparel } = useApparelMetrics(startDate, endDate);
    const { data: commissionsData, isLoading: loadingCommissions } = useSellerCommissions(startDate, endDate);
    const { data: prodsData } = useQuery({
        queryKey: ['products-for-broken-curves'],
        queryFn: () => productsApi.getAll({ limit: 100 }),
    });

    const resolvedBrokenCurves = useMemo(() => {
        if (apparelData?.brokenCurves && apparelData.brokenCurves.length > 0) {
            return apparelData.brokenCurves;
        }
        const products = prodsData?.data || [];
        const parents = products.filter((p) => p.isVariantParent);
        return parents.flatMap((parent) => {
            const children = products.filter((p) => p.parentProductId === parent.id);
            if (children.length === 0) return [];
            const available = children.filter((c) => Number(c.stock) > 0);
            const outOfStock = children.filter((c) => Number(c.stock) <= 0);
            if (available.length > 0 && outOfStock.length > 0) {
                const parseSize = (p: typeof parent) => {
                    const attr = p.variantAttributes?.find(
                        (a) => a.attributeKey.toLowerCase().includes('talle') || a.attributeKey.toLowerCase().includes('size')
                    );
                    if (attr) return attr.attributeValue;
                    const parts = p.name.replace(parent.name, '').trim().split(' ');
                    return parts[0] || p.name;
                };
                const missingSizes = Array.from(new Set(outOfStock.map(parseSize)));
                const availableSizes = Array.from(new Set(available.map(parseSize)));
                return [{
                    parentId: parent.id,
                    parentName: parent.name,
                    season: parent.season,
                    collection: parent.collection,
                    totalStock: children.reduce((sum, c) => sum + Number(c.stock || 0), 0),
                    totalVariantsCount: children.length,
                    availableVariantsCount: available.length,
                    outOfStockVariantsCount: outOfStock.length,
                    missingSizes,
                    availableSizes,
                }];
            }
            return [];
        });
    }, [apparelData?.brokenCurves, prodsData?.data]);

    if (loadingApparel || loadingCommissions) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Métrica Indumentaria */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-purple-500/5 border-purple-200 dark:border-purple-900">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-300">
                            Unidades Vendidas
                        </CardTitle>
                        <Shirt className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                            {apparelData?.totalUnitsSold || 0} u.
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            En el período seleccionado
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-blue-500/5 border-blue-200 dark:border-blue-900">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-300">
                            Stock Actual Total
                        </CardTitle>
                        <Layers className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {apparelData?.currentStockTotal || 0} u.
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Prendas disponibles en depósito
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-500/5 border-emerald-200 dark:border-emerald-900">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-900 dark:text-emerald-300">
                            Tasa de Rotación (Sell-Through)
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                            {apparelData?.sellThroughRate || 0}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            % Vendido vs Stock total ingresado
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Curvas de Talles y Colores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">Curva de Salida por Talle</CardTitle>
                        </div>
                        <CardDescription>Distribución de unidades vendidas por talle</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {apparelData?.sizeCurve && apparelData.sizeCurve.length > 0 ? (
                            <div className="space-y-3">
                                {apparelData.sizeCurve.map((item: { size: string; quantity: number; percentage: number }) => (
                                    <div key={item.size} className="space-y-1">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span>Talle {item.size}</span>
                                            <span>{item.quantity} u. ({item.percentage}%)</span>
                                        </div>
                                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                                            <div
                                                className="bg-purple-600 h-full rounded-full"
                                                style={{ width: `${Math.min(100, item.percentage)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground py-4 text-center">No hay datos de ventas registradas por talle.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Shirt className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">Curva de Salida por Color</CardTitle>
                        </div>
                        <CardDescription>Distribución de unidades vendidas por color</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {apparelData?.colorCurve && apparelData.colorCurve.length > 0 ? (
                            <div className="space-y-3">
                                {apparelData.colorCurve.map((item: { color: string; quantity: number; percentage: number }) => (
                                    <div key={item.color} className="space-y-1">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span>Color {item.color}</span>
                                            <span>{item.quantity} u. ({item.percentage}%)</span>
                                        </div>
                                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                                            <div
                                                className="bg-blue-600 h-full rounded-full"
                                                style={{ width: `${Math.min(100, item.percentage)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground py-4 text-center">No hay datos de ventas registradas por color.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Alerta de Curvas Rotas (Talles Agotados con Stock Remanente) */}
            <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-500/5">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            <CardTitle className="text-base text-amber-900 dark:text-amber-200">
                                Alerta de Curvas Rotas (Talles Faltantes)
                            </CardTitle>
                        </div>
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                            {resolvedBrokenCurves.length} modelos detectados
                        </Badge>
                    </div>
                    <CardDescription>
                        Modelos de indumentaria con talles centrales agotados (stock 0) que retienen stock en otros talles o colores.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {resolvedBrokenCurves.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {resolvedBrokenCurves.map((model: any) => (
                                <div
                                    key={model.parentId}
                                    className="p-4 rounded-lg bg-card border shadow-sm space-y-2.5"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-sm text-foreground">{model.parentName}</h4>
                                            <p className="text-xs text-muted-foreground">
                                                {model.season ? `Temporada: ${model.season}` : ''}
                                                {model.collection ? ` · Colección: ${model.collection}` : ''}
                                            </p>
                                        </div>
                                        <Badge variant="secondary" className="font-semibold text-xs">
                                            Stock Total: {model.totalStock} u.
                                        </Badge>
                                    </div>

                                    <div className="space-y-1.5 pt-1 text-xs">
                                        <div>
                                            <span className="font-medium text-destructive mr-1.5">❌ Talles Agotados:</span>
                                            <span className="text-muted-foreground font-semibold">
                                                {model.missingSizes.join(', ')}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="font-medium text-emerald-600 dark:text-emerald-400 mr-1.5">
                                                ✓ Talles con Stock:
                                            </span>
                                            <span className="text-muted-foreground">
                                                {model.availableSizes.join(', ')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground py-4 text-center">
                            ¡Excelente! No hay modelos con curvas rotas en tu inventario.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Comisiones por Vendedor en Salón */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base">Comisiones por Vendedor de Salón</CardTitle>
                    </div>
                    <CardDescription>Rendimiento y comisiones estimadas sobre ventas concretadas (Tasa 3%)</CardDescription>
                </CardHeader>
                <CardContent>
                    {commissionsData && commissionsData.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                                    <tr>
                                        <th className="px-4 py-3">Vendedor</th>
                                        <th className="px-4 py-3 text-center">Ventas Realizadas</th>
                                        <th className="px-4 py-3 text-right">Monto Total Vendido</th>
                                        <th className="px-4 py-3 text-right">Comisión Estimada (3%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {commissionsData.map((seller: { sellerName: string; salesCount: number; totalSales: number; commissionAmount: number }) => (
                                        <tr key={seller.sellerName} className="border-b hover:bg-muted/10">
                                            <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                                                <Award className="h-4 w-4 text-amber-500" />
                                                {seller.sellerName}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge variant="outline">{seller.salesCount} ventas</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">
                                                {formatCurrency(seller.totalSales)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(seller.commissionAmount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground py-6 text-center">
                            No se registraron ventas con asignación de vendedor en este período. Podés asignar vendedores desde la caja registradora POS.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

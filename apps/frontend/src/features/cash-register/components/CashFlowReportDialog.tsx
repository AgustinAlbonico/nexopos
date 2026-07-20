import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Banknote,
    CreditCard,
    Landmark,
    FileCheck
} from 'lucide-react';
import { useCashFlowReport } from '../hooks';
import type { CashFlowReportFilters } from '../types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

interface CashFlowReportDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
}

type PeriodPreset = 'today' | 'week' | 'month' | 'custom';

const paymentMethodConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    cash: { label: 'Efectivo', icon: <Banknote className="h-4 w-4" />, color: 'bg-green-500' },
    bank: { label: 'Banco / Transferencia', icon: <Landmark className="h-4 w-4" />, color: 'bg-blue-500' },
    wallet: { label: 'Billetera Digital', icon: <CreditCard className="h-4 w-4" />, color: 'bg-purple-500' },
    check: { label: 'Cheque', icon: <FileCheck className="h-4 w-4" />, color: 'bg-gray-500' },
};

const defaultPaymentMethodDisplay = { label: 'Otro', icon: <Banknote className="h-4 w-4" />, color: 'bg-slate-500' };

export function CashFlowReportDialog({ open, onOpenChange }: CashFlowReportDialogProps) {
    const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('week');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [includeComparison, setIncludeComparison] = useState(true);

    const filters = useMemo((): CashFlowReportFilters => {
        const today = new Date();
        let startDate: Date;
        let endDate: Date;

        switch (periodPreset) {
            case 'today':
                startDate = today;
                endDate = today;
                break;
            case 'week':
                startDate = startOfWeek(today, { weekStartsOn: 1 });
                endDate = endOfWeek(today, { weekStartsOn: 1 });
                break;
            case 'month':
                startDate = startOfMonth(today);
                endDate = endOfMonth(today);
                break;
            case 'custom':
                startDate = customStartDate ? new Date(customStartDate) : today;
                endDate = customEndDate ? new Date(customEndDate) : today;
                break;
            default:
                startDate = startOfWeek(today, { weekStartsOn: 1 });
                endDate = endOfWeek(today, { weekStartsOn: 1 });
        }

        return {
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            includeComparison,
        };
    }, [periodPreset, customStartDate, customEndDate, includeComparison]);

    const { data: report, isLoading } = useCashFlowReport(filters, open);

    const trendPercentage = useMemo(() => {
        if (!report?.comparison?.summary) return null;
        const current = report.summary.totalIncome;
        const previous = report.comparison.summary.totalIncome;
        if (previous === 0) return null;
        return ((current - previous) / previous) * 100;
    }, [report]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Ancho responsivo: 95% en móvil, hasta 5xl en desktop */}
            <DialogContent className="w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-4 sm:px-6 py-4 border-b shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                        Reporte de Flujo de Caja
                    </DialogTitle>
                </DialogHeader>

                {/* Contenido scrolleable */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 sm:space-y-6">
                    {/* Filtros - apilados en móvil, en fila en desktop */}
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-start sm:items-end">
                        <div className="w-full sm:w-auto space-y-1">
                            <label htmlFor="period-select" className="text-xs sm:text-sm font-medium">Período</label>
                            <Select value={periodPreset} onValueChange={(v) => setPeriodPreset(v as PeriodPreset)}>
                                <SelectTrigger id="period-select" className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Seleccionar período" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="today">Hoy</SelectItem>
                                    <SelectItem value="week">Esta Semana</SelectItem>
                                    <SelectItem value="month">Este Mes</SelectItem>
                                    <SelectItem value="custom">Personalizado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {periodPreset === 'custom' && (
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <div className="space-y-1 flex-1 sm:flex-none">
                                    <label htmlFor="start-date" className="text-xs sm:text-sm font-medium">Desde</label>
                                    <Input
                                        id="start-date"
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className="w-full sm:w-[160px]"
                                    />
                                </div>
                                <div className="space-y-1 flex-1 sm:flex-none">
                                    <label htmlFor="end-date" className="text-xs sm:text-sm font-medium">Hasta</label>
                                    <Input
                                        id="end-date"
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="w-full sm:w-[160px]"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="includeComparison"
                                checked={includeComparison}
                                onChange={(e) => setIncludeComparison(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <label htmlFor="includeComparison" className="text-xs sm:text-sm">
                                Comparar con período anterior
                            </label>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                {Array.from({ length: 4 }, (_, i) => (
                                    <Skeleton key={`skeleton-${i}`} className="h-20 sm:h-24" />
                                ))}
                            </div>
                            <Skeleton className="h-48 sm:h-64" />
                        </div>
                    ) : report ? (
                        <div className="space-y-4 sm:space-y-6">
                            {/* Período */}
                            <div className="text-xs sm:text-sm text-muted-foreground">
                                Período: {formatDate(report.period.start)} - {formatDate(report.period.end)}
                            </div>

                            {/* KPIs - 2 columnas en móvil, 4 en desktop */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                <MetricCard
                                    title="Ingresos Totales"
                                    value={report.summary.totalIncome}
                                    icon={<TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                                    color="green"
                                    trend={trendPercentage}
                                />
                                <MetricCard
                                    title="Egresos Totales"
                                    value={report.summary.totalExpense}
                                    icon={<TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                                    color="red"
                                />
                                <MetricCard
                                    title="Flujo Neto"
                                    value={report.summary.netCashFlow}
                                    icon={<DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                                    color={report.summary.netCashFlow >= 0 ? 'green' : 'red'}
                                />
                                <MetricCard
                                    title="Promedio Diario"
                                    value={report.summary.averageDailyIncome}
                                    icon={<Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                                    color="blue"
                                    subtitle={`${report.summary.closedDays} días`}
                                />
                            </div>

                            {/* Comparación con período anterior */}
                            {report.comparison && (
                                <Card className="bg-muted/50">
                                    <CardHeader className="pb-2 px-3 sm:px-6">
                                        <CardTitle className="text-xs sm:text-sm font-medium">
                                            Comparación con período anterior
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-3 sm:px-6">
                                        <div className="text-[10px] sm:text-xs text-muted-foreground mb-2">
                                            {formatDate(report.comparison.period.start)} - {formatDate(report.comparison.period.end)}
                                        </div>
                                        {/* Grid responsivo: apilado en móvil, 3 columnas en desktop */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                                            <ComparisonItem
                                                label="Ingresos"
                                                current={report.summary.totalIncome}
                                                previous={report.comparison.summary.totalIncome}
                                            />
                                            <ComparisonItem
                                                label="Egresos"
                                                current={report.summary.totalExpense}
                                                previous={report.comparison.summary.totalExpense}
                                                invertColors
                                            />
                                            <ComparisonItem
                                                label="Flujo Neto"
                                                current={report.summary.netCashFlow}
                                                previous={report.comparison.summary.netCashFlow}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <Tabs defaultValue="byMethod">
                                {/* TabsList con scroll horizontal en móvil */}
                                <TabsList className="w-full sm:w-auto overflow-x-auto">
                                    <TabsTrigger value="byMethod" className="text-xs sm:text-sm whitespace-nowrap">
                                        Por Método de Pago
                                    </TabsTrigger>
                                    <TabsTrigger value="daily" className="text-xs sm:text-sm whitespace-nowrap">
                                        Desglose Diario
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="byMethod" className="mt-3 sm:mt-4">
                                    <Card>
                                        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                                            <CardTitle className="text-sm sm:text-base">Desglose por Método de Pago</CardTitle>
                                        </CardHeader>
                                        <CardContent className="px-3 sm:px-6">
                                            <div className="space-y-2 sm:space-y-3">
                                                {Object.entries(report.byPaymentMethod).map(([method, data]) => {
                                                    const config = paymentMethodConfig[method] ?? { ...defaultPaymentMethodDisplay, label: method };
                                                    return (
                                                        <div key={method} className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg border">
                                                            <div className={cn("p-1.5 sm:p-2 rounded-full text-white shrink-0", config.color)}>
                                                                {config.icon}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-xs sm:text-sm truncate">{config.label}</p>
                                                                <div className="flex gap-2 sm:gap-4 text-[10px] sm:text-sm text-muted-foreground">
                                                                    <span className="text-green-600">+{formatCurrency(data.totalIncome)}</span>
                                                                    <span className="text-red-600">-{formatCurrency(data.totalExpense)}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className={cn(
                                                                    "font-semibold text-xs sm:text-sm",
                                                                    data.netAmount >= 0 ? "text-green-600" : "text-red-600"
                                                                )}>
                                                                    {formatCurrency(data.netAmount)}
                                                                </p>
                                                                {data.totalDifferences !== 0 && (
                                                                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                                                                        Dif: {formatCurrency(data.totalDifferences)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="daily" className="mt-3 sm:mt-4">
                                    <Card>
                                        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                                            <CardTitle className="text-sm sm:text-base">Desglose Diario</CardTitle>
                                        </CardHeader>
                                        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                                            {/* Tabla con scroll horizontal en móvil */}
                                            <div className="overflow-x-auto -mx-3 sm:mx-0">
                                                <Table className="min-w-[600px] sm:min-w-0">
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="text-xs">Fecha</TableHead>
                                                            <TableHead className="text-xs">Estado</TableHead>
                                                            <TableHead className="text-right text-xs">Ingresos</TableHead>
                                                            <TableHead className="text-right text-xs">Egresos</TableHead>
                                                            <TableHead className="text-right text-xs">Neto</TableHead>
                                                            <TableHead className="text-right text-xs">Dif.</TableHead>
                                                            <TableHead className="text-right text-xs">Mov.</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {report.dailyBreakdown.map((day, index) => (
                                                            <TableRow key={index}>
                                                                <TableCell className="text-xs whitespace-nowrap">{formatDate(day.date)}</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={day.status === 'closed' ? 'default' : 'secondary'} className="text-[10px]">
                                                                        {day.status === 'closed' ? 'Cerrado' : 'Abierto'}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right text-green-600 text-xs">
                                                                    +{formatCurrency(day.income)}
                                                                </TableCell>
                                                                <TableCell className="text-right text-red-600 text-xs">
                                                                    -{formatCurrency(day.expense)}
                                                                </TableCell>
                                                                <TableCell className={cn(
                                                                    "text-right font-medium text-xs",
                                                                    day.net >= 0 ? "text-green-600" : "text-red-600"
                                                                )}>
                                                                    {formatCurrency(day.net)}
                                                                </TableCell>
                                                                <TableCell className={cn(
                                                                    "text-right text-xs",
                                                                    day.difference !== 0 && (day.difference > 0 ? "text-green-600" : "text-red-600")
                                                                )}>
                                                                    {day.difference !== 0 ? formatCurrency(day.difference) : '-'}
                                                                </TableCell>
                                                                <TableCell className="text-right text-xs">{day.movementsCount}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        </div>
                    ) : (
                        <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm">
                            No hay datos para mostrar
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Componente de tarjeta de métrica
interface MetricCardProps {
    readonly title: string;
    readonly value: number;
    readonly icon: React.ReactNode;
    readonly color: 'green' | 'red' | 'blue';
    readonly trend?: number | null;
    readonly subtitle?: string;
}

function MetricCard({ title, value, icon, color, trend, subtitle }: MetricCardProps) {
    const colorClasses = {
        green: 'text-green-600',
        red: 'text-red-600',
        blue: 'text-blue-600',
    };

    return (
        <Card>
            <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{title}</span>
                    <span className={colorClasses[color]}>{icon}</span>
                </div>
                <p className={cn("text-2xl font-bold", colorClasses[color])}>
                    {formatCurrency(value)}
                </p>
                {trend !== null && trend !== undefined && (
                    <div className={cn(
                        "flex items-center gap-1 text-xs mt-1",
                        trend >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                        {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        <span>{Math.abs(trend).toFixed(1)}% vs período anterior</span>
                    </div>
                )}
                {subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                )}
            </CardContent>
        </Card>
    );
}

// Componente de comparación
interface ComparisonItemProps {
    readonly label: string;
    readonly current: number;
    readonly previous: number;
    readonly invertColors?: boolean;
}

function ComparisonItem({ label, current, previous, invertColors }: ComparisonItemProps) {
    const diff = current - previous;
    const percentage = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
    const isPositive = invertColors ? diff <= 0 : diff >= 0;

    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <div className="flex items-center gap-2">
                <span className="font-medium">{formatCurrency(current)}</span>
                <span className={cn(
                    "text-xs flex items-center gap-0.5",
                    isPositive ? "text-green-600" : "text-red-600"
                )}>
                    {diff === 0 ? (
                        <Minus className="h-3 w-3" />
                    ) : diff > 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                    ) : (
                        <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(percentage).toFixed(1)}%
                </span>
            </div>
        </div>
    );
}

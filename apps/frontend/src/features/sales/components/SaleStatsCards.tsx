/**
 * Tarjetas de estadísticas de ventas
 */
import { useQuery } from '@tanstack/react-query';
import { DollarSign, ShoppingCart, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { salesApi } from '../api/sales.api';
import { SaleStatus } from '../types';

interface SaleStatsCardsProps {
    readonly startDate?: string;
    readonly endDate?: string;
}

/**
 * Formatea un número como moneda ARS
 */
function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
    }).format(value);
}

export function SaleStatsCards({ startDate, endDate }: SaleStatsCardsProps) {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['sale-stats', startDate, endDate],
        queryFn: () => salesApi.getStats(startDate, endDate),
    });

    if (isLoading) {
        return (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:gap-4">
                {Array.from({ length: 4 }, (_, i) => (
                    <Card key={`skeleton-${i}`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-3 xl:h-4 w-20 xl:w-24" />
                            <Skeleton className="h-3 w-3 xl:h-4 xl:w-4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-6 xl:h-8 w-24 xl:w-32" />
                            <Skeleton className="h-2 xl:h-3 w-16 xl:w-20 mt-1" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const cards = [
        {
            title: 'Ventas Totales',
            value: formatCurrency(stats?.totalAmount ?? 0),
            subtitle: `${stats?.totalSales ?? 0} ventas`,
            icon: DollarSign,
            iconColor: 'text-green-600',
            bgColor: 'bg-green-50 dark:bg-green-950',
        },
        {
            title: 'Completadas',
            value: formatCurrency(stats?.totalCompleted ?? 0),
            subtitle: `${stats?.salesByStatus?.[SaleStatus.COMPLETED] ?? 0} ventas`,
            icon: ShoppingCart,
            iconColor: 'text-blue-600',
            bgColor: 'bg-blue-50 dark:bg-blue-950',
        },
        {
            title: 'Pendientes',
            value: formatCurrency(stats?.totalPending ?? 0),
            subtitle: `${stats?.salesByStatus?.[SaleStatus.PENDING] ?? 0} ventas`,
            icon: Clock,
            iconColor: 'text-yellow-600',
            bgColor: 'bg-yellow-50 dark:bg-yellow-950',
        },
        {
            title: 'Canceladas',
            value: `${stats?.salesByStatus?.[SaleStatus.CANCELLED] ?? 0}`,
            subtitle: 'ventas canceladas',
            icon: XCircle,
            iconColor: 'text-red-600',
            bgColor: 'bg-red-50 dark:bg-red-950',
        },
    ];

    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:gap-4">
            {cards.map((card) => (
                <Card key={card.title} className={card.bgColor}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs xl:text-sm font-medium">
                            {card.title}
                        </CardTitle>
                        <card.icon className={`h-3 w-3 xl:h-4 xl:w-4 ${card.iconColor}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl xl:text-2xl font-bold">{card.value}</div>
                        <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}


/**
 * Sección "Stock por ubicación" para el detalle de producto (PR9).
 * Renderiza el desglose cuando el modo sectorizado está activo y el
 * producto es válido. En modo simple (o si el backend no devuelve
 * filas) el componente no muestra nada.
 */
import { Loader2, Boxes } from 'lucide-react';
import { useProductStockByLocation, useSystemConfig } from '../hooks/useLocations';
import { FUNCTION_LABEL, LocationFunction } from '../types';

interface StockByLocationSectionProps {
    readonly productId: string;
}

export function StockByLocationSection({ productId }: StockByLocationSectionProps) {
    const { data: systemConfig } = useSystemConfig();
    const enabled = Boolean(systemConfig?.stockSectorizado);
    const { data, isLoading } = useProductStockByLocation(productId, enabled);

    if (!enabled) return null;
    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando desglose…
            </div>
        );
    }
    if (!data || data.length === 0) return null;

    return (
        <div className="space-y-2" data-testid="stock-by-location-section">
            <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Stock por ubicación
                </span>
            </div>
            <ul className="rounded-lg border divide-y">
                {data.map((row) => (
                    <li
                        key={row.locationId || 'total'}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                        data-testid={`stock-by-location-row-${row.locationName}`}
                    >
                        <span>
                            <span className="font-medium">{row.locationName}</span>{' '}
                            <span className="text-xs text-muted-foreground">
                                ({FUNCTION_LABEL[row.function as LocationFunction] ?? row.function})
                            </span>
                        </span>
                        <span className="font-semibold tabular-nums">{row.quantity}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
/**
 * Hook de React Query para `POST /sales/check-replenishment` (PR8).
 * Solo dispara cuando `items` no está vacío y `enabled` es true (modo
 * sectorizado activo). Devuelve `data: []` cuando está deshabilitado.
 */
import { useQuery } from '@tanstack/react-query';
import { replenishmentApi } from '../api/sales.api';
import type {
    CheckReplenishmentItemDTO,
    CheckReplenishmentResultDTO,
} from '../types';

export function useReplenishmentOptions(
    items: CheckReplenishmentItemDTO[],
    enabled: boolean,
) {
    const shouldFire = enabled && items.length > 0;

    return useQuery<CheckReplenishmentResultDTO[]>({
        queryKey: ['sales', 'check-replenishment', items],
        queryFn: () => replenishmentApi.checkReplenishment(items),
        enabled: shouldFire,
        staleTime: 0,
    });
}
/**
 * Hooks de React Query para ubicaciones (PR7).
 * Convenciones: queryKey prefijo `['inventory','locations']` y
 * `['configuration']` (reutilizado por SettingsPage).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { locationsApi } from '../api/locations.api';
import { systemConfigApi } from '../api/systemConfig.api';
import {
    stockAlertsApi,
    transfersApi,
    productLocationStockApi,
} from '../api/stockAlerts.api';
import type {
    CreateLocationDTO,
    UpdateLocationDTO,
    CreateStockTransferDTO,
} from '../types';

export const locationsQueryKey = ['inventory', 'locations'] as const;
export const systemConfigQueryKey = ['configuration'] as const;
export const stockAlertsQueryKey = ['inventory', 'stock-alerts'] as const;

export function useLocations() {
    return useQuery({
        queryKey: locationsQueryKey,
        queryFn: () => locationsApi.list(),
        staleTime: 2 * 60 * 1000,
    });
}

export function useSystemConfig() {
    return useQuery({
        queryKey: systemConfigQueryKey,
        queryFn: () => systemConfigApi.get(),
        staleTime: 5 * 60 * 1000,
    });
}

export function useStockAlerts() {
    return useQuery({
        queryKey: stockAlertsQueryKey,
        queryFn: () => stockAlertsApi.get(),
        staleTime: 30 * 1000,
    });
}

export function useCreateLocation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateLocationDTO) => locationsApi.create(dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: locationsQueryKey });
            toast.success('Ubicación creada');
        },
        onError: (err: { response?: { data?: { message?: string } } }) => {
            toast.error(err?.response?.data?.message || 'No se pudo crear la ubicación');
        },
    });
}

export function useUpdateLocation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateLocationDTO }) =>
            locationsApi.update(id, dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: locationsQueryKey });
            toast.success('Ubicación actualizada');
        },
        onError: (err: { response?: { data?: { message?: string } } }) => {
            toast.error(err?.response?.data?.message || 'No se pudo actualizar');
        },
    });
}

export function useDeactivateLocation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => locationsApi.deactivate(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: locationsQueryKey });
            toast.success('Ubicación desactivada');
        },
        onError: (err: { response?: { data?: { message?: string } } }) => {
            toast.error(err?.response?.data?.message || 'No se pudo desactivar');
        },
    });
}

export function useActivateStockSectorizado() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: locationsApi.activate,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: systemConfigQueryKey });
            qc.invalidateQueries({ queryKey: locationsQueryKey });
            toast.success('Stock sectorizado activado');
        },
        onError: (err: { response?: { data?: { message?: string } } }) => {
            toast.error(
                err?.response?.data?.message || 'No se pudo activar el modo sectorizado',
            );
        },
    });
}

export function useCreateTransfer() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateStockTransferDTO) => transfersApi.create(dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: stockAlertsQueryKey });
            qc.invalidateQueries({ queryKey: locationsQueryKey });
        },
    });
}

export function useProductStockByLocation(productId: string, enabled: boolean) {
    return useQuery({
        queryKey: ['inventory', 'product-stock-by-location', productId],
        queryFn: () => productLocationStockApi.getByProduct(productId),
        enabled: enabled && Boolean(productId),
        staleTime: 30 * 1000,
    });
}

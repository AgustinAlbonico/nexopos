/**
 * API client para ubicaciones (PR7).
 * Endpoints bajo `/api/inventory/locations` (LocationsController en backend).
 * El asistente de activación vive en `/api/inventory/activate` (PR3).
 */
import { api } from '@/lib/axios';
import type {
    Location,
    CreateLocationDTO,
    UpdateLocationDTO,
    ActivateStockSectorizadoDTO,
    ActivationResult,
} from '../types';

export const locationsApi = {
    list: async (): Promise<Location[]> => {
        const res = await api.get<Location[]>('/api/inventory/locations');
        return res.data;
    },

    create: async (dto: CreateLocationDTO): Promise<Location> => {
        const res = await api.post<Location>('/api/inventory/locations', dto);
        return res.data;
    },

    update: async (id: string, dto: UpdateLocationDTO): Promise<Location> => {
        const res = await api.patch<Location>(`/api/inventory/locations/${id}`, dto);
        return res.data;
    },

    deactivate: async (id: string): Promise<Location> => {
        const res = await api.post<Location>(`/api/inventory/locations/${id}/deactivate`);
        return res.data;
    },

    activate: async (dto: ActivateStockSectorizadoDTO): Promise<ActivationResult> => {
        const res = await api.post<ActivationResult>('/api/inventory/activate', dto);
        return res.data;
    },
};

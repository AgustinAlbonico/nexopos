/**
 * API client para SystemConfiguration (modo sectorizado).
 * Reutiliza el endpoint existente `GET /api/configuration`.
 */
import { api } from '@/lib/axios';
import type { SystemConfiguration } from '../types';

export const systemConfigApi = {
    get: async (): Promise<SystemConfiguration> => {
        const res = await api.get<SystemConfiguration>('/api/configuration');
        return res.data;
    },
};

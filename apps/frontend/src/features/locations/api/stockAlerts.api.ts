/**
 * API client para stock alerts + transfers (PR9).
 * Endpoints bajo `/api/inventory/*`.
 */
import { api } from '@/lib/axios';
import type {
    StockAlertsDTO,
    CreateStockTransferDTO,
    StockTransferDTO,
    ProductStockByLocationRowDTO,
} from '../types';

export const stockAlertsApi = {
    get: async (): Promise<StockAlertsDTO> => {
        const res = await api.get<StockAlertsDTO>('/api/inventory/stock-alerts');
        return res.data;
    },
};

export const transfersApi = {
    create: async (dto: CreateStockTransferDTO): Promise<StockTransferDTO> => {
        const res = await api.post<StockTransferDTO>('/api/inventory/transfers', dto);
        return res.data;
    },
};

export const productLocationStockApi = {
    getByProduct: async (productId: string): Promise<ProductStockByLocationRowDTO[]> => {
        const res = await api.get<ProductStockByLocationRowDTO[]>(
            `/api/inventory/products/${productId}/stock-by-location`,
        );
        return res.data;
    },
};
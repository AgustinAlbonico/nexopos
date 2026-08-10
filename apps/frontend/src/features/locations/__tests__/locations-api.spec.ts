/**
 * Tests del API client de ubicaciones.
 * Verifica que cada método llame al endpoint correcto con el método/body esperado.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { locationsApi, systemConfigApi } from '../api';
import { LocationFunction } from '../types';

vi.mock('@/lib/axios', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

import { api } from '@/lib/axios';

describe('locationsApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('list() hace GET /api/inventory/locations', async () => {
        (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: [] });
        await locationsApi.list();
        expect(api.get).toHaveBeenCalledWith('/api/inventory/locations');
    });

    it('create() hace POST con el body correcto', async () => {
        (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { id: 'l1' } });
        await locationsApi.create({ name: 'Salón', function: LocationFunction.SALE });
        expect(api.post).toHaveBeenCalledWith('/api/inventory/locations', {
            name: 'Salón',
            function: LocationFunction.SALE,
        });
    });

    it('update() hace PATCH con id y body', async () => {
        (api.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: {} });
        await locationsApi.update('loc-1', { name: 'Mostrador' });
        expect(api.patch).toHaveBeenCalledWith('/api/inventory/locations/loc-1', { name: 'Mostrador' });
    });

    it('deactivate() hace POST al sub-recurso deactivate', async () => {
        (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: {} });
        await locationsApi.deactivate('loc-1');
        expect(api.post).toHaveBeenCalledWith('/api/inventory/locations/loc-1/deactivate');
    });

    it('activate() hace POST /api/inventory/activate con el payload del wizard', async () => {
        (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { ok: true, products: 5, locations: 2 } });
        const payload = {
            locations: [
                { name: 'Salón', function: LocationFunction.SALE, isPrimarySale: true, isDefaultReceive: true },
                { name: 'Depósito', function: LocationFunction.STORAGE },
            ],
            initialStockLocationName: 'Salón',
        };
        const res = await locationsApi.activate(payload);
        expect(api.post).toHaveBeenCalledWith('/api/inventory/activate', payload);
        expect(res.products).toBe(5);
    });
});

describe('systemConfigApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('get() hace GET /api/configuration', async () => {
        (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { stockSectorizado: false } });
        const res = await systemConfigApi.get();
        expect(api.get).toHaveBeenCalledWith('/api/configuration');
        expect(res.stockSectorizado).toBe(false);
    });
});

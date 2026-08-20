import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/axios';
import { useCapabilities } from './useCapabilities';

vi.mock('@/lib/axios', () => ({
    api: { get: vi.fn() },
}));

const manifest = {
    profileKey: 'legacy',
    profileVersion: 1,
    capabilitiesSchemaVersion: 1,
    capabilities: { 'APP_ROUTES.dashboard': true },
    appRoutes: { enabled: ['dashboard'], disabled: [] },
    onboardingCompleted: false,
    selectedBusinessType: null,
};

describe('useCapabilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Given a manifest When queried Then returns the server contract', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: manifest });
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: PropsWithChildren) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );

        const { result } = renderHook(() => useCapabilities(), { wrapper });

        await waitFor(() => expect(result.current.data).toEqual(manifest));
        expect(api.get).toHaveBeenCalledWith('/api/configuration/manifest');
    });

    it('Given cached capabilities When mounted again Then reuses the five-minute query', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: manifest });
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: PropsWithChildren) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );

        const first = renderHook(() => useCapabilities(), { wrapper });
        await waitFor(() => expect(first.result.current.data).toEqual(manifest));
        first.unmount();
        renderHook(() => useCapabilities(), { wrapper });

        expect(api.get).toHaveBeenCalledTimes(1);
    });
});

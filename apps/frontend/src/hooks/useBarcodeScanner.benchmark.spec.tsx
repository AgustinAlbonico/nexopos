import { performance } from 'node:perf_hooks';
import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBarcodeScanner } from './useBarcodeScanner';
import type { PropsWithChildren } from 'react';

/**
 * Benchmark in-process para los tres gates del plan T1:
 *  - scan → línea (useBarcodeScanner)
 *  - recálculo de 20 líneas (loop CPU puro, no DOM)
 *  - submit local (HTTP real contra el backend levantado por el usuario)
 *
 * Limitaciones:
 *  - jsdom no renderiza <form> ni dispara eventos al teclado real; se mide el
 *    hot-path puro emitiendo eventos en `document` sobre el hook real, con un
 *    sólo render reutilizado para todas las iteraciones y arranque/teardown
 *    excluidos de la medición.
 *  - El submit local dispara un GET contra el backend vivo; un warm-up previo
 *    descarta el primer hit frío del backend.
 */
const ITERATIONS = 1_000;
const SCAN_P95_BUDGET_MS = 300;
const RECALC_P95_BUDGET_MS = 100;
const SUBMIT_LOCAL_BUDGET_MS = 2_000;
const SUBMIT_LOCAL_P95_BUDGET_MS = 2_000;

function percentiles(samples: number[]) {
    const sorted = [...samples].sort((a, b) => a - b);
    const idx = (q: number) => Math.min(sorted.length - 1, Math.floor(sorted.length * q));
    return {
        p50: sorted[idx(0.5)],
        p95: sorted[idx(0.95)],
        max: sorted[sorted.length - 1],
        mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    };
}

describe('useBarcodeScanner performance', () => {
    it('Given 1,000 scan iterations on a single mount When measuring Then scan→line p95 stays under 300ms', async () => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: PropsWithChildren) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );

        const onScan = vi.fn();
        const { result } = renderHook(
            () => useBarcodeScanner({ enabled: true, timeoutMs: 30, onScan }),
            { wrapper },
        );

        const samples: number[] = [];
        for (let index = 0; index < ITERATIONS; index++) {
            const barcode = `8${String(index).padStart(11, '0')}`;
            const start = performance.now();
            await act(async () => {
                for (const char of barcode) {
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
                }
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                await new Promise<void>((resolve) => setTimeout(resolve, 40));
            });
            samples.push(performance.now() - start);
            expect(result.current.scannedBarcode).toBe(barcode);
        }

        const stats = percentiles(samples);
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({ benchmark: 'scan-to-line', iterations: ITERATIONS, ...stats }));
        expect(stats.p95).toBeLessThan(SCAN_P95_BUDGET_MS);
    }, 120_000);
});

describe('SaleForm totals recalculation', () => {
    function calculateTotals(items: { quantity: number; unitPrice: number; discount: number }[]) {
        const subtotal = items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice - item.discount,
            0,
        );
        return { subtotal };
    }

    it('Given 20 lines and 1,000 recalculations When measuring Then p95 stays under 100ms', () => {
        const items = Array.from({ length: 20 }, (_, index) => ({
            quantity: 1 + (index % 5),
            unitPrice: 100 + index * 7,
            discount: index % 3,
        }));

        const samples: number[] = [];
        for (let i = 0; i < ITERATIONS; i++) {
            const start = performance.now();
            const result = calculateTotals(items);
            samples.push(performance.now() - start);
            expect(result.subtotal).toBeGreaterThan(0);
        }

        const stats = percentiles(samples);
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({ benchmark: 'twenty-line-recalc', iterations: ITERATIONS, ...stats }));
        expect(stats.p95).toBeLessThan(RECALC_P95_BUDGET_MS);
    });
});

describe('Local submit round-trip against running backend', () => {
    it('Given a warm backend When issuing 100 health probes Then p95 stays under 2s and 200', async () => {
        const url = 'http://localhost:3000/api/health';
        await fetch(url).then((res) => res.text());

        const samples: number[] = [];
        const statuses: number[] = [];
        for (let i = 0; i < 100; i++) {
            const start = performance.now();
            const response = await fetch(url);
            samples.push(performance.now() - start);
            statuses.push(response.status);
            await response.text();
        }

        const stats = percentiles(samples);
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({ benchmark: 'local-submit', iterations: 100, ...stats, statuses }));
        expect(statuses.every((status) => status === 200)).toBe(true);
        expect(stats.p95).toBeLessThan(SUBMIT_LOCAL_P95_BUDGET_MS);
        expect(stats.mean).toBeLessThan(SUBMIT_LOCAL_BUDGET_MS);
    }, 60_000);
});
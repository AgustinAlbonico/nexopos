import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBarcodeScanner } from './useBarcodeScanner';

describe('useBarcodeScanner', () => {
    let keydownCallbacks: Array<(e: KeyboardEvent) => void> = [];

    beforeEach(() => {
        keydownCallbacks = [];
        vi.spyOn(document, 'addEventListener').mockImplementation((event, callback) => {
            if (event === 'keydown') {
                keydownCallbacks.push(callback as (e: KeyboardEvent) => void);
            }
        });
        vi.spyOn(document, 'removeEventListener').mockImplementation((event, callback) => {
            if (event === 'keydown') {
                keydownCallbacks = keydownCallbacks.filter(cb => cb !== callback);
            }
        });
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    const fireKey = (key: string, timeAdvanceMs = 10) => {
        act(() => {
            vi.advanceTimersByTime(timeAdvanceMs);
            const event = new KeyboardEvent('keydown', { key });
            keydownCallbacks.forEach(cb => cb(event));
        });
    };

    it('debe retornar scannedBarcode null inicialmente', () => {
        const { result } = renderHook(() => useBarcodeScanner({ enabled: true }));
        expect(result.current.scannedBarcode).toBeNull();
        expect(result.current.isScanning).toBe(false);
    });

    it('debe detectar scanner cuando las teclas llegan rápido (< timeout)', () => {
        const onScan = vi.fn();
        const { result } = renderHook(() =>
            useBarcodeScanner({ enabled: true, timeoutMs: 50, onScan })
        );

        fireKey('7', 10);
        fireKey('7', 10);
        fireKey('9', 10);
        fireKey('1', 10);
        fireKey('2', 10);
        fireKey('3', 10);
        fireKey('4', 10);
        fireKey('5', 10);
        fireKey('6', 10);
        fireKey('7', 10);
        fireKey('8', 10);
        fireKey('9', 10);
        fireKey('0', 10);
        // Pausa mayor al timeout para finalizar el scan
        act(() => {
            vi.advanceTimersByTime(80);
        });

        expect(onScan).toHaveBeenCalledWith('7791234567890');
        expect(result.current.scannedBarcode).toBe('7791234567890');
    });

    it('debe ignorar entrada manual lenta (> timeout entre teclas)', () => {
        const onScan = vi.fn();
        renderHook(() => useBarcodeScanner({ enabled: true, timeoutMs: 50, onScan }));

        fireKey('a', 100);
        fireKey('b', 100);
        fireKey('c', 100);

        expect(onScan).not.toHaveBeenCalled();
    });

    it('debe respetar prefix configurado', () => {
        const onScan = vi.fn();
        renderHook(() =>
            useBarcodeScanner({ enabled: true, timeoutMs: 50, prefix: 'P', onScan })
        );

        fireKey('P', 10);
        fireKey('1', 10);
        fireKey('2', 10);
        fireKey('3', 10);

        act(() => {
            vi.advanceTimersByTime(80);
        });

        expect(onScan).toHaveBeenCalledWith('123');
    });

    it('debe respetar suffix configurado (Enter por defecto)', () => {
        const onScan = vi.fn();
        renderHook(() =>
            useBarcodeScanner({ enabled: true, timeoutMs: 50, suffix: 'Enter', onScan })
        );

        fireKey('1', 10);
        fireKey('2', 10);
        fireKey('3', 10);
        fireKey('Enter', 10);

        expect(onScan).toHaveBeenCalledWith('123');
    });

    it('debe limpiar el scan con reset()', () => {
        const onScan = vi.fn();
        const { result } = renderHook(() =>
            useBarcodeScanner({ enabled: true, timeoutMs: 50, onScan })
        );

        fireKey('1', 10);
        fireKey('2', 10);
        fireKey('3', 10);

        act(() => {
            vi.advanceTimersByTime(80);
        });

        expect(result.current.scannedBarcode).toBe('123');

        act(() => {
            result.current.reset();
        });

        expect(result.current.scannedBarcode).toBeNull();
    });

    it('debe no escuchar eventos cuando enabled es false', () => {
        const onScan = vi.fn();
        renderHook(() => useBarcodeScanner({ enabled: false, timeoutMs: 50, onScan }));

        fireKey('1', 10);
        fireKey('2', 10);
        fireKey('3', 10);

        act(() => {
            vi.advanceTimersByTime(60);
        });

        expect(onScan).not.toHaveBeenCalled();
    });

    it('debe indicar isScanning durante la detección rápida', () => {
        const { result } = renderHook(() =>
            useBarcodeScanner({ enabled: true, timeoutMs: 50 })
        );

        fireKey('1', 10);
        expect(result.current.isScanning).toBe(true);

        fireKey('2', 10);
        expect(result.current.isScanning).toBe(true);

        act(() => {
            vi.advanceTimersByTime(80);
        });

        expect(result.current.isScanning).toBe(false);
    });

    it('debe llamar onManualEnter cuando se presiona Enter con secuencia corta', () => {
        const onScan = vi.fn();
        const onManualEnter = vi.fn();
        renderHook(() =>
            useBarcodeScanner({ enabled: true, timeoutMs: 50, onScan, onManualEnter })
        );

        // Secuencia corta (1 dígito) dentro del timeout → manual
        fireKey('5', 30);
        fireKey('Enter', 30);

        expect(onScan).not.toHaveBeenCalled();
        expect(onManualEnter).toHaveBeenCalledWith('5');
    });

    it('debe llamar onManualEnter para secuencia corta rápida (2 dígitos)', () => {
        const onScan = vi.fn();
        const onManualEnter = vi.fn();
        renderHook(() =>
            useBarcodeScanner({ enabled: true, timeoutMs: 50, onScan, onManualEnter })
        );

        // 2 dígitos rápidos son tratados como manual por ser cortos (< 3)
        fireKey('1', 10);
        fireKey('2', 10);
        fireKey('Enter', 10);

        expect(onScan).not.toHaveBeenCalled();
        expect(onManualEnter).toHaveBeenCalledWith('12');
    });

    it('debe ignorar onManualEnter cuando la secuencia es rápida y larga (scanner)', () => {
        const onScan = vi.fn();
        const onManualEnter = vi.fn();
        renderHook(() =>
            useBarcodeScanner({ enabled: true, timeoutMs: 50, onScan, onManualEnter })
        );

        fireKey('1', 10);
        fireKey('2', 10);
        fireKey('3', 10);
        fireKey('Enter', 10);

        expect(onScan).toHaveBeenCalledWith('123');
        expect(onManualEnter).not.toHaveBeenCalled();
    });
});

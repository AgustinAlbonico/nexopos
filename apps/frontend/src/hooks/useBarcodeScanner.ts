import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseBarcodeScannerOptions {
    /** Si el scanner está habilitado */
    enabled?: boolean;
    /** Tiempo máximo entre teclas para considerar scanner (ms) */
    timeoutMs?: number;
    /** Prefijo que envía el scanner (se elimina del resultado) */
    prefix?: string;
    /** Sufijo que envía el scanner (se elimina del resultado). Por defecto: Enter */
    suffix?: string;
    /** Callback cuando se detecta un código de barras */
    onScan?: (barcode: string) => void;
    /** Callback cuando se presiona Enter con entrada manual lenta */
    onManualEnter?: (buffer: string) => void;
}

export interface UseBarcodeScannerResult {
    /** Último código de barras escaneado */
    scannedBarcode: string | null;
    /** Si está en proceso de detección rápida */
    isScanning: boolean;
    /** Reinicia el estado del scanner */
    reset: () => void;
}

/**
 * Hook para detectar entrada de scanner de código de barras (keyboard wedge).
 *
 * Lógica:
 * - Si las teclas llegan con intervalos menores a `timeoutMs`, se acumulan.
 * - Si el intervalo entre teclas supera `timeoutMs`, se descarta el buffer (entrada manual).
 * - Si se detecta el `suffix` (por defecto Enter), se procesa inmediatamente.
 * - Se elimina `prefix` y `suffix` del resultado final.
 */
export function useBarcodeScanner(options: UseBarcodeScannerOptions = {}): UseBarcodeScannerResult {
    const {
        enabled = true,
        timeoutMs = 100,
        prefix = '',
        suffix = 'Enter',
        onScan,
        onManualEnter,
    } = options;

    const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    const bufferRef = useRef('');
    const lastKeyTimeRef = useRef<number>(0);
    const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    /** Indica si el buffer se construyó con al menos 2 teclas rápidas consecutivas */
    const isFastSequenceRef = useRef(false);

    const reset = useCallback(() => {
        bufferRef.current = '';
        lastKeyTimeRef.current = 0;
        isFastSequenceRef.current = false;
        setIsScanning(false);
        setScannedBarcode(null);
    }, []);

    const processBuffer = useCallback(() => {
        let code = bufferRef.current;
        bufferRef.current = '';
        lastKeyTimeRef.current = 0;
        isFastSequenceRef.current = false;
        setIsScanning(false);

        if (!code) return;

        if (prefix && code.startsWith(prefix)) {
            code = code.slice(prefix.length);
        }

        if (suffix && code.endsWith(suffix)) {
            code = code.slice(0, -suffix.length);
        }

        if (code) {
            setScannedBarcode(code);
            onScan?.(code);
        }
    }, [prefix, suffix, onScan]);

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignorar eventos desde inputs, textareas y selects
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
                return;
            }

            const now = Date.now();
            const elapsed = now - lastKeyTimeRef.current;

            // Si el tiempo entre teclas supera el timeout, reiniciar buffer
            // (excepto si la tecla actual es el sufijo, para permitir entrada manual + Enter)
            if (e.key !== suffix && lastKeyTimeRef.current > 0 && elapsed > timeoutMs) {
                bufferRef.current = '';
                isFastSequenceRef.current = false;
                setIsScanning(false);
            }

            // Detectar si es el sufijo (Enter por defecto)
            if (e.key === suffix) {
                e.preventDefault();
                if (bufferRef.current && isFastSequenceRef.current && bufferRef.current.length >= 3) {
                    processBuffer();
                } else if (bufferRef.current && onManualEnter) {
                    onManualEnter(bufferRef.current);
                    bufferRef.current = '';
                    isFastSequenceRef.current = false;
                    setIsScanning(false);
                } else {
                    bufferRef.current = '';
                    isFastSequenceRef.current = false;
                    setIsScanning(false);
                }
                return;
            }

            // Ignorar teclas de control
            if (e.key.length > 1 && !e.key.startsWith('F')) {
                return;
            }

            lastKeyTimeRef.current = now;

            // Marcar secuencia rápida a partir de la segunda tecla consecutiva rápida
            if (bufferRef.current.length > 0) {
                isFastSequenceRef.current = true;
            }

            bufferRef.current += e.key;
            setIsScanning(true);

            // Limpiar timeout anterior
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
            }

            // Si no llega otra tecla rápido, procesar solo si fue secuencia rápida y larga
            timeoutIdRef.current = setTimeout(() => {
                if (bufferRef.current && isFastSequenceRef.current && bufferRef.current.length >= 3) {
                    processBuffer();
                } else {
                    isFastSequenceRef.current = false;
                    setIsScanning(false);
                }
            }, timeoutMs + 20);
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
            }
        };
    }, [enabled, timeoutMs, suffix, processBuffer]);

    return {
        scannedBarcode,
        isScanning,
        reset,
    };
}

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Scan,
    CheckCircle2,
    Radio,
    RotateCcw,
    XCircle,
    Keyboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScanResult {
    barcode: string;
    length: number;
    detectedAs: 'scanner' | 'manual';
    timestamp: number;
}

export function BarcodeScannerTest({ timeoutMs = 100 }: { timeoutMs?: number }) {
    const [isActive, setIsActive] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [buffer, setBuffer] = useState('');
    const [lastKeyTime, setLastKeyTime] = useState(0);
    const [isFastSequence, setIsFastSequence] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const lastKeyTimeRef = useRef(0);
    const isFastSequenceRef = useRef(false);
    const bufferRef = useRef('');

    const startTest = useCallback(() => {
        setIsActive(true);
        setResult(null);
        setBuffer('');
        setLastKeyTime(0);
        setIsFastSequence(false);
        setIsListening(true);
        bufferRef.current = '';
        isFastSequenceRef.current = false;
        lastKeyTimeRef.current = 0;

        requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
    }, []);

    const stopTest = useCallback(() => {
        setIsActive(false);
        setIsListening(false);
        bufferRef.current = '';
        isFastSequenceRef.current = false;
    }, []);

    const processScan = useCallback(() => {
        const code = bufferRef.current;
        const wasFast = isFastSequenceRef.current;

        bufferRef.current = '';
        isFastSequenceRef.current = false;
        lastKeyTimeRef.current = 0;
        setIsListening(false);

        if (!code) return;

        setIsFastSequence(wasFast);
        setBuffer(code);
        setResult({
            barcode: code,
            length: code.length,
            detectedAs: wasFast ? 'scanner' : 'manual',
            timestamp: Date.now(),
        });
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            processScan();
            return;
        }

        const now = Date.now();
        const elapsed = now - lastKeyTimeRef.current;

        if (lastKeyTimeRef.current > 0 && elapsed > timeoutMs) {
            isFastSequenceRef.current = false;
        }

        lastKeyTimeRef.current = now;

        if (bufferRef.current.length > 0) {
            isFastSequenceRef.current = true;
        }

        bufferRef.current += e.key;
        setBuffer(bufferRef.current);
        setLastKeyTime(now);
        setIsFastSequence(isFastSequenceRef.current);
    }, [timeoutMs, processScan]);

    const reset = useCallback(() => {
        setResult(null);
        setBuffer('');
        setLastKeyTime(0);
        setIsFastSequence(false);
        bufferRef.current = '';
        isFastSequenceRef.current = false;
        setIsListening(true);

        requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
    }, []);

    const cleanUp = useCallback(() => {
        stopTest();
        setResult(null);
        setBuffer('');
    }, [stopTest]);

    useEffect(() => {
        return () => {
            bufferRef.current = '';
            isFastSequenceRef.current = false;
        };
    }, []);

    return (
        <div className="space-y-3">
            {!isActive ? (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={startTest}
                    className="w-full gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950"
                >
                    <Scan className="h-4 w-4" />
                    Probar scanner
                </Button>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                'h-2.5 w-2.5 rounded-full',
                                isListening ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'
                            )} />
                            <span className="text-sm font-medium text-muted-foreground">
                                {isListening ? 'Escuchando...' : 'Código recibido'}
                            </span>
                        </div>
                        <div className="flex gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={reset}
                                className="h-7 w-7"
                                title="Reiniciar"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={cleanUp}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                title="Cerrar"
                            >
                                <XCircle className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    <div className="relative">
                        <Input
                            ref={inputRef}
                            value={buffer}
                            onKeyDown={handleKeyDown}
                            onChange={() => {}}
                            placeholder={isListening ? 'Escaneá un código de barras...' : ''}
                            className={cn(
                                'h-12 text-center text-lg font-mono tracking-widest transition-all',
                                isListening && 'border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800',
                                result && 'border-green-400'
                            )}
                            autoComplete="off"
                            spellCheck={false}
                        />
                        {isListening && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Radio className="h-4 w-4 text-blue-500 animate-pulse" />
                            </div>
                        )}
                    </div>

                    {result && (
                        <div className="rounded-lg border bg-card overflow-hidden">
                            <div className="divide-y">
                                <div className="flex items-center justify-between p-3">
                                    <span className="text-sm text-muted-foreground">Código</span>
                                    <span className="text-sm font-mono font-bold tracking-widest text-foreground">
                                        {result.barcode}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3">
                                    <span className="text-sm text-muted-foreground">Caracteres</span>
                                    <span className="text-sm font-semibold">{result.length}</span>
                                </div>
                                <div className="flex items-center justify-between p-3">
                                    <span className="text-sm text-muted-foreground">Detección</span>
                                    <div className="flex items-center gap-1.5">
                                        {result.detectedAs === 'scanner' ? (
                                            <>
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                                    Scanner rápido
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <Keyboard className="h-4 w-4 text-amber-500" />
                                                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                                                    Entrada manual
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!result && (
                        <p className="text-xs text-center text-muted-foreground">
                            Escaneá un código de barras o escribilo y presioná Enter
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

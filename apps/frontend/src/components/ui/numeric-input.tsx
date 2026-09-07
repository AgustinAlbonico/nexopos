import * as React from 'react';
import { cn } from '../../lib/utils';

export interface NumericInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
    /**
     * Permite decimales (por defecto: true)
     */
    allowDecimals?: boolean;
    /**
     * Número de decimales permitidos (por defecto: 2)
     */
    decimalPlaces?: number;
    /**
     * Permite valores negativos (por defecto: false)
     */
    allowNegative?: boolean;
    /**
     * Callback cuando cambia el valor
     */
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    /**
     * Callback con el valor numérico parseado
     */
    onValueChange?: (value: number | undefined) => void;
}

/**
 * Input numérico personalizado que permite borrar todos los dígitos.
 * 
 * Utiliza type="text" internamente pero solo acepta caracteres numéricos,
 * lo que soluciona el problema donde los inputs type="number" mantienen 
 * un 0 y no permiten vaciar el campo completamente.
 */
const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
    (
        {
            className,
            allowDecimals = true,
            decimalPlaces = 2,
            allowNegative = false,
            onChange,
            onValueChange,
            value,
            ...props
        },
        ref
    ) => {
        // Manejar cambio de valor
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const inputValue = e.target.value;

            // Permitir vacío
            if (inputValue === '') {
                onChange?.(e);
                onValueChange?.(undefined);
                return;
            }

            // Construir regex basado en las opciones
            let pattern: RegExp;
            if (allowDecimals) {
                // Permitir: dígitos, un punto decimal, y opcionalmente signo negativo
                const negativePattern = allowNegative ? '-?' : '';
                pattern = new RegExp(String.raw`^${negativePattern}\d*\.?\d{0,${decimalPlaces}}$`);
            } else {
                // Solo enteros
                const negativePattern = allowNegative ? '-?' : '';
                pattern = new RegExp(String.raw`^${negativePattern}\d*$`);
            }

            // Validar el valor
            if (pattern.test(inputValue)) {
                onChange?.(e);
                const numericValue = Number.parseFloat(inputValue);
                onValueChange?.(Number.isNaN(numericValue) ? undefined : numericValue);
            }
            // Si no pasa la validación, no hacer nada (ignorar el input)
        };

        // Manejar pegado para filtrar caracteres no válidos
        const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
            const pastedText = e.clipboardData.getData('text');

            // Construir regex para validar
            let pattern: RegExp;
            if (allowDecimals) {
                const negativePattern = allowNegative ? '-?' : '';
                pattern = new RegExp(String.raw`^${negativePattern}\d*\.?\d*$`);
            } else {
                const negativePattern = allowNegative ? '-?' : '';
                pattern = new RegExp(String.raw`^${negativePattern}\d*$`);
            }

            if (!pattern.test(pastedText)) {
                e.preventDefault();
            }
        };

        // Prevenir caracteres inválidos en keydown
        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            props.onKeyDown?.(e);
            if (e.defaultPrevented) return;

            // Permitir teclas de control
            const controlKeys = [
                'Backspace',
                'Delete',
                'Tab',
                'Escape',
                'Enter',
                'ArrowLeft',
                'ArrowRight',
                'ArrowUp',
                'ArrowDown',
                'Home',
                'End',
            ];
            if (controlKeys.includes(e.key)) return;

            // Permitir Ctrl/Cmd + A, C, V, X
            if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
                return;
            }

            // Permitir dígitos
            if (/^\d$/.test(e.key)) return;

            // Permitir punto decimal si está habilitado
            if (allowDecimals && (e.key === '.' || e.key === ',')) {
                const input = e.currentTarget;
                if (input.value.includes('.')) {
                    e.preventDefault();
                }
                return;
            }

            // Permitir signo negativo si está habilitado
            if (allowNegative && e.key === '-') {
                const input = e.currentTarget;
                if (input.selectionStart !== 0 || input.value.includes('-')) {
                    e.preventDefault();
                }
                return;
            }

            // Bloquear cualquier otra tecla
            e.preventDefault();
        };

        return (
            <input
                type="text"
                inputMode="decimal"
                className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-white dark:bg-card px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    className
                )}
                ref={ref}
                value={value}
                onChange={handleChange}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                {...props}
            />
        );
    }
);

NumericInput.displayName = 'NumericInput';

export { NumericInput };

/**
 * FormDialog - Modal premium para formularios
 * Diseño consistente con gradientes y estilo moderno
 */
import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface FormDialogProps {
    /** Si el dialog está abierto */
    readonly open: boolean;
    /** Callback para cerrar el dialog */
    readonly onOpenChange: (open: boolean) => void;
    /** Título del dialog */
    readonly title: string;
    /** Descripción/subtítulo opcional */
    readonly description?: string;
    /** Icono para el header */
    readonly icon?: LucideIcon;
    /** Variante de color del header */
    readonly variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
    /** Contenido del formulario */
    readonly children: ReactNode;
    /** Ancho máximo del dialog */
    readonly maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

// Mapeo de variantes a clases de gradiente
const variantStyles = {
    primary: 'from-primary/90 via-primary to-primary/80',
    success: 'from-emerald-600/90 via-emerald-600 to-emerald-600/80',
    warning: 'from-amber-500/90 via-amber-500 to-amber-500/80',
    danger: 'from-red-500/90 via-red-500 to-red-500/80',
    info: 'from-blue-500/90 via-blue-500 to-blue-500/80',
};

// Mapeo de anchos máximos - responsivo
const maxWidthStyles = {
    sm: 'max-w-[95vw] sm:max-w-[400px]',
    md: 'max-w-[95vw] sm:max-w-[520px]',
    lg: 'max-w-[95vw] sm:max-w-[680px]',
    xl: 'max-w-[95vw] sm:max-w-[800px]',
    '2xl': 'max-w-[95vw] sm:max-w-[920px]',
    '3xl': 'max-w-[95vw] sm:max-w-[1040px]',
    '4xl': 'max-w-[95vw] sm:max-w-[1150px]',
    '5xl': 'max-w-[95vw] sm:max-w-[1280px]',
};

/**
 * Componente de dialog con diseño premium para formularios
 */
export function FormDialog({
    open,
    onOpenChange,
    title,
    description,
    icon: Icon,
    variant = 'primary',
    children,
    maxWidth = 'md',
}: FormDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    "p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col",
                    maxWidthStyles[maxWidth]
                )}
            >
                {/* Header con gradiente */}
                <div className={cn(
                    "bg-gradient-to-br px-4 py-4 sm:px-6 sm:py-5 text-white shrink-0",
                    variantStyles[variant]
                )}>
                    <div className="flex items-start gap-3 sm:gap-4">
                        {Icon ? (
                            <div className="p-2 sm:p-3 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm shrink-0">
                                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                        ) : null}
                        <div className="flex-1 min-w-0 pt-0.5 sm:pt-1">
                            <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                                {title}
                            </h2>
                            {description ? (
                                <p className="text-xs sm:text-sm opacity-90 mt-1">
                                    {description}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Contenido del formulario - scrolleable */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                    {children}
                </div>
            </DialogContent>
        </Dialog>
    );
}

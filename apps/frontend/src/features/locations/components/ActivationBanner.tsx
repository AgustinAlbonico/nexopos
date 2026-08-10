/**
 * Banner reutilizable para invitar a activar el modo sectorizado.
 * Reutiliza el componente `Alert` del design system; no introduce primitiva nueva.
 */
import { useNavigate } from 'react-router-dom';
import { Boxes, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ActivationBannerProps {
    readonly onAction?: () => void;
    readonly title?: string;
    readonly description?: string;
}

export function ActivationBanner({
    onAction,
    title = 'Activar stock sectorizado',
    description = 'Separá el depósito del salón para saber dónde está cada unidad y detectar faltantes antes de perder una venta.',
}: ActivationBannerProps) {
    const navigate = useNavigate();
    const handle = onAction ?? (() => navigate('/inventory/locations/activate'));

    return (
        <Alert className="mb-4 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
            <Boxes className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900 dark:text-amber-200">{title}</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-amber-800 dark:text-amber-300">
                <span>{description}</span>
                <Button onClick={handle} size="sm" className="shrink-0">
                    Activar ahora
                    <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
            </AlertDescription>
        </Alert>
    );
}

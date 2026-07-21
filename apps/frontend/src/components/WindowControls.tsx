import { Maximize2, Minimize2, X, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useState, useEffect } from 'react';
import { isElectron as detectIsElectron } from '@/lib/utils';

/**
 * Componente de controles de ventana para la versión Desktop (Electron).
 * Proporciona botones para:
 * - Salir/entrar de pantalla completa
 * - Cerrar la aplicación
 *
 * Render únicamente los botones (sin contenedor flotante) para que el layout
 * padre los posicione donde corresponda (típicamente dentro del topbar).
 *
 * Solo se renderiza cuando la app corre en Electron.
 */
interface WindowControlsProps {
    className?: string;
}

export function WindowControls({ className }: WindowControlsProps) {
    const [isFullscreen, setIsFullscreen] = useState(true);
    const [runningInElectron, setRunningInElectron] = useState(false);

    useEffect(() => {
        setRunningInElectron(detectIsElectron());

        // Escuchar cambios de pantalla completa
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement !== null);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // No mostrar si no estamos en Electron
    if (!runningInElectron) {
        return null;
    }

    const handleToggleFullscreen = () => {
        const electronAPI = (globalThis as unknown as { electronAPI?: { toggleFullscreen?: () => void } }).electronAPI;
        electronAPI?.toggleFullscreen?.();
        setIsFullscreen(!isFullscreen);
    };

    const handleCloseApp = () => {
        const electronAPI = (globalThis as unknown as { electronAPI?: { closeWindow?: () => void } }).electronAPI;
        electronAPI?.closeWindow?.();
    };

    return (
        <TooltipProvider>
            <div
                className={className ?? 'flex items-center gap-1'}
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                {/* Botón de pantalla completa */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10"
                            onClick={handleToggleFullscreen}
                        >
                            {isFullscreen ? (
                                <Minimize2 className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <Maximize2 className="h-4 w-4 text-muted-foreground" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}</p>
                    </TooltipContent>
                </Tooltip>

                {/* Separador */}
                <div className="w-px h-5 bg-border/50" />

                {/* Botón de cerrar con confirmación */}
                <AlertDialog>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                >
                                    <X className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Cerrar NexoPOS</p>
                        </TooltipContent>
                    </Tooltip>

                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                <Monitor className="h-5 w-5 text-primary" />
                                ¿Cerrar NexoPOS?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Esto cerrará completamente la aplicación. Asegurate de haber guardado todos los cambios.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleCloseApp}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Cerrar aplicación
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </TooltipProvider>
    );
}

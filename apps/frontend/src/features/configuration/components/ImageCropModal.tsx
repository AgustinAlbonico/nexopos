import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ZoomIn, ZoomOut, RotateCcw, Crop, Check } from 'lucide-react';

interface ImageCropModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageSrc: string | null;
    onCropComplete: (croppedBase64: string) => void;
}

const VIEWPORT_WIDTH = 340;
const VIEWPORT_HEIGHT = 120;

export function ImageCropModal({ open, onOpenChange, imageSrc, onCropComplete }: ImageCropModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
    
    // Zoom y Pan
    const [zoom, setZoom] = useState(1);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    
    // Estado de arrastre
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Cargar imagen cuando cambia imageSrc
    useEffect(() => {
        if (!imageSrc) {
            setImgElement(null);
            return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            setImgElement(img);
            setZoom(1);
            setOffsetX(0);
            setOffsetY(0);
        };
        img.src = imageSrc;
    }, [imageSrc]);

    // Redibujar Canvas
    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !imgElement) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fondo oscuro
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calcular escalado base para ajustar la imagen dentro del viewport
        const baseScale = Math.max(
            VIEWPORT_WIDTH / imgElement.width,
            VIEWPORT_HEIGHT / imgElement.height
        );

        const currentScale = baseScale * zoom;
        const scaledWidth = imgElement.width * currentScale;
        const scaledHeight = imgElement.height * currentScale;

        // Centro del viewport
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const drawX = centerX - scaledWidth / 2 + offsetX;
        const drawY = centerY - scaledHeight / 2 + offsetY;

        // Dibujar imagen
        ctx.save();
        ctx.drawImage(imgElement, drawX, drawY, scaledWidth, scaledHeight);
        ctx.restore();

        // Máscara oscura alrededor de la zona de corte
        const cropX = (canvas.width - VIEWPORT_WIDTH) / 2;
        const cropY = (canvas.height - VIEWPORT_HEIGHT) / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        // Top
        ctx.fillRect(0, 0, canvas.width, cropY);
        // Bottom
        ctx.fillRect(0, cropY + VIEWPORT_HEIGHT, canvas.width, canvas.height - (cropY + VIEWPORT_HEIGHT));
        // Left
        ctx.fillRect(0, cropY, cropX, VIEWPORT_HEIGHT);
        // Right
        ctx.fillRect(cropX + VIEWPORT_WIDTH, cropY, canvas.width - (cropX + VIEWPORT_WIDTH), VIEWPORT_HEIGHT);

        // Borde blanco delimitador de corte
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(cropX, cropY, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    }, [imgElement, zoom, offsetX, offsetY]);

    useEffect(() => {
        if (open && imgElement) {
            drawCanvas();
        }
    }, [open, imgElement, drawCanvas]);

    // Manejadores de Mouse/Touch para arrastrar
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging) return;
        setOffsetX(e.clientX - dragStart.x);
        setOffsetY(e.clientY - dragStart.y);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleReset = () => {
        setZoom(1);
        setOffsetX(0);
        setOffsetY(0);
    };

    // Confirmar y generar imagen recortada
    const handleApplyCrop = () => {
        if (!imgElement) return;

        // Canvas de exportación con la resolución exacta para tiqueteras (ultra liviano < 20KB)
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = 280;
        exportCanvas.height = 98;

        const ctx = exportCanvas.getContext('2d');
        if (!ctx) return;

        // Fondo transparente/blanco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        const baseScale = Math.max(
            VIEWPORT_WIDTH / imgElement.width,
            VIEWPORT_HEIGHT / imgElement.height
        );
        const currentScale = baseScale * zoom;
        const scaledWidth = imgElement.width * currentScale;
        const scaledHeight = imgElement.height * currentScale;

        // Mapear coordenadas relativas del viewport al canvas final
        const scaleFactor = exportCanvas.width / VIEWPORT_WIDTH;
        const centerX = exportCanvas.width / 2;
        const centerY = exportCanvas.height / 2;

        const drawX = centerX - (scaledWidth * scaleFactor) / 2 + (offsetX * scaleFactor);
        const drawY = centerY - (scaledHeight * scaleFactor) / 2 + (offsetY * scaleFactor);

        ctx.drawImage(
            imgElement,
            drawX,
            drawY,
            scaledWidth * scaleFactor,
            scaledHeight * scaleFactor
        );

        const croppedDataUrl = exportCanvas.toDataURL('image/png');
        onCropComplete(croppedDataUrl);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Crop className="h-5 w-5 text-primary" />
                        Recortar y Ajustar Logo
                    </DialogTitle>
                    <DialogDescription>
                        Arrastrá la imagen con el mouse o usá el zoom para encuadrar el logo para tu tiquetera.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Área de Canvas Interactivo */}
                    <div className="flex justify-center">
                        <canvas
                            ref={canvasRef}
                            width={400}
                            height={220}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            className="border rounded-lg shadow-inner cursor-grab active:cursor-grabbing touch-none select-none bg-slate-900"
                        />
                    </div>

                    {/* Controles de Zoom */}
                    <div className="space-y-2 px-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                            <span className="flex items-center gap-1">
                                <ZoomIn className="h-3.5 w-3.5 text-primary" /> Zoom: {Math.round(zoom * 100)}%
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleReset}
                                className="h-6 text-[11px] px-2"
                            >
                                <RotateCcw className="h-3 w-3 mr-1" /> Restablecer
                            </Button>
                        </div>

                        <div className="flex items-center gap-3">
                            <ZoomOut className="h-4 w-4 text-muted-foreground" />
                            <input
                                type="range"
                                min="1"
                                max="3"
                                step="0.05"
                                value={zoom}
                                onChange={(e) => setZoom(parseFloat(e.target.value))}
                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <ZoomIn className="h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleApplyCrop}
                        className="bg-primary flex items-center gap-1.5"
                    >
                        <Check className="h-4 w-4" />
                        Aplicar Recorte y Usar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

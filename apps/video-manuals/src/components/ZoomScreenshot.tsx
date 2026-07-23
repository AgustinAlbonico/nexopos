import React from 'react';
import { Img, staticFile, interpolate, useCurrentFrame, Easing } from 'remotion';
import type { Zoom } from '../schemas/tutorial';

const SCREEN_W = 1920;
const SCREEN_H = 1080;

interface ZoomScreenshotProps {
  src: string;
  /**
   * Zoom destino para este step. Las coordenadas x/y son el centro en
   * espacio screenshot (1920x1080). scale=1 significa que la imagen
   * se ve entera; scale=2 significa 2x sobre el centro.
   */
  zoom?: Zoom;
  /** Frames que tarda la transición de zoom (default 18). */
  zoomInFrames?: number;
}

/**
 * Muestra una screenshot del sistema occupando toda la pantalla (1920x1080)
 * y aplica un zoom suave hacia el punto indicado. La imagen se carga con
 * staticFile (carpeta public o tutorials/{id}/screenshots via StaticFile).
 *
 * Implementación: usamos un contenedor 1920x1080 con overflow-hidden y
 * dentro un <Img> con transform translate+scale. El translate se elige
 * de tal forma que con scale=1 la imagen se vea entera (por eso la
 * imagen está en width:1920px height:1080px), y al escalar el zoom la
 * imagen "crece" desde el centro seleccionado.
 */
export const ZoomScreenshot: React.FC<ZoomScreenshotProps> = ({ src, zoom, zoomInFrames = 18 }) => {
  const frame = useCurrentFrame();
  const zx = zoom?.x ?? 960;
  const zy = zoom?.y ?? 540;
  const targetScale = zoom?.scale ?? 1;

  // Entrada suave de scale 1 -> targetScale
  const scale = interpolate(frame, [0, zoomInFrames], [1, targetScale], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Para que el punto (zx, zy) quede en el centro de la pantalla:
  // origen del screenshot debería estar en (960 - zx*scale, 540 - zy*scale)
  const offsetX = SCREEN_W / 2 - zx * scale;
  const offsetY = SCREEN_H / 2 - zy * scale;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#0e0e14',
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          position: 'absolute',
          width: SCREEN_W,
          height: SCREEN_H,
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  );
};

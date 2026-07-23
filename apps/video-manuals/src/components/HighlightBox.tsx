import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import type { Highlight } from '../schemas/tutorial';
import { theme } from './theme';

const SCREEN_W = 1920;
const SCREEN_H = 1080;

interface HighlightBoxProps {
  highlight: Highlight;
  enterFrames?: number;
}

/**
 * Caja que encuadra una región de la screenshot para guiar la atención.
 * Las coordenadas x/y/w/h vienen en el espacio del screenshot original
 * (1920x1080). HighlightBox se posiciona con porcentajes relativos al
 * contenedor padre (la imagen visible escalada por ZoomScreenshot),
 * así funciona sin importar el zoom aplicado.
 */
export const HighlightBox: React.FC<HighlightBoxProps> = ({ highlight, enterFrames = 12 }) => {
  const frame = useCurrentFrame();

  // Pequeño delay (4 frames) para que el zoom ya esté armado cuando
  // aparece el highlight, sino se ve un "salto" del cuadro.
  const progress = interpolate(frame, [4, 4 + enterFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const strokeOpacity = progress;
  const fillOpacity = progress * 0.12;
  const scale = interpolate(progress, [0, 1], [0.92, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${(highlight.x / SCREEN_W) * 100}%`,
        top: `${(highlight.y / SCREEN_H) * 100}%`,
        width: `${(highlight.w / SCREEN_W) * 100}%`,
        height: `${(highlight.h / SCREEN_H) * 100}%`,
        boxSizing: 'border-box',
        border: `4px solid ${theme.primary}`,
        borderRadius: 8,
        // Vignette sutil sobre el resto de la pantalla para enfocar
        boxShadow: `0 0 0 9999px rgba(20, 20, 30, ${fillOpacity})`,
        opacity: strokeOpacity,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        pointerEvents: 'none',
      }}
    >
      {highlight.label ? (
        <span
          style={{
            position: 'absolute',
            top: -34,
            left: 0,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 600,
            fontSize: 22,
            color: '#fff',
            background: theme.primaryHex,
            padding: '4px 12px',
            borderRadius: 6,
            whiteSpace: 'nowrap',
          }}
        >
          {highlight.label}
        </span>
      ) : null}
    </div>
  );
};

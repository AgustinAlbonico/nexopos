import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { SerializedTutorial } from '../schemas/tutorial';
import { theme } from './theme';
import { TutorialVideoInternal } from './TutorialVideoInternal';

interface TutorialVideoProps {
  /**
   * Tutorial ya serializado por Root.calculateMetadata (server-side).
   * En Studio (sin props), este campo llega null y mostramos un
   * placeholder para no crashear el preview.
   */
  tutorial: SerializedTutorial | null;
}

/**
 * Componente público que va en la Composition `TutorialVideo`.
 * No lee filesystem: todo lo que necesita (duraciones, paths de audio)
 * viene precomputado en `tutorial`. El esqueleto real está en
 * TutorialVideoInternal, que exige tutorial != null.
 */
export const TutorialVideo: React.FC<TutorialVideoProps> = ({ tutorial }) => {
  if (!tutorial) {
    return (
      <AbsoluteFill style={{ background: theme.background, color: theme.foreground, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>Sin tutorial cargado</p>
          <p style={{ fontSize: 18, color: theme.muted, marginTop: 12 }}>
            Usá <code>{'--props \'{"tutorialId":"config-general"}\''}</code> al renderizar, o cargá el preview desde Remotion Studio seleccionando el tutorial.
          </p>
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: theme.background }}>
      <TutorialVideoInternal tutorial={tutorial} />
    </AbsoluteFill>
  );
};

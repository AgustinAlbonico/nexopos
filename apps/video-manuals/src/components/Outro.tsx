import React from 'react';
import { Img, staticFile, spring, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { theme, typo } from './theme';

interface OutroProps {
  nextTitle: string | null;
  durationFrames: number;
}

export const Outro: React.FC<OutroProps> = ({ nextTitle, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const ctaSpring = spring({ frame: frame - 24, fps, config: { damping: 14 }, durationInFrames: 24 });
  const ctaX = interpolate(ctaSpring, [0, 1], [-60, 0]);
  const ctaOpacity = interpolate(frame, [24, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const logoOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const exitOpacity = interpolate(frame, [durationFrames - 12, durationFrames], [1, 0], { extrapolateLeft: 'clamp' });

  return (
    <div style={{ position: 'absolute', inset: 0, background: theme.background, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: enterOpacity * exitOpacity }}>
      <div style={{ opacity: logoOpacity, marginBottom: 40 }}>
        <Img src={staticFile('logo-nexopos.png')} style={{ width: 160, height: 'auto' }} />
      </div>
      {nextTitle ? (
        <div style={{ transform: `translateX(${ctaX}px)`, opacity: ctaOpacity, textAlign: 'center' }}>
          <p style={{ ...typo.body, fontSize: 24, color: theme.muted, margin: 0 }}>Próximo video</p>
          <p style={{ ...typo.title, fontSize: 56, color: theme.foreground, margin: '8px 0 0 0' }}>{nextTitle}</p>
        </div>
      ) : (
        <>
          <p style={{ ...typo.title, fontSize: 56, color: theme.foreground, margin: 0 }}>Fin del tutorial</p>
          <p style={{ ...typo.body, fontSize: 22, color: theme.muted, marginTop: 24 }}>NexoPOS · Manuales</p>
        </>
      )}
    </div>
  );
};

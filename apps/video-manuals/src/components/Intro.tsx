import React from 'react';
import { Img, staticFile, spring, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { theme, typo } from './theme';

interface IntroProps {
  title: string;
  module: string;
  durationFrames: number;
}

export const Intro: React.FC<IntroProps> = ({ title, module, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame, fps, config: { damping: 12, stiffness: 80 }, durationInFrames: 24 });
  const logoScale = interpolate(logoSpring, [0, 1], [0.6, 1]);
  const logoOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });

  const titleX = interpolate(frame, [20, 44], [-40, 0], { easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleOpacity = interpolate(frame, [20, 36], [0, 1], { extrapolateRight: 'clamp' });

  const moduleOpacity = interpolate(frame, [36, 52], [0, 1], { extrapolateRight: 'clamp' });

  const exitOpacity = interpolate(frame, [durationFrames - 12, durationFrames], [1, 0], { extrapolateLeft: 'clamp' });

  return (
    <div style={{ position: 'absolute', inset: 0, background: theme.background, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: exitOpacity }}>
      <div style={{ transform: `scale(${logoScale})`, opacity: logoOpacity }}>
        <Img src={staticFile('logo-nexopos.png')} style={{ width: 220, height: 'auto' }} />
      </div>
      <h1 style={{ ...typo.title, fontSize: 72, color: theme.foreground, margin: '40px 0 12px 0', transform: `translateX(${titleX}px)`, opacity: titleOpacity }}>
        {title}
      </h1>
      <p style={{ ...typo.body, fontSize: 28, color: theme.primary, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', margin: 0, opacity: moduleOpacity }}>
        {module}
      </p>
    </div>
  );
};

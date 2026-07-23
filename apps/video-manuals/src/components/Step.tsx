import React from 'react';
import { Audio, staticFile } from 'remotion';
import type { Step as StepType, StepAudio } from '../schemas/tutorial';
import { ZoomScreenshot } from './ZoomScreenshot';
import { HighlightBox } from './HighlightBox';

interface StepProps {
  step: StepType;
  stepAudio: StepAudio;
}

/**
 * Un paso individual del tutorial: screenshot (opcionalmente con zoom),
 * highlight opcional encuadrando una región, y la narración en audio
 * sincronizada con la duración del MP3 + safety.
 *
 * El audio se reproduce desde staticFile(stepAudio.src) y dura lo que
 * diga stepAudio.durationFrames. Remotion lo posiciona automáticamente
 * dentro de la Sequence que lo contiene.
 */
export const Step: React.FC<StepProps> = ({ step, stepAudio }) => {
  return (
    <>
      <ZoomScreenshot src={step.screenshot} zoom={step.zoom} />
      {step.highlight ? <HighlightBox highlight={step.highlight} /> : null}
      <Audio src={staticFile(stepAudio.src)} />
    </>
  );
};

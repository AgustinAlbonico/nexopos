import React from 'react';
import { Sequence } from 'remotion';
import type { SerializedTutorial } from '../schemas/tutorial';
import { Intro } from './Intro';
import { Outro } from './Outro';
import { Step } from './Step';

interface TutorialVideoInternalProps {
  tutorial: SerializedTutorial;
}

/**
 * Arma la timeline completa del tutorial: Intro -> Steps (cada uno con
 * su screenshot + highlight + audio) -> Outro. Cada step ocupa una
 * Sequence con durationInFrames = stepAudio.durationFrames.
 *
 * OJO: el `tutorial` que recibe ya está serializado server-side por
 * loadTutorial.buildSerializedTutorial() — acá NO se toca el filesystem
 * ni se mide audio. Solo se arma el árbol de Sequences.
 */
export const TutorialVideoInternal: React.FC<TutorialVideoInternalProps> = ({ tutorial }) => {
  const { introDurationFrames, outroDurationFrames, stepsAudio, steps } = tutorial;

  let cursor = introDurationFrames;

  return (
    <>
      <Sequence from={0} durationInFrames={introDurationFrames} name="Intro">
        <Intro title={tutorial.title} module={tutorial.module} durationFrames={introDurationFrames} />
      </Sequence>

      {steps.map((step, i) => {
        const audio = stepsAudio[i];
        if (!audio) return null;
        const from = cursor;
        cursor += audio.durationFrames;
        return (
          <Sequence key={step.id} from={from} durationInFrames={audio.durationFrames} name={`Step: ${step.id}`}>
            <Step step={step} stepAudio={audio} />
          </Sequence>
        );
      })}

      <Sequence from={cursor} durationInFrames={outroDurationFrames} name="Outro">
        <Outro nextTitle={tutorial.next} durationFrames={outroDurationFrames} />
      </Sequence>
    </>
  );
};

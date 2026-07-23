import React from 'react';
import { Composition } from 'remotion';
import { TutorialVideo } from './components/TutorialVideo';
import {
  WIDTH,
  HEIGHT,
  FPS,
  INTRO_DURATION_FRAMES,
  OUTRO_DURATION_FRAMES,
  SerializedTutorial,
} from './schemas/tutorial';

const SAFE_DURATION = INTRO_DURATION_FRAMES + OUTRO_DURATION_FRAMES + 30;

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="TutorialVideo"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={TutorialVideo as any}
        defaultProps={{
          tutorial: null as SerializedTutorial | null,
        }}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={SAFE_DURATION}
        calculateMetadata={async ({ props }) => {
          const tutorial = (props as { tutorial?: SerializedTutorial | null }).tutorial;
          if (!tutorial) {
            throw new Error(
              'TutorialVideo requires --props \'{"tutorial": <SerializedTutorial>}\'. Use `tsx scripts/build-video.ts <id>` which precomputes the serialized tutorial server-side.',
            );
          }
          return {
            durationInFrames: Math.max(
              tutorial.totalDurationFrames,
              SAFE_DURATION,
            ),
            props,
          };
        }}
      />
    </>
  );
};

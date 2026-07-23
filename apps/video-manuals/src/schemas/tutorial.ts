import { z } from 'zod';

export const zoomSchema = z.object({
  x: z.number().default(960),
  y: z.number().default(540),
  scale: z.number().min(1).default(1),
});

export const highlightSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  label: z.string().optional(),
});

export const stepSchema = z.object({
  id: z.string(),
  screenshot: z.string(),
  narration: z.string(),
  zoom: zoomSchema.optional(),
  highlight: highlightSchema.nullable().optional(),
  duration: z.number().positive().describe('Safety seconds added after the audio ends'),
});

export const tutorialSchema = z.object({
  id: z.string(),
  title: z.string(),
  module: z.string(),
  description: z.string().default(''),
  next: z.string().nullable().default(null).describe('Title of the next video in the curriculum, shown in outro CTA'),
  steps: z.array(stepSchema).min(1),
});

export type Zoom = z.infer<typeof zoomSchema>;
export type Highlight = z.infer<typeof highlightSchema>;
export type Step = z.infer<typeof stepSchema>;
export type Tutorial = z.infer<typeof tutorialSchema>;

export const INTRO_DURATION_FRAMES = 90;
export const OUTRO_DURATION_FRAMES = 120;
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export interface StepAudio {
  stepId: string;
  src: string;
  durationFrames: number;
}

export interface SerializedTutorial extends Tutorial {
  introDurationFrames: number;
  outroDurationFrames: number;
  fps: number;
  width: number;
  height: number;
  stepsAudio: StepAudio[];
  totalDurationFrames: number;
}

export function serializeTutorial(
  tutorial: Tutorial,
  stepsAudio: StepAudio[],
): SerializedTutorial {
  const stepsFrames = stepsAudio.reduce((acc, a) => acc + a.durationFrames, 0);
  const total = INTRO_DURATION_FRAMES + stepsFrames + OUTRO_DURATION_FRAMES;
  return {
    ...tutorial,
    introDurationFrames: INTRO_DURATION_FRAMES,
    outroDurationFrames: OUTRO_DURATION_FRAMES,
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    stepsAudio,
    totalDurationFrames: total,
  };
}

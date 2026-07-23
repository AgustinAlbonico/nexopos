import { parseMedia } from '@remotion/media-parser';
import { nodeReader } from '@remotion/media-parser/node';
import { FPS } from '../schemas/tutorial';

export interface AudioMeta {
  durationInSeconds: number;
  durationInFrames: number;
}

export async function getAudioDurationInSeconds(src: string): Promise<AudioMeta> {
  const result = await parseMedia({
    src,
    fields: { durationInSeconds: true },
    reader: nodeReader,
    acknowledgeRemotionLicense: true,
  });
  const seconds = result.durationInSeconds ?? 0;
  const frames = Math.ceil(seconds * FPS);
  return { durationInSeconds: seconds, durationInFrames: Math.max(1, frames) };
}

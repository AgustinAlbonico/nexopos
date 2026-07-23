import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { tutorialSchema, type Tutorial, type StepAudio, type SerializedTutorial, FPS } from '../schemas/tutorial';
import { getAudioDurationInSeconds } from './audioDuration';

const ROOT = path.resolve(__dirname, '..', '..');
const TUTORIALS_DIR = path.join(ROOT, 'public', 'tutorials');

export function getTutorialDir(id: string): string {
  return path.join(TUTORIALS_DIR, id);
}

export function loadTutorialFile(id: string): Tutorial {
  const dir = getTutorialDir(id);
  const scriptPath = path.join(dir, 'script.yaml');
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Tutorial script not found: ${scriptPath}`);
  }
  const raw = fs.readFileSync(scriptPath, 'utf8');
  const parsed = yaml.load(raw);
  return tutorialSchema.parse(parsed);
}

export function audioFilePath(tutorialId: string, stepId: string): string {
  return path.join(getTutorialDir(tutorialId), 'audio', `${stepId}.mp3`);
}

export function screenshotFilePath(tutorialId: string, fileName: string): string {
  return path.join(getTutorialDir(tutorialId), 'screenshots', fileName);
}

export async function buildSerializedTutorial(
  id: string,
): Promise<SerializedTutorial> {
  const tutorial = loadTutorialFile(id);
  const stepsAudio: StepAudio[] = [];
  for (const step of tutorial.steps) {
    const abs = audioFilePath(id, step.id);
    if (!fs.existsSync(abs)) {
      throw new Error(`Audio not generated for step "${step.id}". Run 'pnpm generate:audio ${id}' first.`);
    }
    const { durationInFrames } = await getAudioDurationInSeconds(abs);
    const safetyFrames = Math.round((step.duration ?? 0) * FPS);
    stepsAudio.push({
      stepId: step.id,
      src: `tutorials/${id}/audio/${step.id}.mp3`,
      durationFrames: durationInFrames + safetyFrames,
    });
    step.screenshot = `tutorials/${id}/screenshots/${step.screenshot}`;
  }
  const { serializeTutorial } = await import('../schemas/tutorial');
  return serializeTutorial(tutorial, stepsAudio);
}

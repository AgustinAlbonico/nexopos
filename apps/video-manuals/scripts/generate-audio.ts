import * as fs from 'node:fs';
import * as path from 'node:path';
import { EdgeTTS } from '@travisvn/edge-tts';
import { loadTutorialFile, getTutorialDir } from '../src/lib/loadTutorial';

const VOICE = 'es-AR-ElenaNeural';

async function generateStepAudio(
  tutorialId: string,
  stepId: string,
  narration: string,
): Promise<void> {
  const dir = path.join(getTutorialDir(tutorialId), 'audio');
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${stepId}.mp3`);

  if (fs.existsSync(out)) {
    console.log(`  skip ${stepId} (already exists)`);
    return;
  }

  const tts = new EdgeTTS(narration, VOICE, {
    rate: '+0%',
    volume: '+0%',
    pitch: '+0Hz',
  });
  const result = await tts.synthesize();
  const buf = Buffer.from(await result.audio.arrayBuffer());
  fs.writeFileSync(out, buf);
  console.log(`  ok ${stepId} (${buf.length} bytes)`);
}

async function main(): Promise<void> {
  const tutorialId = process.argv[2];
  if (!tutorialId) {
    console.error('Usage: tsx scripts/generate-audio.ts <tutorial-id>');
    process.exit(1);
  }

  console.log(`Loading tutorial "${tutorialId}"...`);
  const tutorial = loadTutorialFile(tutorialId);
  console.log(`  ${tutorial.steps.length} steps`);

  for (const step of tutorial.steps) {
    console.log(`  generating: ${step.id}`);
    await generateStepAudio(tutorialId, step.id, step.narration);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

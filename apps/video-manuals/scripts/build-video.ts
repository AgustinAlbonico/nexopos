import * as fs from 'node:fs';
import * as path from 'node:path';
import * as child_process from 'node:child_process';
import { buildSerializedTutorial } from '../src/lib/loadTutorial';

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');

async function main(): Promise<void> {
  const tutorialId = process.argv[2];
  if (!tutorialId) {
    console.error('Usage: tsx scripts/build-video.ts <tutorial-id>');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`> Building serialized tutorial for "${tutorialId}" ...`);
  const serialized = await buildSerializedTutorial(tutorialId);
  console.log(
    `  steps: ${serialized.steps.length}, totalDurationFrames: ${serialized.totalDurationFrames}`,
  );

  const propsPath = path.join(OUT_DIR, `${tutorialId}.props.json`);
  fs.writeFileSync(
    propsPath,
    JSON.stringify({ tutorial: serialized }, null, 2),
    'utf8',
  );

  const entry = path.join(ROOT, 'src', 'index.ts');
  const output = path.join(OUT_DIR, `${tutorialId}.mp4`);

  const args = [
    'remotion',
    'render',
    entry,
    'TutorialVideo',
    output,
    `--props=${propsPath}`,
  ];

  console.log(`> npx ${args.join(' ')}`);

  const child = child_process.spawnSync('npx', args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (child.status !== 0) {
    console.error('remotion render failed');
    process.exit(child.status ?? 1);
  }

  console.log(`Generated: ${output}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

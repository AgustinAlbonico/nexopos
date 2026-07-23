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

  // Pre-build validation: fail fast if any referenced asset is missing or
  // coords are out of bounds. Without this, Remotion fails mid-render
  // (e.g. 404 on a renamed screenshot) and the user only learns at frame
  // ~1300/2094, wasting minutes.
  console.log(`> Validating assets and coordinates ...`);
  const SCREEN_W = 1920;
  const SCREEN_H = 1080;
  const errors: string[] = [];
  for (const step of serialized.steps) {
    const screenshotPath = path.join(ROOT, 'public', step.screenshot);
    if (!fs.existsSync(screenshotPath)) {
      errors.push(`  [${step.id}] screenshot not found: ${screenshotPath}`);
    }
    if (step.highlight) {
      const h = step.highlight;
      const x2 = h.x + h.w;
      const y2 = h.y + h.h;
      if (h.x < 0 || h.y < 0 || x2 > SCREEN_W || y2 > SCREEN_H) {
        errors.push(
          `  [${step.id}] highlight out of bounds: x=${h.x} y=${h.y} w=${h.w} h=${h.h} ` +
            `(must fit within ${SCREEN_W}x${SCREEN_H})`,
        );
      }
    }
    if (step.zoom) {
      const z = step.zoom;
      if (z.scale <= 0) {
        errors.push(`  [${step.id}] zoom.scale must be > 0 (got ${z.scale})`);
      }
      if (z.x < 0 || z.y < 0 || z.x > SCREEN_W || z.y > SCREEN_H) {
        errors.push(
          `  [${step.id}] zoom center out of bounds: x=${z.x} y=${z.y} ` +
            `(must be within ${SCREEN_W}x${SCREEN_H})`,
        );
      }
    }
  }
  if (errors.length > 0) {
    console.error(`\nPre-build validation FAILED (${errors.length} error${errors.length === 1 ? '' : 's'}):`);
    for (const e of errors) console.error(e);
    console.error(
      `\nFix the issues above and retry. No MP4 was generated.`,
    );
    process.exit(1);
  }
  console.log(`  OK (${serialized.steps.length} steps validated)`);

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

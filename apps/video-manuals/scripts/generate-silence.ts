/**
 * Genera MP3 de silencio como placeholder cuando Edge TTS no está disponible
 * (firewall corporativo, sin internet, etc.). La duración se estima a partir
 * de la narración (~110 palabras por minuto para español argentino).
 *
 * Uso:
 *   npx tsx scripts/generate-silence.ts <tutorial-id>
 *
 * NOTA: los archivos generados tienen la misma ruta que generate-audio.ts
 * (audio/<step-id>.mp3). Si después generás el audio real, este script
 * se saltea los archivos existentes.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadTutorialFile, getTutorialDir } from '../src/lib/loadTutorial';

const ROOT = path.resolve(__dirname, '..');
const FFMPEG = path.resolve(
  ROOT,
  '..',
  '..',
  'node_modules',
  '@remotion',
  'compositor-win32-x64-msvc',
  'ffmpeg.exe',
);
const WPM = 110; // Velocidad conservadora para narración en español rioplatense

function estimateDurationSec(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const seconds = (words / WPM) * 60;
  // Mínimo 3s para que no quede un step vacío. Redondeo a 0.1s.
  return Math.max(3, Math.round(seconds * 10) / 10);
}

function generateSilenceMp3(outPath: string, durationSec: number): void {
  const result = spawnSync(
    FFMPEG,
    [
      '-y',
      '-f', 'lavfi',
      '-i', 'anullsrc=r=24000:cl=mono',
      '-t', String(durationSec),
      '-c:a', 'libmp3lame',
      '-b:a', '64k',
      outPath,
    ],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) {
    throw new Error(`ffmpeg exited with status ${result.status}`);
  }
}

function main(): void {
  const tutorialId = process.argv[2];
  if (!tutorialId) {
    console.error('Usage: tsx scripts/generate-silence.ts <tutorial-id>');
    process.exit(1);
  }

  if (!fs.existsSync(FFMPEG)) {
    console.error(`ffmpeg no encontrado en ${FFMPEG}`);
    console.error('Verificá que npm install haya hoisteado @remotion/compositor-win32-x64-msvc.');
    process.exit(1);
  }

  const tutorial = loadTutorialFile(tutorialId);
  const audioDir = path.join(getTutorialDir(tutorialId), 'audio');
  fs.mkdirSync(audioDir, { recursive: true });

  console.log(`[silence] Generando placeholders para "${tutorialId}" (${tutorial.steps.length} pasos)`);
  console.log('[silence] Edge TTS parece estar bloqueado. Después podés correr generate:audio para audio real.');

  for (const step of tutorial.steps) {
    const out = path.join(audioDir, `${step.id}.mp3`);
    if (fs.existsSync(out)) {
      console.log(`  skip ${step.id} (ya existe)`);
      continue;
    }
    const duration = estimateDurationSec(step.narration);
    try {
      generateSilenceMp3(out, duration);
      console.log(`  ok ${step.id} (${duration}s de silencio, ~${Math.round(duration * WPM / 60)} palabras)`);
    } catch (e) {
      console.error(`  FAIL ${step.id}: ${(e as Error).message}`);
      process.exit(1);
    }
  }

  console.log('[silence] Listo.');
}

main();

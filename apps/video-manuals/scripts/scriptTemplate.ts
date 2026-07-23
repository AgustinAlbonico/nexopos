import * as fs from 'node:fs';
import * as path from 'node:path';
import { getTutorialDir } from '../src/lib/loadTutorial';

const TEMPLATE = `id: __ID__
title: "Titulo del video"
module: "Etapa N - Modulo"
description: ""
next: "Titulo del siguiente video"  # o null si es el ultimo
steps:
  - id: paso-1
    screenshot: "01-inicio.png"   # archivo en screenshots/
    narration: |
      Narracion en español argentino para este paso.
      Puede ocupar varias lineas.
    zoom:
      x: 960        # centro X en espacio 1920x1080
      y: 540        # centro Y
      scale: 1.6    # factor de zoom (>1 acerca)
    highlight:
      x: 300        # top-left X de la caja en espacio screenshot
      y: 250
      w: 600
      h: 120
      label: "Aca toca"  # opcional
    duration: 0.5   # segundos de safety post-audio
  - id: paso-2
    screenshot: "02-segundo.png"
    narration: |
      Segundo paso...
    zoom:
      x: 1200
      y: 700
      scale: 2
    highlight: null
    duration: 0.5
`;

function main(): void {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: tsx scripts/scriptTemplate.ts <tutorial-id>');
    process.exit(1);
  }

  const dir = getTutorialDir(id);
  if (fs.existsSync(dir)) {
    console.error(`Tutorial "${id}" ya existe en ${dir}`);
    process.exit(1);
  }

  fs.mkdirSync(path.join(dir, 'screenshots'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'audio'), { recursive: true });

  const scriptPath = path.join(dir, 'script.yaml');
  fs.writeFileSync(scriptPath, TEMPLATE.replace(/__ID__/g, id), 'utf8');

  console.log(`Scaffold creado en ${dir}`);
  console.log('  - script.yaml (edita los steps)');
  console.log('  - screenshots/  (guarda aca las capturas Playwright)');
  console.log('  - audio/         (generado por generate:audio)');
}

main();

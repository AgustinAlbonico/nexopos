# NexoPOS - Manuales de usuario en video

Generador de videos tutoriales de NexoPOS usando **Remotion** + TTS + screenshots reales del sistema capturados con **Playwright**. TTS primario: **Edge TTS** (voz es-AR-ElenaNeural, gratis). Fallback offline Windows: **SAPI** (voz Helena es-ES, activa si Edge TTS está bloqueado por firewall corporativo).

Cada modulo del sistema tiene su propio video. El guion vive en un YAML simple y el pipeline arma el MP4 final: intro animada con logo + pasos con screenshot/audio/zoom/highlight + outro con CTA al siguiente video.

---

## Stack

- **Remotion 4.0.292** - render de video declarativo en React (1080p 30fps MP4).
- **@travisvn/edge-tts** - voz sintetica es-AR-ElenaNeural (Microsoft Edge TTS, gratis, sin API key).
- **Playwright MCP** - captura de screenshots del sistema real (externo a este paquete).
- **Zod + js-yaml** - tipado y parseo del guion.

## Estructura

```
apps/video-manuals/
  package.json
  tsconfig.json
  remotion.config.ts
  public/
    logo-nexopos.png
  src/
    index.ts                    # registerRoot(Root)
    Root.tsx                    # Composition + calculateMetadata
    schemas/tutorial.ts         # Zod schemas + tipos + serializeTutorial
    lib/
      loadTutorial.ts           # lee YAML, mide audios, arma SerializedTutorial
      audioDuration.ts          # wrapper de @remotion/media-parser
    components/
      TutorialVideo.tsx         # componente publico (va en la Composition)
      TutorialVideoInternal.tsx # armar Sequences de intro + steps + outro
      Intro.tsx                 # logo + titulo animados
      Outro.tsx                  # CTA "Proximo video" o "Fin del tutorial"
      Step.tsx                  # screenshot + audio + highlight por paso
      ZoomScreenshot.tsx        # screenshot con zoom interpolado
      HighlightBox.tsx          # caja de highlight con label + vignette
      theme.ts                  # colores y tipografia NexoPOS
  scripts/
    generate-audio.ts           # YAML -> MP3 por paso (Edge TTS es-AR)
    generate-silence.ts         # fallback silencio (ffmpeg anullsrc)
    sapi-generate-audio.ps1     # fallback offline Windows (SAPI Helena es-ES)
    scriptTemplate.ts           # scaffold de tutorials/{id}/
    build-video.ts              # invoca remotion render con props + pre-build validation
    capture-screenshots.ts      # captura 1920x1080 de NexoPOS con Playwright
  public/
    logo-nexopos.png
    tutorials/
      _template/script.yaml     # template de guion completo y comentado
      <id>/
        script.yaml             # guion editado por video
        screenshots/*.png        # capturas 1920x1080
        audio/*.mp3              # generados por generate:audio | generate:sapi | generate:silence
  out/
    <id>.mp4                    # video final
  .env.example                  # template de NEXOPOS_USERNAME/PASSWORD/BASE_URL
```

---

## Flujo por video nuevo

Cada video es una carpeta `tutorials/<id>/`. El flujo para crear uno nuevo:

### 1. Scaffold del guion

```bash
npm run scaffold:tutorial configuracion-general
```

Crea `tutorials/configuracion-general/` con `script.yaml` (template), `screenshots/` y `audio/` vacios.

### 2. Capturar screenshots con Playwright MCP

Las capturas son 1920x1080 (fullscreen del sistema). Se guardan en `tutorials/<id>/screenshots/01-*.png`, `02-*.png`, etc. El orden y los nombres deben matchear el campo `screenshot` de cada step en el YAML.

> La captura se hace desde afuera de este paquete, usando el MCP de Playwright contra el sistema NexoPOS corriendo en local. El orden pedagogico se garantiza porque cada video asume que el usuario ya vio los anteriores del curriculo.

### 3. Completar el guion YAML

Editar `tutorials/<id>/script.yaml`:

- `id`, `title`, `module`, `description`, `next` (titulo EXACTO del video siguiente, o `null` si es el ultimo).
- `steps[]`: cada paso tiene `id`, `screenshot` (nombre del PNG), `narration` (texto que lee TTS), `zoom` (opcional: x/y centro + scale), `highlight` (opcional: x/y/w/h caja + label opcional), `duration` (segundos de pausa post-audio).

Ver `tutorials/_template/script.yaml` para el formato completo con comentarios.

### 4. Generar audio

```bash
npm run generate:audio configuracion-general
```

Lee el YAML, por cada step genera `tutorials/<id>/audio/<stepId>.mp3` con voz es-AR-ElenaNeural. Skip si el MP3 ya existe (para re-generar, borrar la carpeta `audio/`).

### 5. Previsualizar en Studio (opcional)

```bash
npm run dev
```

Abre Remotion Studio. Para ver un tutorial especifico:

```bash
npm run dev --props='{"tutorialId":"configuracion-general"}'
```

### 6. Renderizar el MP4 final

```bash
npm run build:video configuracion-general
```

Genera `out/configuracion-general.mp4` (1080p 30fps).

---

## Curriculo (11 videos en 4 etapas)

| #  | Video                          | Modulo              |
|----|--------------------------------|---------------------|
| 1  | Configuracion general + Barcode| Etapa 1 - Setup     |
| 2  | Usuarios y Backup              | Etapa 1 - Setup     |
| 3  | Categorias y Productos         | Etapa 2 - Carga     |
| 4  | Clientes y categorias          | Etapa 2 - Carga     |
| 5  | Proveedores                    | Etapa 2 - Carga     |
| 6  | Caja apertura/movimientos     | Etapa 3 - Operacion |
| 7  | Ventas POS                     | Etapa 3 - Operacion |
| 8  | Cuentas Corrientes             | Etapa 3 - Operacion |
| 9  | Ingresos/Compras/Gastos       | Etapa 3 - Operacion |
| 10 | Caja cierre/arqueo            | Etapa 4 - Analisis  |
| 11 | Dashboard y Reportes           | Etapa 4 - Analisis  |

**Out of scope**: instalacion y facturacion fiscal AFIP (se hacen aparte).

---

## Configuracion de render

- Resolucion: 1920x1080 (Full HD)
- FPS: 30
- Intro: 90 frames (3s)
- Outro: 120 frames (4s)
- Safety por step: `duration` segundos post-audio
- Formato: MP4 (H.264 / AAC)

Definidos en `src/schemas/tutorial.ts` (constantes `WIDTH`, `HEIGHT`, `FPS`, `INTRO_DURATION_FRAMES`, `OUTRO_DURATION_FRAMES`).

---

## Notas tecnicas

- **TutorialVideo.tsx** (componente publico en la Composition) NO usa filesystem. Recibe `tutorial: SerializedTutorial` ya computado. El `calculateMetadata` de `Root.tsx` hace todo el trabajo server-side: lee el YAML, mide los audios con `@remotion/media-parser`, arma los `StepAudio[]` con `durationFrames`, y pasa el `SerializedTutorial` como prop.
- **Edge TTS** es gratis y no requiere API key, pero necesita conexion a internet (habla con los endpoints de Microsoft Edge Read Aloud).
- Los audios se cachean en `public/tutorials/<id>/audio/`. Borrar la carpeta para forzar regeneracion.
- Los screenshots son 1920x1080. El zoom se calcula en ese espacio de coordenadas.
- **Step schema (Zod)** acepta un campo opcional `route: z.string()` por step. Lo usa `capture-screenshots.ts` para navegar al URL correspondiente antes de capturar.

---

## Fallbacks operativos

### TTS

Edge TTS puede quedar bloqueado por firewall corporativo (endpoint de Microsoft Edge Read Aloud). Si pasa, dos alternativas:

1. **SAPI (offline, solo Windows)**: voz Helena es-ES via `System.Speech.Synthesis`. Genera WAV y convierte a MP3 96k/44.1kHz con el ffmpeg hoisted de Remotion. Funciona sin internet.

   ```bash
   npm run generate:sapi configuracion-general
   ```

2. **Silence placeholder**: MP3 de silencio calculado por duración estimada de la narración (110 palabras/min, mínimo 3s). Útil para validar el pipeline antes de tener audio real.

   ```bash
   npm run generate:silence configuracion-general
   ```

### Captura de screenshots

Si NexoPOS no está corriendo, `scripts/build-video.ts` tiene **pre-build validation** que falla rápido (`exit 1`) si falta algún screenshot o las coordenadas de `highlight`/`zoom` se salen de bounds 1920×1080. Útil para regenerar con placeholders sin perder tiempo de cómputo de Remotion.

### Workflow recomendado

1. Editar `public/tutorials/<id>/script.yaml` (5 steps aprox).
2. Capturar screenshots reales con NexoPOS corriendo:
   ```bash
   cp .env.example .env  # poblar NEXOPOS_USERNAME/PASSWORD
   npm run capture <id>
   ```
3. Generar audio (Edge TTS, o SAPI si Edge está bloqueado):
   ```bash
   npm run generate:audio <id>   # o generate:sapi / generate:silence
   ```
4. Renderizar:
   ```bash
   npm run build:video <id>
   ```

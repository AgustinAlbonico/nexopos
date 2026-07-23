import * as path from 'node:path';
import { chromium, type Page } from 'playwright-core';
import { loadTutorialFile } from '../src/lib/loadTutorial';

const ROOT = path.resolve(__dirname, '..');
const WIDTH = 1920;
const HEIGHT = 1080;
const POST_NAVIGATE_SETTLE_MS = 800;
const LOGIN_REDIRECT_TIMEOUT_MS = 15000;

async function captureTutorial(tutorialId: string): Promise<void> {
  const baseUrl = process.env.NEXOPOS_BASE_URL ?? 'http://localhost:5173';
  const username = process.env.NEXOPOS_USERNAME;
  const password = process.env.NEXOPOS_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'NEXOPOS_USERNAME and NEXOPOS_PASSWORD env vars are required. Copy .env.example to .env and fill them in.',
    );
  }

  const tutorial = loadTutorialFile(tutorialId);

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    let loggedIn = false;
    let captured = 0;
    let skipped = 0;

    for (const step of tutorial.steps) {
      if (!step.route) {
        console.warn(`[skip] ${step.id}: step has no "route" field in script.yaml`);
        skipped += 1;
        continue;
      }

      const isLoginScreen =
        step.route === '/login' || step.route.endsWith('/login');

      if (!isLoginScreen && !loggedIn) {
        await login(page, baseUrl, username, password);
        loggedIn = true;
      }

      const url = new URL(step.route, baseUrl).toString();
      console.log(`[capture] ${step.screenshot}  <-  ${url}`);

      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(POST_NAVIGATE_SETTLE_MS);

      const outPath = path.join(
        ROOT,
        'public',
        'tutorials',
        tutorialId,
        'screenshots',
        step.screenshot,
      );

      await page.screenshot({ path: outPath, fullPage: false });
      captured += 1;
    }

    console.log(
      `\nDone. Captured ${captured}/${tutorial.steps.length} screenshots for "${tutorialId}"` +
        (skipped > 0 ? ` (${skipped} skipped)` : '') +
        '.',
    );
  } finally {
    await browser.close();
  }
}

async function login(
  page: Page,
  baseUrl: string,
  username: string,
  password: string,
): Promise<void> {
  await page.goto(new URL('/login', baseUrl).toString(), {
    waitUntil: 'networkidle',
  });
  await page.fill('#username', username);
  await page.fill('#password', password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), {
      timeout: LOGIN_REDIRECT_TIMEOUT_MS,
    }),
    page.click('button[type="submit"]'),
  ]);
}

const tutorialId = process.argv[2];
if (!tutorialId) {
  console.error('Usage: npx tsx scripts/capture-screenshots.ts <tutorial-id>');
  process.exit(1);
}

captureTutorial(tutorialId).catch((err) => {
  console.error(err);
  process.exit(1);
});

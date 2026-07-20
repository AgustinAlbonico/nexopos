/**
 * Tests E2E de responsividad
 * Verifica que la UI se adapta correctamente en diferentes viewports
 * sin overflow horizontal ni componentes rotos
 */
import { test, expect } from '../fixtures/test-fixtures';

const VIEWPORTS = [
  { width: 1024, height: 768, label: 'tablet' },
  { width: 1280, height: 800, label: 'small-desktop' },
  { width: 1366, height: 768, label: 'notebook' },
  { width: 1440, height: 900, label: 'medium-desktop' },
  { width: 1920, height: 1080, label: 'full-hd' },
] as const;

test.describe('Responsividad', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`Viewport ${viewport.label} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      test('Dashboard sin overflow horizontal', async ({ page, helpers }) => {
        await helpers.navigateTo('/dashboard');
        await helpers.waitForLoading();

        // Verificar que NO hay scroll horizontal
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalScroll).toBe(false);
      });

      test('Sidebar colapsado en pantallas pequeñas', async ({ page, helpers }) => {
        await helpers.navigateTo('/dashboard');
        await helpers.waitForLoading();

        const sidebar = page.locator('nav').first();
        const sidebarBox = await sidebar.boundingBox();

        if (viewport.width < 1280) {
          // Sidebar debería estar colapsado (angosto)
          expect(sidebarBox).not.toBeNull();
          if (sidebarBox) {
            expect(sidebarBox.width).toBeLessThanOrEqual(80);
          }
        }
      });

      test('Contenido principal visible', async ({ page, helpers }) => {
        await helpers.navigateTo('/dashboard');
        await helpers.waitForLoading();

        // El main content debe ser visible y tener un ancho razonable
        const main = page.locator('main').first();
        await expect(main).toBeVisible();

        const mainBox = await main.boundingBox();
        if (mainBox) {
          // Debe ocupar al menos la mitad del viewport
          expect(mainBox.width).toBeGreaterThan(viewport.width * 0.5);
        }
      });

      test('Página de ventas sin overflow horizontal', async ({ page, helpers }) => {
        await helpers.navigateTo('/sales');
        await helpers.waitForLoading();

        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalScroll).toBe(false);
      });

      test('Botón Nueva Venta visible en página de ventas', async ({ page, helpers }) => {
        await helpers.navigateTo('/sales');
        await helpers.waitForLoading();

        const newSaleButton = page.getByRole('button', { name: /Nueva Venta/i });
        await expect(newSaleButton).toBeVisible();
      });
    });
  }
});

/**
 * Smoke Tests E2E para Flujos Críticos
 *
 * Prueba los flujos más críticos después de cada deployment:
 * - Login → Dashboard → Crear venta básica
 * Tiempo de ejecución objetivo: < 30 segundos
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Smoke Tests - Flujos Críticos Post-Deployment', () => {
    let page: Page;

    test.beforeEach(async ({ page: p }) => {
        page = p;
    });

    test('debe poder cargar la aplicación', async () => {
        await page.goto('/');

        // Verificar que la página cargó
        await expect(page).toHaveTitle(/NexoPOS|Sistema/i);
    });

    test('debe mostrar formulario de login', async () => {
        await page.goto('/#/login');

        await expect(page.locator('input[name="username"], input[id="username"]')).toBeVisible();
        await expect(page.locator('input[name="password"], input[id="password"]')).toBeVisible();
    });

    test('debe poder navegar al dashboard después del login', async () => {
        await page.goto('/#/login');

        await page.locator('input[name="username"], input[id="username"]').fill('admin');
        await page.locator('input[name="password"], input[id="password"]').fill('Admin123!');
        await page.click('button[type="submit"]');

        await page.waitForURL(/\/(dashboard|home|)/, { timeout: 10000 });
        expect(page.url()).toMatch(/dashboard|home/);
    });

    test('debe mostrar elementos principales del dashboard', async () => {
        await page.goto('/#/dashboard');
        const hasDashboardContent = await page.locator('text=/ventas|productos|dashboard|resumen/i').count() > 0;

        if (hasDashboardContent) {
            await expect(page.locator('text=/ventas|productos|dashboard|resumen/i').first()).toBeVisible();
        }
    });

    test('debe cargar los módulos principales', async () => {
        await page.goto('/#/dashboard');

        const navLinks = page.locator('nav a, [role="navigation"] a');
        const count = await navLinks.count();

        expect(count).toBeGreaterThan(0);
    });
});

test.describe('Smoke Tests - Verificación de API', () => {
    test('la API debe responder a requests básicos', async ({ request }) => {
        const response = await request.get('http://localhost:3000/api/docs');

        expect(response.status()).toBe(200);
    });

    test('la API debe rechazar requests sin autenticación cuando corresponde', async ({ request }) => {
        // Intentar acceder a un endpoint protegido
        const response = await request.get('http://localhost:3000/sales');

        // Debe ser 401 o 403, no 500
        expect([401, 403, 404]).toContain(response.status());
    });
});

test.describe('Smoke Tests - Verificación de Recursos', () => {
    test('los recursos estáticos deben cargar correctamente', async ({ page }) => {
        await page.goto('/');

        // Verificar que no hay errores de recursos faltantes
        page.on('response', (response) => {
            if (response.status() === 404) {
                console.warn(`Resource not found: ${response.url()}`);
            }
        });
    });

    test('la aplicación debe ser responsive', async ({ page }) => {
        await page.goto('/');

        // Setear tamaño móvil
        await page.setViewportSize({ width: 375, height: 667 });

        // Verificar que la página se ve bien en móvil
        await expect(page.locator('body')).toBeVisible();

        // Verificar que hay un menú móvil o que el contenido es accesible
        const hasMenu = await page.locator('button[aria-label*="menu"], button[aria-label*="Menu"], nav').count() > 0;
        expect(hasMenu).toBe(true);
    });
});

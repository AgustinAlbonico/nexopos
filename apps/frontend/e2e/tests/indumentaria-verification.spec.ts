import { test, expect } from '@playwright/test';

test.describe('Verificación Integral de Frontend - Indumentaria y Calzado', () => {

    test('1. Verificación de Login y Acceso a Dashboard', async ({ page }) => {
        await page.goto('/#/login');
        await page.waitForLoadState('networkidle');

        // Si estamos redirigidos a login, ingresar credenciales
        if (page.url().includes('login')) {
            await page.fill('input[name="username"], input[id="username"]', 'admin');
            await page.fill('input[name="password"], input[id="password"]', 'Admin123!');
            await page.click('button[type="submit"]');
            await page.waitForURL('**/dashboard');
        }

        // Verificar título de la página
        await expect(page).toHaveURL(/.*dashboard/);
        await expect(page.locator('h1, h2, div').filter({ hasText: /Dashboard|Inicio|Bienvenido/i }).first()).toBeVisible();
    });

    test('2. Verificación de Navegación al POS de Ventas', async ({ page }) => {
        await page.goto('/#/sales');
        await page.waitForLoadState('networkidle');

        // Confirmar pantalla de POS
        await expect(page).toHaveURL(/.*sales/);
        await expect(page.getByText(/Ventas|Nueva Venta|Carrito/i).first()).toBeVisible();
    });

    test('3. Verificación del Catálogo de Productos y Registro de Indumentaria', async ({ page }) => {
        await page.goto('/#/products');
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveURL(/.*products/);
        await expect(page.getByText(/Productos/i).first()).toBeVisible();
    });

    test('4. Verificación del Módulo de Caja', async ({ page }) => {
        await page.goto('/#/cash-register');
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveURL(/.*cash-register/);
        await expect(page.getByText(/Caja|Movimientos|Apertura|Cierre/i).first()).toBeVisible();
    });

    test('5. Verificación de Reportes e Indicadores de Indumentaria', async ({ page }) => {
        await page.goto('/#/reports');
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveURL(/.*reports/);
        await expect(page.getByText(/Reportes|Estadísticas|Ventas/i).first()).toBeVisible();
    });
});

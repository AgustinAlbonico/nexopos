import { test, expect } from '@playwright/test';

test.describe('Multi-depósito visibility verification', () => {
  test('Verify Sidebar menu and Settings card when multi-depósito is disabled', async ({ page }) => {
    // 1. Ir a Dashboard con HashRouter
    await page.goto('/#/dashboard');
    await page.waitForSelector('text=Hola, Administrador!');

    // 2. Verificar Sidebar: "Ubicaciones" y "Reposición" NO deben estar visibles
    const locationsLink = page.getByRole('link', { name: 'Ubicaciones' });
    const replenishmentLink = page.getByRole('link', { name: 'Reposición' });

    await expect(locationsLink).not.toBeVisible();
    await expect(replenishmentLink).not.toBeVisible();

    // Guardar captura del Sidebar en Dashboard
    await page.screenshot({ path: 'e2e-sidebar-no-multideposito.png', fullPage: false });

    // 3. Ir a Ajustes Generales con HashRouter (/#/settings)
    await page.goto('/#/settings');
    await page.waitForSelector('text=Control por Múltiples Depósitos');

    // Verificar que la card de Múltiples Depósitos está presente con su botón
    const cardTitle = page.locator('text=Control por Múltiples Depósitos');
    const enableButton = page.getByRole('button', { name: 'Habilitar Múltiples Depósitos' });

    await expect(cardTitle).toBeVisible();
    await expect(enableButton).toBeVisible();

    // Guardar captura de pantalla del Card en Ajustes
    await page.screenshot({ path: 'e2e-settings-multideposito-card.png', fullPage: false });
  });
});

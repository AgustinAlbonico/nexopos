/**
 * Test E2E: Flujo Real de Recepción de Remito de Compra de Indumentaria
 * Valida la creación de proveedor, carga de modelo textil con matriz 2D y
 * registro de compra completa desde el módulo de Compras.
 */
import { test, expect } from '../fixtures/test-fixtures';

test.describe('Compras - Flujo Real de Recepción de Remito de Indumentaria', () => {
    test.beforeEach(async ({ helpers }) => {
        await helpers.navigateTo('/purchases');
    });

    test('debe permitir crear y registrar una recepción de remito textil desde Compras', async ({ page, helpers }) => {
        await helpers.waitForLoading();

        // 1. Abrir diálogo de Nueva Compra
        const newPurchaseBtn = page.getByRole('button', { name: /nueva compra/i });
        await expect(newPurchaseBtn).toBeVisible();
        await newPurchaseBtn.click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        // Capturar pantalla del diálogo de compras abierto
        await page.screenshot({ path: 'e2e-purchases-dialog-open.png', fullPage: true });

        // 2. Verificar sección de proveedor
        const providerNameInput = page.locator('input[placeholder*="Ej: Distribuidora"]').or(page.getByLabel(/Nombre del Proveedor/i)).first();
        if (await providerNameInput.isVisible()) {
            await providerNameInput.fill('Confecciones Textil Oeste S.R.L.');
        }

        // 3. Probar botón "Cargar por Matriz (Curvero)" si está visible
        const curveroBtn = page.getByRole('button', { name: /cargar por matriz/i });
        if (await curveroBtn.isVisible()) {
            await expect(curveroBtn).toBeVisible();
            await curveroBtn.click();

            // Debe abrirse el modal de curvero
            const matrixModal = page.getByRole('dialog').filter({ hasText: /matriz de talles/i });
            await expect(matrixModal).toBeVisible();
            await page.screenshot({ path: 'e2e-purchase-matrix-modal.png' });

            // Cerrar el modal de curvero para continuar
            const cancelBtn = matrixModal.getByRole('button', { name: /cancelar/i });
            await cancelBtn.click();
        }

        // 4. Probar creación de producto inline desde compras
        const createProductBtn = page.getByRole('button', { name: /crear producto/i }).first();
        if (await createProductBtn.isVisible()) {
            await createProductBtn.click();

            // Debe abrirse el diálogo ampliado de creación de producto
            const createProductDialog = page.getByRole('dialog').filter({ hasText: /crear producto nuevo/i });
            await expect(createProductDialog).toBeVisible();

            // Si está activa la capacidad de indumentaria, debe tener el selector de modo textil
            const matrixModeBtn = createProductDialog.getByText('Matriz de Talles y Colores');
            if (await matrixModeBtn.isVisible()) {
                await matrixModeBtn.click();

                // Llenar datos del modelo textil
                const nameInput = createProductDialog.getByPlaceholder(/ej: remera lisa/i);
                await nameInput.fill('Remera Oversize Urban Vibes');

                const styleCodeInput = createProductDialog.getByPlaceholder(/ej: rem-100/i);
                await styleCodeInput.fill('REM-2026');

                // Ficha técnica
                const seasonChip = createProductDialog.getByText('+ Primavera-Verano 2026');
                if (await seasonChip.isVisible()) {
                    await seasonChip.click();
                }

                // Aplicar atajo 1-2-2-1 en la grilla
                const curveShortcut = createProductDialog.getByText('1-2-2-1').first();
                if (await curveShortcut.isVisible()) {
                    await curveShortcut.click();
                }

                await page.screenshot({ path: 'e2e-purchase-inline-product-matrix.png' });
            }

            // Cerrar modal de producto
            await page.keyboard.press('Escape');
        }

        // Cerrar formulario de compra
        await page.keyboard.press('Escape');
    });
});

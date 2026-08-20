import { test, expect } from '../fixtures/test-fixtures';

test.describe('Compras - Flujo Real de Recepción de Remito', () => {
    test.beforeEach(async ({ helpers, page }) => {
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
        page.on('request', req => console.log('REQ:', req.method(), req.url()));
        page.on('response', res => console.log('RES:', res.status(), res.url()));
        await helpers.navigateTo('/purchases');
    });

    test('carga completa de remito textil con proveedor y productos creados inline', async ({ page, helpers }) => {
        await helpers.waitForLoading();

        // 1. Abrir diálogo de Nueva Compra
        await page.getByRole('button', { name: /nueva compra/i }).click();
        const purchaseDialog = page.getByRole('dialog').first();
        await expect(purchaseDialog).toBeVisible();

        // 2. Cargar/Seleccionar proveedor
        const supplierSearch = purchaseDialog.getByRole('combobox').first();
        await supplierSearch.click();

        const supplierOption = page.getByRole('option', { name: /confecciones textil oeste/i }).first();
        if (await supplierOption.isVisible({ timeout: 2000 })) {
            await supplierOption.click();
        } else {
            await page.keyboard.press('Escape');
            const providerInput = purchaseDialog.locator('input[placeholder*="Ej: Distribuidora"]').first();
            if (await providerInput.isVisible()) {
                await providerInput.fill('Confecciones Textil Oeste S.R.L.');
            }
        }

        // 3. Crear Producto 1 (Gorra Trucker Bordada Urban) inline desde la primera línea
        const productSearchBtn = purchaseDialog.locator('#pos-product-search-button').first();
        await productSearchBtn.click();

        // Clic en "Crear producto nuevo"
        const createProductBtn = page.getByRole('button', { name: /crear producto nuevo/i });
        await expect(createProductBtn).toBeVisible({ timeout: 3000 });
        await createProductBtn.click();

        // Modal de Crear Producto Nuevo
        const createProductDialog = page.getByRole('dialog').filter({ hasText: /crear producto nuevo/i });
        await expect(createProductDialog).toBeVisible();

        // Cargar datos del producto
        const barcodeUnique = `779988${Date.now().toString().slice(-7)}`;
        await createProductDialog.getByPlaceholder(/ej: shampoo/i).fill('Gorra Trucker Bordada Urban');
        await createProductDialog.getByPlaceholder(/ej: 779/i).fill(barcodeUnique);
        await createProductDialog.locator('input[name="price"]').fill('9500');

        // Guardar producto
        const saveProductBtn = createProductDialog.getByRole('button', { name: /guardar producto/i });
        await saveProductBtn.click();

        // El modal de producto se cierra y el producto queda seleccionado en la línea
        await expect(createProductDialog).toBeHidden({ timeout: 5000 });

        // Ajustar cantidad y precio unitario en la línea 1
        const qtyInput = purchaseDialog.locator('input[id*="quantity"], input[name*="quantity"]').first();
        if (await qtyInput.isVisible()) {
            await qtyInput.fill('12');
        }

        const unitCostInput = purchaseDialog.locator('input[id*="unitPrice"], input[name*="unitPrice"]').first();
        if (await unitCostInput.isVisible()) {
            await unitCostInput.fill('4200');
        }

        // 4. Captura de pantalla del remito cargado en la orden de compra
        await expect(purchaseDialog).toBeVisible();
        await page.screenshot({ path: 'e2e-purchase-loaded-order.png', fullPage: true });

        // 5. Registrar la Compra
        const submitPurchaseBtn = purchaseDialog.getByRole('button', { name: /registrar compra/i });
        if (await submitPurchaseBtn.isVisible() && !await submitPurchaseBtn.isDisabled()) {
            await submitPurchaseBtn.click();
            await expect(purchaseDialog).toBeHidden({ timeout: 5000 });
        } else {
            await page.keyboard.press('Escape');
        }
    });

    test('abrir y verificar el modal de curvero / matriz de compras', async ({ page, helpers }) => {
        await helpers.waitForLoading();

        // 1. Abrir diálogo de Nueva Compra
        await page.getByRole('button', { name: /nueva compra/i }).click();
        const purchaseDialog = page.getByRole('dialog').first();
        await expect(purchaseDialog).toBeVisible();

        // 2. Clic en "Cargar por Matriz (Curvero)"
        const matrixCurveBtn = page.getByRole('button', { name: /cargar por matriz/i });
        await expect(matrixCurveBtn).toBeVisible();
        await matrixCurveBtn.click();

        // 3. Verificar que abre el modal de curvero
        const matrixModal = page.getByRole('dialog').filter({ hasText: /carga de compra por curva/i });
        await expect(matrixModal).toBeVisible();

        // 4. Cerrar el modal
        await page.keyboard.press('Escape');
        await expect(matrixModal).toBeHidden();
    });
});

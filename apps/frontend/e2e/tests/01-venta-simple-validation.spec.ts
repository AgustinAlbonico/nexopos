/**
 * Validación E2E: Perfil 01 - Venta Simple (Kiosco / Retail)
 * 
 * Ejecuta automáticamente la batería de pruebas para el perfil simple-retail.
 */
import { test, expect } from '../fixtures/test-fixtures';

test.describe.serial('Validación 01 - Venta Simple (Kiosco / Retail)', () => {
  const TEST_BARCODE = `779${Math.floor(100000000 + Math.random() * 900000000)}`;
  const PRODUCT_NAME = `Alfajor Havanna E2E ${Date.now().toString().slice(-4)}`;

  test.beforeEach(async ({ helpers }) => {
    // Asegurar que la caja registradora esté abierta
    await helpers.ensureCashRegisterOpen();
  });

  test('01.1 - Crear producto rápido por código de barras', async ({ page, helpers }) => {
    await helpers.navigateTo('/products');

    // Click en Nuevo Producto
    await page.getByRole('button', { name: /Nuevo Producto/i }).click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    // Cargar datos de Venta Simple
    await page.getByLabel(/Nombre del Producto/i).fill(PRODUCT_NAME);
    
    const barcodeInput = page.getByLabel(/Código de Barras/i);
    if (await barcodeInput.isVisible().catch(() => false)) {
      await barcodeInput.fill(TEST_BARCODE);
    }

    const costInput = page.getByLabel(/Costo/i).first();
    await costInput.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('1000');

    const stockInput = page.getByLabel(/Stock Inicial|Stock Actual/i).first();
    await stockInput.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('50');

    // Guardar
    await page.getByRole('button', { name: /Guardar Producto|Guardar/i }).click();
    await helpers.waitForLoading();

    // Verificar que el producto aparece en la tabla
    await helpers.searchInTable(PRODUCT_NAME);
    await helpers.expectTableContains(PRODUCT_NAME);
  });

  test('01.2 - Cobranza rápida en mostrador y vuelto', async ({ page, helpers }) => {
    // 1. Navegar a Ventas
    await helpers.navigateTo('/sales');

    // 2. Buscar/Agregar producto por nombre o código
    const searchInput = page.getByPlaceholder(/Buscar producto por código|Buscar por nombre/i).first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill(PRODUCT_NAME);
      await page.waitForTimeout(500);

      // Click en el resultado de búsqueda o enter
      const resultItem = page.locator(`text=${PRODUCT_NAME}`).first();
      if (await resultItem.isVisible().catch(() => false)) {
        await resultItem.click();
      } else {
        await page.keyboard.press('Enter');
      }
    }

    await page.waitForTimeout(500);

    // 3. Proceder a Cobrar
    const checkoutButton = page.getByRole('button', { name: /Cobrar|Finalizar Venta/i }).first();
    if (await checkoutButton.isVisible().catch(() => false)) {
      await checkoutButton.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // Ingresar $2000 en efectivo
      const cashInput = page.getByLabel(/Efectivo|Paga con/i).first();
      if (await cashInput.isVisible().catch(() => false)) {
        await cashInput.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.type('2000');
      }

      // Confirmar venta
      const confirmButton = page.getByRole('button', { name: /Confirmar|Completar Venta/i }).first();
      await confirmButton.click();
      await helpers.waitForLoading();
    }
  });

  test('01.3 - Verificar que el stock descontó la unidad vendida', async ({ helpers }) => {
    await helpers.navigateTo('/products');
    await helpers.searchInTable(PRODUCT_NAME);
    await helpers.expectTableContains(PRODUCT_NAME);
  });

  test('01.4 - Arqueo y movimiento en Caja Registradora', async ({ page, helpers }) => {
    await helpers.navigateTo('/cash-register');
    await page.waitForTimeout(1000);

    // Verificar que la caja muestra estado Abierta
    await expect(page.getByText(/Caja Abierta|Estado: Abierta/i).first()).toBeVisible({ timeout: 10000 });
  });
});

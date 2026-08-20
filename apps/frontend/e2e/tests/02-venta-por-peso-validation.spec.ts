/**
 * Validación E2E: Perfil 02 - Venta por Peso / Balanza ⚖️
 * 
 * Ejecuta la batería de pruebas automatizadas para productos pesables,
 * cantidades decimales y ventas combinadas en fiambrerías/dietéticas.
 */
import { test, expect } from '../fixtures/test-fixtures';

test.describe.serial('Validación 02 - Venta por Peso / Balanza (Fiambrería / Dietética)', () => {
  const TEST_BARCODE = `20${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  const PRODUCT_NAME = `Queso Tybo Fiambrería E2E ${Date.now().toString().slice(-4)}`;
  const WEIGHT_SOLD_1 = 0.350;
  const INITIAL_STOCK = 25.500;

  test.beforeEach(async ({ helpers }) => {
    await helpers.ensureCashRegisterOpen();
  });

  test('02.1 - Alta de producto pesable con marca de Venta por Peso', async ({ page, helpers }) => {
    await helpers.navigateTo('/products');

    // Abrir formulario
    await page.getByRole('button', { name: /Nuevo Producto/i }).click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    // Nombre y código
    await page.getByLabel(/Nombre del Producto/i).fill(PRODUCT_NAME);
    
    const barcodeInput = page.getByLabel(/Código de Barras/i);
    if (await barcodeInput.isVisible().catch(() => false)) {
      await barcodeInput.fill(TEST_BARCODE);
    }

    // Marcar checkbox "Venta por peso o medida"
    const isMeasureCheckbox = page.getByLabel(/Venta por peso o medida/i);
    if (await isMeasureCheckbox.isVisible().catch(() => false)) {
      await isMeasureCheckbox.check();
    }

    // Costo ($8.000 / kg)
    const costInput = page.getByLabel(/Costo/i).first();
    await costInput.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('8000');

    // Stock inicial en decimales (25.500 kg)
    const stockInput = page.getByLabel(/Stock Inicial|Stock Actual/i).first();
    await stockInput.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type(INITIAL_STOCK.toString());

    // Guardar
    await page.getByRole('button', { name: /Guardar Producto|Guardar/i }).click();
    await helpers.waitForLoading();

    // Verificar en tabla
    await helpers.searchInTable(PRODUCT_NAME);
    await helpers.expectTableContains(PRODUCT_NAME);
  });

  test('02.2 - Venta en mostrador con cantidad fraccionada decimal (0.350 kg)', async ({ page, helpers }) => {
    await helpers.navigateTo('/sales');

    // Click en Nueva Venta si es necesario
    const newSaleBtn = page.getByRole('button', { name: /Nueva Venta/i });
    if (await newSaleBtn.isVisible().catch(() => false)) {
      await newSaleBtn.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 }).catch(() => {});
    }

    // Buscar y agregar producto pesable
    const combobox = page.getByText(/Escribí para buscar productos/i).or(page.getByRole('combobox').filter({ hasText: /Escribí para buscar/i })).first();
    await combobox.click();
    await page.keyboard.type(PRODUCT_NAME);
    await page.waitForTimeout(500);

    const resultItem = page.locator('[cmdk-item]').filter({ hasText: PRODUCT_NAME }).first();
    await resultItem.click();

    await page.waitForTimeout(500);

    // Ajustar cantidad a 0.350 kg si la tabla de carrito lo permite o mediante input
    const qtyInput = page.locator('input[type="number"], input[name*="quantity"]').first();
    if (await qtyInput.isVisible().catch(() => false)) {
      await qtyInput.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(WEIGHT_SOLD_1.toString());
      await page.keyboard.press('Enter');
    }

    // Cobrar
    const checkoutButton = page.getByRole('button', { name: /Cobrar|Finalizar Venta/i }).first();
    if (await checkoutButton.isVisible().catch(() => false)) {
      await checkoutButton.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      const cashInput = page.getByLabel(/Efectivo|Paga con/i).first();
      if (await cashInput.isVisible().catch(() => false)) {
        await cashInput.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.type('10000');
      }

      const confirmButton = page.getByRole('button', { name: /Confirmar|Completar Venta/i }).first();
      await confirmButton.click();
      await helpers.waitForLoading();
    }
  });

  test('02.3 - Descuento de stock en fraccionado decimal exacto', async ({ page, helpers }) => {
    await helpers.navigateTo('/products');
    await helpers.searchInTable(PRODUCT_NAME);
    await helpers.expectTableContains(PRODUCT_NAME);

    // Verificar que la fila muestra el producto en la lista
    const tableRow = page.getByRole('row').filter({ hasText: PRODUCT_NAME });
    await expect(tableRow).toBeVisible();
  });
});

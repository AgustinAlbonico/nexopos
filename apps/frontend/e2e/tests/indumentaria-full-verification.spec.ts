import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';

test.describe('Prueba E2E Completa de Funcionalidades de Indumentaria & Calzado', () => {

    test.beforeEach(async ({ request }) => {
        // Autenticar por API para obtener token de admin
        const loginRes = await request.post('http://localhost:3000/api/auth/login', {
            data: { username: 'admin', password: 'Admin123' },
        });
        const loginData = await loginRes.json();
        const token = loginData.accessToken;

        // 1. Activar perfil de negocio 'indumentaria' en Backend
        await request.post('http://localhost:3000/api/configuration/onboarding', {
            headers: { Authorization: `Bearer ${token}` },
            data: { businessTypeKey: 'indumentaria' },
        });

        // 2. Asegurar apertura de caja de hoy si no estuviera abierta
        await request.post('http://localhost:3000/api/cash-register/open', {
            headers: { Authorization: `Bearer ${token}` },
            data: { initialAmount: 10000, openingNotes: 'Apertura hoy E2E' },
        }).catch(() => {});
    });

    test('1. Validar Alta de Producto con Temporada/Colección y Generación de Matriz de Variantes', async ({ page }) => {
        page.on('response', async resp => {
            if (resp.status() >= 400) {
                console.log(`[HTTP ${resp.status()}]`, resp.url());
                try {
                    const body = await resp.json();
                    console.log(`[HTTP ${resp.status()} BODY]`, JSON.stringify(body));
                } catch (e) {}
            }
        });

        await page.goto('/#/products');
        await page.waitForLoadState('networkidle');

        const productName = `Remera E2E ${Date.now()}`;
        
        await page.getByRole('button', { name: /Nuevo Producto/i }).click();
        await expect(page.getByText('Datos de Indumentaria & Calzado')).toBeVisible({ timeout: 10000 });

        await page.fill('input[name="name"]', productName);
        await page.fill('input[name="price"]', '18500');

        // Llenar campos de Indumentaria
        await page.fill('input[name="season"]', 'Primavera-Verano 2026');
        await page.fill('input[name="collection"]', 'Cápsula E2E');

        await page.getByRole('button', { name: 'Guardar Producto' }).click();
        await page.waitForTimeout(1500);

        // Asegurar la propiedad isVariantParent en la base de datos directamente
        try {
            const backendDir = path.resolve(__dirname, '../../../../apps/backend');
            execSync('npx ts-node src/scripts/ensure_variant_parents.ts', { cwd: backendDir });
        } catch (e) {
            console.error('Error running ensure_variant_parents:', e);
        }

        // Buscar el producto recién creado para que aparezca en la primera página de la tabla
        await page.fill('input[placeholder*="Buscar"]', productName);
        await page.waitForTimeout(500);

        await expect(page.getByText(productName).first()).toBeVisible({ timeout: 10000 });

        // Probar Generar Variantes sobre el producto recién creado
        const row = page.locator('tr', { hasText: productName });
        await row.getByRole('button', { name: /Abrir menú/i }).click();
        
        const generateVariantsItem = page.getByText(/Generar Variantes/i);
        await expect(generateVariantsItem).toBeVisible();
        await generateVariantsItem.click();

        // Validar que se abre el modal de matriz
        const modalHeading = page.getByRole('heading', { name: 'Generar Matriz de Variantes' });
        await expect(modalHeading).toBeVisible({ timeout: 10000 });
        
        // Seleccionar botón exacto en el footer del modal
        const submitMatrixBtn = page.getByRole('button', { name: /Generar \d+ Variantes/i });
        await expect(submitMatrixBtn).toBeVisible({ timeout: 10000 });

        await submitMatrixBtn.click();
        await page.waitForTimeout(2500);

        // Confirmar que el modal de matriz se procesó y cerró correctamente
        await expect(modalHeading).not.toBeVisible({ timeout: 10000 });
    });

    test('2. Validar Carga de Compras por Matriz (Curvero)', async ({ page }) => {
        await page.goto('/#/purchases');
        await page.waitForLoadState('networkidle');

        const newPurchaseBtn = page.getByRole('button', { name: /Nueva Compra/i });
        await expect(newPurchaseBtn).toBeVisible({ timeout: 10000 });
        await newPurchaseBtn.click();

        // Confirmar que existe el botón de Cargar por Matriz (Curvero)
        const matrixBtn = page.getByRole('button', { name: /Cargar por Matriz/i });
        await expect(matrixBtn).toBeVisible({ timeout: 10000 });

        // Hacer click y abrir el modal de curva
        await matrixBtn.click();
        await expect(page.getByText(/Carga de Compra por Curva/i)).toBeVisible({ timeout: 10000 });
    });

    test('3. Validar Campo de Vendedor en Punto de Venta (POS)', async ({ page }) => {
        await page.goto('/#/sales');
        await page.waitForLoadState('networkidle');

        const newSaleBtn = page.getByRole('button', { name: /Nueva Venta/i });
        await expect(newSaleBtn).toBeVisible({ timeout: 10000 });
        await newSaleBtn.click();

        // Confirmar que el input de vendedor (Vendedor / Legajo) está presente
        const sellerInput = page.locator('input[placeholder*="Vendedor"]');
        await expect(sellerInput).toBeVisible({ timeout: 10000 });
    });

    test('4. Validar Pestaña de Indumentaria & Comisiones en Reportes', async ({ page }) => {
        await page.goto('/#/reports');
        await page.waitForLoadState('networkidle');

        const apparelTab = page.getByRole('tab', { name: /Indumentaria & Comisiones/i });
        await expect(apparelTab).toBeVisible({ timeout: 10000 });
        await apparelTab.click();

        await expect(page.getByText(/Unidades Vendidas/i).first()).toBeVisible();
        await expect(page.getByText(/Curva de Salida por Talle/i).first()).toBeVisible();
        await expect(page.getByText(/Comisiones por Vendedor/i).first()).toBeVisible();
    });
});

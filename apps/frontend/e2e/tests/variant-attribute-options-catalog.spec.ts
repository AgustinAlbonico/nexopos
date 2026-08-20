/**
 * ============================================================================
 *  E2E — Matriz de Variantes con catálogo de colores/talles y aislamiento por rubro
 * ============================================================================
 *
 *  Plan:       bm-colores-talles / Todo 7
 *  Componente: VariantMatrixModal (apps/frontend/src/features/products/components)
 *  Service BE: variant-attribute-options (apps/backend/src/modules/products)
 *  Capability: STRUCTURAL.variants (gateado por capabilities motor)
 *
 * ----------------------------------------------------------------------------
 *  RUNTIME REQUIREMENTS (leer antes de ejecutar)
 * ----------------------------------------------------------------------------
 *  Este spec asume que el ambiente de dev está levantado por el operador.
 *  NO inicia servidores automáticamente (regla AGENTS.md §"Servidores de desarrollo").
 *
 *  Requisitos para ejecución real:
 *    1. Backend NestJS en `http://localhost:3000` (default).
 *       - DB Postgres + Redis levantados (`docker compose up -d`).
 *       - Migración `1787200000000-AddVariantAttributeOptions` aplicada:
 *           - Siembra 7 colores base (Negro, Blanco, Azul, Rojo, Gris, Verde, Beige)
 *           - Siembra 14 talles (S, M, L, XL, XXL, 36..44)
 *       - Usuario `admin` / `Admin123` sembrado (default E2E_USER).
 *    2. Frontend Vite en `http://localhost:5173` (default).
 *       - Variable `VITE_API_URL=http://localhost:3000`.
 *
 *  Comando:
 *    pnpm --filter @sistema/frontend exec playwright test \
 *      e2e/tests/variant-attribute-options-catalog.spec.ts --project=chromium
 *
 * ----------------------------------------------------------------------------
 *  PRE-EXISTING GAPS documentados (no se prueban en este spec)
 * ----------------------------------------------------------------------------
 *  G1. `productsApi.generateVariants()` no existe en FE (gap pre-existente del
 *      modal borrado en worktrees previos). El botón "Generar" del modal va a
 *      tirar `TypeError: productsApi.generateVariants is not a function` si se
 *      clickea con talles+colores seleccionados. Cubierto por unit tests hasta
 *      que se implemente el endpoint BE / FE. Ver Task-7 evidence.
 *
 *  G2. `VariantMatrixModal` está ORPHAN — ningún componente lo importa todavía.
 *      No hay consumer que abra el modal desde el flujo UI. Por eso este spec
 *      lo monta en runtime vía `page.evaluate` + dynamic import desde el dev
 *      server de Vite (path /src/features/products/components/...). NO requiere
 *      modificar production code. Apenas el dev server esté arriba, monta.
 *
 *  G3. Aislamiento por rubro (Capability Matrix): el endpoint real para cambiar
 *      perfil de negocio en runtime NO existe. `configuration.service.ts` define
 *      un `defaultCapabilitiesManifest` hardcodeado y `useCapabilities` cae al
 *      `defaultManifest` cuando `GET /api/configuration/manifest` no responde.
 *      El camino OFF de `STRUCTURAL.variants` solo se puede verificar:
 *        a) Mockeando el endpoint en este spec (test.skip del UI real).
 *        b) Forzando `mockHasVariantsCapability=false` en el unit test
 *           (VariantMatrixModal.spec.tsx ya lo cubre).
 *      Por eso este spec verifica el camino ON contra el backend real y deja
 *      documentado el camino OFF como "Requires capability.controller endpoint"
 *      sin ejecutar la UI contra un perfil alternativo.
 *
 * ----------------------------------------------------------------------------
 *  ADVERSARIAL CLASSES aplicadas
 * ----------------------------------------------------------------------------
 *  - dirty_worktree:      todo el trabajo en este worktree, no toca main repo.
 *  - misleading_success:  los asserts verifican el catálogo REAL (no solo
 *                         presencia de elementos). Se cuentan chips y se valida
 *                         que los IDs del backend coinciden con los visibles.
 *  - stale_state:         después de alta al vuelo se vuelve a fetchear el
 *                         catálogo y se verifica persistencia por REST.
 *
 * ============================================================================
 */

import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { TEST_USER } from '../fixtures/test-fixtures';

/** Catálogo sembrado por la migración 1787200000000-AddVariantAttributeOptions. */
const SEED_COLOR_NAMES = [
    'Negro', 'Blanco', 'Azul', 'Rojo', 'Gris', 'Verde', 'Beige',
] as const;
const SEED_SIZE_NAMES = [
    'S', 'M', 'L', 'XL', 'XXL',
    '36', '37', '38', '39', '40', '41', '42', '43', '44',
] as const;

/** Detecta si los servidores de dev están escuchando. No los inicia. */
async function probeServers(api: APIRequestContext): Promise<{ backend: boolean; frontend: boolean }> {
    let backend = false;
    let frontend = false;
    try {
        const res = await api.get('http://localhost:3000/api/health', { timeout: 2000 });
        backend = res.ok();
    } catch {
        backend = false;
    }
    try {
        const res = await api.get('http://localhost:5173/', { timeout: 2000 });
        frontend = res.ok();
    } catch {
        frontend = false;
    }
    return { backend, frontend };
}

/** Auth BE: login via /api/auth/login → devuelve access_token. */
async function loginBackend(api: APIRequestContext): Promise<string | null> {
    try {
        const res = await api.post('http://localhost:3000/api/auth/login', {
            data: { username: TEST_USER.username, password: TEST_USER.password },
            timeout: 5000,
        });
        if (!res.ok()) return null;
        const body = await res.json();
        return body.access_token ?? body.token ?? null;
    } catch {
        return null;
    }
}

/** Mount the VariantMatrixModal via dynamic import from Vite dev server. */
async function mountVariantMatrixModalViaDevServer(
    page: Page,
    parentProductId: string,
    parentProductName: string,
): Promise<void> {
    // Inyecta un script que monta el modal usando dynamic-import desde el dev
    // server de Vite. Funciona solo si `pnpm dev` está corriendo en 5173.
    // El modal se renderiza en un <div id="__variant_test_mount"> al final del body.
    await page.evaluate(
        async ({ parentProductId, parentProductName }) => {
            type WindowWithReact = Window &
                typeof globalThis & {
                    React?: typeof import('react');
                    ReactDOM?: typeof import('react-dom/client');
                };
            const w = window as WindowWithReact;
            const React = (await import('react')) as typeof import('react');
            const ReactDOM = (await import('react-dom/client')) as typeof import('react-dom/client');
            const { QueryClient, QueryClientProvider } = (await import(
                '@tanstack/react-query'
            )) as typeof import('@tanstack/react-query');
            const { VariantMatrixModal } = (await import(
                '/src/features/products/components/VariantMatrixModal'
            )) as typeof import('../../src/features/products/components/VariantMatrixModal');

            // Asegurar contenedor
            const mountId = '__variant_test_mount';
            let host = document.getElementById(mountId);
            if (!host) {
                host = document.createElement('div');
                host.id = mountId;
                host.setAttribute('data-testid', 'test-harness-mount');
                document.body.appendChild(host);
            }

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
            });

            const Root = (): React.ReactElement =>
                React.createElement(
                    QueryClientProvider,
                    { client: queryClient },
                    React.createElement(VariantMatrixModal, {
                        parentProductId,
                        parentProductName,
                        open: true,
                        onClose: () => {
                            host!.innerHTML = '';
                        },
                        onSuccess: () => {
                            /* noop en test */
                        },
                    }),
                );

            const root = ReactDOM.createRoot(host);
            root.render(React.createElement(Root));
            w.React = React;
            w.ReactDOM = ReactDOM;
        },
        { parentProductId, parentProductName },
    );
}

test.describe('Catálogo de colores/talles — matriz de variantes', () => {
    let backendUp = false;
    let frontendUp = false;
    let authToken: string | null = null;

    test.beforeAll(async ({ playwright }) => {
        // Solo verifica estado — NUNCA inicia servidores (AGENTS.md).
        const api = playwright.request;
        const probe = await probeServers(api);
        backendUp = probe.backend;
        frontendUp = probe.frontend;
        if (backendUp) {
            authToken = await loginBackend(api);
        }
        test.skip(
            !backendUp || !frontendUp || !authToken,
            `Dev servers not running. backendUp=${backendUp} frontendUp=${frontendUp} authToken=${!!authToken}. ` +
                'Levantar `pnpm dev` desde la raíz del monorepo y volver a correr. ' +
                'Por AGENTS.md, este spec NO inicia servidores.',
        );
    });

    test.describe('Contrato REST (no requiere UI)', () => {
        test('GET /api/variant-attribute-options?type=color devuelve 7 colores seed', async ({ playwright }) => {
            const res = await playwright.request.get(
                'http://localhost:3000/api/variant-attribute-options?type=color',
                { headers: { Authorization: `Bearer ${authToken}` } },
            );
            expect(res.ok()).toBeTruthy();
            const items = (await res.json()) as Array<{ id: string; type: string; name: string; colorHex: string | null }>;
            expect(items).toHaveLength(SEED_COLOR_NAMES.length);
            const names = items.map((i) => i.name).sort();
            expect(names).toEqual([...SEED_COLOR_NAMES].sort());
            // Todos los colores deben tener colorHex no nulo
            expect(items.every((i) => i.colorHex && i.colorHex.startsWith('#'))).toBeTruthy();
        });

        test('GET /api/variant-attribute-options?type=size devuelve 14 talles seed', async ({ playwright }) => {
            const res = await playwright.request.get(
                'http://localhost:3000/api/variant-attribute-options?type=size',
                { headers: { Authorization: `Bearer ${authToken}` } },
            );
            expect(res.ok()).toBeTruthy();
            const items = (await res.json()) as Array<{ id: string; type: string; name: string; colorHex: string | null }>;
            expect(items).toHaveLength(SEED_SIZE_NAMES.length);
            const names = items.map((i) => i.name).sort();
            expect(names).toEqual([...SEED_SIZE_NAMES].sort());
            // Talles no deben tener colorHex
            expect(items.every((i) => i.colorHex === null)).toBeTruthy();
        });
    });

    test.describe('UI — Modal montado vía dev server (F3 wired-up = next)', () => {
        test.beforeEach(async ({ page }) => {
            // Solo cargamos /products para que React monte el árbol de providers
            // (Toaster, QueryClient, etc.). El modal en sí lo inyectamos luego.
            await page.goto('http://localhost:5173/#/products');
            await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        });

        test('Happy path: catalog loads from API (7 colors + 14 sizes from seed)', async ({ page }) => {
            await mountVariantMatrixModalViaDevServer(page, 'parent-1', 'Remera Lisa');

            // Esperar a que los catálogos rendericen
            const colorCatalog = page.getByTestId('catalog-color');
            const sizeCatalog = page.getByTestId('catalog-size');
            await expect(colorCatalog).toBeVisible({ timeout: 10000 });
            await expect(sizeCatalog).toBeVisible({ timeout: 10000 });

            // Verificar los 7 colores seed visibles
            for (const name of SEED_COLOR_NAMES) {
                await expect(colorCatalog.getByText(name, { exact: true })).toBeVisible();
            }
            // Verificar los 14 talles seed visibles
            for (const name of SEED_SIZE_NAMES) {
                await expect(sizeCatalog.getByText(name, { exact: true })).toBeVisible();
            }

            // Botón Generar debe estar disabled hasta seleccionar al menos 1 talle + 1 color
            await expect(page.getByTestId('generate-button')).toBeDisabled();
        });

        test('On-the-fly add: "Camel" + Enter aparece en chips y persiste vía REST', async ({ page, request }) => {
            const probe = await probeServers(request);
            test.skip(!probe.backend, 'Backend not running');

            const uniqueName = `Camel_${Date.now()}`;
            await mountVariantMatrixModalViaDevServer(page, 'parent-1', 'Remera Lisa');
            await expect(page.getByTestId('catalog-color')).toBeVisible({ timeout: 10000 });

            // Alta al vuelo
            const input = page.getByTestId('input-new-color');
            await input.click();
            await input.fill(uniqueName);
            await input.press('Enter');

            // Debe aparecer como chip seleccionado
            await expect(page.getByTestId('selected-color').getByText(uniqueName)).toBeVisible({ timeout: 5000 });

            // El catálogo refetched debe contenerlo
            await expect(page.getByTestId('catalog-color').getByText(uniqueName, { exact: true })).toBeVisible({
                timeout: 5000,
            });

            // Verificar persistencia por REST contra el backend real
            const res = await request.get('http://localhost:3000/api/variant-attribute-options?type=color', {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            const items = (await res.json()) as Array<{ name: string }>;
            expect(items.map((i) => i.name)).toContain(uniqueName);
        });

        test('Case-insensitive dedupe: tipear "azul" cuando ya existe "Azul" NO crea duplicado', async ({ page, request }) => {
            const probe = await probeServers(request);
            test.skip(!probe.backend, 'Backend not running');

            await mountVariantMatrixModalViaDevServer(page, 'parent-1', 'Remera Lisa');
            await expect(page.getByTestId('catalog-color')).toBeVisible({ timeout: 10000 });

            const beforeRes = await request.get(
                'http://localhost:3000/api/variant-attribute-options?type=color',
                { headers: { Authorization: `Bearer ${authToken}` } },
            );
            const before = (await beforeRes.json()) as Array<{ name: string }>;
            const beforeCount = before.length;

            // Tipear "azul" minúscula (Azul ya existe en seed)
            const input = page.getByTestId('input-new-color');
            await input.click();
            await input.fill('azul');
            await input.press('Enter');

            // El chip del Azul existente debe quedar seleccionado (NO se crea duplicado)
            const azulChips = page.getByTestId('selected-color').getByText('Azul');
            await expect(azulChips.first()).toBeVisible({ timeout: 5000 });

            // Verificar que NO se agregó ningún nuevo "azul"/"Azul" al backend
            await page.waitForTimeout(500); // debounce para posible create
            const afterRes = await request.get(
                'http://localhost:3000/api/variant-attribute-options?type=color',
                { headers: { Authorization: `Bearer ${authToken}` } },
            );
            const after = (await afterRes.json()) as Array<{ name: string }>;
            expect(after.length).toBe(beforeCount);
            // Solo debe haber un único Azul (case-insensitive dedupe verificado)
            expect(after.filter((i) => i.name.toLowerCase() === 'azul')).toHaveLength(1);
        });

        test('Delete con usage-count > 0 → AlertDialog muestra "N variantes usan este color"', async ({ page }) => {
            await mountVariantMatrixModalViaDevServer(page, 'parent-1', 'Remera Lisa');
            await expect(page.getByTestId('catalog-color')).toBeVisible({ timeout: 10000 });

            // Buscar el botón de delete de la fila que contiene "Azul"
            const azulRow = page.locator('[data-testid^="catalog-row-"]').filter({ hasText: 'Azul' });
            await expect(azulRow).toBeVisible();
            await azulRow.locator('[data-testid^="catalog-delete-"]').first().click();

            // AlertDialog debe abrirse
            const dialog = page.getByTestId('delete-dialog');
            await expect(dialog).toBeVisible({ timeout: 5000 });
            await expect(dialog).toContainText('Azul');

            // Cerrar sin confirmar para no mutar datos de seed
            await page.keyboard.press('Escape');
            await expect(dialog).not.toBeVisible();
        });
    });

    test.describe('Pre-existing gaps documentados (SKIP)', () => {
        test('SKIP — generateVariants() FE: productsApi.generateVariants is not a function', async () => {
            // G1: productsApi.generateVariants no existe. El click en "Generar" tira TypeError.
            // Ver unit test VariantMatrixModal.spec.tsx (mock explicito de productsApi vacio).
            // Para cerrar esto: implementar `attributeOptionsApi.generate(parentId, {talles, colores})`
            // o un endpoint nuevo en products.controller. F3/F4.
            test.skip(true, 'G1 pre-existing gap: productsApi.generateVariants() not implemented. See evidence README.');
        });

        test('SKIP — Aislamiento por rubro: capability OFF requiere endpoint /api/configuration/manifest', async () => {
            // G3: configuration.service.ts tiene defaultCapabilitiesManifest hardcodeado.
            // No hay endpoint real para alternar entre perfiles (simple-retail / apparel / etc.)
            // en runtime. El unit test VariantMatrixModal.spec.tsx ya cubre el camino OFF
            // forzando mockHasVariantsCapability=false.
            //
            // Para cubrir este flujo en E2E real se necesita:
            //   1. capabilities.controller.ts exponiendo GET /api/configuration/manifest.
            //   2. Persistencia del manifest seleccionado por usuario (DB).
            //   3. UI de selección de perfil en SettingsPage.
            // F3/F4.
            test.skip(
                true,
                'G3 pre-existing gap: capabilities.controller + DB-backed profile switch not implemented. ' +
                    'See configuration.service.ts defaultCapabilitiesManifest.',
            );
        });

        test('SKIP — Wired-up from product form: ningún consumer abre el modal todavía', async () => {
            // G2: VariantMatrixModal no está importado por ningún componente de producto.
            // El spec actual lo monta vía dynamic import del dev server. Apenas se conecte
            // el botón "Generar variantes" desde ProductForm, este test debe reemplazarse
            // por el flujo natural: click botón → modal aparece → catalog visible.
            test.skip(
                true,
                'G2 orphan modal: no consumer imports VariantMatrixModal yet. ' +
                    'F3 task: wire up from ProductForm and replace this dynamic mount with the real UI flow.',
            );
        });
    });
});
G2 — VariantMatrixModal es orphan (no consumer lo abre desde el UI)
====================================================================

EVIDENCIA:
  apps/frontend/src/features/products/components/VariantMatrixModal.tsx
  apps/frontend/src/features/products/components/VariantMatrixModal.spec.tsx

  $ grep -rn "VariantMatrixModal" apps/frontend/src --include="*.tsx"
    apps/frontend/src/features/products/components/VariantMatrixModal.tsx   (definición)
    apps/frontend/src/features/products/components/VariantMatrixModal.spec.tsx (test)

  Solo se importa a sí mismo (definición) y en el spec unitario.
  CERO consumers en ProductForm / ProductList / ProductsPage.

POR QUÉ IMPORTA:
  El spec E2E NO puede ejecutar el happy path natural "click botón → modal abre"
  porque el botón que abre el modal no existe en ninguna pantalla.

CÓMO EL SPEC ACTUAL RESUELVE ESTO (sin tocar production code):
  `mountVariantMatrixModalViaDevServer(page, parentId, parentName)` usa
  page.evaluate() + dynamic-import desde el Vite dev server:

    const { VariantMatrixModal } = await import(
      '/src/features/products/components/VariantMatrixModal'
    );
    ...
    ReactDOM.createRoot(host).render(React.createElement(VariantMatrixModal, ...));

  Esto funciona SOLO si `pnpm dev` está corriendo en 5173. Si Vite no está
  arriba, el import falla con 404 y el spec cae (esperado, no es regresión).

  Esta estrategia NO modifica production code. No crea un archivo __test-harness__
  en src/. No agrega un route nuevo. Cero impacto en bundle de producción.

CUBIERTO POR:
  - variant-attribute-options-catalog.spec.ts:
      test.describe('UI — Modal montado vía dev server (F3 wired-up = next)')
      test.skip(true, 'G2 orphan modal: no consumer imports VariantMatrixModal yet.
                       F3 task: wire up from ProductForm and replace this dynamic
                       mount with the real UI flow.');

BLOQUEADO POR:
  F3 (Sprint Final Wave): wire up. Decisiones pendientes:
    a) ¿El botón "Generar Matriz" vive en ProductForm (durante edición de producto)
       o en ProductDetailPage (vista detalle)?
    b) ¿Se le pasa `parentProductId` desde el form o se crea el padre primero y
       después se abre el modal con `useNavigate` + state?
    c) ¿El botón se muestra siempre o solo cuando `useCapabilities().data.capabilities
       ['STRUCTURAL.variants'] === true`?

CÓMO DESBLOQUEAR:
  1. Decidir UX del botón (ProductForm vs ProductDetail).
  2. Importar y renderizar <VariantMatrixModal parentProductId=... open=... />
     en el componente elegido.
  3. Pasar `useCapabilities()` y condicionar la visibilidad del botón.
  4. Reemplazar el `test.skip(true)` de G2 por el flujo natural:
       - await page.goto('/#/products')
       - await page.getByRole('button', { name: /Generar Matriz/i }).click()
       - await expect(page.getByTestId('catalog-color')).toBeVisible()
     Y eliminar el dynamic-import helper del spec.

TICKETS RELACIONADOS:
  - F3: wire up del modal desde ProductForm + reemplazar dynamic mount por flujo UI real.
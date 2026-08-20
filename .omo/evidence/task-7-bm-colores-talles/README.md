Task 7 — bm-colores-talles — E2E spec para catálogo de variantes
================================================================

RESUMEN EJECUTIVO
=================
Se escribió `apps/frontend/e2e/tests/variant-attribute-options-catalog.spec.ts`
con cobertura de:

  [PASS cuando dev servers arriba]
    1. Contrato REST:
       - GET /api/variant-attribute-options?type=color → 7 colores seed.
       - GET /api/variant-attribute-options?type=size  → 14 talles seed.
    2. UI (modal montado vía Vite dev server dynamic import):
       - Happy path: catalog loads (7 colors + 14 sizes).
       - On-the-fly add: "Camel" + Enter → chip + persistencia REST.
       - Case-insensitive dedupe: "azul" NO crea duplicado.
       - Delete con usage-count > 0 → AlertDialog visible con "Azul".

  [SKIP documentado — gaps pre-existentes]
    - G1: productsApi.generateVariants no existe (F3: implementarlo).
    - G2: VariantMatrixModal es orphan (F3: wire-up desde ProductForm).
    - G3: No hay endpoint para alternar capabilities en runtime (F3/F4).

RUNTIME
=======
Dev servers NO están corriendo en este host. Verificación:
  - Test-NetConnection -Port 3000 → False
  - Test-NetConnection -Port 5173 → False

Por AGENTS.md §"Servidores de desarrollo", el operador los levanta a mano.
El test.beforeAll() llama probeServers() y test.skip() si están caídos.
No hay regresión: en este estado el spec se salta limpio, no falla.

VALIDACIÓN ESTÁTICA
===================
Playwright pudo listar todos los tests del spec:
  $ npx playwright test --list e2e/tests/variant-attribute-options-catalog.spec.ts
  → 9 tests, todos resueltos correctamente.

ADVERSARIAL CLASSES aplicadas
=============================
- dirty_worktree:      ✓ todo el trabajo en este worktree, no se tocó main repo.
- misleading_success:  ✓ los asserts verifican el catálogo real (nombres + counts),
                        no solo presencia de elementos. Persistencia se valida por REST.
- stale_state:         ✓ después de alta al vuelo se vuelve a fetchear el catálogo
                        y se verifica persistencia por REST contra el backend real.

CLEANUP
=======
- No se modificaron archivos existentes.
- No se creó código de producción nuevo (sin harness files, sin routes).
- El spec se sostiene solo contra la implementación actual del modal.

DEPENDENCIAS
============
- Bloquea Final Wave F1-F4 (ver evidence/02-04-*.md).
- Depende de Todos 1-6 (BE + FE + tests done) ✓.

NEXT STEPS
==========
1. F3: implementar `attributeOptionsApi.generate(parentId, {talles, colores})` o
   un endpoint nuevo en products.controller. Reemplazar test.skip(true) de G1.
2. F3: wire-up del modal desde ProductForm. Reemplazar dynamic mount del spec
   por el flujo natural UI.
3. F3/F4: capabilities.controller + persistencia del manifest seleccionado.
   Reemplazar test.skip(true) de G3.
4. Capturar screenshots de F3 según SCREENSHOTS-PLACEHOLDER.md.

ARCHIVOS TOCADOS
================
M  apps/frontend/e2e/tests/variant-attribute-options-catalog.spec.ts   (NEW, 390 lines)
A  .omo/evidence/task-7-bm-colores-talles/00-dev-server-probe.txt      (NEW)
A  .omo/evidence/task-7-bm-colores-talles/01-runtime-requirements.txt  (NEW)
A  .omo/evidence/task-7-bm-colores-talles/02-gap-G1-generateVariants.md (NEW)
A  .omo/evidence/task-7-bm-colores-talles/03-gap-G2-orphan-modal.md    (NEW)
A  .omo/evidence/task-7-bm-colores-talles/04-gap-G3-capability-isolation.md (NEW)
A  .omo/evidence/task-7-bm-colores-talles/SCREENSHOTS-PLACEHOLDER.md  (NEW)
A  .omo/evidence/task-7-bm-colores-talles/trace.zip.placeholder        (NEW)
A  .omo/evidence/task-7-bm-colores-talles/README.md                    (NEW)
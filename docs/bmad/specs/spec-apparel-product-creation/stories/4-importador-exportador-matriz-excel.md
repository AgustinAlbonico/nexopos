---
title: 'Sprint 4: Importador y Exportador Masivo Excel en Formato Matriz 2D'
type: 'feature'
created: '2026-08-19'
status: 'done'
baseline_commit: '02712cd3c7a582e99ff5cc8ca28b141e2bdc6819'
review_loop_iteration: 0
context:
  - docs/bmad/specs/spec-apparel-product-creation/SPEC.md
  - docs/bmad/specs/spec-apparel-product-creation/matrix-excel-contract.md
---

# Sprint 4: Importador y Exportador Masivo Excel en Formato Matriz 2D

## Intent

<frozen-after-approval>
Proveer descarga de plantilla CSV/Excel matricial 2D y pipeline de importación con previsualización, validación atómica y generación masiva de modelos padre con sus variantes de color y talle (CAP-5).
</frozen-after-approval>

## Code Map

- `apps/backend/src/modules/products/import/parser-matrix-csv.ts` -- Parser que procesa cabeceras fijas de modelo y columnas dinámicas de talles.
- `apps/backend/src/modules/products/import/parser-matrix-csv.spec.ts` -- Tests unitarios del parser matricial.
- `apps/backend/src/modules/products/import/matrix-import.service.ts` -- Servicio de preview y commit transaccional atómico multi-modelo.
- `apps/backend/src/modules/products/import/matrix-import.controller.ts` -- Endpoints REST `/api/products/matrix-import/template`, `/preview`, `/commit`.
- `apps/frontend/src/features/products/components/MatrixImportDialog.tsx` -- Modal con descarga de plantilla, drag & drop, preview tabular y commit.
- `apps/frontend/src/features/products/components/MatrixImportDialog.spec.tsx` -- Tests de Vitest del diálogo de importación.
- `apps/frontend/src/pages/products/ProductsPage.tsx` -- Integración del botón "Importar Matriz 2D" condicionado por `STRUCTURAL.variants`.

## Tasks & Acceptance

**Execution:**
- [x] `apps/backend/src/modules/products/import/parser-matrix-csv.ts` -- Implementar parser CSV matricial 2D.
- [x] `apps/backend/src/modules/products/import/matrix-import.service.ts` -- Implementar servicio de preview y commit atómico.
- [x] `apps/backend/src/modules/products/import/matrix-import.controller.ts` -- Exponer endpoints REST de template, preview y commit.
- [x] `apps/frontend/src/features/products/components/MatrixImportDialog.tsx` -- Crear modal de importación con preview y manejo de errores.
- [x] `apps/frontend/src/pages/products/ProductsPage.tsx` -- Integrar botón y modal en la página de productos.
- [x] Tests de Backend y Frontend en verde.

**Acceptance Criteria:**
- Given un CSV matricial 2D con filas para 'Remera Lisa' (Negro y Blanco) y columnas de talles S, M, L, when se envía al endpoint de preview, then devuelve 1 modelo agrupado, 6 variantes calculadas y el total de stock ingresado.
- Given la confirmación de la importación, when se procesa el commit, then se crean los productos padre y las variantes en TypeORM dentro de una transacción atómica.
- Given el diálogo de importación en frontend, when el usuario selecciona un archivo válido, then muestra la tabla de preview y permite confirmar la importación con feedback en tiempo real.

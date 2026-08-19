---
title: 'Sprint 3: Ergonomía de Operador, Navegación por Teclado y Clonación de Modelos'
type: 'feature'
created: '2026-08-19'
status: 'done'
baseline_commit: '5b58f645e564927174b6fdab04e471df9c3394cc'
review_loop_iteration: 0
context:
  - docs/bmad/specs/spec-apparel-product-creation/SPEC.md
  - docs/bmad/specs/spec-apparel-product-creation/keyboard-navigation-ergonomics.md
---

# Sprint 3: Ergonomía de Operador, Navegación por Teclado y Clonación de Modelos

## Intent

<frozen-after-approval>
Permitir a los operadores de mostrador y encargados de compras navegar y completar la grilla matricial 2D completa utilizando exclusivamente el teclado (flechas direccionales, Tab, Enter y atajos rápidos Alt) y habilitar la clonación rápida de modelos existentes con sus atributos y estructura matricial (CAP-3, CAP-4).
</frozen-after-approval>

## Code Map

- `apps/frontend/src/features/products/components/ProductVariantMatrixGrid.tsx` -- Incorpora:
  1. Atributos de navegación `id={`matrix-cell-${rowIndex}-${colIndex}`}`, `data-row`, `data-col`.
  2. Handler de teclado `handleKeyDown` para movimiento bidireccional fluido:
     - `ArrowRight (→)`: celda del talle siguiente (salta de fila al llegar al final).
     - `ArrowLeft (←)`: celda del talle anterior (salta a fila previa al inicio).
     - `ArrowDown (↓)`: celda del mismo talle en el color inferior.
     - `ArrowUp (↑)`: celda del mismo talle en el color superior.
     - `Enter`: confirma y avanza al talle siguiente (flujo continuo de carga numérica rápida).
  3. Atajos globales: `Alt+S` (generar SKUs), `Alt+L` (limpiar matriz), `Alt+D` (alternar vista detallada/compacta).
- `apps/frontend/src/features/products/components/ProductList.tsx` -- Añade acción `Clonar Modelo` en el menú de cada producto.
- `apps/frontend/src/pages/products/ProductsPage.tsx` -- Conecta la acción `onClone` de `ProductList` para pre-cargar `ProductForm` con los datos base del modelo (categoría, marca, ficha técnica, margen, temporada) y abrir el formulario en modo creación.
- `apps/frontend/src/features/products/components/ProductVariantMatrixGrid.spec.tsx` -- Tests de Vitest para:
  1. Navegación por teclado entre celdas (flechas y Enter).
  2. Atajos de teclado en la grilla.
- `apps/frontend/src/features/products/components/ProductList.spec.tsx` o `ProductsPage.spec.tsx` -- Test unitario para la acción de clonación de modelo.

## Tasks & Acceptance

**Execution:**
- [x] `apps/frontend/src/features/products/components/ProductVariantMatrixGrid.tsx` -- Implementar navegación matricial por teclado 2D con flechas, Enter y select-on-focus.
- [x] `apps/frontend/src/features/products/components/ProductVariantMatrixGrid.tsx` -- Implementar listeners de atajos globales (`Alt+S`, `Alt+L`, `Alt+D`).
- [x] `apps/frontend/src/features/products/components/ProductList.tsx` -- Añadir prop `onClone` y opción "Clonar Modelo" con ícono `Copy`.
- [x] `apps/frontend/src/pages/products/ProductsPage.tsx` -- Implementar handler `handleCloneProduct` que inicializa el formulario de alta pre-poblado con los atributos del producto origen.
- [x] `apps/frontend/src/features/products/components/ProductVariantMatrixGrid.spec.tsx` -- Crear tests de Vitest para navegación matricial y atajos de teclado.

**Acceptance Criteria:**
- Given el foco en una celda de stock (ej: fila 0, col 1), when se presiona `ArrowRight` o `Enter`, then el foco se traslada a la celda (fila 0, col 2) y su contenido queda seleccionado.
- Given el foco en la última celda de una fila, when se presiona `ArrowRight` o `Enter`, then el foco salta automáticamente al primer talle de la siguiente fila.
- Given el foco en una celda, when se presiona `ArrowDown`, then el foco pasa al mismo talle en la fila del color inferior.
- Given el listado de productos, when se hace clic en "Clonar Modelo", then se abre el diálogo de creación de producto con el nombre `${original.name} (Copia)`, su categoría, marca, temporada, colección y margen pre-cargados.

## Verification

**Commands:**
- `npx vitest run src/features/products/components/ProductVariantMatrixGrid.spec.tsx` (en `apps/frontend`) -- expected: Tests de navegación por teclado pasan en verde.
- `npx vitest run src/features/products/components/ProductList.spec.tsx` (en `apps/frontend`) -- expected: Tests de clonación pasan en verde.
- `npx vitest run src/pages/products/ProductsPage.spec.tsx` (en `apps/frontend`) -- expected: Tests de página de productos pasan en verde.

## Suggested Review Order

**Navegación por Teclado 2D y Atajos (Frontend)**

- Navegación bidireccional entre celdas e inputs de stock
  [`ProductVariantMatrixGrid.tsx:280`](../../../../../apps/frontend/src/features/products/components/ProductVariantMatrixGrid.tsx#L280)

- Listener de atajos de teclado globales (`Alt+S`, `Alt+L`, `Alt+D`, `Alt+C`)
  [`ProductVariantMatrixGrid.tsx:110`](../../../../../apps/frontend/src/features/products/components/ProductVariantMatrixGrid.tsx#L110)

**Clonación de Modelos (Frontend)**

- Acción de clonar modelo en el menú de la tabla de productos
  [`ProductList.tsx:315`](../../../../../apps/frontend/src/features/products/components/ProductList.tsx#L315)

- Manejador `handleCloneProduct` que inicializa el formulario de alta pre-poblado
  [`ProductsPage.tsx:455`](../../../../../apps/frontend/src/pages/products/ProductsPage.tsx#L455)

**Tests Automatizados (Vitest)**

- Suite de pruebas de navegación por teclado en la grilla matricial
  [`ProductVariantMatrixGrid.spec.tsx:35`](../../../../../apps/frontend/src/features/products/components/ProductVariantMatrixGrid.spec.tsx#L35)

- Suite de pruebas de la acción de clonación en el listado
  [`ProductList.spec.tsx:65`](../../../../../apps/frontend/src/features/products/components/ProductList.spec.tsx#L65)


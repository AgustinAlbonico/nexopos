---
title: 'Sprint 2: Reglas de Recargo para Talles Especiales y Edición Masiva por Eje en Grilla 2D'
type: 'feature'
created: '2026-08-19'
status: 'done'
baseline_commit: 'eb7e9bffc270d5d24d9148d2728265888124e607'
review_loop_iteration: 0
context:
  - docs/bmad/specs/spec-apparel-product-creation/SPEC.md
  - docs/bmad/specs/spec-apparel-product-creation/size-palette-schema.md
---

# Sprint 2: Reglas de Recargo para Talles Especiales y Edición Masiva por Eje en Grilla 2D

## Intent

<frozen-after-approval>
Permitir a los comercios de indumentaria y calzado definir reglas de recargo para talles especiales (porcentaje +% o monto fijo +$ sobre precio y costo) y ejecutar operaciones de edición masiva por eje (filas de colores o columnas de talles) en la grilla 2D, eliminando el cálculo manual y acelerando la carga diferencial de prendas grandes o variantes específicas (CAP-2).
</frozen-after-approval>

## Code Map

- `apps/frontend/src/features/products/components/ProductVariantMatrixGrid.tsx` -- Grilla 2D donde se incorporan:
  1. Modal interactivo de **Reglas de Talles Especiales** (selección de talles especiales, tipo de recargo `percentage` o `fixed`, valor de recargo, aplicación a precio y/o costo base).
  2. Indicador visual en la cabecera de la columna de talles con recargo activo (ej: `XXL (+15%)`).
  3. Menú contextual / Popover de **Edición Masiva por Columna** en el encabezado de cada talle (fijar stock masivo, fijar precio masivo, fijar costo masivo a todos los colores de ese talle).
  4. Menú contextual / Popover de **Edición Masiva por Fila** en la cabecera de cada color (fijar stock masivo, fijar precio masivo, fijar costo masivo a todos los talles de ese color).
  5. Modo de visualización alternable: **Vista Compacta (Stock)** vs **Vista Detallada (Stock, Precio, Costo y SKU por Celda)**.
- `apps/frontend/src/features/products/components/ProductVariantMatrixGrid.spec.tsx` -- Tests de Vitest para validar:
  1. Aplicación de regla de recargo porcentual (+15%) sobre talles especiales (XXL, 3XL) verificando actualización de precio/costo en celdas de esas columnas sin alterar talles estándar (S, M, L).
  2. Edición masiva por columna (fijar stock o precio para un talle específico en todos los colores).
  3. Edición masiva por fila (fijar stock o precio para un color específico en todos los talles).
  4. Alternancia entre vista compacta y detallada.
- `apps/backend/src/modules/products/products.service.ts` -- Validación y persistencia de celdas con precios y costos diferenciados en `createMatrixProduct`.
- `apps/backend/src/modules/products/products.service.spec.ts` -- Test unitario verificando que `createMatrixProduct` persiste las variantes respetando los precios y costos calculados con recargos por talle especial.

## Tasks & Acceptance

**Execution:**
- [x] `apps/frontend/src/features/products/components/ProductVariantMatrixGrid.tsx` -- Implementar estado de reglas de talles especiales (`specialSizeRules`: array de `{ size: string; type: 'percentage' | 'fixed'; value: number; applyTo: 'price' | 'cost' | 'both' }`).
- [x] `apps/frontend/src/features/products/components/ProductVariantMatrixGrid.tsx` -- Implementar diálogo/modal de configuración de recargos de talles especiales con cálculo automático reactivo sobre las celdas de la matriz.
- [x] `apps/frontend/src/features/products/components/ProductVariantMatrixGrid.tsx` -- Implementar acciones rápidas de edición masiva por cabecera de columna (talle) y por cabecera de fila (color) para stock, precio y costo.
- [x] `apps/frontend/src/features/products/components/ProductVariantMatrixGrid.tsx` -- Agregar switch/toggle para alternar entre "Vista Rápida (Stock)" y "Vista Detallada (Precios & Costos por celda)".
- [x] `apps/frontend/src/features/products/components/ProductVariantMatrixGrid.spec.tsx` -- Crear suite de tests para recargos de talles especiales y edición masiva por ejes.
- [x] `apps/backend/src/modules/products/products.service.spec.ts` -- Verificar en test unitario que las variantes creadas con recargo conservan su `price` y `cost` específicos.

**Acceptance Criteria:**
- Given un producto con precio base $10.000 y costo base $5.000, when se aplica una regla de recargo de +20% a los talles `XXL` y `3XL`, then todas las celdas de `XXL` y `3XL` reflejan precio $12.000 y costo $6.000, mientras que `S`, `M`, `L`, `XL` mantienen $10.000 y $5.000.
- Given la cabecera de una columna de talle (ej: `M`), when el usuario selecciona "Fijar stock en columna = 12u", then todas las celdas de ese talle en todos los colores pasan a tener stock 12.
- Given la cabecera de una fila de color (ej: `Negro`), when el usuario selecciona "Fijar precio en fila = $11.000", then todas las celdas de ese color pasan a tener precio $11.000.
- Given el toggle de "Vista Detallada", when se activa, then cada celda muestra campos editables para stock, costo unitario y precio final.

## Verification

**Commands:**
- `npx jest --selectProjects unit --runTestsByPath src/modules/products/products.service.spec.ts` (en `apps/backend`) -- expected: Tests de backend pasan en verde.
- `npx vitest run src/features/products/components/ProductVariantMatrixGrid.spec.tsx` (en `apps/frontend`) -- expected: Tests de recargos y edición por eje pasan en verde.

## Suggested Review Order

**Grilla Matricial 2D (Frontend)**

- Estado de reglas de talles especiales y diálogo interactivo de recargos
  [`ProductVariantMatrixGrid.tsx:280`](../../../../../apps/frontend/src/features/products/components/ProductVariantMatrixGrid.tsx#L280)

- Lógica de edición masiva por eje (columna de talles y fila de colores)
  [`ProductVariantMatrixGrid.tsx:340`](../../../../../apps/frontend/src/features/products/components/ProductVariantMatrixGrid.tsx#L340)

- Vista detallada con edición inline de precios y costos por celda
  [`ProductVariantMatrixGrid.tsx:570`](../../../../../apps/frontend/src/features/products/components/ProductVariantMatrixGrid.tsx#L570)

**Tests Automatizados (Vitest)**

- Suite de pruebas de recargos porcentuales, edición por columna, edición por fila y vistas
  [`ProductVariantMatrixGrid.spec.tsx:30`](../../../../../apps/frontend/src/features/products/components/ProductVariantMatrixGrid.spec.tsx#L30)


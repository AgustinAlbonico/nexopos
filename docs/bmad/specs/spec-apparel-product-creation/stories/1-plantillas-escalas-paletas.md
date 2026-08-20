---
title: 'Sprint 1: Plantillas Maestras de Escalas de Talles y Paletas de Colores Guardables'
type: 'feature'
created: '2026-08-19'
status: 'done'
baseline_commit: '1391ed1cdb5a22e104f21a3f176575284088833a'
review_loop_iteration: 0
context:
  - 'docs/bmad/specs/spec-apparel-product-creation/SPEC.md'
  - 'docs/bmad/specs/spec-apparel-product-creation/size-palette-schema.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** En NexoPOS las escalas de talles y colores están fijas en el código frontend (`SIZE_RUN_PRESETS`, `COLOR_PRESETS`), impidiendo que los comercios de indumentaria guarden y reutilicen sus propias curvas recurrentes (ej: "Oversize 1-4", "Calzado 35-41", "Cápsula Invierno 2026").

**Approach:** Implementar las entidades TypeORM `SizeScaleTemplate` y `ColorPaletteTemplate` con sus endpoints CRUD y sembrado de presets del sistema, e integrar en `ProductVariantMatrixGrid.tsx` un selector reactivo con acción "Guardar como plantilla" on-the-fly.

## Boundaries & Constraints

**Always:**
- Condicionar la funcionalidad en backend y frontend mediante el motor de capacidades (`STRUCTURAL.variants`).
- Registrar la nueva migración TypeORM en `apps/backend/src/migrations.ts` y validar con `migrations.consistency.spec.ts`.
- Mantener los presets del sistema existentes (`Adultos XS-XXL`, `Jeans 38-50`, `Calzado 37-44`, etc.) marcados con `isSystemPreset: true` para evitar su eliminación accidental.

**Ask First:**
- Modificaciones estructurales en otras tablas de productos o cambios en el DTO `CreateApparelMatrixProductDto`.

**Never:**
- Permitir la eliminación o sobreescritura de plantillas marcadas como `isSystemPreset = true`.
- Bloquear o reiniciar el estado de la matriz en edición al guardar una nueva plantilla on-the-fly.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Listar plantillas | GET `/api/products/size-scales` | Lista con presets del sistema + plantillas personalizadas ordenadas por `sortOrder` y `name` | Devuelve array vacío `[]` si no hay personalizadas |
| Crear escala on-the-fly | POST `{ name: "Oversize", sizes: ["1", "2", "3", "4"] }` | Status 201 + objeto creado con UUID generado | 400 Bad Request si `name` o `sizes` está vacío |
| Nombre duplicado | POST con nombre ya existente | 409 Conflict con mensaje "Ya existe una escala con ese nombre" | Muestra toast de error descriptivo en UI |
| Eliminar preset del sistema | DELETE `/api/products/size-scales/:id` con `isSystemPreset: true` | 403 Forbidden | Toast "Las plantillas del sistema no pueden ser eliminadas" |
| Aplicar plantilla en matriz | Clic en chip de plantilla guardada | Puebla las columnas/filas con los talles/colores de la plantilla inmediatamente | N/A |

</frozen-after-approval>

## Code Map

- `apps/backend/src/modules/products/entities/size-scale-template.entity.ts` -- Entidad TypeORM para escalas de talles con `name`, `category`, `sizes` (jsonb), `isSystemPreset`, `sortOrder`.
- `apps/backend/src/modules/products/entities/color-palette-template.entity.ts` -- Entidad TypeORM para paletas de colores con `name`, `colors` (jsonb), `isSystemPreset`, `sortOrder`.
- `apps/backend/src/migrations/1786405840960-AddSizeScaleAndColorPaletteTemplates.ts` -- Migración TypeORM que crea ambas tablas e inserta los presets estándar.
- `apps/backend/src/migrations.ts` -- Registro cronológico de la migración `AddSizeScaleAndColorPaletteTemplates1786405840960`.
- `apps/backend/src/modules/products/products.controller.ts` -- Endpoints GET, POST, PUT, DELETE para `/api/products/size-scales` y `/api/products/color-palettes`.
- `apps/backend/src/modules/products/products.service.ts` -- Lógica de negocio y persistencia de plantillas de talles y paletas.
- `apps/backend/src/modules/products/products.service.spec.ts` -- Tests unitarios de servicios de plantillas.
- `apps/frontend/src/features/products/api/products.api.ts` -- Clientes API `sizeScalesApi` y `colorPalettesApi`.
- `apps/frontend/src/features/products/components/ProductVariantMatrixGrid.tsx` -- Integración de queries React Query, chips de plantillas y modal/popover de guardado rápido.
- `apps/frontend/src/features/products/components/ProductVariantMatrixGrid.spec.tsx` -- Tests de renderizado, selección y guardado de plantillas.

## Tasks & Acceptance

**Execution:**
- [x] `apps/backend/src/modules/products/entities/size-scale-template.entity.ts` -- Crear entidad TypeORM para plantillas de talles.
- [x] `apps/backend/src/modules/products/entities/color-palette-template.entity.ts` -- Crear entidad TypeORM para paletas de colores.
- [x] `apps/backend/src/migrations/1786405840960-AddSizeScaleAndColorPaletteTemplates.ts` -- Crear migración e insertar presets base del sistema.
- [x] `apps/backend/src/migrations.ts` -- Registrar importación y exportación de la migración en el array `migrations`.
- [x] `apps/backend/src/modules/products/products.service.ts` -- Añadir métodos CRUD de escalas y paletas validando inmutabilidad de presets de sistema.
- [x] `apps/backend/src/modules/products/products.controller.ts` -- Exponer endpoints REST con decoradores Swagger y validación de capabilities.
- [x] `apps/backend/src/modules/products/products.service.spec.ts` -- Crear tests unitarios para CRUD de plantillas de talles y paletas.
- [x] `apps/frontend/src/features/products/api/products.api.ts` -- Añadir funciones para consultar y crear escalas/paletas.
- [x] `apps/frontend/src/features/products/components/ProductVariantMatrixGrid.tsx` -- Actualizar componente para cargar plantillas desde API y permitir guardado on-the-fly.
- [x] `apps/frontend/src/features/products/components/ProductVariantMatrixGrid.spec.tsx` -- Añadir tests de Vitest para validar selector dinámico y guardado on-the-fly.

**Acceptance Criteria:**
- Given la grilla matricial activa, when se consulta la lista de escalas, then se obtienen los presets del sistema más las escalas personalizadas creadas por el usuario.
- Given una selección de talles personalizada en la matriz, when el usuario presiona "Guardar como plantilla" e ingresa un nombre, then la escala queda persistida en base de datos y seleccionable de inmediato.
- Given una escala con `isSystemPreset: true`, when se intenta eliminar vía API, then el backend responde con `403 Forbidden`.
- Given la ejecución de `npx jest --selectProjects unit --runTestsByPath src/migrations.consistency.spec.ts`, then la suite pasa en verde sin discrepancias.

## Verification

**Commands:**
- `npm run test -- apps/backend/src/migrations.consistency.spec.ts` -- expected: Migrations consistency test passes.
- `npx jest --selectProjects unit --runTestsByPath src/modules/products/products.service.spec.ts` (en `apps/backend`) -- expected: Tests de plantillas pasan en verde.
- `npm run test -- ProductVariantMatrixGrid.spec.tsx` (en `apps/frontend`) -- expected: Tests de frontend pasan en verde.

## Suggested Review Order

**Esquema de Base de Datos y Migración**

- Entidad para persistir escalas de talles con flag de sistema y orden
  [`size-scale-template.entity.ts:1`](../../../../../apps/backend/src/modules/products/entities/size-scale-template.entity.ts#L1)

- Entidad para paletas de colores con array de swatches JSONB
  [`color-palette-template.entity.ts:1`](../../../../../apps/backend/src/modules/products/entities/color-palette-template.entity.ts#L1)

- Migración TypeORM con creación de tablas y sembrado de presets
  [`1786405840960-AddSizeScaleAndColorPaletteTemplates.ts:1`](../../../../../apps/backend/src/migrations/1786405840960-AddSizeScaleAndColorPaletteTemplates.ts#L1)

- Registro en el index de migraciones
  [`migrations.ts:80`](../../../../../apps/backend/src/migrations.ts#L80)

**Servicios y Controladores Backend**

- Métodos CRUD para escalas y paletas con protección de presets de sistema
  [`products.service.ts:765`](../../../../../apps/backend/src/modules/products/products.service.ts#L765)

- Endpoints REST para `/api/products/size-scales` y `/api/products/color-palettes`
  [`products.controller.ts:75`](../../../../../apps/backend/src/modules/products/products.controller.ts#L75)

**Integración Frontend y Grilla 2D**

- Clientes API para interactuar con los endpoints de plantillas
  [`products.api.ts:145`](../../../../../apps/frontend/src/features/products/api/products.api.ts#L145)

- Grilla matricial 2D con queries React Query, chips de plantillas y modales on-the-fly
  [`ProductVariantMatrixGrid.tsx:40`](../../../../../apps/frontend/src/features/products/components/ProductVariantMatrixGrid.tsx#L40)

**Verificación y Tests**

- Tests unitarios de backend para CRUD de plantillas
  [`products.service.spec.ts:560`](../../../../../apps/backend/src/modules/products/products.service.spec.ts#L560)

- Tests unitarios de frontend con QueryClientProvider y validación de modales
  [`ProductVariantMatrixGrid.spec.tsx:1`](../../../../../apps/frontend/src/features/products/components/ProductVariantMatrixGrid.spec.tsx#L1)


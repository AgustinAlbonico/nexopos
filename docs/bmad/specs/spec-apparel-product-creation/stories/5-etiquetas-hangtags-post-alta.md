---
title: 'Sprint 5: Disparador de Impresión de Etiquetas Térmicas y Hangtags Post-Alta'
type: 'feature'
created: '2026-08-19'
status: 'done'
baseline_commit: '2fa5963f57220ea1b2b2400f273417b1436461c5'
review_loop_iteration: 0
context:
  - docs/bmad/specs/spec-apparel-product-creation/SPEC.md
  - docs/bmad/specs/spec-apparel-product-creation/labels-hangtag-contract.md
---

# Sprint 5: Disparador de Impresión de Etiquetas Térmicas y Hangtags Post-Alta

## Intent

<frozen-after-approval>
Ofrecer el flujo de emisión inmediata de etiquetas térmicas (50×30mm) y de colgar (Hangtag 50×90mm) con talle visible en recuadro gigante, código de barras/QR y precio tras guardar un producto matricial o recepcionar mercadería (CAP-6).
</frozen-after-approval>

## Code Map

- `apps/backend/src/modules/products/labels/labels.service.ts` -- Incorpora plantillas `hangtag_50x90` y `thermal_50x30` con recuadro de talle gigante y soporte multi-copia.
- `apps/backend/src/modules/products/labels/labels.service.spec.ts` -- Tests unitarios de renderizado PDF para Hangtags y térmicas.
- `apps/backend/src/modules/products/labels/labels.controller.ts` -- Expone endpoint para previsualización e impresión por lotes.
- `apps/frontend/src/features/products/components/PostCreationLabelDialog.tsx` -- Modal interactivo post-guardado con selección de formato y cantidad.
- `apps/frontend/src/features/products/components/PostCreationLabelDialog.spec.tsx` -- Tests de Vitest del diálogo de etiquetas.
- `apps/frontend/src/features/products/components/VariantMatrixModal.tsx` -- Conexión del trigger post-alta exitoso.

## Tasks & Acceptance

**Execution:**
- [x] `apps/backend/src/modules/products/labels/labels.service.ts` -- Añadir plantillas `hangtag_50x90` y `thermal_50x30`.
- [x] `apps/backend/src/modules/products/labels/labels.controller.ts` -- Soportar generación de etiquetas con metadatos de indumentaria.
- [x] `apps/frontend/src/features/products/components/PostCreationLabelDialog.tsx` -- Crear modal de impresión post-alta.
- [x] `apps/frontend/src/features/products/components/VariantMatrixModal.tsx` -- Integrar apertura automática de modal de etiquetas.
- [x] Tests de Backend y Frontend en verde.

**Acceptance Criteria:**
- Given un producto creado con variantes de talle y color, when se genera el PDF con formato `hangtag_50x90`, then el PDF resultante contiene páginas de 50×90mm con el talle en recuadro gigante y código QR.
- Given la creación de una matriz con 10 unidades de stock, when el usuario selecciona "1 por unidad de stock", then se generan exactamente 10 etiquetas para impresión.

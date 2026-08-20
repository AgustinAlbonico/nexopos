# Wave 1 — Modelo de datos NexoPOS

## Hallazgos
- `Product` concentra SKU, barcode, costo, precio y stock; cantidades son enteras.
- Ventas y compras fotografían identidad/precio y mutan stock mediante `StockMovement`.
- `unitOfMeasure` existe en `SaleItem`, pero no está expuesto en contratos de creación/UI y queda en `unidades`.
- No hay modelos de packs, variantes, lotes, series, propiedad consignada ni listas de precios.
- Migraciones usan registro explícito en `apps/backend/src/migrations.ts` y tienen test de consistencia.

## EXPAND
- LEAD: field-by-field lineage for new structural capabilities — WHY: quantify blast radius — ANGLE: product→DTO→service→reports→frontend.

## CLAIMS
- Money is decimal-backed; stock and sale quantities are integer-oriented.

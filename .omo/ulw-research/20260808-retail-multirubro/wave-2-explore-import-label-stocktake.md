# Wave 2 — Importación, etiquetas y conteos

## Hallazgos NexoPOS
- No existe importación operativa de catálogo; `seed.ts` y `seed-admin.ts` son bootstrap de desarrollo/instalación.
- No existe impresión de etiquetas de producto; PDF/print actual es para comprobantes/reportes.
- Ajustes actuales son movimientos ad hoc; no hay sesión de conteo con snapshot, cantidades esperadas/contadas, aprobación y variación.
- Stock movement sólo tiene `notes`, no reason codes estructurados.
- Audit log no incluye productos/inventario.

## Seams
- Product CRUD/barcode/initial stock, inventory movements/history, brands/categories and product page are reusable.

## EXPAND
- LEAD: validated import pipeline semantics — WHY: data quality and rollback — ANGLE: preview, duplicate strategy, row errors and transaction.
- LEAD: stocktake session minimum model — WHY: trusted inventory — ANGLE: snapshot, partial count, approval, variance reason.
- LEAD: label template/device boundary — WHY: product onboarding — ANGLE: product identity vs printer output.

## CLAIMS
- Import, labels and stocktakes are missing cross-cutting retail capabilities, not family-specific differentiators.

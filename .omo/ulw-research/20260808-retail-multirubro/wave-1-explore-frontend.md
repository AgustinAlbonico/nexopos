# Wave 1 — Caja y frontend

## Hallazgos
- `SaleForm` integra búsqueda, scanner, cantidades, pagos mixtos, impuestos, ventas pendientes y fiscalidad.
- Caja abierta es requisito; out-of-stock es política global en UI/backend.
- Atajos F1-F11 y command palette son activos de velocidad.
- Cancelación devuelve stock y revierte cuentas/caja; falta E2E completo de cancel/refund e invoice retry.
- “Registrar pago” tiene backend, pero el handler frontend sigue siendo un toast pendiente.
- Comprobantes son descarga HTML/PDF; no hay auto-print.

## EXPAND
- LEAD: return/refund E2E and fiscal semantics — WHY: riskiest common retail workflow — ANGLE: cancellation versus immutable return document.
- LEAD: shared capability/config consumption — WHY: avoid repeated configuration contracts — ANGLE: backend capability source + frontend provider.

## CLAIMS
- Checkout speed depends on scanner, keyboard shortcuts and keeping admin choices out of `SaleForm`.

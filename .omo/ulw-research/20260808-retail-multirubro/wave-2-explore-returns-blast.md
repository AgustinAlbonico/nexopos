# Wave 2 — Devoluciones en NexoPOS

## Hallazgos
- UI `cancel` llama `PATCH /sales/:id/cancel`; backend revierte inventario, cuenta o caja y marca la venta CANCELLED.
- Refund actual es movimiento de caja EXPENSE; RETURN es sólo source de stock movement.
- No hay entidad/ruta/UI de devolución o cambio, ni nota de crédito/débito AFIP.
- Reportes excluyen canceladas en lugar de registrar un documento de devolución.
- Tests cubren cancelación/reversión, no true return/exchange.

## EXPAND
- LEAD: dedicated return/exchange document and original-line snapshot — WHY: cancellation cannot represent partial returns or exchanges — ANGLE: sale/invoice/stock/cash/accounts/report dependencies.

## CLAIMS
- NexoPOS implements side-effect reversal for whole-sale cancellation, not retail returns/exchanges.

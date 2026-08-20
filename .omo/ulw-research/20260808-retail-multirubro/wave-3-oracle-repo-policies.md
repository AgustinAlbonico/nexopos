# Wave 3 — Policies validadas sólo contra repo

## Hallazgos
- Quantity policy cruza Product, StockMovement, SaleItem, PurchaseItem, DTOs y schemas; todo es integer-oriented.
- Stock identity actual es `Product`; variantes/lotes/series cambian esa identidad transversalmente.
- Price policy reside en products/configuration; ventas aceptan/snapshot `unitPrice`, por lo que la validación de precio transaccional merece boundary propio.
- SalesService/InventoryService son autoridad; frontend es UX-only.
- Receiving hoy equivale a compra pagada que actualiza inventario; separar recepción de pago es requisito real para wholesale/durables.
- Returns hoy son cancellation; partial return requiere sale-item boundary.
- Configuration/SystemConfiguration es seam existente para perfiles/capacidades.

## Leads
- UI `SaleItemsList` no respeta consistentemente allowOutOfStockSale.
- Transaction ownership entre sales/purchases e InventoryService debe revisarse antes de stock avanzado.

## EXPAND
- CLOSED AS IMPLEMENTATION TASK: transaction boundary and UI policy alignment.

## CLAIMS
- Seven policy boundaries are compatible with current modules, but should be introduced incrementally, not as a framework rewrite.

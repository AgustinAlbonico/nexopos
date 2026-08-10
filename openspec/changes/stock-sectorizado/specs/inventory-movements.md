# inventory-movements (MODIFIED)

## Purpose

Extender `InventoryMovement` (`stock_movements`) para registrar la
ubicación afectada cuando el modo sectorizado está activo, preservando el
historial auditable.

## Requirements

### MODIFIED — `locationId` en movimientos

- Nueva columna `stock_movements.locationId` (uuid, nullable, FK a
  `locations.id`).
- En modo simple: `locationId` es null. Comportamiento actual intacto.
- En modo sectorizado: toda operación que modifique saldos (carga inicial,
  compra, venta, ajuste, devolución, traslado) registra `locationId`:
  - Carga inicial → ubicación inicial de activación.
  - Compra → destino de la compra.
  - Venta → ubicación principal de venta.
  - Ajuste → ubicación indicada por el usuario.
  - Devolución → destino elegido (por defecto ubicación de venta).
  - Traslado → dos movimientos, uno con `locationId = from`, otro con
    `locationId = to` y `source = TRANSFER`.

### MODIFIED — Enum `StockMovementSource`

- Se agrega valor `TRANSFER` al enum existente.

### Sin cambio — Backfill

- No se backfilean `locationId` para movimientos previos a la activación;
  quedan en null. Reportes los muestran como "sin ubicación".

## Scenarios

### S1 — Venta en modo sectorizado registra ubicación

**Given** modo sectorizado activo, venta de 2 unidades de P desde L1
**When** se completa la venta
**Then** existe un `stock_movement` con `type = OUT`, `source = SALE`,
`quantity = 2`, `locationId = L1`

### S2 — Compra registra destino

**Given** modo sectorizado activo, compra de 10 unidades hacia L2
**When** se completa la compra
**Then** existe un `stock_movement` con `type = IN`, `source = PURCHASE`,
`quantity = 10`, `locationId = L2`

### S3 — Traslado genera dos movimientos

**Given** traslado de 4 unidades de L1 a L2
**When** se ejecuta el traslado
**Then** existen dos `stock_movements`: uno `OUT` en L1 y otro `IN` en L2,
ambos con `source = TRANSFER` y la misma transferencia referenciada

### S4 — Movimientos históricos sin ubicación

**Given** movimientos creados antes de activar el modo sectorizado
**When** se consulta el historial
**Then** se muestran con `locationId = null` y un indicador "sin ubicación"

### S5 — Modo simple inalterado

**Given** modo simple activo
**When** se registra cualquier movimiento
**Then** `locationId` queda null; el resto del comportamiento es idéntico al
actual

# sales-stock-by-location (MODIFIED)

## Purpose

Extender `SaleItem` para que descuente stock desde la ubicación principal de
venta cuando el modo sectorizado está activo, y exponer un camino de
reposición explícito cuando esa ubicación no alcanza.

## Requirements

### MODIFIED — Descuento de stock

- En modo simple: comportamiento actual intacto.
- En modo sectorizado: cada `SaleItem` descuenta de
  `ProductLocationStock(productId, locationId =
  SystemConfiguration.primarySaleLocationId)`.
- El descuento ocurre dentro de la misma transacción que crea el
  `stock_movement` (`source = SALE`) y que actualiza el total
  consolidado (`Product.stock`).
- `SaleItem` lleva opcionalmente `locationId` poblado cuando el modo está
  activo; queda null en modo simple.

### MODIFIED — Reposición guiada desde POS

- Antes de validar el stock, si el modo sectorizado está activo y la
  ubicación de venta no alcanza la cantidad solicitada, el backend expone
  `GET /inventory/replenishment-options?productId=&qty=` con la lista de
  ubicaciones alternativas que tienen stock > 0 y la cantidad disponible.
- Si el cliente envía `POST /sales` con `replenishFromTransfer: { fromLocationId,
  quantity }`, el backend ejecuta primero el traslado atómico y luego completa
  la venta, todo dentro de la misma transacción.
- Si el traslado falla por saldo cambiado, la venta no se registra.

### Sin cambio — `allowOutOfStockSale`

- En modo sectorizado, `allowOutOfStockSale = true` autoriza la venta aunque
  la ubicación de venta quede negativa; el total consolidado puede quedar
  negativo.
- El sistema **nunca** descuenta silenciosamente desde otra ubicación para
  evitar este flag. Si hay stock alternativo, se ofrece reposición explícita.

## Scenarios

### S1 — Venta con stock suficiente en ubicación de venta

**Given** modo sectorizado activo, ubicación principal L1, producto P con
`P.stockAt(L1) = 5`
**When** se registra una venta de 2 unidades de P
**Then** `P.stockAt(L1) = 3`, `Product.stock = total - 2`, sin pasos
adicionales

### S2 — Venta con reposición aceptada

**Given** modo sectorizado activo, L1 con `P.stockAt(L1) = 1`, L2 con
`P.stockAt(L2) = 5`
**When** el POS registra la venta de 3 unidades con
`replenishFromTransfer = { fromLocationId: L2, quantity: 2 }`
**Then**:
- Primero se ejecuta el traslado L2 → L1 de 2 unidades
- Luego se descuenta la venta de L1
- `P.stockAt(L1) = 0`, `P.stockAt(L2) = 3`, `Product.stock = total - 3`
- Existe la fila `stock_transfers` y los `stock_movements` correspondientes

### S3 — Venta con stock alternativo pero reposición rechazada

**Given** modo sectorizado activo, L1 con `P.stockAt(L1) = 1`, L2 con
`P.stockAt(L2) = 5`
**When** el usuario rechaza la reposición y la venta no incluye
`replenishFromTransfer`
**Then** la venta se rechaza con 422 indicando que la ubicación de venta no
alcanza; ningún saldo se modifica

### S4 — Venta con reposición fallida por concurrencia

**Given** modo sectorizado activo, L1 con `P.stockAt(L1) = 1`, L2 con
`P.stockAt(L2) = 5`
**And** otra caja consumió las 5 unidades de L2 antes del traslado
**When** el POS intenta `replenishFromTransfer` con `fromLocationId = L2`
**Then** el backend responde 409 con el estado actual; la venta no se
completa; no se registra movimiento alguno

### S5 — Venta sin stock autorizada por `allowOutOfStockSale`

**Given** modo sectorizado activo, `allowOutOfStockSale = true`, L1 con
`P.stockAt(L1) = 0`, L2 con `P.stockAt(L2) = 5`
**When** se registra una venta de 2 unidades sin `replenishFromTransfer`
**Then**:
- La venta se completa
- `P.stockAt(L1) = -2`, `P.stockAt(L2) = 5` (L2 intacta)
- `Product.stock = total - 2`
- El movimiento queda registrado con nota auditable
- **NO** se descuenta implícitamente de L2

### S6 — Venta sin stock y sin autorización

**Given** modo sectorizado activo, `allowOutOfStockSale = false`, L1 con
`P.stockAt(L1) = 0`
**When** se intenta registrar una venta de 1 unidad
**Then** el backend responde 422; ningún saldo se modifica

### S7 — Modo simple inalterado

**Given** modo simple activo
**When** se registra cualquier venta
**Then** el comportamiento es idéntico al actual; `SaleItem.locationId` queda
null; `Product.stock` se descuenta directamente

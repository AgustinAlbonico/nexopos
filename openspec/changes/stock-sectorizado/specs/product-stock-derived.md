# product-stock-derived (MODIFIED)

## Purpose

Definir el comportamiento de `Product.stock` cuando el modo sectorizado
está activo: derivado de los saldos por ubicación, no editable
directamente, pero conservado como cache para no romper reportes y
pantallas existentes.

## Requirements

### MODIFIED — `Product.stock` como cache derivado

- En modo simple: `Product.stock` es la única verdad; se mantiene y se
  modifica como hasta ahora.
- En modo sectorizado:
  - `ProductService.updateStock(...)` y cualquier endpoint que escriba
    `Product.stock` directamente queda deshabilitado (rechaza con 422
    cuando `stockSectorizado = true`).
  - `InventoryService` recalcula `Product.stock = SUM(product_location_stock.quantity)`
    dentro de la misma transacción que toca `product_location_stock`.
  - El reporte de productos, dashboard y consultas existentes leen
    `Product.stock` sin cambios.

### ADDED — Endpoint de desglose

- `GET /products/:id/location-stock` devuelve el desglose por ubicación
  para modo sectorizado; 404 en modo simple.

## Scenarios

### S1 — Escritura directa rechazada en modo sectorizado

**Given** `stockSectorizado = true`
**When** se intenta `PATCH /products/:id` con `stock` en el body
**Then** el backend rechaza con 422 indicando que el stock se gestiona por
ubicación

### S2 — Total sincronizado tras traslado

**Given** producto P con `Product.stock = 12`, L1 = 10, L2 = 2
**When** se ejecuta un traslado de 3 unidades L1 → L2
**Then** tras la transacción: `Product.stock = 12`, `L1 = 7`, `L2 = 5`

### S3 — Total sincronizado tras venta

**Given** modo sectorizado activo, producto P con `Product.stock = 10`,
L1 = 10
**When** se vende 1 unidad
**Then** tras la transacción: `Product.stock = 9`, `L1 = 9`

### S4 — Desglose por ubicación

**Given** modo sectorizado activo, producto P con L1 = 6, L2 = 4
**When** se consulta `GET /products/:id/location-stock`
**Then** devuelve `[{ locationId: L1, quantity: 6 }, { locationId: L2, quantity: 4 }]`

### S5 — Modo simple inalterado

**Given** modo simple activo
**When** se consulta cualquier endpoint de productos
**Then** el comportamiento es idéntico al actual; no existe
`GET /products/:id/location-stock` (404 o no registrado)

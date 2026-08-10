# inventory-locations (ADDED)

## Purpose

Permitir que un comercio defina y gestione las ubicaciones físicas que se usan
para almacenar y vender mercadería cuando el modo sectorizado está activo.
Las ubicaciones son insumo del inventario, no un catálogo independiente.

## Requirements

### ADDED — `Location`

- Toda `Location` tiene `name` (varchar, único, no vacío), `function`
  (`SALE` | `STORAGE`) y `isActive` (boolean).
- Una `Location` activa con `function = SALE` puede ser la ubicación principal
  de venta (`SystemConfiguration.primarySaleLocationId`).
- Una `Location` activa puede ser destino predeterminado de compras
  (`SystemConfiguration.defaultReceiveLocationId`).
- Una `Location` con `isActive = false` no recibe nuevos movimientos (entradas,
  compras, traslados entrantes) pero conserva su historial.
- Una `Location` no se elimina físicamente; se desactiva vía
  `PATCH /locations/:id/deactivate`. Si tiene saldo > 0 en cualquier producto,
  el backend rechaza la desactivación.

### ADDED — `ProductLocationStock`

- Existe exactamente una fila por par `(productId, locationId)` cuando el modo
  está activo y la ubicación recibió stock al menos una vez.
- `quantity` es decimal(14,4) y puede ser negativo cuando una venta se autorizó
  sin existencias suficientes (`allowOutOfStockSale`).
- Ningún módulo distinto a `InventoryService` escribe en
  `product_location_stock`.

### ADDED — `StockTransfer`

- Registra `productId`, `fromLocationId`, `toLocationId`, `quantity > 0`,
  `reason` (opcional), `userId` (auditoría) y `createdAt`.
- En una sola transacción: descuenta origen, acredita destino, recalcula
  `Product.stock` total, registra la transferencia y los dos
  `stock_movements` asociados.
- Restricciones: origen y destino distintos; ambas ubicaciones activas;
  `quantity <= stock` en origen.

### ADDED — Activación del modo sectorizado

- Endpoint `POST /inventory/activate` ejecuta un asistente transaccional:
  1. Crea/selecciona ubicaciones iniciales.
  2. Define `primarySaleLocationId`.
  3. Define `defaultReceiveLocationId`.
  4. Elige una ubicación inicial para recibir todo el stock existente.
  5. Inserta `product_location_stock` con `quantity = Product.stock` previo
     para cada producto.
  6. Verifica `SUM(product_location_stock) == SUM(Product.stock)` previo.
  7. Flipea `SystemConfiguration.stockSectorizado = true`.
- Si cualquier paso falla → rollback completo (sin ubicaciones colgadas, sin
  flag activado, sin saldos parciales).
- No se permite activar sin `primarySaleLocationId` válido y activo.

## Scenarios

### S1 — CRUD de ubicaciones (modo sectorizado activo)

**Given** el modo sectorizado activo y el usuario administrador
**When** crea una ubicación con `name = "Depósito"`, `function = STORAGE`
**Then** la ubicación aparece en el listado como activa y disponible para
destino de compras

**And when** intenta desactivar esa ubicación teniendo productos con saldo > 0
**Then** el backend rechaza con 409 indicando que primero debe vaciarse

### S2 — Activación exitosa con totales preservados

**Given** modo simple activo con N productos y `Product.stock` total = T
**When** el administrador completa el asistente eligiendo la ubicación
`L1` para recibir todo el stock existente
**Then** tras la activación:
- `SUM(product_location_stock)` agrupado por producto == `Product.stock` previo
- `Product.stock` total global == T (sin pérdida ni duplicación)
- `SystemConfiguration.stockSectorizado = true`
- `SystemConfiguration.primarySaleLocationId = L1`
- Cada producto tiene una fila en `product_location_stock` con
  `quantity = Product.stock` previo

### S3 — Activación con rollback ante falla

**Given** el asistente en paso 5 (inserción de saldos) para 1 producto la
inserción en `product_location_stock` viola una constraint
**When** se ejecuta la transacción completa
**Then**:
- Ninguna fila de `product_location_stock` persiste
- Ninguna ubicación nueva persiste
- `stockSectorizado` sigue `false`
- `Product.stock` total global == T (intacto)

### S4 — Desactivación sin saldo permitido

**Given** una ubicación con todos sus `product_location_stock` en 0
**When** se llama `PATCH /locations/:id/deactivate`
**Then** la ubicación queda inactiva, conserva historial, no recibe
movimientos nuevos

### S5 — Traslado atómico entre dos ubicaciones

**Given** producto P con `locationA.stock = 10` y `locationB.stock = 2`
**When** se solicita un traslado de 4 unidades de A a B
**Then**:
- `locationA.stock = 6`, `locationB.stock = 6`
- `Product.stock = 12` (sin cambio)
- Existe una fila `stock_transfers` con `quantity = 4`
- Existen dos `stock_movements` (uno OUT en A, uno IN en B) con
  `source = TRANSFER` (extensión del enum existente)

### S6 — Traslado rechazado por saldo insuficiente

**Given** producto P con `locationA.stock = 3`
**When** se solicita un traslado de 5 unidades desde A
**Then** el backend rechaza con 422; no se modifica ningún saldo

### S7 — Traslado a ubicación inactiva rechazado

**Given** `locationB` con `isActive = false`
**When** se intenta un traslado con `toLocationId = B`
**Then** el backend rechaza con 422; sin movimientos registrados

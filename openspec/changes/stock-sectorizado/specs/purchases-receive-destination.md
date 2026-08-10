# purchases-receive-destination (MODIFIED)

## Purpose

Permitir que cada compra registre el destino físico donde ingresa la
mercadería, con un valor predeterminado configurable y override por
operación.

## Requirements

### MODIFIED — Destino predeterminado

- `SystemConfiguration.defaultReceiveLocationId` define el destino que se
  sugiere al crear una compra cuando el modo sectorizado está activo.
- En modo simple, las compras siguen funcionando como hoy; el campo no se
  muestra.

### MODIFIED — Destino por compra

- `POST /purchases` acepta opcionalmente `locationId` (a nivel compra o por
  ítem). Si no se envía, se usa `defaultReceiveLocationId`.
- Si la ubicación destino está inactiva, el backend rechaza con 422 exigiendo
  seleccionar otra.
- Todos los `stock_movements` (`source = PURCHASE`) de esa compra llevan el
  `locationId` resultante.

### Sin cambio — Costo y total consolidado

- El costo, el total y la lógica contable de la compra conservan el
  comportamiento actual. Solo cambia **dónde** se acredita el stock.

## Scenarios

### S1 — Compra con destino predeterminado

**Given** modo sectorizado activo, `defaultReceiveLocationId = L2` (depósito)
**When** se registra una compra sin especificar `locationId`
**Then** todos los ítems se acreditan en L2; cada `stock_movement` lleva
`locationId = L2`

### S2 — Compra con destino alternativo

**Given** modo sectorizado activo, `defaultReceiveLocationId = L2`
**When** se registra una compra con `locationId = L1` (salón)
**Then** todos los ítems se acreditan en L1; los `stock_movements` llevan
`locationId = L1`; el `defaultReceiveLocationId` configurado no cambia

### S3 — Compra rechazada por destino inactivo

**Given** modo sectorizado activo, L1 con `isActive = false`
**When** se registra una compra con `locationId = L1`
**Then** el backend rechaza con 422 exigiendo otra ubicación; ningún saldo
se modifica

### S4 — Modo simple inalterado

**Given** modo simple activo
**When** se registra cualquier compra
**Then** el comportamiento es idéntico al actual; `stock_movements.locationId`
queda null; `Product.stock` se acredita directamente

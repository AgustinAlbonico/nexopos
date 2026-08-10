# configuration-stock-mode (ADDED)

## Purpose

Persistir el modo de inventario y los parámetros asociados (ubicación
principal de venta, destino predeterminado de compras, mínimo de
reposición del salón) en `SystemConfiguration`.

## Requirements

### ADDED — Campos nuevos en `SystemConfiguration`

- `stockSectorizado` (boolean, default false) — interruptor del modo.
- `primarySaleLocationId` (uuid, FK a `locations.id`, nullable) — ubicación
  principal que abastece ventas cuando el modo está activo.
- `defaultReceiveLocationId` (uuid, FK a `locations.id`, nullable) — destino
  que se sugiere en compras cuando el modo está activo.
- `stockMinimoVenta` (int, default 5) — mínimo de reposición del salón;
  activa la alerta de reposición.

### ADDED — Endpoints

- `PATCH /configuration/system` acepta los campos nuevos. Las FKs se
  validan contra `locations` activas.

### ADDED — Lectura del modo efectivo

- `ConfigurationService.getEffective()` devuelve la config completa
  incluyendo los campos nuevos y un booleano derivado
  `stockSectorizadoEnabled` para evitar checks repetidos en cada llamada.

## Scenarios

### S1 — Activación del flag

**Given** `stockSectorizado = false`
**When** el endpoint de activación completa exitosamente
**Then** `stockSectorizado = true`, `primarySaleLocationId` poblado,
`defaultReceiveLocationId` poblado

### S2 — Rechazo de FK inválida

**Given** `stockSectorizado = true`
**When** se intenta `PATCH /configuration/system` con
`primarySaleLocationId` apuntando a una ubicación inexistente
**Then** el backend rechaza con 422

### S3 — Default del mínimo de reposición

**Given** un sistema recién activado con `stockMinimoVenta` sin definir
**When** se lee `ConfigurationService.getEffective()`
**Then** devuelve `stockMinimoVenta = 5`

### S4 — Modo simple no expone nuevos campos

**Given** `stockSectorizado = false`
**When** el frontend consulta la config
**Then** los campos `primarySaleLocationId`, `defaultReceiveLocationId` y
`stockMinimoVenta` se devuelven como null/0; el frontend los oculta

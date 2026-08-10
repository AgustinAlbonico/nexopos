# Design — Stock sectorizado opcional

**Change:** `stock-sectorizado`
**Detailed design:** `docs/plans/2026-08-10-stock-sectorizado-design.md` (aprobado 2026-08-10)

Este documento cierra las decisiones técnicas que el diseño funcional dejó
abiertas. Todo lo relativo a **qué** se hace está en el diseño aprobado; acá
solo se define **cómo**.

## Decisiones técnicas

### Modelo de datos (PostgreSQL / TypeORM)

**Reutilización — no se agregan columnas especulativas.**

Tablas nuevas (módulo `inventory`):

- `locations`
  - `id` uuid PK
  - `name` varchar(120) unique no nulo
  - `function` enum `'SALE' | 'STORAGE'`
  - `isActive` boolean default true
  - `createdAt` / `updatedAt` timestamp
- `product_location_stock`
  - `id` uuid PK
  - `productId` uuid FK → `products.id` ON DELETE RESTRICT
  - `locationId` uuid FK → `locations.id` ON DELETE RESTRICT
  - `quantity` decimal(14,4) default 0
  - UNIQUE (`productId`, `locationId`)
  - `updatedAt` timestamp
- `stock_transfers`
  - `id` uuid PK
  - `productId` uuid FK
  - `fromLocationId` uuid FK
  - `toLocationId` uuid FK
  - `quantity` decimal(14,4) > 0
  - `reason` varchar(255) nullable
  - `userId` uuid FK → `users.id` nullable (auditoría)
  - `createdAt` timestamp
  - CHECK (`fromLocationId` <> `toLocationId`)

Columnas nuevas en tablas existentes:

- `stock_movements`: `locationId` uuid FK nullable (null en modo simple; en
  modo sectorizado todo movimiento debe traer uno).
- `system_configuration`:
  - `stockSectorizado` boolean default false
  - `primarySaleLocationId` uuid FK → `locations.id` nullable
  - `defaultReceiveLocationId` uuid FK → `locations.id` nullable
  - `stockMinimoVenta` int default 5 (mínimo de reposición del salón; el
    existente `minStockAlert` sigue siendo el umbral global de compra)

### `Product.stock` — derivado, no editable

En modo simple sigue siendo la única verdad. En modo sectorizado:

- Cualquier escritura a `Product.stock` se rechaza a nivel servicio.
- El total consolidado se recalcula dentro de la misma transacción que toca
  `product_location_stock` y se persiste como cache (`Product.stock = SUM`).
- Reportes, productos, dashboard leen el total; nada consulta la suma
  directamente desde la pantalla.

### Migrations

Archivos nuevos (timestamps cronológicos por encima del último, `1769200000000`):

- `1770000000000-AddStockSectorizadoFoundations.ts` — crea `locations`,
  `product_location_stock`, `stock_transfers`, agrega columnas nuevas a
  `stock_movements` y `system_configuration`, registra FKs.
- (Si hace falta seed configurable) no se agrega seed inicial: el asistente
  de activación crea la primera ubicación.

**Regla crítica (AGENTS.md):** todo archivo nuevo en `apps/backend/src/migrations/`
debe quedar registrado en el array `migrations` de `apps/backend/src/migrations.ts`
y pasar `migrations.consistency.spec.ts`. Se incluye como check explícito en
las tareas.

### Estructura de módulos (NestJS)

Reutilización — no se crean módulos nuevos cuando alcanza con uno extendido:

- `apps/backend/src/modules/inventory/`
  - `entities/location.entity.ts`
  - `entities/product-location-stock.entity.ts`
  - `entities/stock-transfer.entity.ts`
  - `inventory.service.ts` extendido con rama `sectorized`; helpers de
    traslado atómico (`executeTransfer`, `applyMovementByLocation`).
  - `controllers/locations.controller.ts` (CRUD básico de ubicaciones).
  - `controllers/activation.controller.ts` (wizard de activación).
  - `controllers/transfers.controller.ts` (crear / listar traslados).
  - `dto/` con DTOs nuevos (`CreateLocationDto`, `ActivateStockSectorizadoDto`,
    `CreateStockTransferDto`).
- `apps/backend/src/modules/configuration/` — extiende el servicio para leer
  el flag `stockSectorizado` y devolver la config efectiva.
- `apps/backend/src/modules/sales/sales.service.ts` — selecciona ubicación de
  venta antes de validar stock; expone `findReplenishmentOptions(productId, qty)`.
- `apps/backend/src/modules/purchases/purchases.service.ts` — acepta
  `locationId` por ítem/compra; si no viene, usa `defaultReceiveLocationId`.
- `apps/backend/src/modules/products/products.service.ts` — deshabilita
  escritura directa a `Product.stock` cuando el flag está activo.
- `apps/backend/src/migrations/` — dos archivos nuevos registrados.

Sin módulo nuevo `locations/`: las ubicaciones viven en `inventory/` para
evitar scope creep (no son catálogo independiente, son insumo del inventario).

### Endpoints clave (NestJS)

Bajo el prefijo existente (`/api`):

- `GET/POST/PATCH /locations` (CRUD mínimo; sin DELETE físico — solo
  `PATCH .../deactivate`).
- `POST /inventory/activate` — wizard (una transacción, ver abajo).
- `POST /inventory/transfers` — traslado interno (transacción).
- `GET /inventory/replenishment-options?productId=&qty=` — alternativas desde
  venta.
- `PATCH /configuration/system` — suma campos nuevos del modo sectorizado.
- `POST /sales` — opcionalmente acepta `replenishFromTransfer: true` para que
  el backend ejecute el traslado dentro de la misma transacción antes de
  registrar la venta.
- `POST /purchases` — acepta `locationId` opcional.

### Atomicidad

Toda escritura que toque saldos pasa por `InventoryService`. Las
transacciones se abren explícitamente con `DataSource.transaction`:

- **Activación** — una sola tx: crea/valida ubicaciones, fija
  `primarySaleLocationId` y `defaultReceiveLocationId`, inserta
  `product_location_stock` para el destino inicial con `quantity =
  Product.stock`, recalcula totales, flippea el flag, verifica que el SUM
  pre == SUM post (en caso de falla: rollback total).
- **Venta con reposición** — una sola tx: lee saldo bajo `SELECT ... FOR UPDATE`
  (lock pesimista sobre la fila de `product_location_stock`); si falta,
  ejecuta el traslado interno y vuelve a validar; completa la venta y los
  movimientos asociados. Si el lock falla o el saldo cambió → 409 con el
  estado actual.
- **Traslado** — una sola tx: valida origen (saldo suficiente y activo),
  destino (activo), descuenta origen, acredita destino, recalcula total,
  registra `stock_transfers` y los dos `stock_movements` correspondientes.
- **Compra** — una sola tx: crea los `stock_movements` con el `locationId`
  elegido, actualiza `product_location_stock` y recalcula total.

`InventoryService` mantiene su invariante: ningún otro módulo toca saldos
directamente.

### Alertas — split

Existente: `minStockAlert` (entero, default 5) sobre el total consolidado.

Nuevo: `stockMinimoVenta` (entero, default 5) sobre el stock de la ubicación
principal de venta.

Servicio de alertas expone:

- `lowStockForPurchase()` → productos con total <= `minStockAlert`.
- `lowStockForReplenishment()` → productos con stock en venta <=
  `stockMinimoVenta` AND con stock disponible en otra ubicación.

Las pantallas consumen estas listas por separado.

### Frontend (React + Vite + Tailwind v3 + shadcn/ui)

Feature folder: `apps/frontend/src/features/inventory-locations/`.

- `pages/LocationsPage.tsx` — CRUD (listar, crear, editar nombre, activar/
  desactivar).
- `pages/ActivationWizard.tsx` — pasos del asistente (explicación → crear/
  seleccionar ubicaciones → primaria de venta → destino compras → asignar
  stock existente → confirmar → ejecutar). Consumido desde Configuración.
- `components/ReplenishmentDialog.tsx` — diálogo "Reponer y continuar" en POS.
- `pages/ReplenishmentPage.tsx` — vista proactiva con sugerencias.
- `pages/ProductDetailBreakdown.tsx` — desglose por ubicación dentro del
  detalle de producto (extiende la pantalla existente; no se duplica).

Reutilización — shadcn/ui ya provee `Dialog`, `Table`, `Select`, `Form`.
No se agrega librería de UI nueva. Sin dependencias nuevas.

### Estrategia de BD (compatible con la regla del repo)

Las migraciones se generan con `npm run migration:generate` desde
`apps/backend`, con timestamp nuevo, y se registran en `migrations.ts`.
El test `migrations.consistency.spec.ts` debe pasar tras cada nueva
migración — se ejecuta en CI y localmente antes de fusionar.

### Compatibilidad simple

Mientras `stockSectorizado = false`:

- Las columnas `locationId` quedan `nullable`; los endpoints de
  ubicaciones devuelven arrays vacíos / 404 según corresponda pero no
  rompen el flujo.
- `InventoryService.applyMovement` mantiene la rama simple: escribe
  `Product.stock` directamente sin tocar `product_location_stock`.
- Ninguna pantalla nueva se monta.
- Tests de regresión simple cubren ventas, compras, ajustes, devoluciones,
  alertas y `allowOutOfStockSale`.

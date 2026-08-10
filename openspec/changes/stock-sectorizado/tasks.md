# Tasks — Stock sectorizado opcional

**Change:** `stock-sectorizado`
**Strict TDD:** active. Cada tarea lista los tests que deben existir antes de
dar por terminada la implementación.

## PR1 — Foundations (DB + entity + migration)

> Migración + entidades + registro de migraciones + test de consistencia.
> Comprometer primero la regresión del modo simple antes de activar nada.

- [ ] Crear `apps/backend/src/modules/inventory/entities/location.entity.ts`
  (`Location`).
- [ ] Crear
  `apps/backend/src/modules/inventory/entities/product-location-stock.entity.ts`
  (`ProductLocationStock`).
- [ ] Crear
  `apps/backend/src/modules/inventory/entities/stock-transfer.entity.ts`
  (`StockTransfer`).
- [ ] Crear migración
  `apps/backend/src/migrations/1770000000000-AddStockSectorizadoFoundations.ts`
  con: creación de `locations`, `product_location_stock`, `stock_transfers`;
  columnas nuevas (`stock_movements.locationId`,
  `system_configuration.stockSectorizado`,
  `system_configuration.primarySaleLocationId`,
  `system_configuration.defaultReceiveLocationId`,
  `system_configuration.stockMinimoVenta`); enum extendido con `TRANSFER`.
- [ ] Registrar la nueva migración en
  `apps/backend/src/migrations.ts` (orden cronológico).
- [ ] Verificar que `apps/backend/src/migrations.consistency.spec.ts` pasa.
- [ ] Test:
  `apps/backend/src/modules/inventory/entities/__tests__/location-entity.spec.ts`
  (validaciones de modelo, defaults).
- [ ] Test:
  `apps/backend/src/modules/inventory/entities/__tests__/product-location-stock-entity.spec.ts`.
- [ ] Test:
  `apps/backend/src/modules/inventory/entities/__tests__/stock-transfer-entity.spec.ts`.

**LOC estimado:** ~220 (entidades + migración + tests + registro).

## PR2 — InventoryService refactor + Locations CRUD

> Service de inventario extendido; helper de traslado atómico; CRUD
> básico de ubicaciones (sin eliminar, solo desactivar).

- [ ] Extender `InventoryService.applyMovement` con rama `sectorized`:
  escribe `product_location_stock` y recalcula `Product.stock`.
- [ ] Implementar `InventoryService.executeTransfer(productId, fromId, toId,
  qty, reason, userId)` con transacción explícita.
- [ ] Implementar `InventoryService.findReplenishmentOptions(productId, qty)`.
- [ ] Crear `LocationsService` + `LocationsController` con
  `create / list / update / deactivate`.
- [ ] Test:
  `apps/backend/src/modules/inventory/inventory-transfer.spec.ts`
  (atómico, saldo insuficiente, destino inactivo, origen y destino iguales).
- [ ] Test:
  `apps/backend/src/modules/inventory/locations.controller.spec.ts`
  (CRUD + rechazo de desactivar con saldo).
- [ ] Regresión simple: `inventory.service.spec.ts` ya existente debe pasar
  sin cambios.

**LOC estimado:** ~320 (service + controller + tests).

## PR3 — Activation wizard

> Endpoint transaccional que ejecuta los 7 pasos del asistente de
> activación, con verificación de totales antes/después.

- [ ] Crear `ActivationService` con
  `activateSectorizado(payload: ActivateStockSectorizadoDto)`.
- [ ] Crear `ActivationController` con `POST /inventory/activate`.
- [ ] Implementar la transacción única (crear ubicaciones, asignar stock
  existente, verificar `SUM(pre) == SUM(post)`, flippear flag).
- [ ] Test:
  `apps/backend/src/modules/inventory/activation.service.spec.ts` cubriendo:
  activación exitosa con totales preservados;
  rollback ante falla en paso 5; rechazo si no hay primaria de venta.
- [ ] Test de integración:
  `apps/backend/src/modules/inventory/__tests__/activation.integration.spec.ts`
  contra SQLite/Postgres de testing.

**LOC estimado:** ~260 (controller + service + tests integración).

## PR4 — Sales integration

> Ventas consumen ubicación principal; reposición guiada con traslado
> previo; `allowOutOfStockSale` extendido al nivel de ubicación.

- [ ] Extender `SalesService.create` con rama `sectorized`: selecciona
  ubicación principal; valida saldo bajo lock pesimista; acepta
  `replenishFromTransfer`.
- [ ] Implementar el flujo "reponer y continuar": traslado atómico previo,
  validación, venta.
- [ ] Manejar `allowOutOfStockSale` con saldo negativo a nivel ubicación,
  nunca descuento implícito desde otra ubicación.
- [ ] Test:
  `apps/backend/src/modules/sales/sales-stock-by-location.spec.ts`
  cubriendo los 7 escenarios de `specs/sales-stock-by-location.md`.
- [ ] Regresión simple: `sales.service.spec.ts` ya existente debe pasar
  sin cambios.

**LOC estimado:** ~280 (extensión + tests).

## PR5 — Purchases integration

> Compras aceptan `locationId` por operación; default desde
  `SystemConfiguration`; rechazo si destino inactivo.

- [ ] Extender `PurchasesService.create` con `locationId` opcional.
- [ ] Validar destino activo; fallback a `defaultReceiveLocationId`.
- [ ] Persistir `stock_movements.locationId` en cada ítem de la compra.
- [ ] Test:
  `apps/backend/src/modules/purchases/purchases-destination.spec.ts`
  cubriendo los 4 escenarios de `specs/purchases-receive-destination.md`.
- [ ] Regresión simple: `purchases.service.spec.ts` ya existente debe
  pasar sin cambios.

**LOC estimado:** ~140 (extensión + tests).

## PR6 — Alerts split

> Separar alerta de compra (total vs `minStockAlert`) de alerta de
  reposición (salón vs `stockMinimoVenta`).

- [ ] Agregar método `ReportsService.getReplenishmentSuggestions()` (o
  equivalente) con origen sugerido y cantidad sugerida.
- [ ] Mantener `getLowStockProducts()` con semántica actual (sobre el
  total).
- [ ] Test:
  `apps/backend/src/modules/reports/alerts-split.spec.ts`
  cubriendo los 5 escenarios de `specs/alerts.md`.

**LOC estimado:** ~120 (método + tests).

## PR7 — Frontend: Locations CRUD + activation wizard

> UI mínima para gestionar ubicaciones y correr el asistente de
  activación desde Configuración.

- [ ] Crear `apps/frontend/src/features/inventory-locations/` con
  `pages/LocationsPage.tsx` y `pages/ActivationWizard.tsx`.
- [ ] Consumir endpoints `GET/POST/PATCH /locations` y
  `POST /inventory/activate`.
- [ ] Test:
  `apps/frontend/src/features/inventory-locations/__tests__/locations-page.spec.tsx`
  (Vitest + React Testing Library).
- [ ] Test:
  `apps/frontend/src/features/inventory-locations/__tests__/activation-wizard.spec.tsx`.

**LOC estimado:** ~300 (UI + tests).

## PR8 — Frontend: POS "Reponer y continuar"

> Diálogo de reposición en el POS cuando la ubicación principal no
  alcanza.

- [ ] Crear
  `apps/frontend/src/features/inventory-locations/components/ReplenishmentDialog.tsx`.
- [ ] Integrar en el flujo POS existente: detectar respuesta 422 por
  saldo en venta, abrir diálogo, llamar `POST /sales` con
  `replenishFromTransfer`.
- [ ] Test:
  `apps/frontend/src/features/inventory-locations/__tests__/replenishment-dialog.spec.tsx`
  (acepta, rechaza, falla por concurrencia).
- [ ] Regresión simple: la pantalla de POS sin modo sectorizado sigue
  comportándose igual (Vitest e2e del flujo).

**LOC estimado:** ~220 (UI + integración + tests).

## PR9 — Frontend: Replenishment list + product detail breakdown

> Vista proactiva de reposición y desglose por ubicación en producto.

- [ ] Crear `apps/frontend/src/features/inventory-locations/pages/ReplenishmentPage.tsx`
  consumiendo `getReplenishmentSuggestions()`.
- [ ] Extender el detalle de producto existente con
  `ProductLocationStock` (no duplicar pantalla).
- [ ] Test:
  `apps/frontend/src/features/inventory-locations/__tests__/replenishment-page.spec.tsx`.
- [ ] Test:
  `apps/frontend/src/features/products/__tests__/product-detail-breakdown.spec.tsx`.

**LOC estimado:** ~260 (UI + tests).

## PR10 — Verification + archive gate

> Regresión completa del modo simple, integración e2e, gate de archivo.

- [ ] Ejecutar suite completa backend:
  `npm run test:all -w @sistema/backend`.
- [ ] Ejecutar suite completa frontend: `npm run test -w @sistema/frontend`.
- [ ] Test e2e Playwright del happy path sectorizado
  (activación → venta con reposición → compra → traslado → alerta).
- [ ] Re-verificar `migrations.consistency.spec.ts`.
- [ ] Verificar acceptance criteria de la propuesta (13 checks).
- [ ] Si todo pasa → archivar change en OpenSpec.

**LOC estimado:** ~50 (scripts + e2e), pero el trabajo es de verificación.

---

## Review Workload Forecast

- Project total estimated lines: **~2170** (código de producción + tests)
- PR1 subtotal: ~220
- PR2 subtotal: ~320
- PR3 subtotal: ~260
- PR4 subtotal: ~280
- PR5 subtotal: ~140
- PR6 subtotal: ~120
- PR7 subtotal: ~300
- PR8 subtotal: ~220
- PR9 subtotal: ~260
- PR10 subtotal: ~50
- 400-line budget risk: **high** (cada PR1–PR9 individualmente excede 400 líneas solo si se suma la mitad de tests; el presupuesto aplica al delta de revisión, no al código total)
- Chained PRs recommended: **Yes** (10 PRs pequeños secuenciales son revisables; agrupar PR1+PR2 = "fundaciones" baja el riesgo de revisión cruzada)
- Decision needed before apply: **Yes** (confirmar si PR1+PR2 se mergean juntos como "fundaciones")
- Reason: PR1–PR9 son indivisibles lógicamente pero cada uno sigue debajo del presupuesto si se cuenta solo diff de producción; tests suman volumen pero son revisión rápida.

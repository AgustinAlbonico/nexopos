# Archive — Stock sectorizado opcional

- **Change ID:** `stock-sectorizado`
- **Status:** archived
- **Archived at:** 2026-08-10
- **PRs merged:** 10 (PR1–PR10, all stacked to main)

## Implementation summary

Optional "sectorized" inventory mode ships behind a `stockSectorizado = false`
default flag. The simple mode is preserved bit-for-bit: every existing screen,
endpoint, alert, and movement keeps working without a new field, a new step,
or a new column appearing in the UI. When activated, `Product.stock` becomes
a derived cache of `SUM(product_location_stock)`; sales debit the primary
sale location under a pessimistic row lock; the POS detects alternative
stock and proposes a one-shot "reponer y continuar" transfer executed in the
same transaction as the sale; purchases accept a per-operation destination
overriding the configured default; alerts split between "comprar" (total vs
`minStockAlert`) and "reponer" (salon vs `stockMinimoVenta`). All writes
that touch balances go through `InventoryService` inside explicit
`DataSource.transaction` blocks; activation is a single tx with a
pre/post SUM guard. Frontend adds a `features/inventory-locations/` folder
(Locations CRUD, activation wizard, POS replenishment dialog, proactive
replenishment list, product-detail breakdown) reusing shadcn/ui primitives
and zero new dependencies.

## Final metrics

| Area | Result |
|---|---|
| Backend unit suite | **1157/1157 pass** (56 suites, ~14s) |
| Backend consistency gate | **3/3 pass** (`migrations.consistency.spec.ts`) |
| Backend `tsc --noEmit` | 0 new errors (1 pre-existing in `invoice.service.spec.ts`) |
| Frontend unit suite | **108/108 pass** (13 files, ~7s) |
| Frontend `tsc --noEmit` | 0 new errors |
| New migrations | **4** (`1770000000000`, `1771000000000`, `1772000000000`, `1773000000000`) — all registered in `apps/backend/src/migrations.ts` |
| Combined prod LOC | ~2000 (backend + frontend) |
| PR slices | 10, stacked to main; PR8/PR9 over the 400 LOC review budget due to UX coverage — documented |

## Acceptance criteria (13/13)

All ticked in `VERIFICATION.md`:

1. Modo simple intacto — `inventory.service.spec.ts:270-302` + `purchases.service.spec.ts:296-308`.
2. Activación preserva totales — `activation.service.spec.ts:170-227, 248-307`.
3. Total + desglose consistente — `product-detail-breakdown.spec.tsx:71-90` + `inventory.service.spec.ts:453-501`.
4. Compras con destino predeterminado modificable — `purchases.service.spec.ts:310-367`.
5. Ventas descuentan ubicación principal — `sales.service.spec.ts:2688-2733`.
6. POS detecta stock alternativo y propone reposición — `sales.service.spec.ts:2734-2771` + `ReplenishmentDialog.spec.tsx`.
7. Reposición registrada antes de la venta — `sales.service.spec.ts:2895-2970`.
8. Traslados atómicos sin pérdida — `inventory.service.spec.ts:453-575` (5 escenarios).
9. Alertas separadas (compra vs reposición) — `inventory.service.spec.ts:943-1115` + regresión `getLowStockProducts`.
10. Historial con ubicación — `inventory.service.spec.ts:669-693` + `design.md` `inventory-movements`.
11. `allowOutOfStockSale` auditable — `sales.service.spec.ts:428-461` + `inventory.service.spec.ts:202-249`.
12. Concurrencia sin doble consumo — `inventory.service.spec.ts:329-422` (lock pesimista).
13. Migraciones registradas y verificadas — `migrations.consistency.spec.ts` + `apps/backend/src/migrations.ts`.

## Migrations

| Timestamp | File | One-liner |
|---|---|---|
| `1770000000000` | `AddStockSectorizadoFoundations.ts` | Crea `locations`, `product_location_stock`, `stock_transfers`; agrega `stock_movements.locationId`; columnas de config (`stockSectorizado`, `primarySaleLocationId`, `defaultReceiveLocationId`, `stockMinimoVenta`); enum `TRANSFER`. |
| `1771000000000` | (PR3 — activation wizard support) | Ajustes de constraints/índices requeridos por la activación transaccional. |
| `1772000000000` | (PR5 — purchases destination) | Respaldo del campo destino a nivel de movimiento. |
| `1773000000000` | (PR6 — alerts split) | Default y constraint del nuevo `stockMinimoVenta`. |

> Ponytail note: each migration file lives under `apps/backend/src/migrations/`
> and is registered in `apps/backend/src/migrations.ts` in chronological
> order, per `AGENTS.md` migration rule.

## Out of scope (still pending — explicit non-goals from `proposal.md`)

- Free deactivation of sectorized mode without guided consolidation.
- Per-product replenishment minimums (only global `stockMinimoVenta` ships).
- Branch locations with independent commercial operations and accounting.
- Stock reservations for future orders.
- Lots, expiry dates, serial numbers.
- Aisles, shelves, exact bin positions inside a location.
- Picking, routing, advanced WMS receiving.

## Follow-ups (deviations flagged during PR1–PR10 — require separate changes)

- **PR5 PENDING→PAID path** — the purchases-destination spec does not yet
  thread `locationId` through the payment-status transition; needs its own
  slice when the payment-state machine is revisited.
- **PR6 alert enrichment trimmed from spec** — original proposal carried a
  richer "replenishment reason" payload (aging, last sale, supplier lead
  time); only the minimum shape was shipped to keep PR6 under budget. Open
  a new change when richer context is requested.
- **PR9 LOC overage justification** — `replenishment-page` + `product-detail-breakdown`
  crossed the 400 LOC review cap together because both reuse the same
  breakdown component; splitting would have duplicated code. Acceptable
  for this PR, but flag for budget tracking on similar future work.

## Out of convention

This project does **not** maintain a `openspec/specs/` directory; delta specs
remain under `openspec/changes/stock-sectorizado/specs/` and no merge into
a main specs tree was performed. `openspec/config.yaml` was updated to mark
the change as `archived` and remove it from the active `changes:` list.

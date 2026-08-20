# NexoPOS Retail Multi-Rubro — Phase Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan stage-by-stage. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Cross-reference:** This plan is the *companion* to `.omo/plans/retail-multirubro-roadmap.md`. The roadmap owns the 24 numbered tasks (T1..T24), the dependency matrix, the verification evidence scheme, and the agenda of each. This document only decides *how* to execute them as five reviewable stages, what *exact* files/contracts/migrations/tests each stage must touch, and what *gate* ends it. Do not duplicate the task descriptions: read the roadmap task before opening a stage.

**Goal:** Group T1..T24 into five execution stages that preserve the roadmap's dependency order, isolate each stage behind entry/exit gates, and stay executable without a new design interview.

**Architecture:** No new architectural concept. We reuse the current NestJS modules, TypeORM migrations registry, the `ConfigurationService` singleton, the existing AFIP/Invoice service, the existing `SalesService`/`PurchasesService`/`InventoryService`, the React Query config query, the static `App.tsx` routes, the static `Sidebar.tsx` items (14 entries), and the Electron `setup-wizard.ts`. Capabilities are exposed via additions to the existing `ConfigurationService`/`ConfigurationController` only; three pure helper modules (`capabilities/keys.ts`, `capabilities/presets.ts`, `capabilities/resolve.ts`) hold the typed vocabulary, presets, and resolver. Profile is one primary preset name persisted in `SystemConfiguration`; mixed businesses are expressed as `profileKey + capabilitiesJson` overrides — never combined preset strings. One PostgreSQL schema, one migration stream, unconditional migrations, one capability namespace `POLICY.*` / `STRUCTURAL.*` / `TOOLING.*` / `COMMERCIAL.*` / `FISCALITY.*` / `APP_ROUTES.*`.

**Tech Stack:** NestJS 10 + TypeORM 0.3 (existing); React 18 + Vite + Vitest (existing); Jest + Supertest (existing); Playwright only when user-managed servers are already running; the already-installed `qrcode` package for QR labels; PostgreSQL `pg_dump -Fc` for backup creation and a new `pg_restore` lookup/execution helper for restoration. No new dependencies. No new ports.

---

## TL;DR (For humans)

**What you'll get:** The same NexoPOS you have today, persisted as a `legacy` profile, plus five reviewable stages that gradually add quantity/UOM, snapshotting, common tools, returns, variants, weight, lots, serials, wholesale, consignment, and bounded promotions — without ever forking the codebase.

**Why this approach:** We refuse to expand the surface area. Every stage reuses what is already there: `ConfigurationService` becomes the capability resolver with a small set of new methods, `SalesService`/`PurchasesService` wrap typed policy helpers instead of growing new branches, returns live in a dedicated `SaleReturnService` exposed through `SaleReturnController` under `@Controller('sales')` (the existing `SalesController` is unchanged), credit notes live in a separate `credit_notes` table that links to `sale_return_id` and `original_invoice_id` and stores the latest AFIP attempt, `App.tsx` keeps its 19 named protected paths plus a single index redirect (login is public) and `Sidebar.tsx` keeps its 14 nav items — all reachable for `legacy` — and the electron setup wizard writes `NEXOPOS_PROFILE_KEY` atomically alongside the existing `.env` keys. The product-code PDF labels route through the existing `pdf-generator.service.ts` and produce a QR (machine-readable, via the already-installed `qrcode`) plus textual SKU/barcode plus price; templates are `qr_text_price` (default), `qr_text`, `qr_only`; 1D barcode rasterization is explicitly deferred pending dependency/hardware approval. Catalog import is a CSV-only state-machine parser with an explicit dialect. Restore safety adds the missing `pg_restore` lookup/execution helpers on top of the existing `BackupService` (which today only knows `pg_dump -Fc`) and flows through a generated temporary PostgreSQL database (`CREATE DATABASE <temp>` via admin connection + `pg_restore --dbname=<temp>`, never `--create`), with `pg_restore --clean --if-exists --single-transaction` against production under packaged-backend maintenance orchestration. Existing installs migrate to `legacy` with zero visible change.

**What it will NOT do:** No SaaS, no multi-tenancy, no multi-location/transfers, no multi-currency, no gastronomy, no pharmacy compliance, no services, no WMS, no generic rule engine, no plugin marketplace, no profile-name conditionals, no frontend-only enforcement, no new dependencies, no inferred recommendations, no XLSX, no 1D-barcode generation (deferred), no SQLite restore branch, no commits, no auto-started dev servers.

**Effort:** XL
**Risk:** High — quantity, stock identity, returns and fiscal documents cross every transactional module. Stages 1, 3 and 4 carry the load. The roadmap/dependency matrix already isolates these risks; the stages make them separately reviewable.

**Decisions to sanity-check:**
- One schema, one migration stream, unconditional migrations (no `if profile ===`).
- Backend is authoritative; frontend is visibility-only.
- Profile is one primary preset; mixed businesses are `profileKey + capabilitiesJson` overrides (never combined preset strings).
- Capability resolver validates only known keys + boolean values + known preset names + `capabilitiesSchemaVersion`. No inter-capability dependency rules.
- Migration of existing installs always resolves to `legacy` with no business data change.
- `SalesService.cancel()` keeps emitting a `RETURN` stock movement as today; *true* returns/exchanges live in `SaleReturnService` and a separate `credit_notes` table that links to `sale_return_id` and `original_invoice_id`. The return itself is the persisted document and uses the existing PDF path for its receipt — no separate `RETURN_RECEIPT` document.
- Disposition (`restock`/`quarantine`/`scrap`/`supplier`) lives on each `sale_return_item` (not on the return header) because one return can restock one item and quarantine another.
- Credit notes never modify `Invoice`; they reference the original invoice by id. AFIP numeric codes live in `int` columns (e.g. `3` NCA / `8` NCB / `13` NCC); no Postgres enum migration. The `credit_notes` row stores the latest `attemptId`/`status`/`error`/`payloadSnapshot`; every attempt is audit-logged through existing `AuditLog`.
- Decimalization is forward-only; the down migration aborts if any fractional quantity exists.
- Quantity validation is always executed as a pure policy using `Product.unitOfMeasureId` and the UOM `precision`; the capability flag is `STRUCTURAL.decimal_quantities` (positive, `false` for `legacy`, `true` for decimal profiles). `SaleForm` uses `Number.parseFloat` only when `STRUCTURAL.decimal_quantities === true`; otherwise `Number.parseInt`. The basic validation path never calls `assertCapabilityEnabled`.
- Catalog import is a CSV-only state-machine parser with explicit dialect (UTF-8 header, comma, CRLF/LF, quoted commas, escaped `""`; embedded newlines inside a quoted field rejected); XLSX waits for explicit dependency approval.
- Labels produce QR (already-installed `qrcode`) + textual SKU/barcode + price through the existing PDF path; templates are `qr_text_price`/`qr_text`/`qr_only`; 1D barcode rasterization is a blocked optional follow-up.
- Variable barcode parser covers GS1 AI `310n` (net kg) and price AIs `392n`/`393n`, plus a configurable local EAN-13 layout (`prefix`, `product-code range`, `value range`, `value type weight|price`, `decimal places`, `check digit`).
- Restore safety uses the existing `BackupService` (`pg_dump -Fc` only) and adds `pg_restore` lookup/execution helpers; the temporary database flow uses admin `CREATE DATABASE <temp>` then `pg_restore --dbname=<temp>`; the production swap uses `pg_restore --clean --if-exists --single-transaction` against production under packaged-backend maintenance orchestration. Dev/tests use disposable PostgreSQL DB processes only.
- Wholesale persistence: `Customer.customerGroupId` plus concrete `sales_orders` and `sales_order_items` entities. `OrderService` owns quote/order/partial delivery/invoice.
- Stage 5 function types are explicit: price adjustments return `Adjustments[]`; loyalty redemption and store credit return `PaymentAllocation[]` (never `Adjustments`); loyalty earning returns a `LedgerMovement` (never an `Adjustment`). Idempotency: `coupon_redemptions` reference coupon/sale/return with signed/reversal relation; `loyalty_movements` and `store_credit_movements` carry signed `amount`/`points`, `saleId`/`returnId`, `reversalOfId`, and a unique `idempotencyKey`.
- `app.module.ts` only imports new modules; controllers are registered in their owning modules.
- Production rollback is *forward corrective migrations*, never `DROP COLUMN` against data-bearing tables and never deletion of applied migration files. S1 metadata columns may only be dropped after every row proves to be `legacy` with empty overrides.
- All five stages ship behind a yes/no gate before the next stage.

Current next move: execute S1, which the user explicitly authorized, then stop at its exit gate for approval before S2. Every later stage still requires a new explicit user request — read `## Commit strategy` below.

---

> TL;DR (machine): XL/high-risk. Five stages (S1 tasks 1-5, S2 tasks 6-11, S3 tasks 12-15, S4 tasks 16-22, S5 tasks 23-24). Each stage is self-contained, re-runnable, and ends on a defined exit gate. One schema, one migration stream, no new dependencies.

## Scope

### Must have
- Five reviewable stages, each ending in a go/no-go gate.
- Each stage reuses the existing modules, services, controllers, entities, typeorm repositories, electron IPC, and React Query layer.
- Exact file paths and contracts for every stage.
- Migration order for every stage, registered in `apps/backend/src/migrations.ts` and validated by `apps/backend/src/migrations.consistency.spec.ts`. Timestamps generated at apply time with `npm run migration:generate` from `apps/backend`; the leading timestamp is **strictly greater than the latest entry in `apps/backend/src/migrations.ts` at execution time**, and the descriptive suffix (e.g. `-Name.ts`) is the stable identifier. No fixed timestamps are ever written into this plan.
- Per-stage TDD/QA commands (workdir `apps/backend`, `src/...` paths; frontend uses `npm test` from `apps/frontend`) with expected outcomes and evidence paths under `.omo/evidence/`.
- Per-stage rollback strategy: production rollback is always a *forward corrective migration*; data-bearing tables either export or are forward-only. S1 metadata columns may only be dropped after every row proves to be `legacy` with empty overrides.
- A "phase-entry drift revalidation" checkpoint at the top of every stage.
- Every new entity registered in `apps/backend/src/entities.ts`, in the owning module's `TypeOrmModule.forFeature([...])`. New modules are imported in `apps/backend/src/app.module.ts`; controllers are registered in their owning modules.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- No new dependencies. No new package manifests. No new ports.
- No profile-name conditionals (`if (profile === 'electronics')`) anywhere.
- No frontend-only enforcement of capabilities.
- No conditional migrations by profile.
- No new plugins, no generic rules engines, no generic scale/printer abstractions.
- No SaaS, multi-tenancy, multi-location, multi-currency, gastronomy, services, pharmacy, WMS, omnichannel, repair/RMA scheduling.
- No inferred business-data recommendations in setup wizard.
- No CSV/XLSX libraries outside what is already installed (CSV only, state-machine parser).
- No 1D barcode rasterization (deferred).
- No SQLite restore branch (the system is PostgreSQL-only).
- No commits, no auto-started dev servers, no Playwright unless user-managed servers are already running.
- No duplication of the roadmap's 24 task descriptions.
- No deletion of applied migration files; no `DROP COLUMN` against data-bearing tables in production rollback.
- No cycle / inter-capability dependency rules.
- No combined preset strings (`apparel+wholesale` etc.).
- No new top-level routes in Stage 4.

## Verification strategy

> Zero human intervention — all verification is agent-executed.

- **Test decision:** TDD. Add the failing test first, then the minimum code that passes it, then refactor. No new code without a green-on-amber step.
- **Backend:** Jest unit + Supertest integration. Workdir `apps/backend`. Project names: `unit`, `integration`, `api`. Use `npm run test:unit`, `npm run test:integration`, `npm run test:api` from `apps/backend`. Spec paths are `src/**/*.spec.ts` and `test/integration/**/*.spec.ts`.
- **Frontend:** Vitest + Testing Library. Workdir `apps/frontend`. Use `npm test` or `npm run test:coverage` from `apps/frontend`.
- **Migrations:** `npm run test:unit -- --runTestsByPath src/migrations.consistency.spec.ts` from `apps/backend` on every stage.
- **Route / sidebar invariants:** every stage's frontend tests must assert that `App.tsx` still defines 19 named protected paths plus one protected index redirect and one public login, and `Sidebar.tsx` still defines exactly 14 `navItems`. This assertion runs on every stage's exit gate. Current line refs: `apps/frontend/src/App.tsx:81-100` (19 protected paths plus the index redirect, including `inventory/replenishment`), `apps/frontend/src/components/Sidebar.tsx:55-138` (14 nav items including `Ubicaciones` and `Reposición`).
- **Locations hooks:** S1's legacy mapper and `ConfigurationService` must keep the existing locations hooks (`stockSectorizado`, `primarySaleLocationId`, `defaultReceiveLocationId`, `stockMinimoVenta`) unchanged.
- **Diagnostics baseline:** S2 creates `DiagnosticsService`; its scale endpoint must return `{ supported: false, model: null, lastError: null }` until S4 registers the simulator adapter.
- **Evidence:** `.omo/evidence/stage-<N>-retail-multirubro-phase-execution.<ext>`. Stage-evidence is the *aggregate* of the roadmap task evidence files referenced inside the stage.
- **Playwright:** only if the user-managed frontend and backend are already running. `cd apps/frontend && npm run test:e2e` is invoked only when stage exit-gate says so.
- **Performance budgets:** scan→line p95 ≤ 300 ms; 20-line total recalc ≤ 100 ms; local submit ≤ 2 s without ARCA/print. Recorded by stage-1 benchmark script and re-checked at stage-5 exit gate.
- **Workspace tooling:** root is npm workspaces (turbo). Do not use `pnpm`. Use `npm run <script>` and `npm --workspace=<name> run <script>`.

## Execution strategy

### Five execution stages

> Each stage ends on a go/no-go exit gate. The next stage cannot start until the user explicitly OKs the gate.

- **Stage 1 — Safety & capability seam (Wave 1): roadmap T1..T5.**
  Goal: freeze `legacy` behavior, define capability vocabulary, persist it, expose it via the existing `ConfigurationService`/`ConfigurationController`, and gate routes/sidebar/setup wizard. No business behavior change. Atomic `.env` write of `NEXOPOS_PROFILE_KEY`. Resolver only validates known keys, boolean values, preset names, and `capabilitiesSchemaVersion`. Legacy keeps all 19 named protected paths + index + public login reachable and all 14 nav items rendered.
- **Stage 2 — Shared structural foundation & tools (Wave 2): roadmap T6..T11.**
  Goal: exact decimal quantity + UOM with typed canonical-base converter, sale/purchase line snapshotting, CSV-only validated import (state-machine parser with explicit dialect), QR + text PDF labels through the existing PDF path (`qr_text_price`/`qr_text`/`qr_only` templates), and the full PostgreSQL `pg_dump -Fc` / `pg_restore` restore-safety flow (adds `pg_restore` lookup/execution helpers on top of the existing `BackupService`).
- **Stage 3 — Returns & retail primitives (Wave 3): roadmap T12..T15.**
  Goal: `SaleReturnService` (with `SaleReturnController` under `@Controller('sales')`) for true partial returns/exchanges, separate `credit_notes` table linked to `sale_return_id` and `original_invoice_id` (latest AFIP attempt; every attempt audit-logged), UOM/pack/bundle semantics with disposition on each `sale_return_item`, and primitive typed policies (`manual-discount`, `price-override`) that persist reasons via existing `AuditLog`; non-enforced primitives (`quantity-break`, `coupon`, `loyalty`, `store-credit`) are typed pure models tested in S3, enforced in S5.
- **Stage 4 — Structural retail families (Wave 4): roadmap T16..T22.**
  Goal: weight/PLU/variable barcode (GS1 AIs + configurable local EAN-13) + bounded direct scale (simulator adapter), parent/variant via `Product.parentProductId` + `product_variant_attributes`, lot/expiry/FEFO/recall (with `locationId` on `product_lot_balances` and `product_serials`), serial/warranty, wholesale price lists/terms/fulfilment (`Customer.customerGroupId` + concrete `sales_orders`/`sales_order_items` entities), and consignment (own module). *No new top-level routes.* Surfaces appear only as tabs/dialogs in existing pages with capability-filtered controls. `CustomerGroup` lives in the customers module.
- **Stage 5 — Commercial overlays & final profiles (Wave 5): roadmap T23..T24.**
  Goal: typed `apply*` functions called by `SalesService` with explicit return-type contracts (`Adjustments[]` for price functions, `PaymentAllocation[]` for loyalty redemption + store credit, `LedgerMovement` for loyalty earning), three generated migrations for `promotions`/`coupons`/`coupon_redemptions`/`loyalty_accounts`/`loyalty_movements`/`store_credit_accounts`/`store_credit_movements` (with idempotency fields: `reversalOfId`, unique `idempotencyKey`), and the final capability-scoped UX/profile matrix. Explicit user selection only; mixed businesses are `profileKey + capabilitiesJson` overrides.

### Dependency matrix

Pulled from the roadmap (this is the matrix the stages follow). See `.omo/plans/retail-multirubro-roadmap.md#dependency-matrix` for in-row detail.

| Roadmap task | Depends on | Blocks | Stage |
| --- | --- | --- | --- |
| T1 | - | T2..T24 | S1 |
| T2 | T1 | T3..T5, T24 | S1 |
| T3 | T2 | T4..T5 | S1 |
| T4 | T3 | T5, T12..T24 | S1 |
| T5 | T4 | T24 | S1 |
| T6 | T1, T4 | T7, T14, T16..T22 | S2 |
| T7 | T6 | T8..T22 | S2 |
| T8 | T7 | T16..T22 | S2 |
| T9 | T7 | T18..T22 | S2 |
| T10 | T7 | T14, T16..T18 | S2 |
| T11 | T5 | T16..T17, T24 | S2 |
| T12 | T7 | T13, T18..T22 | S3 |
| T13 | T12 | T18..T22 | S3 |
| T14 | T7, T10 | T16, T20, T22 | S3 |
| T15 | T7 | T20, T23 | S3 |
| T16 | T6, T7, T10, T14 | T17 | S4 |
| T17 | T11, T16 | T24 | S4 |
| T18 | T7, T8, T9, T12 | T20 | S4 |
| T19 | T7..T9, T12..T13 | T24 | S4 |
| T20 | T12..T13, T18 | T24 | S4 |
| T21 | T7, T12..T13 | T24 | S4 |
| T22 | T7, T9, T12, T14 | T24 | S4 |
| T23 | T12, T15 | T24 | S5 |
| T24 | T5, T11, T17, T19..T23 | Final wave | S5 |

### Stage-level gates

| Stage | Entry gate | Exit gate |
| --- | --- | --- |
| S1 | Roadmap approved; no in-flight branch; `migrations.ts` and `migrations.consistency.spec.ts` green; setup wizard writes `NEXOPOS_PROFILE_KEY` atomically | S1 evidence stored; `legacy` reproduces current behavior; manifest endpoint returns 200 deterministic; `App.tsx` still has 19 named protected paths + 1 protected index redirect + 1 public login; `Sidebar.tsx` still has 14 nav items, all reachable for `legacy`; user says "go to S2" |
| S2 | S1 gate passed; drift revalidation done; Stage 1's manifest endpoint still green | S2 evidence stored; migrations consistency green; decimals round-trip 0.001 in a transactional fixture; snapshot fields exist on `sale_items`/`purchase_items`; CSV state-machine parser stamps; QR + text PDF labels work; full PostgreSQL `pg_dump -Fc` / `pg_restore` restore path proven against a fixture DB; user says "go to S3" |
| S3 | S2 gate passed; drift revalidation done; `legacy` still untouched | S3 evidence stored; partial return doesn't exceed net sold; `credit_notes` table records the latest AFIP attempt (audit-logged) for multiple partial returns against one invoice; disposition lives on `sale_return_item`; typed `manual-discount`/`price-override` policies persist reasons via `AuditLog`; non-enforced primitives are typed and tested; user says "go to S4" |
| S4 | S3 gate passed; drift revalidation done; simulator scale adapter present | S4 evidence stored; lots/serials/variants isolate stock; wholesale + consignment deterministic; *no new top-level routes added*; user says "go to S5" |
| S5 | S4 gate passed; drift revalidation done; profile matrix compiled | S5 evidence stored; profile matrix maps every capability to code/test/docs; legacy unchanged; F1..F4 must ALL pass |

## Stage 1 — Safety & capability seam (Roadmap T1..T5)

### 1.0 Phase-entry drift revalidation checkpoint
Run before any code:

```bash
# from C:\Proyectos\punto_de_venta
git diff --stat
cd apps/backend && npm run test:unit -- --runTestsByPath src/migrations.consistency.spec.ts
```
Expected: working tree clean (or only known edit list), consistency spec passes. If any drift on `apps/backend/src/migrations.ts`, `apps/backend/src/migrations/`, `apps/backend/src/modules/configuration/`, `apps/backend/src/modules/sales/`, `apps/backend/src/migrations.consistency.spec.ts`, `apps/frontend/src/App.tsx`, `apps/frontend/src/components/Sidebar.tsx`, `apps/frontend/src/features/sales/components/SaleForm.tsx`, `apps/desktop/electron/setup-wizard.ts`, STOP and re-plan S1.

### 1.1 Entry gate
- Roadmap `.omo/plans/retail-multirubro-roadmap.md` is `status: approved`.
- No in-flight branch modifying the files above.
- User has explicitly said "go to S1".

### 1.2 Verified current-state map (ground-truth citations)
- `SystemConfiguration` is a single-row entity with `defaultProfitMargin`, `minStockAlert`, `sistemaHabilitado`, `barcodeScannerEnabled`, `barcodeScannerTimeoutMs`, `allowOutOfStockSale`, `stockSectorizado`, `primarySaleLocationId`, `defaultReceiveLocationId`, `stockMinimoVenta`. No profile, no capability keys. (`apps/backend/src/modules/configuration/entities/system-configuration.entity.ts:7-60`).
- `ConfigurationService` is global singleton, exposes `getConfiguration`, `updateConfiguration`, `getDefaultProfitMargin`, `getMinStockAlert`, `isOutOfStockSaleAllowed`, `updateAllProductsPrices` plus an `onModuleInit()` hook that bootstraps the singleton row. Used by `SalesService`, `ProductsService`, `CategoriesService`, `ReportsService`, `cash-register`, `customers`. (`apps/backend/src/modules/configuration/configuration.service.ts:13-145`).
- `ConfigurationController` exposes `GET /api/configuration`, `PATCH /api/configuration`, `POST /api/configuration/update-all-prices`. (`apps/backend/src/modules/configuration/configuration.controller.ts:14-34`).
- `App.tsx` defines 19 named protected paths plus 1 protected `<Route index element={<Navigate to="/dashboard" replace />} />` redirect and 1 public `/login` route. The 19 named protected paths (current) are: `dashboard`, `products`, `customers`, `suppliers`, `purchases`, `sales`, `expenses`, `incomes`, `cash-register`, `customer-accounts`, `customer-accounts/:customerId`, `reports`, `settings`, `settings/fiscal`, `settings/users`, `settings/backup`, `inventory/locations`, `inventory/locations/activate`, `inventory/replenishment`. For `legacy`, all 19 named protected paths remain reachable (and the index redirect always works). (`apps/frontend/src/App.tsx:81-100`).
- `Sidebar.tsx` renders a static `navItems` array with exactly 14 entries (Inicio, Ventas, Caja, Cuentas Corrientes, Ingresos, Compras, Gastos, Productos, Clientes, Proveedores, Reportes, Ubicaciones, Reposición, Configuración); no dynamic visibility today. (`apps/frontend/src/components/Sidebar.tsx:55-138`).
- `ProtectedRoute.tsx` already exists and gates by authentication + system-status; S1 *modifies* it to optionally accept `requiredCapability`. (`apps/frontend/src/components/ProtectedRoute.tsx:1-31`).
- `SaleForm` issues `GET /api/configuration` directly to read `barcodeScannerEnabled`/`barcodeScannerTimeoutMs`/`allowOutOfStockSale`. Manual quantity uses `Number.parseInt(buffer, 10)` — today integers only. (`apps/frontend/src/features/sales/components/SaleForm.tsx:139-153, 332-345`).
- `setup-wizard.ts` writes a `.env` containing `DATABASE_HOST/PORT/NAME/USER/PASSWORD` + `JWT_SECRET` before backend configuration. (`apps/desktop/electron/setup-wizard.ts:67-83`).
- `migrations.ts` exports a single chronological array consumed by `dataSource` with `migrationsRun: true`. (`apps/backend/src/migrations.ts:19-33`).
- `migrations.consistency.spec.ts` fails the build if a migration file is not registered. (`apps/backend/src/migrations.consistency.spec.ts:45-62`).
- Existing DTOs in `apps/backend/src/modules/configuration/dto/` follow the NestJS `class-validator` + `@ApiProperty` pattern (e.g. `UpdateConfigurationDto`, `fiscal-configuration.dto.ts`); S1's new DTOs must follow the same pattern.
- No diagnostics module exists in the current baseline; S2 creates it with an intentionally unsupported scale response until S4 registers the simulator adapter.

### 1.3 Exact contracts / model decisions

**DB / entity**
- Extend `SystemConfiguration` (current table `system_configuration`) with:
  - `profileKey: varchar(64) NOT NULL DEFAULT 'legacy'` — one primary preset name.
  - `profileVersion: int NOT NULL DEFAULT 1` — schema version of the resolver rules.
  - `capabilitiesJson: jsonb NOT NULL DEFAULT '{}'` — explicit enabled/disabled overrides keyed by capability id. Mixed businesses are expressed as `profileKey + capabilitiesJson` overrides; never as a combined preset string.
  - `capabilitiesSchemaVersion: int NOT NULL DEFAULT 1` — for forward-compatibility assertions.
- No column deletes; only additive nullable columns with defaults. The existing sectorized-stock fields (`stockSectorizado`, `primarySaleLocationId`, `defaultReceiveLocationId`, `stockMinimoVenta`) are unchanged.

**Capability vocabulary (typed, in `apps/backend/src/modules/configuration/capabilities/keys.ts`)** — *single namespace*, frozen for the duration of the roadmap:
- `POLICY.manual_discount_reason` — manual discount requires reason + audit.
- `POLICY.price_override_reason` — price override requires reason + audit.
- `POLICY.whole_sale_only_cancellation` — legacy cancellation-only behavior (default `true` for `legacy`).
- `STRUCTURAL.decimal_quantities` — sale accepts fractional quantities (`true` for decimal profiles, `false` for `legacy`).
- `STRUCTURAL.weight_scale`, `STRUCTURAL.variants`, `STRUCTURAL.lot_expiry`, `STRUCTURAL.serial_warranty`, `STRUCTURAL.consignment`, `STRUCTURAL.wholesale_price_lists`, `STRUCTURAL.unit_pack`, `STRUCTURAL.sellable_pack`, `STRUCTURAL.bundle`.
- `TOOLING.catalog_import`, `TOOLING.product_labels`, `TOOLING.stocktake`, `TOOLING.inventory_audit`, `TOOLING.restore_safety`, `TOOLING.updater_recovery`, `TOOLING.peripheral_diagnostics`.
- `COMMERCIAL.quantity_breaks`, `COMMERCIAL.time_bound_promotion`, `COMMERCIAL.coupon`, `COMMERCIAL.loyalty`, `COMMERCIAL.store_credit`.
- `FISCALITY.credit_notes_a`, `FISCALITY.credit_notes_b`, `FISCALITY.credit_notes_c`.
- `APP_ROUTES.dashboard`, `APP_ROUTES.products`, `APP_ROUTES.customers`, `APP_ROUTES.suppliers`, `APP_ROUTES.purchases`, `APP_ROUTES.sales`, `APP_ROUTES.expenses`, `APP_ROUTES.incomes`, `APP_ROUTES.cash_register`, `APP_ROUTES.customer_accounts`, `APP_ROUTES.reports`, `APP_ROUTES.settings`, `APP_ROUTES.settings_fiscal`, `APP_ROUTES.settings_users`, `APP_ROUTES.settings_backup`, `APP_ROUTES.inventory_locations`, `APP_ROUTES.inventory_locations_activate`, `APP_ROUTES.inventory_replenishment`.

The resolver **only** validates:
1. Each key is in the known `CapabilityKey` set.
2. Each value is a boolean.
3. `profileKey` is a known preset name (or `legacy`).
4. `capabilitiesSchemaVersion` equals the current schema version.

No inter-capability dependency rules. No cycle rejection (because no rules exist).

**Presets (constants in `apps/backend/src/modules/configuration/capabilities/presets.ts`)**
- `legacy` → `POLICY.manual_discount_reason=false`, `POLICY.price_override_reason=false`, `POLICY.whole_sale_only_cancellation=true`, `STRUCTURAL.decimal_quantities=false`, every other `STRUCTURAL.*`/`TOOLING.*`/`COMMERCIAL.*`/`FISCALITY.*` *off*, every `APP_ROUTES.*` *on* (all 19 named protected paths reachable, including `settings_fiscal`, `inventory_locations`, `inventory_locations_activate`, `inventory_replenishment`).
- `unit-retail`, `fast-packaged`, `weight`, `apparel`, `lot-retail`, `electronics`, `wholesale`, `consignment` — each is a preset that enables exactly the capability keys listed in the roadmap T2 description. `unit-retail`/`fast-packaged`/`weight`/`lot-retail`/`wholesale` set `STRUCTURAL.decimal_quantities=true`.

**API contracts**
- `GET /api/configuration` (existing) — unchanged shape. A new *legacy response mapper* (`apps/backend/src/modules/configuration/dto/system-configuration-legacy-response.dto.ts`) is applied at the controller boundary. The mapper exposes **all** existing fields (including the sectorized-stock fields `stockSectorizado`, `primarySaleLocationId`, `defaultReceiveLocationId`, `stockMinimoVenta` and the existing scanner flags) and hides the four new columns and `capabilitiesJson`.
- `GET /api/configuration/capabilities` → `{ profileKey, profileVersion, capabilitiesSchemaVersion, capabilities: Record<string, boolean> }`. Stable keys, deterministic output, same shape for `legacy` and any preset.
- `PATCH /api/configuration/capabilities` body `{ capabilities?: Record<string, boolean>, profileKey?: string }` → returns the same shape. Validation rejects unknown keys, non-boolean values, unknown preset names, and `capabilitiesSchemaVersion` mismatches.
- `GET /api/configuration/manifest` aggregates `{ profileKey, profileVersion, capabilities, appRoutes: { enabled: string[], disabled: string[] } }` for the frontend.

**Frontend**
- New `useCapabilities()` hook in `apps/frontend/src/hooks/useCapabilities.ts` (single React Query against `/api/configuration/manifest`, `staleTime: 5 * 60 * 1000` matching `queryClient` in `App.tsx:38-45`).
- `ProtectedRoute.tsx` is **modified** to accept an optional `requiredCapability: string` prop; if missing for the active preset, redirects to `/dashboard` with a toast. Authentication and `useSystemStatus` are preserved unchanged.
- `Sidebar.tsx` filters `navItems` by `capabilities.appRoutes`; never adds, never mutates the 14 entries. The `Ubicaciones` entry maps to `APP_ROUTES.inventory_locations`. The `Reposición` entry maps to `APP_ROUTES.inventory_replenishment`. The activation route `inventory/locations/activate` is gated by `APP_ROUTES.inventory_locations_activate` and remains directly reachable when that capability is on (it is on for `legacy`).
- `SettingsPage` gains a "Perfil y capacidades" tab that calls `PATCH /api/configuration/capabilities`. No drag-and-drop; only known keys.
- Setup wizard atomic write: the wizard adds `NEXOPOS_PROFILE_KEY=${config.profileKey}` to the same `envContent` string it already writes; `ConfigurationService.onModuleInit()` reads `process.env.NEXOPOS_PROFILE_KEY` and uses it only when *creating* the singleton row (i.e. `count === 0`). For an existing install, `onModuleInit` never overrides the persisted `profileKey`. No `POST /api/configuration/capabilities` from the wizard.

### 1.4 Files to create / modify / test

**Create** — only pure helpers and DTOs; no service/controller abstraction duplication.
- `apps/backend/src/modules/configuration/capabilities/keys.ts` — typed capability keys + `CapabilityKey` union.
- `apps/backend/src/modules/configuration/capabilities/presets.ts` — `LEGACY_PRESET`, `WEIGHT_PRESET`, `APPAREL_PRESET`, etc. Pure constants.
- `apps/backend/src/modules/configuration/capabilities/resolve.ts` — `resolveCapabilities(profileKey, overrides): { ok: true, capabilities } | { ok: false, errors: string[] }`. No I/O. No inter-capability dependency rules. Only validates known keys + boolean values + known preset names + schema version.
- `apps/backend/src/modules/configuration/dto/system-configuration-legacy-response.dto.ts` — NestJS `class-validator` DTO applied by `ConfigurationController.getConfiguration()`. Includes every existing field including the sectorized-stock fields.
- `apps/backend/src/modules/configuration/dto/update-capabilities.dto.ts` — NestJS `class-validator` DTO: `profileKey` is `@IsString @IsIn(knownPresets) @IsOptional`; `capabilities` is `@IsObject @IsOptional`; `capabilitiesSchemaVersion` is `@IsInt @Min(1) @IsOptional`. The resolver performs per-entry boolean validation; the DTO does **not** use `@ValidateNested` on the raw `Record`.
- `apps/backend/src/modules/configuration/capabilities.spec.ts` — Jest unit tests for every preset, unknown key, non-boolean value, unknown preset, and override precedence (placed under `src/` to match the test glob; co-located with the helpers it exercises).

**Modify**
- `apps/backend/src/modules/configuration/configuration.service.ts` — add `getCapabilitiesManifest()`, `setProfile(profileKey)`, `setCapabilityOverrides(overrides)`, `getLegacyResponse()`. `onModuleInit()` reads `process.env.NEXOPOS_PROFILE_KEY` only when `count === 0`; for an existing install it leaves the row untouched. The existing methods keep their signatures. Basic quantity validation is unchanged: it always runs as a pure policy using `Product.unitOfMeasureId` and the UOM `precision`.
- `apps/backend/src/modules/configuration/configuration.controller.ts` — add `@Get('capabilities')`, `@Patch('capabilities')`, `@Get('manifest')`. The existing `getConfiguration()` now returns the legacy response mapper; the new mapper hides the four new columns.
- `apps/backend/src/modules/configuration/configuration.module.ts` — **no changes** unless a new provider/controller must be registered. The DTO is imported by the controller; it does not need module registration.
- `apps/frontend/src/hooks/useCapabilities.ts` — new file (single React Query hook).
- `apps/frontend/src/hooks/useCapabilities.spec.ts` — Vitest unit tests.
- `apps/frontend/src/components/ProtectedRoute.tsx` — *modified*, not created. Adds optional `requiredCapability` prop.
- `apps/frontend/src/components/ProtectedRoute.spec.tsx` — Vitest unit tests.
- `apps/frontend/src/components/Sidebar.tsx` — filter `navItems` (14 entries) by `capabilities.appRoutes`; map `Ubicaciones` to `APP_ROUTES.inventory_locations` and `Reposición` to `APP_ROUTES.inventory_replenishment`.
- `apps/frontend/src/components/Sidebar.spec.tsx` — Vitest unit tests. Must assert `navItems.length === 14`.
- `apps/frontend/src/pages/settings/SettingsPage.tsx` — add `<CapabilitiesTab />` tab; preserve all existing tabs.
- `apps/frontend/src/pages/settings/CapabilitiesTab.tsx` — read-only + override panel (no drag-and-drop).
- `apps/frontend/src/App.tsx` — the route count is asserted unchanged: 19 named protected paths + 1 protected `<Route index …>` redirect + 1 public `/login`. S1 may add the optional `requiredCapability` prop to specific routes only; it does not add or remove `<Route>` entries.
- `apps/frontend/src/App.spec.tsx` — Vitest test that asserts `App.tsx` exposes exactly 19 named protected paths plus the index redirect, that `inventory/replenishment` is reachable when `inventory_replenishment` is on, and that the activation route is reachable when `inventory_locations_activate` is on.
- `apps/desktop/electron/setup-wizard.ts` — extend the same `envContent` write with `NEXOPOS_PROFILE_KEY=${config.profileKey}`. No IPC handler, no `configureProfile` step, no separate `setup-wizard-steps.ts` file.

**Test (existing — no change needed beyond running them)**
- `apps/backend/src/modules/configuration/configuration.service.spec.ts`.
- `apps/backend/src/modules/configuration/configuration.controller.spec.ts`.
- `apps/backend/src/modules/configuration/fiscal-configuration.service.spec.ts`.
- `apps/backend/src/modules/configuration/fiscal-configuration.controller.spec.ts`.
- `apps/backend/test/integration/configuration.integration.spec.ts`.

**New tests**
- `apps/backend/src/modules/configuration/capabilities.spec.ts` — 8 presets + invalid keys + non-boolean values + unknown preset + override precedence.
- `apps/backend/test/integration/capabilities.integration.spec.ts` — Supertest integration for the three new endpoints; the legacy mapper is asserted to (a) hide the four new columns and (b) include the existing sectorized-stock fields.
- `apps/backend/test/integration/database-migration.integration.spec.ts` — clean DB and pre-feature snapshot both migrate to the `legacy` profile.

**Migration**
- One new file. Pattern: `<generated>-AddCapabilitiesColumns.ts` where `<generated>` is the timestamp produced by `npm run migration:generate` from `apps/backend`, **strictly greater than the latest entry currently registered in `apps/backend/src/migrations.ts` at execution time** (resolved by the developer, not hardcoded in this plan). The descriptive suffix `-AddCapabilitiesColumns` is the stable identifier; the timestamp is regenerated at apply time. Generated SQL (TypeORM will produce the same):
  ```sql
  ALTER TABLE system_configuration ADD COLUMN profile_key varchar(64) NOT NULL DEFAULT 'legacy';
  ALTER TABLE system_configuration ADD COLUMN profile_version int NOT NULL DEFAULT 1;
  ALTER TABLE system_configuration ADD COLUMN capabilities_json jsonb NOT NULL DEFAULT '{}'::jsonb;
  ALTER TABLE system_configuration ADD COLUMN capabilities_schema_version int NOT NULL DEFAULT 1;
  ```
- Register in `apps/backend/src/migrations.ts` *in chronological order* (never around existing timestamps) — add to the `import` block and `migrations` array.

### 1.5 Migration order
1. T1 (benchmark + regression specs) — no migration.
2. T2 (capability vocabulary) — no migration.
3. T3 (extend `SystemConfiguration`) — generate with `npm run migration:generate` from `apps/backend`; register in `migrations.ts`; run consistency spec.
4. T4 (manifest/legacy mapper) — no migration.
5. T5 (frontend + setup) — no migration.

### 1.6 TDD / QA commands and expected outcomes

```bash
# T1: regression characterization + benchmark
cd apps/backend && npm run test:unit -- --runTestsByPath src/modules/products/products.service.spec.ts
cd apps/backend && npm run test:unit -- --runTestsByPath src/modules/sales/sales.service.spec.ts
cd apps/backend && npm run test:unit -- --runTestsByPath src/modules/inventory/inventory.service.spec.ts
cd apps/frontend && npm test -- src/features/sales/components/SaleForm.spec.tsx
cd apps/frontend && npm test -- src/hooks/useBarcodeScanner.spec.ts
# Expect: all green; benchmark writes .omo/evidence/stage-1-retail-multirubro-phase-execution.bench.json
#         with p50/p95 scan→line, 20-line recalc, local submit.

# T2: vocabulary + preset tests
cd apps/backend && npm run test:unit -- --runTestsByPath src/modules/configuration/capabilities.spec.ts
# Expect: 8 presets + invalid keys + non-boolean values + unknown preset + override precedence deterministic;
#         no inter-capability dependency rules; resolver errors are typed and stable.

# T3: migration consistency
cd apps/backend && npm run test:unit -- --runTestsByPath src/migrations.consistency.spec.ts
cd apps/backend && npm run test:integration -- --runTestsByPath test/integration/database-migration.integration.spec.ts
# Expect: green; clean DB and pre-feature snapshot both resolve to `legacy`.

# T4: API contract
cd apps/backend && npm run test:integration -- --runTestsByPath test/integration/capabilities.integration.spec.ts
# Expect: 200 deterministic manifest; unknown key → 400 typed; non-boolean value → 400 typed;
#         unknown preset → 400 typed; schema version mismatch → 409 typed;
#         GET /api/configuration response shape unchanged (legacy mapper hides new columns);
#         existing locations hooks (`stockSectorizado`, `primarySaleLocationId`,
#         `defaultReceiveLocationId`, `stockMinimoVenta`) keep working.

# T5: frontend + setup
cd apps/frontend && npm test -- src/components/ProtectedRoute.spec.tsx src/components/Sidebar.spec.tsx src/hooks/useCapabilities.spec.ts src/App.spec.tsx
# Expect: legacy renders identical 14-item sidebar (including `Ubicaciones` and `Reposición`);
#         minimal preset hides only expected routes;
#         App.tsx exposes exactly 19 named protected paths + index redirect;
#         legacy reaches all 19 (including `inventory/locations`, `inventory/locations/activate`, and `inventory/replenishment`).
```

Evidence artifact: write `.omo/evidence/stage-1-retail-multirubro-phase-execution.json` summarizing the seven Jest runs and the benchmark numbers.

### 1.7 Rollback / compatibility strategy
- `profileKey` defaults to `'legacy'`; existing rows resolve to identical behavior. No business data change.
- `GET /api/configuration` and `PATCH /api/configuration` are unchanged shape *from the client's perspective* thanks to the legacy mapper (which includes all existing fields including the sectorized-stock fields). Frontend callers do not break.
- New endpoints are additive (`/capabilities`, `/manifest`). A down-level frontend can ignore them.
- **S1 metadata-column drop is conditional, not unconditional.** A forward corrective migration that drops the four new columns runs only after a precondition check proves every row is `profileKey = 'legacy'` AND `capabilitiesJson = '{}'::jsonb` AND `capabilitiesSchemaVersion = 1`; otherwise the migration aborts with a typed error and the columns are preserved. **Never** delete an already-applied migration file from `apps/backend/src/migrations/`; the corrective migration reverses it.
- Capability keys are frozen for the duration of the roadmap; do not rename without `profileVersion` bump.

### 1.8 Exit gate (must all pass before S2)
- Backend unit + integration suites green.
- Frontend Vitest green.
- `legacy` capability manifest equals `LEGACY_PRESET` byte-for-byte.
- `GET /api/configuration` response (legacy mapper) contains **all** existing fields including `stockSectorizado`/`primarySaleLocationId`/`defaultReceiveLocationId`/`stockMinimoVenta` and the original `barcodeScannerEnabled`/`barcodeScannerTimeoutMs`/`allowOutOfStockSale`/`sistemaHabilitado`. The four new columns do not appear.
- `App.tsx` still defines exactly 19 named protected paths + 1 protected index redirect + 1 public login; all 19 named paths reachable for `legacy` (asserted by `App.spec.tsx`). `inventory/locations`, `inventory/locations/activate`, and `inventory/replenishment` are all reachable.
- `Sidebar.tsx` still has exactly 14 `navItems`; all 14 rendered for `legacy` (asserted by `Sidebar.spec.tsx`); `Ubicaciones` and `Reposición` are both rendered.
- Direct URL navigation to a route disabled for the preset redirects to `/dashboard` with a toast; no partial render.
- `.env` write in setup wizard still happens first; `NEXOPOS_PROFILE_KEY` is part of the same atomic write; `ConfigurationService.onModuleInit()` consumes it only when `count === 0`.
- `.omo/evidence/stage-1-retail-multirubro-phase-execution.json` exists.
- User explicitly says "go to S2".

### 1.9 Dependencies
- Roadmap T1 → T2 → T3 → T4 → T5 (all complete inside S1).
- Blocks every later stage — S2..S5 cannot start without S1's capability manifest.

---

## Stage 2 — Shared structural foundation & tools (Roadmap T6..T11)

### 2.0 Phase-entry drift revalidation checkpoint
- Re-run S1's TDD commands; expect identical results.
- `git diff --stat` should show only S1 work (or none if S1 is already merged).
- `cd apps/backend && npm run test:unit -- --runTestsByPath src/migrations.consistency.spec.ts` — expect green.
- Re-run benchmark and append to `.omo/evidence/stage-2-retail-multirubro-phase-execution.drift.json` to confirm parity.

### 2.1 Entry gate
- S1 exit gate passed (manifest + drivers + tests).
- User has explicitly said "go to S2".

### 2.2 Verified current-state map
- `quantity` columns are `int` in `Product`, `StockMovement`, `SaleItem`, `PurchaseItem`. (`product.entity.ts:82`, `stock-movement.entity.ts:70`, `sale-item.entity.ts:44`, `purchase-item.entity.ts:40` — see also roadmap ref lines.)
- `SaleItem` snapshots basic fields only: `productCode`, `productDescription`, `unitPrice`, `discount`, `discountPercent`, `subtotal`. Missing `unitOfMeasureCode`, `uomConversionToBase`, `unitCost`, `taxSnapshot`, `capabilitySnapshot`.
- `SalesService.cancel()` emits `StockMovementSource.RETURN` to reverse stock. (`sales.service.ts:630-710, 995`.)
- `InvoiceService` authorizes with AFIP using `InvoiceType` enum (A/B/C). No credit-note support. (`services/invoice.service.ts:14-189`.)
- `BackupService` (existing) implements only `pg_dump -Fc` (custom-format) dumps via Docker or local PostgreSQL client. It does **not** yet implement `pg_restore`; S2 adds the missing lookup/execution helpers and the full restore safety flow. (`apps/backend/src/modules/backup/backup.service.ts:27, 126-290`.)
- No operator import, no product label subsystem, no stocktake session model (roadmap T8/T9/T10).
- `useBarcodeScanner` reads manual quantity with `Number.parseInt` and rejects decimals. (`SaleForm.tsx:335`.)
- `package.json` already includes `qrcode` (used by `pdf-generator.service.ts` for invoice QR). No `pdf-lib`, no `bwip-js`, no `xlsx`, no `csv-parse`, no `papaparse`. S2 reuses what is already installed.

### 2.3 Exact contracts / model decisions

**Decimal quantity + typed canonical-base UOM (T6)**
- New `apps/backend/src/modules/products/entities/unit-of-measure.entity.ts` (table `unit_of_measures`): `id uuid`, `code varchar(16) UNIQUE`, `name varchar(64)`, `symbol varchar(8)`, `category varchar(16)` (validated against a TS literal union, *not* a Postgres enum migration), `precision int NOT NULL DEFAULT 0`, `conversionToBase decimal(20,8) NOT NULL DEFAULT 1`.
- Canonical base units are defined in a small typed constant `apps/backend/src/modules/products/uom/canonical-bases.ts`:
  - `unit → un`
  - `weight → kg`
  - `volume → l`
  - `length → m`
  Product packs are **not** a UOM category; they are a separate concept in S3 (`product_packs`). The `pack` UOM seed from earlier plans is removed; `pack` does not appear in `category`.
- `g/ml` conversions normalize to the category canonical base: `g → kg` (`conversionToBase = 0.001`), `ml → l` (`conversionToBase = 0.001`). The pure converter `apps/backend/src/modules/products/uom/converter.ts` consumes `canonical-bases.ts` and exposes `convertToBase(quantity, fromUom): { ok: true, baseQuantity, precision } | { ok: false, error }`.
- `Product` (additive) gains `unitOfMeasureId uuid NULL` (FK to `unit_of_measures`) and `quantityPrecision int NOT NULL DEFAULT 0`. There is no separate `baseUnitId` on `Product` — `conversionToBase` and precision live entirely on the UOM row.
- `SaleItem`, `PurchaseItem`, `StockMovement` change `quantity` from `int` to `decimal(20, 3)` (`numeric(20,3)`). Legacy rows round-trip exactly because all values are integers. Decimalization is **forward-only**: a future rollback migration must `SELECT EXISTS(SELECT 1 FROM sale_items WHERE quantity != floor(quantity))` (and the same for `purchase_items`, `stock_movements`) and `RAISE EXCEPTION` if any fractional row exists. The down migration never deletes data; it aborts.
- **Basic quantity validation always runs as a pure policy using `Product.unitOfMeasureId` and the UOM `precision`**. The capability `STRUCTURAL.decimal_quantities` only gates the *parser* used by `SaleForm`:
  - `STRUCTURAL.decimal_quantities === false` (legacy) → `SaleForm` uses `Number.parseInt`; `SalesService` rejects fractional input.
  - `STRUCTURAL.decimal_quantities === true` (decimal profiles) → `SaleForm` uses `Number.parseFloat`; the converter enforces UOM precision.
  The basic validation path **never** calls `assertCapabilityEnabled`; the capability only switches the parser.

**Line snapshotting (T7)**
- `SaleItem`/`PurchaseItem` gain additive columns: `unitOfMeasureCode varchar(16)`, `uomConversionToBase decimal(20,8)`, `unitCost decimal(20,4)`, `taxSnapshot jsonb`, `capabilitySnapshot jsonb`. All nullable; existing rows get `null` and are treated as legacy.
- `SalesService.create` and `PurchasesService.create` snapshot the *quote* before persisting, then run the same totals math on the persisted snapshot. Reports and returns consume the snapshot; never re-derive from current product.
- New policy helper `apps/backend/src/modules/sales/policies/totals.ts` consolidates `subtotal/tax/total` math. `SalesService` and `InvoiceService` both call it. `InvoiceService` reads `taxSnapshot` from `SaleItem` when computing IVAs.

**CSV-only catalog import — explicit dialect + state machine (T8)**
- New `apps/backend/src/modules/products/import/` folder: `import.service.ts`, `import.controller.ts`, `import-preview.dto.ts`, `errors.ts`, `parser-csv.ts`, `parser-csv.spec.ts`. CSV is parsed by a small hand-written state machine (no `csv-parse`, no `papaparse`, no XLSX).
- **Supported dialect (exact):**
  - File encoding: UTF-8 (no BOM requirement; BOM bytes at the start are tolerated and stripped).
  - Header row: first non-empty row.
  - Separator: comma (`,`).
  - Line terminators: `CRLF` (`\r\n`) and `LF` (`\n`).
  - Quoted fields: double-quote wrapper. Quoted fields may contain commas.
  - Escaped double quotes: `""` inside a quoted field represents a single literal `"`.
  - **Embedded newlines inside a quoted field are explicitly rejected** with a typed row/file error (`import.errors.ts: EmbeddedNewlineInQuotedField`). The parser does not split lines inside quotes; if an opening quote is followed by a `\n` or `\r\n` before the closing quote, the parser raises and the file is rejected.
- Stable-key strategy: explicit `barcode` if present, else `sku`, else name+price. Duplicate strategy: `skip | overwrite | duplicate` enum, surfaced in the preview payload.
- `POST /api/products/import/preview` returns `{ rows: ParsedRow[], duplicates: DuplicateRef[], errors: RowError[] }`. No DB writes.
- `POST /api/products/import/commit` body `{ previewId, duplicates: 'skip'|'overwrite'|'duplicate' }` — runs in `dataSource.transaction()`; on failure rolls back atomically. Reuses `ProductsService.create` for each row.
- Frontend: `apps/frontend/src/features/products/components/ImportDialog.tsx` (file picker → preview table → commit button). Reuses existing `ProductsPage` list and `useBarcodeScanner` patterns.
- **XLSX is explicitly deferred** until an external dependency is approved by the user; it is out of scope for S2.

**Stocktake (T9)**
- New entity `apps/backend/src/modules/inventory/entities/stocktake-session.entity.ts` (table `stocktake_sessions`) and `stocktake-line.entity.ts`. Session: `id`, `name`, `status varchar(16)` (validated against `'open'|'approved'|'cancelled'` in code), `startedAt`, `approvedAt`, `approvedById`. Line: `sessionId`, `productId`, `expectedQuantity decimal(20,3)`, `countedQuantity decimal(20,3)`, `countedAt`, `countedById`, `reasonCode varchar(32) NULL`.
- **Concurrency model (exact):** `expectedQuantity` is the snapshot of `Product.stock` at `start`. At approval, the expected is recomputed as
  ```
  adjustedExpected = snapshotQuantity
                  + SUM(stock_movements.quantity) WHERE productId = line.productId
                                              AND source IN ('PURCHASE','INITIAL_LOAD','TRANSFER')
                                              AND createdAt >= session.startedAt
                  - SUM(stock_movements.quantity) WHERE productId = line.productId
                                              AND source = 'SALE'
                                              AND createdAt >= session.startedAt
  ```
  variance = `counted - adjustedExpected`. The approval produces exactly one `ADJUSTMENT` stock movement per changed line equal to the variance. Idempotent re-approval finds no further variance.
- New `audit_action` strings `STOCKTAKE_START`, `STOCKTAKE_COUNT`, `STOCKTAKE_APPROVE`, `STOCKTAKE_CANCEL`. Reuse existing `audit.service.ts`. If `audit_log.action` is a Postgres enum, S2 extends the enum via a TypeORM `ALTER TYPE` migration; if it is `varchar`, no enum change is required.

**QR + textual SKU/barcode + price PDF labels (T10)**
- New `apps/backend/src/modules/products/labels/labels.service.ts` and `LabelsController`. PDF rendered by **the existing** `pdf-generator.service.ts` using the already-installed `qrcode` dependency. **No `pdf-lib`, no `bwip-js`, no fake `[barcode: text]` placeholder.**
- Template names (exact, coherent):
  - `qr_text_price` (default) — QR + textual SKU/barcode + price.
  - `qr_text` — QR + textual SKU/barcode (no price line).
  - `qr_only` — QR only.
  No "text-only" or "fallback" naming. The QR payload encodes the barcode (or SKU), so the label is machine-readable through any QR scanner.
- 1D barcode rasterization is **deferred** — Stage 2 does not produce 1D rasters because no generator is installed. QR scanner compatibility is part of `DiagnosticsService.scale.status()` (a barcode scanner is a scanner, not a scale) and the existing `peripheral_diagnostics` block in S1; the printer must report QR capability before `labels.queue` will print.
- `POST /api/products/labels/preview` returns the PDF buffer (controller `Content-Type: application/pdf`).
- `POST /api/products/labels/queue` enqueues `{ products: uuid[], template }`; the queue is a local `Map<id, Job>` in the service (no Redis, no worker). `GET /api/products/labels/queue/:id` returns status.

**Restore safety — full PostgreSQL `pg_dump -Fc` / `pg_restore` flow (T11)**
- Ground truth: the existing `BackupService` only creates custom-format dumps with `pg_dump -Fc` (`apps/backend/src/modules/backup/backup.service.ts:126-290`). It does **not** yet implement `pg_restore`. S2 adds `pg_restore` lookup/execution helpers on top of it.
- `BackupService` (extended) gains:
  1. `pg_restore` lookup: `findPgRestoreExecutable()` mirrors the existing `findPgDumpExecutable()` pattern — search `C:\Program Files\PostgreSQL\<version>\bin\pg_restore.exe` (and other typical paths) when Docker is unavailable. Returns the local executable path.
  2. `pg_restore` execution helpers:
     - `listBackupContents(backupId)` — runs `pg_restore --list <backup_file>` (or `docker exec … pg_restore --list`) and returns the parsed TOC for preflight.
     - `createTempDatabaseName()` — generates `<prod_db>_restore_<timestamp>` for the temporary PostgreSQL database.
     - `createTempDatabase(tempName)` — opens an admin connection to `postgres` (the maintenance DB) and runs `CREATE DATABASE "<tempName>"`. Never relies on `--create` archive semantics.
     - `pgRestoreToDatabase(backupFile, targetDbName)` — runs `pg_restore --dbname=<targetDbName>` against the temporary DB or production DB.
     - `dropTempDatabase(tempName)` — opens an admin connection to `postgres` and runs `DROP DATABASE IF EXISTS "<tempName>"` (only after validation or rollback).
  3. `preflight(backupId)` — verifies backup integrity using `listBackupContents` (no DB writes).
  4. `createSafetyBackup()` — calls `BackupService.create()` to produce a safety backup at the start of any restore. The safety backup is held in a managed path until the restore is either completed or rolled back.
  5. `restoreIntoTemporaryDatabase(backupId)` — generates the temporary PostgreSQL database name, runs `createTempDatabase`, then `pgRestoreToDatabase(backupFile, tempName)` (using `pg_restore --dbname=<tempName>`, never `--create`). The production DB is never written during this step.
  6. `validateRestoredDatabase(tempName)` — runs integrity checks against the temporary DB: schema correctness (TypeORM metadata query), presence of every applied migration (`SELECT name FROM migrations WHERE name IN (...)`), and critical row-count sanity vs. the pre-restore snapshot. Returns a typed report.
  7. `swapOrTransactionalApply(tempName)` — performs `pg_restore --clean --if-exists --single-transaction --dbname=<prod_db>` against the production database. The `--single-transaction` flag wraps the restore in a single transaction so any failure aborts atomically.
  8. `rollbackToSafetyBackup()` — restores the safety backup into the production DB with `pg_restore --clean --if-exists --single-transaction --dbname=<prod_db>` if the swap fails or the operator cancels. Drops the temporary DB after completion.
- `GET /api/backup/preflight/:id`, `POST /api/backup/restore` (body `{ backupId, mode: 'swap'|'transactional' }`), `POST /api/backup/rollback`, `GET /api/backup/safety-backup` expose these flows.
- **Desktop production-only maintenance orchestration** lives in `apps/desktop/electron/main.ts` (and uses preload + IPC if needed): when the packaged user invokes "Restore from backup", the orchestrator stops the packaged backend, runs `pg_restore --clean --if-exists --single-transaction` against production, then restarts the packaged backend and health-checks `/api/health`. On failure the orchestrator runs the safety-backup restore the same way. During development and tests, only disposable PostgreSQL DB processes are used — Nest/Vite are **never auto-started**. There is no SQLite branch; the system is PostgreSQL-only.
- A new `apps/backend/src/modules/support/` module: `bundle.service.ts` redacts secrets (CUIT, JWT, certificate body, AFIP token) and returns a JSON dictionary; `GET /api/support/bundle` is admin-only.
- Peripheral diagnostics: `GET /api/diagnostics/scanner`, `GET /api/diagnostics/printer`, `GET /api/diagnostics/drawer`, `GET /api/diagnostics/scale` return `{ supported: boolean, model: string|null, lastError: string|null }`. The scale endpoint is intentionally `{ supported: false, model: null }` for S2; S4 (T17) fills it with a bounded simulator adapter. The printer endpoint returns a `qrSupported: boolean` field so the label queue can verify QR compatibility before printing.
- `desktop/main.ts` integrates an "updater pending" badge via IPC `app:getUpdaterStatus` polling a local file written by the auto-updater. No auto-start of dev servers.

### 2.4 Files to create / modify / test

**Create**
- `apps/backend/src/modules/products/entities/unit-of-measure.entity.ts`.
- `apps/backend/src/modules/products/uom/{canonical-bases.ts, converter.ts, converter.spec.ts}`.
- `apps/backend/src/modules/products/policies/quantity.ts`, `apps/backend/src/modules/products/policies/measure.ts`.
- `apps/backend/src/modules/products/import/{import.service.ts, import.controller.ts, import-preview.dto.ts, errors.ts, parser-csv.ts, parser-csv.spec.ts, import.service.spec.ts}`.
- `apps/backend/src/modules/inventory/entities/stocktake-session.entity.ts`, `stocktake-line.entity.ts`, `stocktake.service.ts`, `stocktake.controller.ts`, `*.spec.ts`.
- `apps/backend/src/modules/products/labels/{labels.service.ts, labels.controller.ts, *.spec.ts}`.
- `apps/backend/src/modules/support/{bundle.service.ts, bundle.controller.ts, *.spec.ts}`.
- `apps/backend/src/modules/diagnostics/{diagnostics.service.ts, diagnostics.controller.ts, *.spec.ts}`.
- `apps/backend/src/modules/sales/policies/totals.ts` (and spec).
- `apps/backend/src/modules/products/import/preview-cache.ts` (in-memory store).
- `apps/frontend/src/features/products/components/ImportDialog.tsx`, `apps/frontend/src/features/products/import/{useImportPreview.ts, useImportCommit.ts, *.spec.ts}`.
- `apps/frontend/src/features/inventory/components/StocktakeDialog.tsx`, `apps/frontend/src/features/inventory/hooks/useStocktake.ts`.
- `apps/frontend/src/features/products/labels/LabelsDialog.tsx`.

**Modify**
- `apps/backend/src/modules/products/entities/product.entity.ts` — add `unitOfMeasureId`, `quantityPrecision`. No `baseUnitId` (UOM owns conversion).
- `apps/backend/src/modules/purchases/entities/purchase-item.entity.ts` — change `quantity` to `decimal(20,3)`, add `unitOfMeasureCode`, `uomConversionToBase`, `unitCost`, `taxSnapshot jsonb`, `capabilitySnapshot jsonb`.
- `apps/backend/src/modules/sales/entities/sale-item.entity.ts` — same additions.
- `apps/backend/src/modules/inventory/entities/stock-movement.entity.ts` — change `quantity` to `decimal(20,3)`.
- `apps/backend/src/modules/sales/sales.service.ts` — replace `validateProductsStock` body with a call to the UOM/precision pure policy helper; replace `calculateTotals` body with a call to `policies/totals.ts`; snapshot before persisting. **`cancel()` is left exactly as it is today** (Stage 3's `SaleReturnService` owns partial returns).
- `apps/backend/src/modules/purchases/purchases.service.ts` — same pattern.
- `apps/backend/src/modules/sales/services/invoice.service.ts` — read `taxSnapshot` from `SaleItem`; never derive IVAs from `product.price` once snapshots exist.
- `apps/backend/src/modules/configuration/configuration.service.ts` — `assertCapabilityEnabled(key)` is already added in S1; S2 adds no new capability check on the basic validation path.
- `apps/backend/src/modules/inventory/inventory.service.ts` — gate `createMovement` behind `TOOLING.stocktake` only for variance movements; otherwise unchanged.
- `apps/backend/src/modules/backup/backup.service.ts` — add `findPgRestoreExecutable`, `listBackupContents`, `createTempDatabaseName`, `createTempDatabase`, `pgRestoreToDatabase`, `dropTempDatabase`, `preflight`, `createSafetyBackup`, `restoreIntoTemporaryDatabase`, `validateRestoredDatabase`, `swapOrTransactionalApply`, `rollbackToSafetyBackup`. All use the existing `pg_dump -Fc` / `pg_restore` machinery.
- `apps/backend/src/modules/backup/backup.controller.ts` — add the matching routes.
- `apps/frontend/src/pages/settings/BackupPage.tsx` — restore panel reads `preflight`/`validateIntegrity`/`rollbackToSafetyBackup` and shows a rollback button.
- `apps/frontend/src/components/Sidebar.tsx` — `settings_backup` is filtered only when its capability is off (always on for `legacy`).
- `apps/frontend/src/features/sales/components/SaleForm.tsx` — quantity input switches between `Number.parseInt` and `Number.parseFloat` based on `capabilities.STRUCTURAL.decimal_quantities`. The basic validation policy runs unconditionally.
- `apps/frontend/src/components/BarcodeScannerTest.tsx` — read peripheral diagnostics.
- `apps/desktop/electron/main.ts` — add `app:getUpdaterStatus` IPC and the production-only restore orchestrator (stop packaged backend → `pg_restore --single-transaction` → restart → health-check); never auto-start dev servers.

**Entity registry**
- New entities must be registered in `apps/backend/src/entities.ts` and in the owning module's `TypeOrmModule.forFeature([...])`. The relevant additions are: `UnitOfMeasure`, `StocktakeSession`, `StocktakeLine`.

**Migrations** — filenames use the descriptive suffix; the leading timestamp is generated by `npm run migration:generate` from `apps/backend` and must be **strictly greater than the latest entry currently registered in `apps/backend/src/migrations.ts` at execution time** (no fixed numbers).
- `<generated>-AddUnitOfMeasures.ts` — create `unit_of_measures` table; seed `un`, `kg`, `g`, `l`, `ml`, `m`. No `pack` row. `g` and `ml` rows carry `conversionToBase` for their category canonical base.
- `<generated>-AddProductUomColumns.ts` — additive columns on `products`.
- `<generated>-DecimalizeQuantityColumns.ts` — `ALTER TABLE sale_items ALTER COLUMN quantity TYPE numeric(20,3);` (same for `purchase_items`, `stock_movements`). The down method aborts if any row has a fractional value.
- `<generated>-AddLineSnapshotColumns.ts` — additive columns on `sale_items` and `purchase_items`.
- `<generated>-AddStocktakeFoundations.ts` — create `stocktake_sessions` and `stocktake_lines`.
- `<generated>-AddAuditActionsForStocktake.ts` — extend `audit_log.action` if the column is a Postgres enum.
- All six must be imported and added to the `migrations` array in `apps/backend/src/migrations.ts` in chronological order.

**Test updates**
- `sales.service.spec.ts`: add decimals round-trip 0.125 fixture; add legacy-only 1.5 rejection.
- `purchases.service.spec.ts`: same.
- `inventory.service.spec.ts`: same.
- `products.service.spec.ts`: UOM/precision validation.
- `SaleForm.spec.tsx`: parser switches by capability flag.
- Add `policies/totals.spec.ts`, `policies/quantity.spec.ts`, `parser-csv.spec.ts`, `import.service.spec.ts`, `stocktake.service.spec.ts`, `labels.service.spec.ts`, `bundle.service.spec.ts`, `diagnostics.service.spec.ts`.
- `restore-safety.integration.spec.ts`: full path against a real local PostgreSQL — preflight (`pg_restore --list` via `listBackupContents`), safety backup, `CREATE DATABASE <temp>` via admin connection, `pg_restore --dbname=<temp>` restore, validation (schema, migrations table, critical row counts), `pg_restore --clean --if-exists --single-transaction` swap against a disposable production DB, happy rollback, plus one failure path that triggers `rollbackToSafetyBackup`. Disposable DB processes only; no dev-server auto-start. The test also asserts that `findPgRestoreExecutable()` finds a usable binary in `PATH` or in the local PostgreSQL install path.

### 2.5 Migration order
1. Unit of measures (T6).
2. Product UOM columns (T6).
3. Decimalize quantity columns (T6).
4. Line snapshot columns (T7) — must come before any sales/purchases code that reads the new columns.
5. Stocktake foundations (T9).
6. Audit action extension (T9) — only if the audit action column is a Postgres enum.

### 2.6 TDD / QA commands and expected outcomes

```bash
# Migration
cd apps/backend && npm run test:unit -- --runTestsByPath src/migrations.consistency.spec.ts

# Decimals + UOM
cd apps/backend && npm run test:unit -- --runTestsByPath src/modules/sales/sales.service.spec.ts
cd apps/backend && npm run test:unit -- --runTestsByPath src/modules/purchases/purchases.service.spec.ts
cd apps/backend && npm run test:unit -- --runTestsByPath src/modules/inventory/inventory.service.spec.ts
cd apps/backend && npm run test:unit -- --runTestsByPath src/modules/products/uom/converter.spec.ts
# Expect: 0.125 round-trips; 1.5 stock rejected for unit-only product; g→kg and ml→l canonical conversion exact.

# Snapshots
cd apps/backend && npm run test:integration -- --runTestsByPath test/integration/sales-line-snapshot.integration.spec.ts
# Expect: editing product/uom/price after the transaction does not change the historic subtotal.

# Import (CSV state-machine)
cd apps/backend && npm run test:unit -- --runTestsByPath src/modules/products/import/parser-csv.spec.ts
cd apps/backend && npm run test:unit -- --runTestsByPath src/modules/products/import/import.service.spec.ts
# Expect: UTF-8 header + comma + CRLF/LF + quoted commas + escaped quotes accepted; embedded newline in quoted field rejected with `EmbeddedNewlineInQuotedField`; scientific-notation barcode normalized; partial invalid file mutates 0 rows; transaction-failure rollback works; XLSX file rejected with a typed error.

# Stocktake
cd apps/backend && npm run test:integration -- --runTestsByPath test/integration/stocktake.integration.spec.ts
# Expect: start with stock=10, sell 2, count 8 ⇒ variance = 0 ⇒ no adjustment movement; concurrent sale accounted for; idempotent re-approval.

# Labels (QR + textual)
cd apps/frontend && npm test -- src/features/products/labels/LabelsDialog.spec.tsx
cd apps/backend && npm run test:unit -- --runTestsByPath src/modules/products/labels/labels.service.spec.ts
# Expect: PDF parses; template names are exactly `qr_text_price`/`qr_text`/`qr_only`; the printable payload contains the QR (via `qrcode`) plus textual SKU/barcode/price for `qr_text_price`; no 1D raster, no fake placeholder, no text-only/fallback naming.

# Restore safety (real PostgreSQL)
cd apps/backend && npm run test:integration -- --runTestsByPath test/integration/restore-safety.integration.spec.ts
cd apps/backend && npm run test:unit -- --runTestsByPath src/modules/support/bundle.service.spec.ts
# Expect: `pg_restore --list` preflight green; corrupt backup fails preflight; safety backup + `CREATE DATABASE <temp>` + `pg_restore --dbname=<temp>` + validation + `pg_restore --clean --if-exists --single-transaction` swap all green; failure triggers `rollbackToSafetyBackup`; bundle redacts secrets; diagnostics report QR support before labels print; scale status is `{ supported: false, model: null, lastError: null }`.
```

Evidence artifact: `.omo/evidence/stage-2-retail-multirubro-phase-execution.json` aggregating the seven plus the benchmark regression check.

### 2.7 Rollback / compatibility strategy
- Every added column is nullable or has a default; legacy rows continue to validate. The decimalization migration is forward-only — its down method aborts if any fractional row exists. Production rollback never deletes data.
- The `int → decimal(20,3)` widening is safe at the SQL level; TypeORM transformers already use `Number.parseFloat` (e.g. `sale-item.entity.ts:54-58`).
- `SalesService.validateProductsStock` is *replaced* body but keeps the same signature; callers do not break.
- Import and stocktake are additive; existing sale/purchase flows do not call them.
- Label queue is in-memory; no persisted state.
- Restore safety path is itself the rollback mechanism; S2 introduces no new backup format.

### 2.8 Exit gate
- All migration consistency + unit + integration suites green.
- Legacy `STRUCTURAL.decimal_quantities` is `false`; existing `SaleForm` integer path still works.
- Snapshot columns are read by `InvoiceService` in test fixtures.
- `.env` still writes first in setup wizard; `NEXOPOS_PROFILE_KEY` is part of the same atomic write; capabilities still load.
- Restore safety's full PostgreSQL `pg_dump -Fc` / `pg_restore` path proven in `restore-safety.integration.spec.ts`.
- `.omo/evidence/stage-2-retail-multirubro-phase-execution.json` exists.
- User explicitly says "go to S3".

### 2.9 Dependencies
- S1 capability manifest must be live.
- Blocks S3, S4, S5.

---

## Stage 3 — Returns & retail primitives (Roadmap T12..T15)

### 3.0 Phase-entry drift revalidation
- Re-run S2's regression tests; expect unchanged.
- Re-run `migrations.consistency.spec.ts`; expect green.
- Generate `.omo/evidence/stage-3-retail-multirubro-phase-execution.drift.json`.

### 3.1 Entry gate
- S2 snapshot columns live; policy helpers consumed by `SalesService` and `InvoiceService`.
- User has explicitly said "go to S3".

### 3.2 Verified current-state map
- `SalesService.cancel()` (T-roadmap ref `sales.service.ts:630-710`) returns stock via `RETURN` stock movement; no partial return document.
- `Invoice` entity has `invoiceType: InvoiceType` enum (`FACTURA_A`, `FACTURA_B`, `FACTURA_C`). No `NOTA_CREDITO_A/B/C`. The `invoice.saleId` link is unique today; nothing else shares that link.
- `InvoiceService.generateInvoice` rejects `CANCELLED` sales; it does not handle a partial return.
- `pdf-generator.service.ts` renders PDFs for both invoices and any persisted document that has a typed render-data builder; S3 reuses it for the sale-return receipt.
- SaleForm's payment/payment-method primitives live in `apps/frontend/src/features/sales/components/SalePayments.tsx` and `SaleTotals.tsx`.
- `manualDiscount` is a single per-line and per-sale field; no promotion/loyalty primitives yet.

### 3.3 Exact contracts / model decisions

**Returns (T12)**
- New entities under `apps/backend/src/modules/sales/entities/`:
  - `sale-return.entity.ts` (`sale_returns`): `id`, `originalSaleId`, `customerId`, `cashRegisterSessionId NULL`, `totalRefund decimal(20,2)`, `totalExchangeAmount decimal(20,2)`, `status varchar(16)` (validated against `'draft'|'committed'|'cancelled'` in code), `createdAt`, `committedAt`. **No `disposition` column on the header.**
  - `sale-return-item.entity.ts` (`sale_return_items`): `id`, `returnId`, `originalSaleItemId`, `quantityReturned decimal(20,3)`, `unitRefundAmount decimal(20,2)`, **`disposition varchar(16)`** (validated against `'restock'|'quarantine'|'scrap'|'supplier'` in code — disposition lives on the item because one return can restock one item and quarantine another), `taxSnapshot jsonb`, `capabilitySnapshot jsonb`.
- **`SaleReturnService`** (new, owned by itself) provides `create`, `preview`, `commit`, `cancel`, `findByOriginalSale`, `renderReceiptPdf`. It mutates `Product.stock` (or `ProductLocationStock` in sectorized mode), inserts `SaleReturn` + `SaleReturnItem`, emits one `RETURN` stock movement per item with that item's disposition, and reverses payment allocation + cash-register ledger atomically. **`SalesService.cancel()` stays untouched.**
- **`SaleReturnController`** (new) lives under `@Controller('sales')` and owns the return routes (`/sales/:id/returns`, `/sales/returns/preview`, `/sales/returns/:id/commit`, `/sales/returns/:id/cancel`, `/sales/returns/:id/receipt.pdf`). It delegates to `SaleReturnService`; it contains no business logic. **The existing `SalesController` is unchanged.**
- **The `SaleReturn` is itself the persisted document for non-fiscal returns.** The receipt PDF is rendered by `SaleReturnService.renderReceiptPdf()` reusing the existing `pdf-generator.service.ts` (same render-data-builder pattern as invoices). No separate `RETURN_RECEIPT` entity/document.
- Exchange = `saleReturn` + new `sale` reusing the snapshot math from S2.
- `GET /api/sales/:id/returns` returns the list with net-sold totals.

**Credit notes — separate table (T13)**
- New entity `apps/backend/src/modules/sales/entities/credit-note.entity.ts` (`credit_notes`): `id`, `saleReturnId uuid NOT NULL UNIQUE` (FK to `sale_returns.id`, one credit note per return), `originalInvoiceId uuid NOT NULL` (FK to `invoices.id`; supports multiple partial returns against the same invoice because the `UNIQUE` lives on `saleReturnId`, not on `originalInvoiceId`), `afipDocumentTypeCode int NOT NULL` (numeric AFIP code, e.g. `3` for NCA / `8` for NCB / `13` for NCC; **not** a Postgres enum migration), `afipAssociatedDocumentTypeCode int NULL`, `afipAssociatedInvoiceNumber bigint NULL`, `afipAssociatedPointOfSale int NULL`, `receiverCuit varchar(13) NOT NULL`, `cae varchar(20) NULL`, `caeExpirationDate date NULL`, `invoiceNumber bigint NULL`, `pointOfSale int NULL`, `status varchar(16)` (validated against `'PENDING'|'AUTHORIZED'|'REJECTED'|'ERROR'` in code), `attemptId uuid NULL`, `errorMessage text NULL`, **`payloadSnapshot jsonb NOT NULL` (the latest payload sent to AFIP)**. The row carries only the latest attempt state; earlier attempts are recorded through the existing `AuditLog` (entity type `'credit_note'`, action `'ATTEMPT'`).
- `CreditNoteService` (new) builds the AFIP payload from `saleReturn` + `originalInvoice`, calls `AfipService`, and on each attempt: writes/updates the `credit_notes` row (status, attemptId, error, payloadSnapshot) AND writes an `AuditLog` row. Failures stay retryable without duplicate notes thanks to `(saleReturnId UNIQUE, attemptId)`. **No changes** to `Invoice`, `InvoiceType`, `InvoiceService.generateInvoice`, or `invoices.saleId` uniqueness.
- The presence of an existing authorized `Invoice` toggles fiscal-vs-receipt behavior inside `CreditNoteService` (fiscal return → `CreditNoteService`; non-fiscal return → `SaleReturn` only).
- AFIP timing rules and reason-code catalogues are **not** asserted in this plan; the test fixtures verify only that the numeric `afipDocumentTypeCode`, `afipAssociatedDocumentTypeCode`, `afipAssociatedInvoiceNumber` and `receiverCuit` are sent in the documented payload and match the original invoice. Any claim about 30-day windows or legal reason-code catalogues is out of scope until verified against an external source.

**UOM / packs / bundles (T14)**
- Three explicit semantics, all policy-driven:
  - **Alternate UOM**: each `unit_of_measures` row already carries `conversionToBase` and `precision`. `SalesService.create` resolves `requestedUnits → baseUnits` via the pure converter from S2 (`apps/backend/src/modules/products/uom/converter.ts`) and decrements base stock.
  - **Sellable pack**: new entity `product_packs` (`id`, `productId`, `packBarcode UNIQUE`, `packPrice decimal(20,2)`, `unitsPerPack decimal(20,3)`). `SalesService` validates `packBarcode`, decrements `unitsPerPack` base units. **Packs are not a UOM category**; they are a separate concept on top of `Product`.
  - **Bundle**: new entity `product_bundles` (`id`, `bundleProductId`, `componentProductId`, `componentQuantity decimal(20,3)`). `SalesService.create` decrements every component, refuses if any component is out of stock (subject to `allowOutOfStockSale`).
- Returns reverse the same semantics. The snapshot math handles all three. Disposition is per-item.

**Promotion primitives — typed pure models, partial persistence (T15)**
- New folder `apps/backend/src/modules/sales/promotions/` with typed primitives only:
  - `manual-discount.policy.ts` — requires `POLICY.manual_discount_reason`; **persists the reason via the existing `AuditLog`**. This is the only S3 primitive that touches persistence.
  - `price-override.policy.ts` — same as above; **persists the reason via the existing `AuditLog`**.
  - `quantity-break.model.ts` — **typed pure model that accepts a typed list as input** (`type QuantityBreakEntry = { productId: string; minQuantity: number; unitPrice: number }`); exports `resolveQuantityBreak(cart, list): ApplyResult`. It does **not** reference the future S4 `quantity_break_prices` table; S5 later sources `list` from S4.
  - `coupon.model.ts` — typed pure model: `(code, cart) → { ok, redemption }`. No enforcement in S3.
  - `loyalty.model.ts` — typed pure model: `(accountId, redemptionAmount) → { ok, movement }`. No enforcement in S3.
  - `store-credit.model.ts` — typed pure model: `(accountId, amount) → { ok, movement }`. No enforcement in S3.
- The S3 primitives are *typed pure models/policies*; they are not "persistence-only". Enforcement and additional persistence for the non-AuditLog primitives live in S5. The two policy primitives that do persist (`manual-discount`, `price-override`) reuse `AuditLog` directly — no new tables, no new migrations in S3.

### 3.4 Files to create / modify / test

**Create**
- `apps/backend/src/modules/sales/entities/{sale-return.entity.ts, sale-return-item.entity.ts, credit-note.entity.ts}`.
- `apps/backend/src/modules/sales/dto/{create-return.dto.ts, return-preview.dto.ts}`.
- `apps/backend/src/modules/sales/sale-return.service.ts`, `apps/backend/src/modules/sales/sale-return.service.spec.ts`.
- `apps/backend/src/modules/sales/sale-return.controller.ts` (new, `@Controller('sales')`), `apps/backend/src/modules/sales/sale-return.controller.spec.ts` (delegation only; no logic).
- `apps/backend/src/modules/sales/services/credit-note.service.ts`, `credit-note.service.spec.ts`.
- `apps/backend/src/modules/products/entities/{product-pack.entity.ts, product-bundle.entity.ts}`.
- `apps/backend/src/modules/products/packs.service.ts`, `bundles.service.ts`, `*.spec.ts`.
- `apps/backend/src/modules/sales/promotions/{manual-discount.policy.ts, price-override.policy.ts, quantity-break.model.ts, coupon.model.ts, loyalty.model.ts, store-credit.model.ts, primitives.spec.ts}`.
- `apps/frontend/src/features/sales/components/ReturnDialog.tsx`, `return-preview.ts`, `*.spec.tsx`.
- `apps/frontend/src/features/products/components/PackForm.tsx`, `BundleForm.tsx`.

**Modify**
- `apps/backend/src/modules/sales/sales.service.ts` — `cancel()` is **unchanged**. No `createReturn` method on this service.
- `apps/backend/src/modules/sales/sales.module.ts` — register `SaleReturnService` and `SaleReturnController`.
- `apps/backend/src/modules/sales/sales.controller.ts` — **unchanged**.
- `apps/backend/src/modules/products/products.service.ts` — add `findByPackBarcode`; bundle validation in `create`.
- `apps/backend/src/modules/products/dto/create-product.dto.ts` — accept optional `packs`, `bundles` arrays.
- `apps/frontend/src/features/sales/components/SaleForm.tsx` — `useCapability('POLICY.manual_discount_reason')`; show reason input when required.
- `apps/frontend/src/features/sales/components/SaleTotals.tsx` — display reason only when needed; never alter totals.
- `apps/frontend/src/pages/sales/SalesPage.tsx` — add a "Devoluciones" tab.

**Entity registry**
- Register `SaleReturn`, `SaleReturnItem`, `CreditNote`, `ProductPack`, `ProductBundle` in `apps/backend/src/entities.ts` and the owning modules' `TypeOrmModule.forFeature([...])`.

**Migrations**
- `<generated>-AddSaleReturns.ts` — create `sale_returns`, `sale_return_items`. The header table has **no** `disposition`; the item table has `disposition`.
- `<generated>-AddCreditNotes.ts` — create `credit_notes` (with `sale_return_id UNIQUE NOT NULL`, `original_invoice_id NOT NULL`, numeric `afip_document_type_code int`, numeric `afip_associated_* int`, status/attemptId varchar + jsonb `payload_snapshot` + `error_message text`). No Postgres enum. No changes to `invoices`.
- `<generated>-AddProductPacks.ts` — `product_packs`.
- `<generated>-AddProductBundles.ts` — `product_bundles`.
- All four must be registered in `apps/backend/src/migrations.ts` in chronological order (timestamps strictly greater than the latest entry in `migrations.ts` at execution time; no fixed numbers).

### 3.5 Migration order
1. Sale returns (T12).
2. Credit notes (T13) — separate table, no `invoices` change.
3. Product packs (T14).
4. Product bundles (T14).

### 3.6 TDD / QA commands and expected outcomes

```bash
# Returns
cd apps/backend && npm run test:integration -- --runTestsByPath test/integration/sales-returns.integration.spec.ts
# Expect: returning 1 of 2 items ok; returning 2 of 1 rejected; one item restocked and another quarantined in the same return ⇒ two `RETURN` stock movements with per-item dispositions; exchange equals return + new sale; retry request idempotent; cancellation `cancel()` flow unchanged; non-fiscal return renders its receipt via the existing PDF path (no separate document entity).

# Credit notes
cd apps/backend && npm run test:unit -- --runTestsByPath src/modules/sales/services/credit-note.service.spec.ts
# Expect: two partial returns against the same invoice produce two `credit_notes` rows; AFIP payload contains the numeric codes and the original receiver CUIT; AFIP timeout → retry updates the row's `attemptId`/`status`/`error`/`payloadSnapshot` AND writes an `AuditLog` row (entity `credit_note`, action `ATTEMPT`); non-fiscal return → no `credit_notes` row.

# Packs / bundles
cd apps/backend && npm run test:integration -- --runTestsByPath test/integration/product-packs-bundles.integration.spec.ts
# Expect: case/bottle balance equals 12; 6-pack decrements 6 units; 3-component kit decrements all components; return reverses.

# Promotion primitives
cd apps/backend && npm run test:unit -- --runTestsByPath src/modules/sales/promotions/primitives.spec.ts
# Expect: manual discount requires reason + audit; price override requires reason + audit (AuditLog rows visible);
#         `quantity-break` model accepts a typed list as input and does NOT reference any future S4 table;
#         coupon / loyalty / store-credit models are typed and unit-tested but not enforced;
#         store-credit never enters discount/tax basis (pure-model assertion).
```

Evidence artifact: `.omo/evidence/stage-3-retail-multirubro-phase-execution.json`.

### 3.7 Rollback / compatibility strategy
- `SaleReturn` is a new document; existing `cancel()` is untouched. The receipt PDF is rendered from the `SaleReturn` document itself; no parallel entity.
- `CreditNote` is a separate table; `invoices` is unchanged. No new invoice types, no Postgres enum migration, no risk to `invoices.saleId` uniqueness.
- Packs/bundles are additive; products without them behave exactly as today.
- Promotion primitives are typed pure models; the only S3 persistence is `AuditLog` (existing). Enforcement/persistence for the rest lives in S5.
- Rollback strategy: a forward corrective migration drops the new tables *only* when they are empty (or after a backup-and-prune workflow); production rollbacks never `DROP COLUMN` against data-bearing tables without an export step.

### 3.8 Exit gate
- All Jest suites green.
- `legacy` profile still renders identical 14-item sidebar (including `Ubicaciones` and `Reposición`) and 19 named protected paths + index redirect + public login.
- `SaleForm` integer path still works for legacy.
- Cancellation `cancel()` still emits `RETURN` and does not invoke credit-note code.
- `invoices` table schema unchanged; `credit_notes` table carries multiple partial returns per invoice; each attempt is audit-logged.
- Disposition lives on `sale_return_item`, not on the header.
- `AuditLog` rows exist for manual discount and price override reasons (verified by `primitives.spec.ts`).
- Migration consistency passes.
- `.omo/evidence/stage-3-retail-multirubro-phase-execution.json` exists.
- User explicitly says "go to S4".

### 3.9 Dependencies
- S2 snapshot columns live.
- Blocks S4 (variants, weight, lots, serials, wholesale, consignment).
- Blocks S5 (promotion enforcement).

---

## Stage 4 — Structural retail families (Roadmap T16..T22)

### 4.0 Phase-entry drift revalidation
- Re-run S3 suites; expect green.
- Re-run `migrations.consistency.spec.ts`.
- Re-run legacy smoke (`legacy` profile + 14-item sidebar + 19 named protected paths + index redirect + cancel path); append to `.omo/evidence/stage-4-retail-multirubro-phase-execution.drift.json`.

### 4.1 Entry gate
- S3 exit gate passed.
- User has explicitly said "go to S4".

### 4.2 Verified current-state map
- `SaleForm` accepts a manual quantity with `Number.parseFloat` only when `STRUCTURAL.decimal_quantities === true` (set in S2); otherwise `Number.parseInt`.
- `invoice.controller.ts` exposes the existing invoice routes; no credit-note route (credit notes live in `credit_notes` table).
- `desktop/main.ts` already wires IPC for `getAppVersion`; new scale IPC must follow the same pattern (typed preload).
- No bundle, no lot, no serial, no consignment, no variant entities.
- `ReportsService` reads `sale_items`/`purchase_items` directly; S4 must keep using snapshots, not raw product data.
- `App.tsx` route count is fixed at 19 named protected paths + 1 protected index redirect + 1 public login; **S4 adds zero new top-level routes.** (`inventory/replenishment` is baseline from the start of the roadmap and is therefore not a new S4 route.) All new surfaces appear as tabs/dialogs in existing pages.
- Variants are a single `Product.parentProductId` self-FK plus a `product_variant_attributes` table; there is no `product_relations` entity.

### 4.3 Exact contracts / model decisions

**Weight / PLU / variable barcode (T16)**
- `Product` reuses the S2 `unitOfMeasureId` (FK to `unit_of_measures`). No new `measureUnitId` column on `Product`.
- `Product` gains `isMeasure boolean DEFAULT false`, `tareGrams decimal(10,3) NULL`, `variableBarcodeFormat varchar(16) NULL` (validated in code against a TS literal union `'gs1_weight'|'gs1_price'|'local_weight'|'local_price'`). Quantity precision still comes from `unit_of_measures.precision` through `Product.unitOfMeasureId`.
- `SaleItem` gains `enterMode varchar(16) NULL` (validated against `'manual'|'barcode'|'scale'`), `grossQuantity decimal(20,3) NULL`, `tareGrams decimal(10,3) NULL`, `netQuantity decimal(20,3) NULL` (resolved at submit).
- **Variable barcode parser contract** (pure `BarcodeParserService`):
  - **GS1 AI `310n` (net kg):** the AI plus a 4-or-5-digit weight in kg (decimal places inferred from the trailing `n`).
  - **GS1 AI `392n` (amount payable for variable measure) and `393n` (amount payable for variable measure with ISO currency):** parsed into a price; `n` digits.
  - **Configurable local EAN-13 layout** with the following typed inputs:
    - `prefix: string` (EAN-13 country/manufacturer prefix).
    - `productCodeRange: { from: number; to: number }` (digits identifying the product within the prefix).
    - `valueRange: { from: number; to: number }` (digits carrying the weight or price value).
    - `valueType: 'weight' | 'price'`.
    - `decimalPlaces: number` (e.g. `3` for kg with 0.001 resolution).
    - `checkDigit: boolean` (whether the 13th digit is a computed EAN-13 check digit).
  The parser is config-driven; `legacy` uses a local weight config seeded by an integration test fixture, not a string-literal regex.
- The parser is used by `SaleForm`'s scanner handler. The existing `Number.parseInt` / `Number.parseFloat` paths from S2 remain.
- Reports use `netQuantity`; never `grossQuantity`.

**Bounded direct scale (T17)**
- `apps/desktop/electron/scale/` folder: `types.ts` (capability metadata), `protocols/simulator.ts` (only vendor for S4; no real model claim), `scale-gateway.ts` (IPC contract). The simulator is the only declared device.
- `apps/backend/src/modules/diagnostics/diagnostics.service.ts` extended with `scale.status()` returning `{ supported: true, model: 'simulator', lastError: null }` once the simulator adapter is registered.
- Configured via `apps/backend/src/modules/configuration/capabilities/presets.ts` (`weight` preset enables `STRUCTURAL.weight_scale`).
- Reads are stable-weight requiring two identical frames within tolerance; otherwise discard and emit diagnostic.

**Variants (T18)** — tabs/dialogs only.
- `Product` gains `isVariantParent boolean`, `parentProductId uuid NULL` (self-FK). Child products own SKU/barcode/price/stock; parent is for catalog aggregation only.
- New entity `product_variant_attributes` (`productId uuid`, `attributeKey varchar(64)`, `attributeValue varchar(128)`, `UNIQUE (productId, attributeKey)`). This replaces the earlier `product_relations` + `product_attribute_definitions` plan — variants are a self-FK plus per-child attribute rows.
- Matrix generation: `POST /api/products/:id/attributes/generate` produces variants in a single transaction; label queue from S2 picks them up. The matrix is rendered in a new `Variants` tab inside the existing `ProductsPage`.
- SaleForm lists children when a parent is selected; refuses to sell the parent when `STRUCTURAL.variants` enabled.

**Lot / expiry / FEFO (T19)** — tabs/dialogs only.
- New entities `product_lots` (`id`, `productId`, `lotCode`, `expiryDate`, `receivedAt`, `status varchar(16)` validated against `'available'|'quarantined'|'recalled'|'depleted'` in code) and `product_lot_balances` (`lotId`, `quantity decimal(20,3)`, **`locationId uuid NULL`** — required when sectorized mode is on; nullable otherwise). Allocation, receiving, count, and return preserve `locationId`.
- `InventoryService` allocates FEFO at sale-validate time; expired or quarantined lots are blocked.
- `PurchasesService` (existing) gains lot-aware receiving inside the same service module. `StocktakeService` (S2) gains lot-aware mode and preserves `locationId` in adjustments.
- `RecallsService` (new) flags on-hand + sold-by-lot; exposed through the existing `inventory` module's controller and surfaced in a new "Lotes / Recall" tab inside `ProductsPage`. No pharmacy compliance claims.

**Serial / warranty (T20)** — tabs/dialogs only.
- New entity `product_serials` (`id`, `productId`, `serial string UNIQUE`, **`locationId uuid NULL`** — required when sectorized mode is on; nullable otherwise), `status varchar(16)` validated against `'in_stock'|'sold'|'returned'|'quarantined'` in code, `receivedAt`, `soldAt`, `warrantyExpiresAt`, `originalSaleItemId NULL`, `originalCustomerId NULL`.
- `PurchasesService` requires N serials per quantity; `SalesService` requires N serials at sale; duplicate active/sold rejected. `SaleReturnService` (S3) finds serial by original sale item.
- Serial capture UI lives inside the existing `ProductsPage` product detail dialog.

**Wholesale (T21)** — tabs/dialogs only.
- `Customer.customerGroupId uuid NULL` (FK to `customer_groups.id`) — added to the customers module's `Customer` entity and included in the migration. The wholesale resolution reads this column.
- `customer_groups` lives in the **customers module** (`apps/backend/src/modules/customers/entities/customer-group.entity.ts`): `id`, `name`, `kind varchar(16)` validated against `'retail'|'wholesale'` in code, `paymentTermsDays int NULL`, `creditLimit decimal(20,2) NULL`, `discountPercent decimal(5,2) NULL`.
- `price_lists` (`id`, `name`, `productId`, `customerGroupId`, `price decimal(20,2)`) and `quantity_break_prices` (`priceListId`, `minQuantity`, `price`). `quantity_break_prices` is the S4 source for `COMMERCIAL.quantity_breaks`; S5 reads from it.
- `SalesService.create` resolves price by `customer.customerGroupId` → `customer_groups.kind` → `price_lists` then by `quantity_break_prices`; never overrides the snapshot.
- **Concrete sales-order entities (required for partial delivery):**
  - `sales_orders` (`id`, `customerId`, `quoteSaleId NULL`, `status varchar(16)` validated against `'draft'|'confirmed'|'partial'|'delivered'|'cancelled'`, `paymentTermsDays int NULL`, `creditLimit decimal(20,2) NULL`, `totalAmount decimal(20,2)`, `createdAt`, `confirmedAt`, `deliveredAt`).
  - `sales_order_items` (`id`, `orderId`, `productId`, `orderedQuantity decimal(20,3)`, `dispatchedQuantity decimal(20,3) NOT NULL DEFAULT 0`, `unitPrice decimal(20,2)`, `taxSnapshot jsonb`, `capabilitySnapshot jsonb`).
- `OrderService` (new) provides `quote`, `confirm`, `deliver`, `invoice`. `sales_order_items.dispatchedQuantity` cannot exceed `orderedQuantity`; stock decrements and invoice emit only on delivery. Surfaces through a new "Pedidos" tab inside `SalesPage`. Without these entities, partial delivery cannot be modeled.
- Single currency/location only.

**Consignment (T22)** — own module.
- New module `apps/backend/src/modules/consignment/` (ownership/settlement is not product catalog CRUD; it warrants its own module):
  - Entities: `consignors` (`id`, `name`, `taxId`, `commissionPercent decimal(5,2)`); `consignor_balances` ledger entries on sale settlement; reversal on return.
  - `Product` gains `isConsigned boolean`, `consignorId uuid NULL`, `consignorSplitPercent decimal(5,2) NULL`.
  - `consignors.service.ts`, `consignment.controller.ts`, `*.spec.ts`.
  - Reports separate consigned value from owned value at the SQL layer; never mix.
- Surfaces through a new "Consignatarios" tab inside `CustomersPage` (customers and consignors share the same module surface).

### 4.4 Files to create / modify / test

**Create**
- `apps/backend/src/modules/products/barcode-parser/{barcode-parser.service.ts, gs1.ts, local.ts, *.spec.ts}`.
- `apps/backend/src/modules/products/entities/{product-variant-attribute.entity.ts, product-lot.entity.ts, product-lot-balance.entity.ts, product-serial.entity.ts, price-list.entity.ts, quantity-break-price.entity.ts}`.
- `apps/backend/src/modules/customers/entities/customer-group.entity.ts`.
- `apps/backend/src/modules/consignment/{consignor.entity.ts, consignor-balance.entity.ts, consignors.service.ts, consignment.controller.ts, *.spec.ts}`.
- `apps/backend/src/modules/sales/entities/{sales-order.entity.ts, sales-order-item.entity.ts}`.
- `apps/backend/src/modules/products/services/{variants.service.ts, lots.service.ts, serials.service.ts, price-lists.service.ts, recalls.service.ts}` plus specs.
- `apps/backend/src/modules/sales/order.service.ts`, `order.controller.ts`, `*.spec.ts`.
- `apps/desktop/electron/scale/{types.ts, scale-gateway.ts, protocols/simulator.ts}`.
- `apps/desktop/electron/preload.ts` (extend) — add `scale:read` IPC.
- `apps/frontend/src/features/products/components/{VariantMatrix.tsx, BundleManager.tsx, LotPicker.tsx, SerialCapture.tsx, PriceListEditor.tsx, ConsignorEditor.tsx, RecallsTab.tsx}`.
- `apps/frontend/src/features/sales/components/OrderDialog.tsx`, `apps/frontend/src/features/sales/hooks/useOrder.ts`.
- `apps/frontend/src/features/products/components/VariantsTab.tsx` (lives inside `ProductsPage`).

**Modify**
- `apps/backend/src/modules/products/entities/product.entity.ts` — add `isMeasure`, `tareGrams`, `variableBarcodeFormat`, `isVariantParent`, `parentProductId`, `isConsigned`, `consignorId`, `consignorSplitPercent`. **No separate `measureUnitId`** — reuse S2's `unitOfMeasureId`.
- `apps/backend/src/modules/customers/entities/customer.entity.ts` — add `customerGroupId uuid NULL` (FK to `customer_groups.id`).
- `apps/backend/src/modules/sales/entities/sale-item.entity.ts` — add `enterMode`, `grossQuantity`, `tareGrams`, `netQuantity`.
- `apps/backend/src/modules/sales/sales.service.ts` — call `VariantsService.validate` / `LotsService.allocateFefo` / `SerialsService.capture` / `PriceListsService.resolve` based on capabilities. `cancel()` remains unchanged.
- `apps/backend/src/modules/inventory/inventory.service.ts` — `createMovement` consults `LotsService` for lot-aware flows.
- `apps/backend/src/modules/purchases/purchases.service.ts` — gains lot + serial capture inside the same provider.
- `apps/backend/src/modules/reports/reports.service.ts` — read `netQuantity` for weight products; never `quantity`.
- `apps/backend/src/modules/configuration/capabilities/presets.ts` — add `weight`, `apparel`, `lot-retail`, `electronics`, `wholesale`, `consignment` presets.
- `apps/frontend/src/features/sales/components/SaleForm.tsx` — basket can mix unit and 0.125kg items without refactor; barcode parser handles variable formats.
- `apps/desktop/electron/main.ts` — register scale IPC.
- `apps/frontend/src/pages/products/ProductsPage.tsx` — add `<VariantsTab />`, `<LotPicker />`, `<SerialCapture />`, `<BundleManager />` tabs/dialogs.
- `apps/frontend/src/pages/sales/SalesPage.tsx` — add `<OrderDialog />` tab.
- `apps/frontend/src/pages/customers/CustomersPage.tsx` — add `<ConsignorEditor />` tab.
- `apps/frontend/src/App.tsx` — **no route additions** in S4.
- `apps/frontend/src/components/Sidebar.tsx` — no new items in S4; existing 14 items stay reachable for `legacy`.
- `apps/backend/src/app.module.ts` — **only imports new modules** (e.g. `consignment`); controllers are registered in their owning modules' `*.module.ts`.

**Entity registry**
- Register the new entities in `apps/backend/src/entities.ts` and the owning modules' `TypeOrmModule.forFeature([...])`:
  - `apps/backend/src/modules/products/entities/`: `ProductVariantAttribute`, `ProductLot`, `ProductLotBalance`, `ProductSerial`, `PriceList`, `QuantityBreakPrice`.
  - `apps/backend/src/modules/customers/entities/`: `CustomerGroup`.
  - `apps/backend/src/modules/consignment/`: `Consignor`, `ConsignorBalance`.
  - `apps/backend/src/modules/sales/entities/`: `SalesOrder`, `SalesOrderItem`.

**Migrations** — filenames use the descriptive suffix; the leading timestamp is generated by `npm run migration:generate` from `apps/backend` and must be strictly greater than the latest entry currently registered in `apps/backend/src/migrations.ts` at execution time (no fixed numbers). No Postgres enum migrations; every new column is `varchar` validated in code or a typed numeric column.
- `<generated>-AddMeasureColumns.ts`
- `<generated>-AddVariantParentChild.ts`
- `<generated>-AddProductVariantAttributes.ts`
- `<generated>-AddProductLots.ts`
- `<generated>-AddProductSerials.ts`
- `<generated>-AddCustomerGroups.ts`
- `<generated>-AddCustomerGroupIdColumn.ts`
- `<generated>-AddPriceLists.ts`
- `<generated>-AddConsignmentColumns.ts`
- `<generated>-AddSaleItemMeasureColumns.ts`
- `<generated>-AddSalesOrders.ts`
- All ten registered in `apps/backend/src/migrations.ts` in chronological order.

**Test updates**
- `BarcodeParserService.spec.ts` — fixture-driven: GS1 AI `310n` (net kg), GS1 AI `392n` (price), configurable local EAN-13 weight layout, configurable local EAN-13 price layout, invalid payloads.
- `variants.service.spec.ts` — matrix generation, label queue, exchange variant.
- `lots.service.spec.ts` — FEFO, expired blocking, recall, count/return/supplier-return, `locationId` preserved through the flow.
- `serials.service.spec.ts` — receive/sell/return, duplicate IMEI, warranty expired/valid, `locationId` preserved.
- `order.service.spec.ts` — quote, partial deliver twice, invoice, exceed credit, `sales_orders` and `sales_order_items` rows track state correctly.
- `consignors.service.spec.ts` (consignment module) — intake, markdown, sell, return, settle/reverse.
- `scale/protocols/simulator.spec.ts` — stable/unstable/corrupt frames.
- `SaleForm.spec.tsx` — mixed unit + 0.125kg cart.
- `purchases.service.spec.ts` — lot + serial capture during purchase receive, with `locationId`.
- `migrations.consistency.spec.ts` — must stay green.

### 4.5 Migration order
1. Measure columns (T16).
2. Sale item measure columns (T16) — must precede first sale that reads them.
3. Variant parent/child + variant attributes (T18).
4. Lot + balances (T19).
5. Serial (T20).
6. Customer groups (T21).
7. `Customer.customerGroupId` column (T21).
8. Price lists + quantity breaks (T21).
9. Consignment columns (T22).
10. Sales orders + sales order items (T21 — needed for partial delivery).

### 4.6 TDD / QA commands and expected outcomes

```bash
cd apps/backend && npm run test:unit -- --runTestsByPath src/migrations.consistency.spec.ts
cd apps/backend && npm run test:unit -- --runTestsByPath src/modules/products/barcode-parser/barcode-parser.service.spec.ts
cd apps/backend && npm run test:integration -- --runTestsByPath test/integration/weight-sale.integration.spec.ts
cd apps/frontend && npm test -- src/features/sales/components/SaleForm.spec.tsx
# Expect: mixed cart subtotal exact; legacy unit path unchanged; `Product.unitOfMeasureId` reused (no `measureUnitId`); GS1 AIs 310n/392n/393n and the configurable local EAN-13 layout both parse.

cd apps/backend && npm run test:integration -- --runTestsByPath test/integration/scale-simulator.integration.spec.ts
# Expect: stable frame accepted; unstable discarded; corrupt diagnostic.

cd apps/backend && npm run test:integration -- --runTestsByPath test/integration/variants.integration.spec.ts
# Expect: stock isolation by child; parent cannot be sold; exchange moves correct variant; `product_variant_attributes` rows drive the matrix.

cd apps/backend && npm run test:integration -- --runTestsByPath test/integration/lots.integration.spec.ts
# Expect: FEFO deterministic; expired blocked; recall identifies on-hand + sold; `product_lot_balances.locationId` preserved through allocation/receiving/count/return.

cd apps/backend && npm run test:integration -- --runTestsByPath test/integration/serials.integration.spec.ts
# Expect: count = quantity; duplicate active rejected; warranty return matches; `product_serials.locationId` preserved.

cd apps/backend && npm run test:integration -- --runTestsByPath test/integration/wholesale-order.integration.spec.ts
# Expect: `Customer.customerGroupId` resolves to a `customer_groups.kind='wholesale'` row; list/break applied; partial deliver twice deterministic; `sales_orders.dispatchedQuantity` and `sales_order_items.dispatchedQuantity` track state; credit limit enforced.

cd apps/backend && npm run test:integration -- --runTestsByPath test/integration/consignment.integration.spec.ts
# Expect: consigned value excluded from owned; settle idempotent; return preserves ownership; consignment module owns entities/services.

cd apps/backend && npm run test:integration -- --runTestsByPath test/integration/purchases-lot-serial.integration.spec.ts
# Expect: PurchasesService receives lots and serials in one transaction; `locationId` carried.
```

Evidence artifact: `.omo/evidence/stage-4-retail-multirubro-phase-execution.json`.

### 4.7 Rollback / compatibility strategy
- Every new column is additive or has a default.
- `legacy` preset disables all of S4's structural capabilities; products added in S4 still save but never activate their extra fields.
- Reports keep `legacy` SQL path; lot/serial/wholesale projections are isolated.
- Scale IPC is feature-flagged via `STRUCTURAL.weight_scale`; absent flag → `DiagnosticsService.scale.status()` returns `{ supported: false }`.
- Production rollback strategy: forward corrective migrations. Data-bearing tables (`sale_items` measure columns, `product_lots`, `product_lot_balances`, `product_serials`, `consignor_balances`, `sales_orders`, `sales_order_items`) require a backup-and-prune workflow before any column drop; otherwise the down migration aborts when the column is non-null.

### 4.8 Exit gate
- All Jest suites green.
- `legacy` profile still renders identical 14-item sidebar and 19 named protected paths + index redirect.
- `App.tsx` route count is unchanged from S3.
- Mixed profile test (e.g. `wholesale` + `lot-retail` + `legacy` expressed as `profileKey='legacy' + capabilitiesJson overrides`) exercises lot + price list in one sale without errors.
- Tare never enters net stock.
- `.omo/evidence/stage-4-retail-multirubro-phase-execution.json` exists.
- User explicitly says "go to S5".

### 4.9 Dependencies
- S3 returns and snapshots must be live.
- Blocks S5 profile matrix.

---

## Stage 5 — Commercial overlays & final profiles (Roadmap T23..T24)

### 5.0 Phase-entry drift revalidation
- Re-run S4 suites; expect green.
- Re-run `migrations.consistency.spec.ts`.
- Re-run legacy smoke; append to `.omo/evidence/stage-5-retail-multirubro-phase-execution.drift.json`.

### 5.1 Entry gate
- S4 exit gate passed.
- User has explicitly said "go to S5".

### 5.2 Verified current-state map
- S3 primitives exist as typed pure models; only `manual-discount` and `price-override` persist via `AuditLog`.
- `legacy` preset disables every commercial capability.
- `setup-wizard.ts` writes `.env` (including `NEXOPOS_PROFILE_KEY`) atomically; no inferred recommendation.
- `SettingsPage` has the "Perfil y capacidades" tab from S1.
- S4 added no new top-level routes; the 19 named protected paths + index redirect + public login list is unchanged.
- `quantity_break_prices` already exists from S4 and is the data source for `COMMERCIAL.quantity_breaks`; S5 reads from it.

### 5.3 Exact contracts / model decisions

**Promotion enforcement — explicit sequencing and typed return contracts (T23)**
- `apps/backend/src/modules/sales/promotions/apply.ts` exports an ordered list of typed functions, called by `SalesService.create`. Each function declares its return type explicitly; they are not all `Adjustments[]`.

  **Before totals/tax — price adjustments (return type `ApplyPriceResult = { adjustments: Adjustments[] }`):**
  1. `applyManualDiscountPolicy(cart, ctx): ApplyPriceResult` — requires `POLICY.manual_discount_reason`; persists via `AuditLog` (S3).
  2. `applyPriceOverridePolicy(cart, ctx): ApplyPriceResult` — requires `POLICY.price_override_reason`; persists via `AuditLog` (S3).
  3. `applyQuantityBreak(cart, ctx): ApplyPriceResult` — uses the S4 `quantity_break_prices` table as the source list passed in via `ctx`; no new persistence.
  4. `applyTimeBoundPromotion(cart, ctx): ApplyPriceResult` — uses the new `promotions` table; reads only time-bound rows (`status='active' AND validFrom <= now <= validTo`).
  5. `applyCoupon(cart, ctx): ApplyPriceResult` — uses the new `coupons` table; writes a row to `coupon_redemptions` with signed/reversal relation.

  **After total — payment allocations (return type `ApplyPaymentResult = { allocations: PaymentAllocation[] }`; never price/tax adjustments):**
  6. `applyLoyaltyRedemption(cart, ctx): ApplyPaymentResult` — uses the new `loyalty_accounts` + `loyalty_movements` tables; debits `loyalty_accounts.balance` and writes a `'REDEMPTION'` row in `loyalty_movements` with signed `points`, `saleId`, `reversalOfId NULL`, and unique `idempotencyKey`.
  7. `applyStoreCredit(cart, ctx): ApplyPaymentResult` — uses the new `store_credit_accounts` + `store_credit_movements` tables; debits `store_credit_accounts.balance` and writes a `'DEBIT'` row in `store_credit_movements` with signed `amount`, `saleId`, `reversalOfId NULL`, and unique `idempotencyKey`.

  **After committed sale — ledger only (return type `ApplyLedgerResult = { movement: LedgerMovement }`; never modifies the sale totals):**
  8. `recordLoyaltyEarning(sale, ctx): ApplyLedgerResult` — writes an `'EARNING'` row in `loyalty_movements` against the customer's `loyalty_accounts` with signed `points`, `saleId`, `reversalOfId NULL`, and unique `idempotencyKey`. The recorded sale totals are never modified.

- `SalesService.create` orchestrates steps 1–5 before totals math; the payment steps (6–7) are applied during payment allocation after totals are known; step 8 runs only after the sale commits.
- Returns reverse coupon redemption, loyalty earning, loyalty redemption, and store credit **idempotently** through `SaleReturnService`. Each reversal is a new row of opposite sign with `reversalOfId` pointing to the original; original rows are never mutated. `idempotencyKey` uniqueness prevents duplicate reversals.

**Persistence tables and minimal columns (S5)**
- `promotions` (`id`, `code`, `name`, `status varchar(16)` validated against `'active'|'inactive'`, `validFrom timestamptz NULL`, `validTo timestamptz NULL`, `kind varchar(16)` validated against `'percent_off'|'amount_off'|'bxgy'|'time_bound_promotion'`, `parameters jsonb NOT NULL`, `createdAt`, `updatedAt`).
- `coupons` (`id`, `code varchar(64) UNIQUE`, `status varchar(16)` validated against `'active'|'inactive'|'exhausted'`, `parameters jsonb NOT NULL`, `validFrom timestamptz NULL`, `validTo timestamptz NULL`, `createdAt`, `updatedAt`).
- `coupon_redemptions` (`id`, `couponId uuid`, `saleId uuid NULL`, `saleReturnId uuid NULL`, `signedAmount decimal(20,2) NOT NULL`, `reversalOfId uuid NULL` (FK to `coupon_redemptions.id` for the reversed record, NULL on original), `idempotencyKey varchar(64) UNIQUE NOT NULL`, `createdAt`). `reversalOfId` plus `idempotencyKey` together guarantee one redemption per coupon and one reversal per original.
- `loyalty_accounts` (`id`, `customerId uuid UNIQUE`, `balancePoints int NOT NULL DEFAULT 0`, `createdAt`, `updatedAt`).
- `loyalty_movements` (`id`, `loyaltyAccountId uuid`, `kind varchar(16)` validated against `'EARNING'|'REDEMPTION'|'ADJUSTMENT'`, `signedPoints int NOT NULL`, `saleId uuid NULL`, `saleReturnId uuid NULL`, `reversalOfId uuid NULL` (FK to `loyalty_movements.id`), `idempotencyKey varchar(64) UNIQUE NOT NULL`, `createdAt`).
- `store_credit_accounts` (`id`, `customerId uuid UNIQUE`, `balanceAmount decimal(20,2) NOT NULL DEFAULT 0`, `createdAt`, `updatedAt`).
- `store_credit_movements` (`id`, `storeCreditAccountId uuid`, `kind varchar(16)` validated against `'DEBIT'|'CREDIT'|'ADJUSTMENT'`, `signedAmount decimal(20,2) NOT NULL`, `saleId uuid NULL`, `saleReturnId uuid NULL`, `reversalOfId uuid uuid NULL` (FK to `store_credit_movements.id`), `idempotencyKey varchar(64) UNIQUE NOT NULL`, `createdAt`).

**Final profiles (T24)**
- `apps/backend/src/modules/configuration/capabilities/presets.ts` confirms the existing presets (`legacy`, `unit-retail`, `fast-packaged`, `weight`, `apparel`, `lot-retail`, `electronics`, `wholesale`, `consignment`). `profileKey` is always one primary preset. Mixed businesses are expressed by selecting a primary preset and then setting `capabilitiesJson` overrides. **Combined preset strings (e.g. `apparel+wholesale`) are not used anywhere.**
- `ConfigurationService.profileMatrix()` returns `{ profileKey, capabilities: Record<string, boolean> }` derived from the primary preset plus the `capabilitiesJson` overrides.
- `setup-wizard.ts` writes `NEXOPOS_PROFILE_KEY` exactly as the user selected in the wizard — no inference from business data, no "recommended profile" step.
- `SettingsPage` "Perfil y capacidades" tab renders the matrix as a read-only table; mixed combinations expose only the union of capabilities.
- Documentation: `docs/planificacion-multirubro-completa.md` is augmented with a matrix-of-capabilities section; updates are additive (no removal of existing content).

### 5.4 Files to create / modify / test

**Create**
- `apps/backend/src/modules/sales/entities/{promotion.entity.ts, coupon.entity.ts, coupon-redemption.entity.ts, loyalty-account.entity.ts, loyalty-movement.entity.ts, store-credit-account.entity.ts, store-credit-movement.entity.ts}`.
- `apps/backend/src/modules/sales/promotions/apply.ts` — exported ordered list of typed `apply*` functions with explicit return-type contracts (`ApplyPriceResult`, `ApplyPaymentResult`, `ApplyLedgerResult`).
- `apps/backend/src/modules/sales/promotions/precedence.ts` — typed-code precedence table.
- `apps/backend/src/modules/sales/promotions/apply.spec.ts`.
- `apps/backend/src/modules/configuration/capabilities/profile-matrix.ts` (pure function), `profile-matrix.spec.ts`.
- `apps/frontend/src/features/sales/components/PromotionsPanel.tsx`, `apps/frontend/src/features/sales/hooks/usePromotions.ts`, `*.spec.tsx`.
- `apps/frontend/src/pages/settings/ProfileMatrixTab.tsx`.

**Modify**
- `apps/backend/src/modules/sales/sales.service.ts` — orchestrate `apply*` (1–5) before totals math, (6–7) during payment allocation, and `recordLoyaltyEarning` (8) after the sale commits.
- `apps/backend/src/modules/sales/sale-return.service.ts` — invoke reversal hooks named explicitly in S3/S5 primitives; reversals are idempotent additional rows (with `reversalOfId` + `idempotencyKey`), not mutations of original rows.
- `apps/backend/src/modules/configuration/configuration.service.ts` — `profileMatrix()` method.
- `apps/frontend/src/pages/settings/SettingsPage.tsx` — add `<ProfileMatrixTab />`.
- `apps/desktop/electron/setup-wizard.ts` — `NEXOPOS_PROFILE_KEY` is part of the same atomic `.env` write it already performs. No recommendation step.
- `docs/planificacion-multirubro-completa.md` — append the capability matrix section at the end (no removal of existing content).

**Entity registry**
- Register `Promotion`, `Coupon`, `CouponRedemption`, `LoyaltyAccount`, `LoyaltyMovement`, `StoreCreditAccount`, `StoreCreditMovement` in `apps/backend/src/entities.ts` and the sales module's `TypeOrmModule.forFeature([...])`.

**Migrations** — three generated migrations, each with the descriptive suffix pattern; the leading timestamp is generated by `npm run migration:generate` from `apps/backend` and must be strictly greater than the latest entry currently registered in `apps/backend/src/migrations.ts` at execution time (no fixed numbers):
- `<generated>-AddPromotionsAndCoupons.ts` — `promotions`, `coupons`, `coupon_redemptions`.
- `<generated>-AddLoyaltyLedger.ts` — `loyalty_accounts`, `loyalty_movements`.
- `<generated>-AddStoreCreditLedger.ts` — `store_credit_accounts`, `store_credit_movements`.
- All three registered in `apps/backend/src/migrations.ts` in chronological order.

**Test updates**
- `apply.spec.ts` — BOGO/quantity/coupon/loyalty/store-credit fixtures with returns; non-stack combinations rejected; loyalty earning never modifies sale totals; returns reverse coupon redemption, loyalty earning, loyalty redemption, and store credit idempotently via new `reversalOfId` + `idempotencyKey` rows; type contracts (`ApplyPriceResult` vs `ApplyPaymentResult` vs `ApplyLedgerResult`) enforced by the tests.
- `profile-matrix.spec.ts` — every preset + three mixed examples using `profileKey + capabilitiesJson` overrides (e.g. `profileKey='apparel'` + `capabilitiesJson={'STRUCTURAL.wholesale_price_lists':true}`, etc.).

### 5.5 Migration order
1. `<generated>-AddPromotionsAndCoupons.ts` (T23 base).
2. `<generated>-AddLoyaltyLedger.ts` (T23 loyalty earning/redemption).
3. `<generated>-AddStoreCreditLedger.ts` (T23 store credit).

### 5.6 TDD / QA commands and expected outcomes

```bash
cd apps/backend && npm run test:unit -- --runTestsByPath src/migrations.consistency.spec.ts
cd apps/backend && npm run test:unit -- --runTestsByPath src/modules/sales/promotions/apply.spec.ts
cd apps/backend && npm run test:unit -- --runTestsByPath src/modules/configuration/capabilities/profile-matrix.spec.ts
# Expect: every primitive isolated; precedence deterministic; returns reverse correctly; loyalty earning is a ledger row only; store credit and loyalty redemption are `PaymentAllocation[]`, never `Adjustments`; idempotency keys reject duplicate reversals; type contracts enforced.

cd apps/frontend && npm test -- src/features/sales/components/PromotionsPanel.spec.tsx
# Expect: stacked primitives visible; non-stack combinations unavailable.

# Manual QA via the package and developer install (NOT committing or auto-starting user dev servers)
cd apps/backend && npm run build
cd apps/frontend && npm run build
# Expect: clean builds. No Playwright unless user has backend + frontend running.
```

Evidence artifact: `.omo/evidence/stage-5-retail-multirubro-phase-execution.json`.

### 5.7 Rollback / compatibility strategy
- Promotion apply functions are opt-in via capabilities; `legacy` keeps its current discount/surcharge fields.
- `apply*` chain returns no adjustments when `legacy` is active.
- Profile matrix is read-only; it never mutates without an explicit `PATCH /api/configuration/capabilities` call.
- Rollback strategy: forward corrective migrations that drop the new tables only when empty (or after a backup-and-prune workflow). Production rollback never deletes applied migration files.

### 5.8 Exit gate
- All Jest suites green.
- Profile matrix rendered in the Settings tab equals the matrix in `docs/planificacion-multirubro-completa.md`.
- `legacy` still ships identical navigation (14 sidebar items, 19 named protected paths + index redirect) and `SaleForm` integer path.
- Speed budgets re-measure: scan p95 ≤ 300 ms; 20-line recalc ≤ 100 ms; local submit ≤ 2 s — recorded in `.omo/evidence/stage-5-retail-multirubro-phase-execution.bench.json`.
- F1..F4 review wave (below) runs and ALL must approve.

### 5.9 Dependencies
- S4 structural families must be live.
- This is the final stage.

---

## Final verification wave

> Runs after S5 closes. ALL must APPROVE before marking the plan complete. No commit/merge/deploy is authorized by this plan.

- **F1 — Plan compliance audit:** every preset maps to a code path, a test, and a doc row. Every roadmap task description resolves to a stage. No placeholder strings remain (the literal phrase `TBD` / `<fill>` appears only inside the F1 rule itself).
- **F2 — Code quality review:** no profile-name conditionals; no frontend-only enforcement; no scattered migrations; policy helpers consumed by existing services; no new dependencies; no `ReceivingService` / `recommend-profile` / `setup-wizard-steps` / SQLite-branch references; no `POST /api/configuration/capabilities` from the setup wizard; no combined preset strings; no `RETURN_RECEIPT` document entity; no invented `*<weight>@<price>/kg` syntax; no `@ValidateNested` on raw `Record`; no fixed migration timestamps in the plan.
- **F3 — Real manual QA:** packaged local install (no auto-starting dev servers) walks Setup → sale → return → restore → representative mixed example (e.g. `profileKey='apparel'` + `capabilitiesJson` overrides enabling wholesale). Speed budgets re-checked.
- **F4 — Scope fidelity:** no SaaS, multi-location, multi-currency, services, pharmacy, WMS, generic rules engine, plugin marketplace, or auto-restarted dev server. Manual-runtime checks not blocked by automation are reported explicitly.

Evidence: `.omo/evidence/final-retail-multirubro-phase-execution.json` aggregating the four review artifacts.

## Commit strategy

- This plan does **not** authorize commits, pushes, or deploys.
- Each stage may be committed **only if** the user explicitly asks at the relevant exit gate. If so:
  - Atomic commit per stage; implementation and direct tests stay together.
  - Migration file and `apps/backend/src/migrations.ts` registration stay together.
  - Use `npm` (the workspace tool) — never `pnpm` — to install/test/build.
  - Hooks are respected; no `--no-verify`.
- Before any commit or deploy, run the project's `/code-review` skill (it is in scope) and store its output under `.omo/evidence/`.

## Success criteria

- The roadmap's 24 tasks are executed across the five stages above, each ending on a verified exit gate.
- Existing installs resolve to `legacy` with no visible or data behavior regression.
- `App.tsx` keeps 19 named protected paths + 1 protected index redirect + 1 public login; `Sidebar.tsx` keeps 14 nav items (including `Ubicaciones` and `Reposición`). Both remain reachable for `legacy`.
- Scan/recalc/submit performance budgets hold at every stage exit gate.
- Quantity/UOM, packs, variants, lots, serials, ownership and pricing preserve exact historical snapshots.
- Returns are partial, idempotent, stock-aware, payment-aware and recorded as separate `credit_notes` rows that reference the original invoice and the originating `sale_return`. Each AFIP attempt is audit-logged; `SaleReturn` itself is the persisted document for non-fiscal returns.
- Decimalization is forward-only; its down migration aborts when fractional data exists.
- Every migration is unconditional, registered in `apps/backend/src/migrations.ts`, and validated by `migrations.consistency.spec.ts`. Timestamps in this plan are generated at apply time; no fixed numbers appear.
- Capability manifest is the single source of truth; `profileKey` is one primary preset, never combined with another preset name. Mixed businesses are `profileKey + capabilitiesJson` overrides. The capability namespace is `POLICY.*` / `STRUCTURAL.*` / `TOOLING.*` / `COMMERCIAL.*` / `FISCALITY.*` / `APP_ROUTES.*`.
- The product owner can select a profile or mixed combination without code changes. Setup wizard writes `NEXOPOS_PROFILE_KEY` atomically with the rest of `.env`; no inference, no recommendation step.
- Catalog import is a CSV state-machine parser (exact dialect specified); XLSX waits for explicit dependency approval.
- Labels produce QR + textual SKU/barcode + price PDF using the existing `pdf-generator.service.ts` and the already-installed `qrcode`; templates are `qr_text_price` / `qr_text` / `qr_only`; 1D barcode rasterization is a blocked optional follow-up requiring explicit dependency approval.
- Restore safety follows the full PostgreSQL `pg_dump -Fc` / `pg_restore` flow: preflight via `listBackupContents`, automatic safety backup, `CREATE DATABASE <temp>` via admin connection + `pg_restore --dbname=<temp>` (never `--create`), validation, `pg_restore --clean --if-exists --single-transaction` swap under packaged-backend maintenance orchestration, rollback to safety backup.
- Stage 4 wholesale persistence: `Customer.customerGroupId` + `sales_orders` + `sales_order_items` entities.
- Stage 5 typed apply functions: price functions return `ApplyPriceResult`/`Adjustments[]`; loyalty redemption and store credit return `ApplyPaymentResult`/`PaymentAllocation[]`; loyalty earning returns `ApplyLedgerResult`/`LedgerMovement` and never modifies sale totals. Idempotency: `reversalOfId` + unique `idempotencyKey` on `coupon_redemptions`, `loyalty_movements`, `store_credit_movements`.
- `app.module.ts` only imports new modules; controllers are registered in their owning modules.
- Production rollback is always a forward corrective migration; no `DROP COLUMN` against data-bearing tables, no migration deletion. S1 metadata columns may only be dropped after every row proves to be `legacy` with empty overrides.
- F1..F4 final reviewers all approve and every blocked manual-runtime check is explicitly reported rather than bypassed.

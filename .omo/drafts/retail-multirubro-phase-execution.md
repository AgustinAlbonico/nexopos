---
slug: retail-multirubro-phase-execution
status: approved
intent: clear
review_required: false
pending-action: explicit-go-to-s1
approach: Un único plan de ejecución con cinco etapas (S1..S5) que mapea 1:1 los waves del roadmap retail-multirubro, reutiliza ConfigurationService/ConfigurationController (sin abstracciones paralelas), persiste NEXOPOS_PROFILE_KEY en el mismo write atómico de .env del setup wizard, usa namespace único de capacidades (POLICY.*, STRUCTURAL.*, TOOLING.*, COMMERCIAL.*, FISCALITY.*, APP_ROUTES.*) y nunca autoriza commits ni auto-start de dev servers.
---

# Draft: retail-multirubro-phase-execution

## Components (topology ledger)
<!-- Lock the SHAPE before depth. One row per top-level component that can succeed or fail independently. -->
<!-- id | outcome (one line) | status: active|deferred | evidence path -->

| id | outcome | status | evidence path |
| --- | --- | --- | --- |
| s1-capability-seam | Capability manifest + legacy baseline (19 named protected paths + index + login / 14 sidebar items) + setup/sidebar gates (single namespace, class-validator DTOs) | active | `.omo/plans/retail-multirubro-phase-execution.md#stage-1` |
| s2-shared-foundations | Decimal UOM (typed canonical bases, no `pack` category), snapshots, CSV state-machine parser (exact dialect), QR + textual PDF labels (`qr_text_price`/`qr_text`/`qr_only`), full PostgreSQL `pg_dump -Fc` / `pg_restore` restore safety (adds `pg_restore` helpers on top of `BackupService`) | active | `.omo/plans/retail-multirubro-phase-execution.md#stage-2` |
| s3-returns-primitives | SaleReturnController (`@Controller('sales')`) + SaleReturnService (disposition per `sale_return_item`, no separate `RETURN_RECEIPT`), separate `credit_notes` table (latest AFIP attempt + AuditLog per attempt), packs/bundles, typed promotion primitives | active | `.omo/plans/retail-multirubro-phase-execution.md#stage-3` |
| s4-structural-families | Weight (reuses `unitOfMeasureId`, no `measureUnitId`; GS1 AIs + configurable local EAN-13), variants (Product.parentProductId + product_variant_attributes, no product_relations), lots/serials with `locationId`, wholesale (CustomerGroup + Customer.customerGroupId + sales_orders/sales_order_items entities), consignment (own module) — no new top-level routes | active | `.omo/plans/retail-multirubro-phase-execution.md#stage-4` |
| s5-overlays-profiles | Ordered apply chain with explicit return-type contracts (`ApplyPriceResult`/`ApplyPaymentResult`/`ApplyLedgerResult`), three generated migrations (PromotionsAndCoupons, LoyaltyLedger, StoreCreditLedger) with idempotency (`reversalOfId` + unique `idempotencyKey`), profileKey + capabilitiesJson for mixed businesses | active | `.omo/plans/retail-multirubro-phase-execution.md#stage-5` |

## Open assumptions (announced defaults)
<!-- Record any default you adopt instead of asking, so the user can veto it at the gate. -->

| assumption | adopted default | rationale | reversible? |
| --- | --- | --- | --- |
| Stage count | 5 stages, exact same waves as roadmap | Roadmap already split tasks 1-5 / 6-11 / 12-15 / 16-22 / 23-24; matching waves preserves dependency isolation | Sí, fusionar o subdividir cambia gates |
| Migration policy | One schema, one migration stream, unconditional | Stated user rule; `migrations.consistency.spec.ts` enforces registration | Sí, vía forward corrective migration |
| Migration timestamps | Generated at apply time with `npm run migration:generate` from `apps/backend`; the leading timestamp must be strictly greater than the latest entry currently registered in `apps/backend/src/migrations.ts` at execution time. Descriptive suffix is the stable id | Stated Oracle rule; fixed numbers drift away from reality and create avoidable foot-guns | Sí |
| Decimalization rollback | Forward-only; down migration aborts when fractional rows exist | Stated Oracle rule; data-bearing tables are forward-only by default | Sí, vía forward corrective migration after prune |
| Capability model | Profile = one primary preset; capabilities drive behavior; backend authoritative; single namespace `POLICY.*` / `STRUCTURAL.*` / `TOOLING.*` / `COMMERCIAL.*` / `FISCALITY.*` / `APP_ROUTES.*` | Stated Oracle rule; current ConfigurationService singleton is the host | Sí, vía `profileVersion` bump |
| Decimal quantities flag | `STRUCTURAL.decimal_quantities` (positive); `legacy=false`, decimal profiles `true`; only gates the parser, never the basic validation path | Stated Oracle rule; the previous inverted `POLICY.quantity_validation` capability was confusing and unnecessary because basic validation always runs as a pure policy using `Product.unitOfMeasureId` and UOM `precision` | Sí |
| Mixed businesses | `profileKey + capabilitiesJson` overrides; never combined preset strings | Stated Oracle rule; explicit user selection only | Sí |
| Existing installs | Migrate to `legacy` with zero visible behavior change | Stated user rule; protects prod data | Sí |
| Frontend visibility | Hook/context reads manifest; never bypasses backend | Stated user rule; no frontend-only enforcement | Sí |
| Sidebar / App routes | Sidebar 14 nav items (including `Ubicaciones` and `Reposición`); App.tsx 19 named protected paths + 1 protected index redirect + 1 public login; unchanged for `legacy`; S4 adds zero new routes (replenishment is baseline before S1) | Stated Oracle rule; verified `Sidebar.tsx:55-138`, `App.tsx:81-100` | Sí, vía forward corrective migration |
| Resolver rules | Known keys + boolean values + known preset names + capabilitiesSchemaVersion only; no inter-capability dependency rules | Stated Oracle rule | Sí |
| DTO pattern | NestJS `class-validator` + `@ApiProperty`, matching existing `UpdateConfigurationDto` / `fiscal-configuration.dto.ts` | Stated Oracle rule; matches current codebase | Sí |
| Restore safety path | PostgreSQL `pg_dump -Fc` / `pg_restore` flow. Current `BackupService` only creates custom-format dumps (`pg_dump -Fc`); S2 adds `pg_restore` lookup/execution helpers. Temporary DB flow uses admin connection to `CREATE DATABASE <temp>`, then `pg_restore --dbname=<temp>` (no `--create` archive semantics). Production swap is `pg_restore --clean --if-exists --single-transaction` against production under packaged-backend maintenance orchestration | Stated Oracle rule; SQLite branch removed; system is PostgreSQL-only | Sí |
| Performance budgets | scan p95 ≤ 300 ms; 20-line recalc ≤ 100 ms; local submit ≤ 2 s | Stated roadmap success criterion | Sí, budgets se ajustan con benchmark real |
| New dependencies | None — current stack only (npm + turbo, qrcode already installed for invoice QR and now also labels) | Stated user rule | Sí |
| Auto-start of servers | Forbidden — user-managed | Stated rule in AGENTS.md | Sí |
| Catalog import | CSV-only state-machine parser; exact dialect specified (UTF-8 header, comma, CRLF/LF, quoted commas, escaped quotes); embedded newline in quoted field rejected; XLSX waits for explicit dependency approval | Stated Oracle rule; no parser library installed today | Sí, vía approval + dependency |
| Labels | `qr_text_price` (default) / `qr_text` / `qr_only`; QR (already-installed `qrcode`) + textual SKU/barcode + price through existing `pdf-generator.service.ts`; 1D barcode rasterization is a blocked optional follow-up | Stated Oracle rule; no 1D generator available without a new dependency; printer diagnostics include `qrSupported` so the label queue verifies QR compatibility before printing | Sí, vía approval + dependency |
| UOM canonical bases | `unit → un`, `weight → kg`, `volume → l`, `length → m` (typed constant); `g/ml` normalize to category canonical base; `pack` is not a UOM category | Stated Oracle rule; product packs are a separate S3 concept | Sí |
| Weight S4 column set | Reuses S2 `Product.unitOfMeasureId`; **no** separate `measureUnitId` | Stated Oracle rule; avoids duplication | Sí |
| Variable barcode parser | Covers GS1 AI `310n` (net kg) and price AIs `392n`/`393n`, plus a configurable local EAN-13 layout (`prefix`, `productCodeRange`, `valueRange`, `valueType weight|price`, `decimalPlaces`, `checkDigit`); no invented `*<weight>@<price>/kg` syntax | Stated Oracle rule | Sí |
| Sectorized stock | `product_lot_balances.locationId` nullable (required in sectorized mode); `product_serials.locationId` nullable; allocation/receiving/count/return preserve `locationId` | Stated Oracle rule | Sí |
| Setup wizard | `NEXOPOS_PROFILE_KEY` is part of the same atomic `.env` write; no IPC call; no inferred recommendation; no `setup-wizard-steps.ts` | Stated Oracle rule | Sí |
| Variants | `Product.parentProductId` self-FK + `product_variant_attributes` table; no `product_relations` entity | Stated Oracle rule | Sí |
| CustomerGroup ownership | customers module | Stated Oracle rule | Sí |
| Wholesale persistence | `Customer.customerGroupId` + `customer_groups` + `price_lists` + `quantity_break_prices` + `sales_orders` + `sales_order_items` entities | Stated Oracle rule | Sí |
| Consignment | own module (`apps/backend/src/modules/consignment/`); not product catalog CRUD | Stated Oracle rule | Sí |
| Returns ownership | `SaleReturnController` under `@Controller('sales')` + `SaleReturnService`; existing `SalesController` unchanged | Stated Oracle rule | Sí |
| Return disposition | On each `sale_return_item`, not on the header | Stated Oracle rule; one return can restock one item and quarantine another | Sí |
| Non-fiscal return | `SaleReturn` itself is the persisted document; the existing PDF path renders its receipt via `SaleReturnService.renderReceiptPdf()`; no separate `RETURN_RECEIPT` document/entity | Stated Oracle rule | Sí |
| Credit note retries | `CreditNote` stores the latest `attemptId`/`status`/`error`/`payloadSnapshot`; each attempt is audit-logged through existing `AuditLog` (entity `credit_note`, action `ATTEMPT`) | Stated Oracle rule | Sí |
| Promotion primitives (S3) | Typed pure models/policies; `manual-discount` and `price-override` persist via existing `AuditLog`; `quantity-break` accepts a typed list as input (no S4 table reference); `coupon` / `loyalty` / `store-credit` typed and unit-tested, enforced/persisted in S5 | Stated Oracle rule; removes contradictory "persistence-only" claim | Sí |
| Promotion enforcement (S5) | Ordered `apply*` chain in `apply.ts`: before totals/tax (manual discount, price override, quantity break, time-bound promotion, coupon — all return `ApplyPriceResult`/`Adjustments[]`) → after total (loyalty redemption + store credit return `ApplyPaymentResult`/`PaymentAllocation[]`) → after committed sale (loyalty earning returns `ApplyLedgerResult`/`LedgerMovement`); returns reverse idempotently via additional rows with `reversalOfId` + unique `idempotencyKey` | Stated Oracle rule | Sí |
| Promotion persistence (S5) | Three generated migrations (`AddPromotionsAndCoupons`, `AddLoyaltyLedger`, `AddStoreCreditLedger`) for `promotions`/`coupons`/`coupon_redemptions`/`loyalty_accounts`/`loyalty_movements`/`store_credit_accounts`/`store_credit_movements`; quantity breaks reuse S4 `quantity_break_prices`; no precedence table | Stated Oracle rule | Sí |
| Stocktake concurrency | expected quantity at approval = snapshot quantity + sum(IN movements since start) − sum(OUT movements since start); variance = counted − adjusted expected | Stated Oracle rule | Sí |
| App module registry | `apps/backend/src/app.module.ts` imports new modules only; controllers are registered in their owning modules | Stated Oracle rule | Sí |
| S1 metadata-column rollback | Forward corrective migration that drops the four new columns only after proving every row is `profileKey='legacy'` AND `capabilitiesJson='{}'` AND `capabilitiesSchemaVersion=1`; otherwise preserve | Stated Oracle rule | Sí |
| Commit policy | Each stage requires explicit user approval at exit gate | Stated user rule in prompt | Sí |
| Workspace tool | `npm` (root is npm workspaces with turbo); never `pnpm` | Stated Oracle rule; verified `package.json:5-7` | Sí |

## Findings (cited - path:lines)

- Configuration is a global singleton with no capabilities; flags live on `SystemConfiguration`. (`apps/backend/src/modules/configuration/configuration.service.ts:13-145`, `entities/system-configuration.entity.ts:7-60`).
- `SystemConfiguration` carries sectorized-stock fields (`stockSectorizado`, `primarySaleLocationId`, `defaultReceiveLocationId`, `stockMinimoVenta`) that must remain unaffected by S1–S5. (`apps/backend/src/modules/configuration/entities/system-configuration.entity.ts:31-54`).
- App routes: `App.tsx` declares 19 named protected paths plus 1 protected `<Route index …>` redirect and 1 public `/login` route. The 19 named paths (including `inventory/replenishment`) are listed in S1.1.2. (`apps/frontend/src/App.tsx:81-100`).
- Sidebar: `Sidebar.tsx` defines exactly 14 `navItems` (including `Ubicaciones` and `Reposición`). (`apps/frontend/src/components/Sidebar.tsx:55-138`).
- `ProtectedRoute.tsx` already exists; S1 *modifies* it (does not create a new file). (`apps/frontend/src/components/ProtectedRoute.tsx:1-31`).
- SaleForm fetches `/api/configuration` directly and parses manual quantity with `Number.parseInt(buffer, 10)`. (`apps/frontend/src/features/sales/components/SaleForm.tsx:139-153, 332-345`).
- Backend and frontend both calculate totals (SaleForm reducer + `SalesService.calculateTotals`). (`SaleForm.tsx:201-214`, `sales.service.ts:113-...`).
- SalesService snapshots only basic product fields (code, description, unitPrice, discount). (`sales/entities/sale-item.entity.ts:38-100`).
- Cancellation emits `RETURN` stock movement; not a partial return document. (`sales.service.ts:630-710, 995`).
- InvoiceService authorizes A/B/C; no credit-note support. (`sales/services/invoice.service.ts:14-189`, `sales/entities/invoice.entity.ts:19-54`).
- Products are flat (no variants/lots/serials/bundles/packs). (`products/entities/product.entity.ts:1-133`).
- `PurchasesService` exists; lot + serial capture is added to that same service. (`apps/backend/src/modules/purchases/purchases.service.ts`).
- No import / label / stocktake / vertical models exist. (Roadmap T8..T10; verified absence in `apps/backend/src/modules/products/`).
- Desktop setup wizard writes `.env` *before* backend configuration; today that write covers DB + JWT only. (`apps/desktop/electron/setup-wizard.ts:67-83`).
- `migrations.ts` + `migrations.consistency.spec.ts` enforce registration. (`apps/backend/src/migrations.ts:19-33`, `migrations.consistency.spec.ts:45-62`).
- Backend is npm + turbo; `pnpm` is not the workspace tool. (`package.json:5-7`, `apps/backend/package.json:6-23`).
- `apps/backend/src/entities.ts` is the registry every new entity must join. (`apps/backend/src/entities.ts:65-98`).
- `qrcode` is already installed (used for invoice QR; now also for product labels). `pdf-lib`, `bwip-js`, `xlsx`, `csv-parse`, `papaparse` are not. (`apps/backend/package.json`).
- Existing DTOs follow the `class-validator` + `@ApiProperty` pattern (`apps/backend/src/modules/configuration/dto/`).
- `BackupService` currently implements only `pg_dump -Fc`; it does **not** implement `pg_restore`. (`apps/backend/src/modules/backup/backup.service.ts:27, 126-290`).
- `pdf-generator.service.ts` renders PDFs for invoices and is reusable for any persisted document with a typed render-data builder.
- `Invoice` has a unique `saleId` link today; S3's `credit_notes` lives in a separate table and never modifies `invoices`.

## Decisions (with rationale)

- One plan, five stages — matches user choice ("Un plan, cinco etapas").
- All 24 roadmap tasks preserved; stage boundaries match waves.
- Each stage begins with a phase-entry drift revalidation checkpoint and ends with an exit gate.
- Backend is authoritative; profile is one primary preset; capabilities live in a single namespace.
- ConfigurationService/ConfigurationController are extended, never duplicated. New DTOs use `class-validator`.
- Setup wizard writes `NEXOPOS_PROFILE_KEY` atomically in the same `.env` write.
- Decimalization is forward-only; down migration aborts when fractional rows exist.
- Resolver validates only known keys + boolean values + known preset names + capabilitiesSchemaVersion.
- Decimal quantities is positive (`STRUCTURAL.decimal_quantities`); basic quantity validation always runs as a pure policy using `Product.unitOfMeasureId` and UOM `precision`. The capability only switches the parser.
- Mixed businesses are `profileKey + capabilitiesJson` overrides; no combined preset strings.
- S4 adds no new top-level routes.
- Catalog import is CSV-only with a small state-machine parser; explicit dialect; XLSX waits.
- Labels produce QR + textual SKU/barcode + price PDF via the existing `pdf-generator.service.ts` + `qrcode`; templates are `qr_text_price`/`qr_text`/`qr_only`; 1D deferred.
- Variable barcode parser covers GS1 AIs `310n`/`392n`/`393n` plus a configurable local EAN-13 layout.
- Weight S4 reuses `Product.unitOfMeasureId` from S2; no separate `measureUnitId` column.
- Restore safety follows the full PostgreSQL `pg_dump -Fc` / `pg_restore` flow with `pg_restore` lookup/execution helpers added on top of `BackupService`; no SQLite branch.
- Wholesale persistence: `Customer.customerGroupId` + `customer_groups` + `price_lists` + `quantity_break_prices` + `sales_orders` + `sales_order_items`.
- Stage 5 typed apply functions with explicit return-type contracts (`ApplyPriceResult`/`ApplyPaymentResult`/`ApplyLedgerResult`); idempotency via `reversalOfId` + unique `idempotencyKey`.
- `SaleReturn` itself is the persisted document for non-fiscal returns; no separate `RETURN_RECEIPT` entity.
- Disposition lives on each `sale_return_item`, not on the return header.
- Credit note retries: latest attempt state on the `credit_notes` row; every attempt audit-logged through existing `AuditLog`.
- `apps/backend/src/app.module.ts` imports new modules only; controllers live in their owning modules.
- Production rollback is always a forward corrective migration; no `DROP COLUMN` against data-bearing tables, no migration deletion. S1 metadata columns may only be dropped after every row proves to be `legacy` with empty overrides.
- Variants = `Product.parentProductId` + `product_variant_attributes` (no `product_relations`).
- `CustomerGroup` lives in customers module; consignment owns its own module.
- `SaleReturnController` (under `@Controller('sales')`) + `SaleReturnService`; existing `SalesController` unchanged.
- S3 promotion primitives are typed pure models/policies; only `manual-discount` and `price-override` persist via existing `AuditLog`; `quantity-break`/`coupon`/`loyalty`/`store-credit` are typed and tested but enforced/persisted in S5.
- S5 ordered apply chain: before totals/tax (manual discount, price override, quantity break, time-bound promotion, coupon — `ApplyPriceResult`) → after total (loyalty redemption + store credit — `ApplyPaymentResult`) → after committed sale (loyalty earning — `ApplyLedgerResult`); returns reverse idempotently via additional rows.
- No Playwright is invoked unless the user-managed servers are already running.

## Scope IN

- Five stages with entry/exit gates and revalidation checkpoints.
- Exact files (create / modify / test) and migration-name patterns per stage.
- TDD commands + expected outcomes + evidence paths per stage. Backend commands run from `apps/backend` and use `src/...`; frontend uses `npm test` from `apps/frontend`.
- Rollback strategy per stage: forward corrective migrations, never delete applied migrations.

## Scope OUT (Must NOT have)

- Implementation work, commits, pushes, deploys, auto-started dev servers.
- New dependencies, new ports, generic plugin systems.
- Profile-name conditionals anywhere in code.
- Frontend-only capability enforcement.
- SaaS, multi-tenancy, multi-location, multi-currency, services, gastronomy, pharmacy, WMS, generic rules engine.
- New `ReceivingService` / `recommend-profile.ts` providers.
- Combined preset strings (`apparel+wholesale` etc.).
- `pdf-lib`, `bwip-js`, `xlsx`, `csv-parse` or any 1D-barcode/XLSX/CSV library not currently installed.
- SQLite restore branch.
- New top-level routes in S4.
- Inter-capability dependency rules or cycle rejection in the resolver.
- Separate `RETURN_RECEIPT` document/entity for non-fiscal returns.
- Fixed migration timestamps (all timestamps are generated at apply time).
- `@ValidateNested` on raw `Record` for `UpdateCapabilitiesDto.capabilities`.
- The previous inverted `POLICY.quantity_validation` capability and `assertCapabilityEnabled('POLICY.quantity_validation')` on basic validation.
- A separate `measureUnitId` column on `Product`; weight reuses `Product.unitOfMeasureId` from S2.
- Invented `*<weight>@<price>/kg` syntax.

## Open questions

- None blocking. The user has already approved "Todas las etapas ahora" and "Un plan, cinco etapas". Stage-level execution still requires explicit per-stage approval at each exit gate.

## Approval gate

status: approved
approach: Un único plan de ejecución con cinco etapas (S1..S5) que mapea 1:1 los waves del roadmap retail-multirubro, reutiliza ConfigurationService/ConfigurationController (sin abstracciones paralelas), persiste NEXOPOS_PROFILE_KEY en el mismo write atómico de .env del setup wizard, usa namespace único de capacidades (POLICY.*, STRUCTURAL.*, TOOLING.*, COMMERCIAL.*, FISCALITY.*, APP_ROUTES.*) y nunca autoriza commits ni auto-start de dev servers.
evidence:
- User selected "Todas las etapas ahora" and approved "Un plan, cinco etapas" during the planning interview.
- Roadmap at `.omo/plans/retail-multirubro-roadmap.md` is `status: approved`; draft at `.omo/drafts/retail-multirubro-roadmap.md` is `status: approved`.
- Plan written at `.omo/plans/retail-multirubro-phase-execution.md`; 5 stages map tasks 1-5, 6-11, 12-15, 16-22, 23-24.
- Momus-drift corrections applied: route count updated to 19 named protected paths + 1 protected index redirect + 1 public login (App.tsx) and 14 sidebar nav items including `Ubicaciones` and `Reposición` (Sidebar.tsx); capability keys `APP_ROUTES.inventory_locations`, `APP_ROUTES.inventory_locations_activate`, and `APP_ROUTES.inventory_replenishment` added with `legacy` enabling all three; legacy mapper now includes all existing fields including sectorized-stock fields (`stockSectorizado`, `primarySaleLocationId`, `defaultReceiveLocationId`, `stockMinimoVenta`); hardcoded `1771000000000` removed (every migration pattern says "strictly greater than the latest entry in `apps/backend/src/migrations.ts` at execution time"); `POLICY.quantity_validation` replaced with positive `STRUCTURAL.decimal_quantities` (legacy `false`, decimal profiles `true`); basic quantity validation always runs as a pure policy using `Product.unitOfMeasureId` and UOM `precision`; `SaleForm` parser switches between `parseInt`/`parseFloat` only; stocktake concurrency model rewritten: expected at approval = snapshot + sum(IN movements since start) − sum(OUT movements since start); `BackupService` ground truth recorded (today only `pg_dump -Fc`; S2 adds `pg_restore` lookup/execution helpers); temp DB flow uses admin connection `CREATE DATABASE <temp>` + `pg_restore --dbname=<temp>` (no `--create` archive semantics); label template names unified to `qr_text_price`/`qr_text`/`qr_only`; return disposition moved to `sale_return_item` (not header); non-fiscal return uses `SaleReturn` itself + existing PDF path (no `RETURN_RECEIPT` document); credit-note retries store latest attempt state on the `credit_notes` row with each attempt audit-logged through existing `AuditLog`; S3 `quantity-break` model accepts a typed list as input (no S4 table reference); weight S4 reuses `Product.unitOfMeasureId` (no separate `measureUnitId`); variable barcode parser contract covers GS1 AIs `310n`/`392n`/`393n` plus configurable local EAN-13 layout; invented `*<weight>@<price>/kg` syntax removed; `product_lot_balances.locationId` and `product_serials.locationId` added (nullable, required in sectorized mode); wholesale persistence includes `Customer.customerGroupId` + `sales_orders` + `sales_order_items`; S5 typed return contracts (`ApplyPriceResult`/`Adjustments[]` for price, `ApplyPaymentResult`/`PaymentAllocation[]` for loyalty redemption + store credit, `ApplyLedgerResult`/`LedgerMovement` for loyalty earning); S5 idempotency fields (`reversalOfId` + unique `idempotencyKey`) on `coupon_redemptions`/`loyalty_movements`/`store_credit_movements`; `app.module.ts` only imports new modules; `UpdateCapabilitiesDto.capabilities` uses `@IsObject` only (no `@ValidateNested`); three generated S5 migrations (`AddPromotionsAndCoupons`, `AddLoyaltyLedger`, `AddStoreCreditLedger`).
- All previous Oracle and self-review corrections remain applied (single capability namespace, class-validator DTOs, legacy mapper, sectorized-stock map, `<generated>-Name.ts` migration pattern, `entities.ts` + `TypeOrmModule.forFeature` registration, decimalization forward-only, CSV state-machine parser with explicit dialect, QR + textual PDF labels, PostgreSQL `pg_dump -Fc` / `pg_restore` restore safety without SQLite, `SaleReturnController` under `@Controller('sales')` + `SaleReturnService`, existing PurchasesService reuse, no new S4 routes, mixed businesses as `profileKey + capabilitiesJson`, typed canonical-base UOM, `Product.parentProductId` + `product_variant_attributes`, `CustomerGroup` in customers module, consignment in its own module, npm/turbo commands, restore-safety full PostgreSQL flow, forward corrective migration rollback only, no PromotionEngine / ReceivingService / recommend-profile / mobile-shop / combos / pdf-lib / bwip-js / setup-wizard-steps / SQLite references).
- Momus final re-review returned `[OKAY]` for the previously verified plan. During S1 entry revalidation, uncommitted stock-sectorizado work on `main` added `inventory/replenishment` and `Reposición`; the user explicitly chose to preserve that work and approved re-baselining the plan from 18/13 to 19/14 with `APP_ROUTES.inventory_replenishment` enabled for `legacy`.
pending: implementation requires an explicit per-stage user request at each exit gate; no commit/merge/deploy is authorized by this plan.
review: Oracle corrections, self-review and Momus drift corrections applied; Momus final re-review `[OKAY]`
review_required: false

# NexoPOS Retail Multi-Rubro — Work Plan

## TL;DR (For humans)
<!-- Fill this LAST, after the detailed plan below is written, so it summarizes the REAL plan. -->
<!-- Plain English for a non-engineer: NO file paths, NO todo numbers, NO wave/agent/tool names. -->

**What you'll get:** Un único NexoPOS local que conserva el comportamiento actual y puede combinar capacidades para venta por unidad, alta rotación, peso, variantes, lotes, series, wholesale y consignación.

**Why this approach:** Primero se construyen las bases compartidas —capacidades, cantidades/UOM, importación, conteos, devoluciones y recuperación— y después cada familia estructural. Así no se crean forks ni funciones a medias.

**What it will NOT do:** No será SaaS, multi-sucursal, multimoneda, restaurante, sistema de servicios, farmacia ni ERP/WMS enterprise. Tampoco promete soporte universal de hardware.

**Effort:** XL
**Risk:** High - quantity, stock identity, returns and fiscal documents cross every transactional module, but the roadmap isolates those risks by phase.
**Decisions to sanity-check:** single store/currency; return requires original sale; PDF labels first; manual/variable-barcode weight before direct scale; promotions after structural families.

Your next move: seleccionar una fase cuando se quiera implementar. Esta planificación no autoriza cambios de código ni commits. Full execution detail follows below.

---

> TL;DR (machine): XL/high-risk dependency roadmap; 24 independently verifiable tasks covering legacy capabilities, common retail tools, returns/fiscality and eight composable retail families.

## Scope
### Must have
- One codebase, PostgreSQL schema, migration registry and Electron installer.
- `legacy` profile preserving all current behavior.
- Backend capability source of truth; frontend capability-derived visibility.
- Explicit policy boundaries for quantity, stock identity, price, sale validation, receiving and returns.
- Common retail tooling: validated import, product labels, stocktake sessions, inventory reason/audit, restore and device diagnostics.
- True returns/exchanges linked to original sale and AFIP credit-note support.
- Distinct semantics for UOM conversion, sellable pack, bundle and variable measure.
- End-to-end support for weight, variants, lot/expiry, serial/warranty, wholesale pricing and consignment.
- Measurable checkout performance and migration consistency in every phase.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- Vertical branches/builds, customer-name conditionals or profile-specific migrations.
- SaaS, multi-tenancy, remote flag service, multi-location/transfers or multi-currency.
- Gastronomy, appointments/services, regulated pharmacy, WMS, repairs platform or omnichannel.
- Generic plugin marketplace or generic promotion rules engine.
- Frontend-only capability enforcement.
- Conditional schema migrations by profile.
- Direct scale/printer claims without explicit supported protocol/model.
- Commits unless the user explicitly asks at execution time.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: TDD. Jest unit/integration/API for NestJS; Vitest/Testing Library for React; Playwright only when the user-managed frontend/backend are already running; desktop build/package smoke without auto-starting dev servers.
- Evidence: .omo/evidence/task-<N>-retail-multirubro-roadmap.<ext>

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. Fewer than 3 (except the final) means you under-split.

- **Wave 1 — Safety and capability seam:** Tasks 1-5.
- **Wave 2 — Shared structural foundation and tools:** Tasks 6-11 after Wave 1; tasks 8-11 can parallelize after task 7.
- **Wave 3 — Complete common retail:** Tasks 12-15 after task 7; 12 blocks 13.
- **Wave 4 — Structural retail families:** Tasks 16-22 according to dependencies.
- **Wave 5 — Commercial overlays and final profiles:** Tasks 23-24.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 | - | 2-24 | - |
| 2 | 1 | 3-5, 24 | - |
| 3 | 2 | 4-5 | - |
| 4 | 3 | 5, 12-24 | - |
| 5 | 4 | 24 | - |
| 6 | 1, 4 | 7, 14, 16-22 | - |
| 7 | 6 | 8-22 | - |
| 8 | 7 | 16-22 | 9, 10, 11 |
| 9 | 7 | 18-22 | 8, 10, 11 |
| 10 | 7 | 14, 16-18 | 8, 9, 11 |
| 11 | 5 | 16-17, 24 | 8, 9, 10 |
| 12 | 7 | 13, 18-22 | 14, 15 |
| 13 | 12 | 18-22 | 14, 15 |
| 14 | 7, 10 | 16, 20, 22 | 12, 15 |
| 15 | 7 | 20, 23 | 12, 14 |
| 16 | 6, 7, 10, 14 | 17 | 18 |
| 17 | 11, 16 | 24 | 18 |
| 18 | 7, 8, 9, 12 | 20 | 16-17 |
| 19 | 7, 8, 9, 12, 13 | 24 | 20-22 |
| 20 | 12, 13, 18 | 24 | 19, 21, 22 |
| 21 | 7, 12, 13 | 24 | 19, 20, 22 |
| 22 | 7, 9, 12, 14 | 24 | 19-21 |
| 23 | 12, 15 | 24 | 19-22 |
| 24 | 5, 11, 17, 19-23 | Final wave | - |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [ ] 1. Lock legacy behavior and checkout performance baseline
  What to do / Must NOT do: Add regression characterization for unit products, integer stock, barcode lookup, paid/on-account sales, purchase stock-in, cancellation reversal, out-of-stock policy and reports. Add a repeatable local benchmark for scan→line, 20-line total recalc and local submit; do not change behavior while characterizing.
  Parallelization: Wave 1 | Blocked by: - | Blocks: 2-24
  References: `apps/backend/src/modules/products/products.service.spec.ts`, `sales/sales.service.spec.ts`, `inventory/inventory.service.spec.ts`, `apps/frontend/src/features/sales/components/SaleForm.spec.tsx`, `useBarcodeScanner.spec.ts`, `.omo/ulw-research/20260808-retail-multirubro/SYNTHESIS.md#invariantes-de-velocidad-y-seguridad`
  Acceptance criteria: backend/frontend unit tests pass; benchmark evidence records p50/p95 and proves no assertion changed; migration consistency passes.
  QA scenarios: Tool `Jest/Vitest + benchmark script` → run unit fixtures and 1,000 local scan/recalc iterations → Expected: legacy assertions green and baseline stored in `.omo/evidence/task-1-retail-multirubro-roadmap.json`.
  Commit: N | No commit without explicit user request.

- [ ] 2. Define capability vocabulary and profile presets
  What to do / Must NOT do: Create typed keys for supported structural/common capabilities and presets for `legacy`, unit retail, fast packaged, weight, apparel, lot retail, electronics, wholesale and consignment. A profile only proposes capabilities; never branch logic on profile name.
  Parallelization: Wave 1 | Blocked by: 1 | Blocks: 3-5, 24
  References: `apps/backend/src/modules/configuration`, `docs/planificacion-multirubro-completa.md`, `.omo/ulw-research/20260808-retail-multirubro/SYNTHESIS.md#arquitectura-recomendada`
  Acceptance criteria: exhaustive tests prove every profile references only known keys, structural dependencies resolve, and mixed profiles can add/remove safe capabilities.
  QA scenarios: Tool `Jest` → load all presets and invalid/contradictory overrides → Expected: valid manifests deterministic; unknown or dependency-breaking keys rejected with typed error.
  Commit: N | No commit without explicit user request.

- [ ] 3. Persist profile and capability overrides with legacy migration
  What to do / Must NOT do: Extend `SystemConfiguration` with profile key/version and enabled/disabled overrides; migrate every existing DB to `legacy` without changing current flags. Register migration chronologically in `migrations.ts`; never make migration conditional on profile.
  Parallelization: Wave 1 | Blocked by: 2 | Blocks: 4-5
  References: `apps/backend/src/modules/configuration/entities/system-configuration.entity.ts`, `configuration.service.ts`, `apps/backend/src/migrations.ts`, `migrations.consistency.spec.ts`, `AGENTS.md`
  Acceptance criteria: fresh and legacy DB fixtures converge to same schema; existing values survive; consistency spec passes from `apps/backend`.
  QA scenarios: Tool `Jest integration` → migrate clean DB and pre-feature snapshot → Expected: `legacy` effective capabilities reproduce current behavior and no business data changes.
  Commit: N | Migration + index would be atomic only after explicit request.

- [ ] 4. Add backend capability resolver and enforcement boundary
  What to do / Must NOT do: Resolve preset + overrides into one effective manifest; expose it from configuration API; provide focused helpers/guards for services. Backend remains authoritative; do not introduce a remote flag service or profile-name checks.
  Parallelization: Wave 1 | Blocked by: 3 | Blocks: 5, 12-24
  References: `configuration.module.ts`, `configuration.controller.ts`, `configuration.service.ts`, `sales.service.ts:286-1050`, `inventory.service.ts:26-226`
  Acceptance criteria: API returns profile, supported/effective capabilities and version; disabled operations fail before mutation; existing endpoints remain compatible.
  QA scenarios: Tools `Jest + Supertest` → request manifest and invoke allowed/disabled fixture action → Expected: 200 deterministic manifest, typed 409/403 for disabled action, zero DB mutations.
  Commit: N | No commit without explicit user request.

- [ ] 5. Add frontend capability provider, navigation gating and setup selection
  What to do / Must NOT do: Load manifest once, expose typed hook/context, derive sidebar/routes/settings and add profile selection to setup/admin. Keep fiscal setup separate. `legacy` must render exactly the current navigation.
  Parallelization: Wave 1 | Blocked by: 4 | Blocks: 24
  References: `apps/frontend/src/App.tsx:45-95`, `components/Sidebar.tsx`, `pages/settings/SettingsPage.tsx`, `apps/desktop/electron/setup-wizard.ts`, `setup/index.html`
  Acceptance criteria: component tests cover legacy/minimal/mixed manifests; direct navigation to unavailable module redirects with explanation; setup persists selected profile atomically.
  QA scenarios: Tool `Vitest/Testing Library` → render three manifests and setup failure/retry → Expected: stable menu, no hidden-route access and no partial profile write.
  Commit: N | No commit without explicit user request.

- [ ] 6. Introduce exact quantity and UOM foundation
  What to do / Must NOT do: Add unit definitions with code/name/symbol/category/precision/base conversion; migrate product, movement, sale and purchase quantities to exact decimal columns while legacy products keep integer validation. Do not add scale/variant/lot logic here.
  Parallelization: Wave 2 | Blocked by: 1, 4 | Blocks: 7, 14, 16-22
  References: `product.entity.ts:71`, `stock-movement.entity.ts:63`, `sale-item.entity.ts:44`, `purchase-item.entity.ts:40`, create DTOs/schemas, `wave-2-librarian-packs-uom.md`
  Acceptance criteria: exact decimal round trips preserve 0.001 without float drift; legacy unit product rejects fractional sale; migration preserves all integer values.
  QA scenarios: Tools `Jest integration + Vitest` → persist/sell/purchase 0.125 and test unit-only 1.5 → Expected: exact database values/subtotals and explicit rejection for unit-only product.
  Commit: N | No commit without explicit user request.

- [ ] 7. Snapshot unit, quantity, price, tax and structural metadata on lines
  What to do / Must NOT do: Make sale/purchase lines immutable historical facts: product name/code, UOM, conversion, exact quantity, unit price, discount, tax, cost and capability metadata. Centralize quantity/price/sale-validation policy calls; do not recompute old transactions from current product data.
  Parallelization: Wave 2 | Blocked by: 6 | Blocks: 8-22
  References: `sales/entities/sale-item.entity.ts`, `purchases/entities/purchase-item.entity.ts`, `sales.service.ts`, `purchases.service.ts`, `reports.service.ts`
  Acceptance criteria: editing product/UOM/price after transaction does not change historical receipt/report/return basis; backend validates current quote once before persistence.
  QA scenarios: Tool `Jest integration` → create transaction, mutate product/UOM/price, reload reports → Expected: snapshots unchanged and totals identical.
  Commit: N | No commit without explicit user request.

- [ ] 8. Build validated catalog import pipeline
  What to do / Must NOT do: Add staged CSV/XLSX import with stable key strategy (barcode/SKU), preview, field errors, duplicate resolution, explicit commit and rollback/recovery. Reuse ProductService; never call developer seeds.
  Parallelization: Wave 2 | Blocked by: 7 | Blocks: 16-22 | Can parallelize: 9-11
  References: `products/products.service.ts`, `brands.service.ts`, `categories.service.ts`, `pages/products/ProductsPage.tsx`, `wave-3-librarian-common-tools.md`
  Acceptance criteria: valid rows apply in one transaction; invalid file does not mutate DB; duplicate strategy is visible; failed commit can be retried safely.
  QA scenarios: Tools `Jest + Vitest` → import valid, duplicate, scientific-notation barcode, partial invalid and transaction-failure fixtures → Expected: deterministic preview/errors and atomic final state.
  Commit: N | No commit without explicit user request.

- [ ] 9. Add stocktake sessions, reason codes and inventory audit
  What to do / Must NOT do: Model named count session with snapshot, expected/counted quantities, concurrent movement handling, partial scope, review/approval, variance movement and structured reason. Add product/inventory audit types; do not overwrite stock directly.
  Parallelization: Wave 2 | Blocked by: 7 | Blocks: 18-22 | Can parallelize: 8, 10, 11
  References: `inventory/entities/stock-movement.entity.ts`, `inventory.service.ts`, `audit/*`, `StockHistoryDialog.tsx`, `wave-3-librarian-common-tools.md`
  Acceptance criteria: approving once creates exactly one variance movement per changed item; unapproved count never changes stock; concurrent sales are accounted for.
  QA scenarios: Tool `Jest integration` → start count, record sale, count partial products, approve/retry → Expected: movement-adjusted variance, idempotent approval and complete audit.
  Commit: N | No commit without explicit user request.

- [ ] 10. Add product barcode/price label templates and calibrated queue
  What to do / Must NOT do: Generate PDF-first barcode/price labels from product/variant/pack identity, with size/template, preview, test print and batch queue. Keep raw ZPL/ESC-POS drivers deferred; do not reuse invoice PDF as label model.
  Parallelization: Wave 2 | Blocked by: 7 | Blocks: 14, 16-18 | Can parallelize: 8, 9, 11
  References: `sales/services/pdf-generator.service.ts`, `invoice.controller.ts`, `ProductsPage.tsx`, `wave-3-librarian-common-tools.md`
  Acceptance criteria: generated labels contain stable barcode, human-readable code/name/price and correct dimensions; missing identity blocks print with row error.
  QA scenarios: Tool `Jest PDF parser + snapshot` → generate single/batch labels for SKU, GTIN and pack → Expected: parseable barcode payloads, deterministic dimensions and no invoice-specific fields.
  Commit: N | No commit without explicit user request.

- [ ] 11. Make restore, updater recovery and peripheral diagnostics first-class
  What to do / Must NOT do: Add safe restore preflight/backup-before-restore/validation/rollback; updater pending state/log/recovery; support bundle; scanner/print/drawer/scale test surfaces with supported protocol metadata. Do not auto-start dev servers.
  Parallelization: Wave 2 | Blocked by: 5 | Blocks: 16-17, 24 | Can parallelize: 8-10
  References: `backup.service.ts`, `backup.controller.ts`, `BackupPage.tsx`, `desktop/electron/main.ts`, `SettingsPage.tsx`, `BarcodeScannerTest.tsx`, `wave-2-librarian-local-resilience.md`
  Acceptance criteria: fixture backup restores to disposable DB and passes integrity checks; corrupt backup leaves original untouched; support bundle redacts secrets; device tests time out cleanly.
  QA scenarios: Tools `Jest integration + desktop build smoke` → restore valid/corrupt fixtures and simulate absent device/updater error → Expected: rollback, actionable diagnostics and no data loss.
  Commit: N | No commit without explicit user request.

- [ ] 12. Model true partial returns and exchanges
  What to do / Must NOT do: Add return header/items linked to original Sale/SaleItem, returned quantity limits, disposition (restock/quarantine/scrap/supplier), refund allocation, exchange composition and audit. Keep existing whole-sale cancellation unchanged for legacy.
  Parallelization: Wave 3 | Blocked by: 7 | Blocks: 13, 18-22 | Can parallelize: 14, 15
  References: `sales.service.ts:630-710`, sale entities/controller/UI, cash-register, customer-accounts, inventory, reports, `wave-2-explore-returns-blast.md`
  Acceptance criteria: partial returns cannot exceed net sold quantity; financial/stock effects occur once; exchange equals return + new sale; cancellation remains compatible.
  QA scenarios: Tool `Jest integration/API` → return one of two items, quarantine another, retry request, exchange with difference → Expected: exact stock/cash/account/report state and idempotency.
  Commit: N | No commit without explicit user request.

- [ ] 13. Add AFIP credit-note support for returns
  What to do / Must NOT do: Extend fiscal documents for NC A/B/C linked to original invoice, same receiver and verified timing rules; generate/authorize/store/print credit note and connect it to return. Do not use cancellation or non-fiscal note as substitute.
  Parallelization: Wave 3 | Blocked by: 12 | Blocks: 18-22
  References: `sales/entities/invoice.entity.ts`, `invoice.service.ts`, `afip.service.ts`, `invoice.controller.ts`, `wave-3-librarian-arca-returns.md`, `claim-ledger.md`
  Acceptance criteria: fiscal return creates correct credit-note request/reference and persists CAE/status; non-fiscal sale return does not call AFIP; failures remain retryable without duplicate note.
  QA scenarios: Tools `Jest with AFIP mock + Supertest` → factura A/B/C partial return, AFIP timeout/retry, receiver mismatch fixture → Expected: correct document type/reference and exactly-once persistence.
  Commit: N | No commit without explicit user request.

- [ ] 14. Add UOM conversions, sellable packs and component bundles
  What to do / Must NOT do: Implement three explicit semantics: alternate UOM normalized to base stock; sellable pack with own barcode/price/fixed quantity; bundle with component stock. Exclude logistics packages/WMS.
  Parallelization: Wave 3 | Blocked by: 7, 10 | Blocks: 16, 20, 22 | Can parallelize: 12, 15
  References: UOM foundation, products/inventory/sales/purchases/reports, `wave-2-librarian-packs-uom.md`
  Acceptance criteria: pack sale decrements exact base units; bundle decrements components; UOM conversion preserves precision; return reverses same semantics.
  QA scenarios: Tool `Jest integration` → buy case/sell bottle, sell 6-pack, sell 3-component kit and return each → Expected: exact balances/margins/reports with no double decrement.
  Commit: N | No commit without explicit user request.

- [ ] 15. Separate discount, price override, promotion, loyalty and store credit primitives
  What to do / Must NOT do: Preserve current manual discount, add permission/reason audit and typed primitives for future quantity breaks, bundles, coupons, loyalty and store credit. Define stacking/tax/return precedence; do not build generic rules engine yet.
  Parallelization: Wave 3 | Blocked by: 7 | Blocks: 20, 23 | Can parallelize: 12, 14
  References: `SaleTotals.tsx`, sale DTO/entities/service, payment methods/customer accounts, `wave-2-librarian-promotions-loyalty.md`
  Acceptance criteria: manual discount/override require permission and reason; deterministic precedence tests exist; store credit never changes discount/tax basis.
  QA scenarios: Tool `Jest/Vitest` → stack allowed/forbidden fixtures, tax before/after, return discounted line and store-credit refund → Expected: explicit, deterministic totals and audit.
  Commit: N | No commit without explicit user request.

- [ ] 16. Implement weight/measure, PLU and variable barcodes
  What to do / Must NOT do: Add measurement product configuration, tare, manual weight, price/kg/liter/meter, GS1/local variable barcode parser, labels, purchase/stock/return/report support. Do not depend on direct scale hardware.
  Parallelization: Wave 4 | Blocked by: 6, 7, 10, 14 | Blocks: 17 | Can parallelize: 18
  References: quantity/UOM/pack tasks, SaleForm/ProductSearch/scanner, receipt/report code, GS1 sources in `SYNTHESIS.md#3-peso-o-medida`
  Acceptance criteria: cart mixes unit and 0.125kg items; barcode/manual quantities yield exact subtotal/stock/report; tare never enters net stock; legacy products remain integer UX.
  QA scenarios: Tools `Jest/Vitest` → parse valid/invalid weight/price barcode, manual 0.125kg, partial return and mixed cart → Expected: exact values, clear rejection and unchanged unit flow.
  Commit: N | No commit without explicit user request.

- [ ] 17. Add bounded direct-scale integration
  What to do / Must NOT do: Define supported scale model/protocol adapters, stable-weight read, timeout/retry, tare command if supported and test screen. No generic “USB scale” claim; deployment checks model approval separately.
  Parallelization: Wave 4 | Blocked by: 11, 16 | Blocks: 24 | Can parallelize: 18
  References: desktop Electron IPC/preload/types, settings diagnostics, `wave-2-librarian-scales-offline.md`
  Acceptance criteria: simulated protocol adapter returns stable exact reading; unstable/timeout/disconnect never adds item; unsupported device is clearly identified.
  QA scenarios: Tool `adapter contract tests + desktop smoke` → replay stable/unstable/corrupt frames → Expected: deterministic parsed quantity, cancellation and diagnostic logs.
  Commit: N | No commit without explicit user request.

- [ ] 18. Implement parent products and sellable variants
  What to do / Must NOT do: Use parent for catalog aggregation and child sellable product/variant for SKU/barcode/price/stock; matrix generation, bulk import, labels, search, exchange and reports. Parent cannot be sold when variants required.
  Parallelization: Wave 4 | Blocked by: 7, 8, 9, 12 | Blocks: 20 | Can parallelize: 16-17
  References: products entities/repository/service/form/list/search, inventory/sales/purchases/reports, `wave-1-librarian-variants.md`
  Acceptance criteria: stock isolation by variant; parent aggregates without owning stock; duplicate SKU/GTIN rejected; exchange moves correct variants.
  QA scenarios: Tools `Jest integration + Vitest` → generate size/color matrix, import labels, sell/exchange one variant → Expected: correct child identity and parent reports.
  Commit: N | No commit without explicit user request.

- [ ] 19. Implement lot, expiry, FEFO, quarantine and recall
  What to do / Must NOT do: Receive stock by lot/expiry; maintain lot balances/status; suggest FEFO; block/warn expired; quarantine/recall; near-expiry alerts; lot-aware count/return/supplier return/report. Do not claim pharmacy compliance.
  Parallelization: Wave 4 | Blocked by: 7-9, 12-13 | Blocks: 24 | Can parallelize: 20-22
  References: inventory/purchases/sales/returns/reports, `wave-2-librarian-argentina-expiry.md`, verified sources in `SYNTHESIS.md#5-lotes-y-vencimientos`
  Acceptance criteria: receiving creates distinct lot balances; FEFO allocation deterministic; expired/quarantined lot not sold; recall identifies on-hand and sold quantities.
  QA scenarios: Tool `Jest integration` → receive two expiries, sell/return/count/quarantine/recall → Expected: exact lot lineage, blocking and reports.
  Commit: N | No commit without explicit user request.

- [ ] 20. Implement serial/IMEI and warranty lifecycle
  What to do / Must NOT do: Capture unique serial per unit at receiving/sale/return; snapshot warranty; lookup original sale/customer; quarantine/RMA handoff only. Do not build repair scheduling/work orders.
  Parallelization: Wave 4 | Blocked by: 12-13, 18 | Blocks: 24 | Can parallelize: 19, 21, 22
  References: products/inventory/purchases/sales/returns/customer/reports, `wave-1-librarian-serial-warranty.md`
  Acceptance criteria: required serial count equals quantity; duplicate active/sold serial rejected; warranty return matches sold unit and original sale.
  QA scenarios: Tool `Jest integration/API` → receive/sell/return serial, duplicate IMEI, warranty expired/valid → Expected: exact lifecycle and typed errors.
  Commit: N | No commit without explicit user request.

- [ ] 21. Implement wholesale price lists, terms and order fulfilment
  What to do / Must NOT do: Add customer groups, deterministic price lists, quantity breaks, credit/terms, quote→order→partial delivery/invoice, receiving independent of supplier payment and margin visibility. Single currency/location only.
  Parallelization: Wave 4 | Blocked by: 7, 12-13 | Blocks: 24 | Can parallelize: 19, 20, 22
  References: customers/accounts, products/pricing, purchases, sales/invoice, `wave-1-librarian-wholesale.md`
  Acceptance criteria: retail customer gets base price; wholesale group gets correct list/quantity break; credit limit/terms enforced; partial delivery never duplicates stock/invoice.
  QA scenarios: Tool `Jest integration/API` → quote mixed packs, partial deliver twice, invoice, exceed credit → Expected: deterministic pricing/remaining quantities and safe rejection.
  Commit: N | No commit without explicit user request.

- [ ] 22. Implement consignment ownership and settlement
  What to do / Must NOT do: Add consignor/contract, item ownership, split/commission, aging/markdown, payout ledger/hold/reversal, return-to-owner and owner-aware valuation/reports. Keep payout rails/portal optional.
  Parallelization: Wave 4 | Blocked by: 7, 9, 12, 14 | Blocks: 24 | Can parallelize: 19-21
  References: products/inventory/sales/returns/suppliers/accounts/reports/audit, `wave-1-librarian-consignment.md`
  Acceptance criteria: consigned stock excluded from owned inventory value; sale computes settlement; payout idempotent; return preserves ownership.
  QA scenarios: Tool `Jest integration` → intake, markdown, sell, return, settle/reverse two owners → Expected: exact owner balances and audit trail.
  Commit: N | No commit without explicit user request.

- [ ] 23. Add bounded promotions, coupons and loyalty overlays
  What to do / Must NOT do: Implement only typed use cases proven necessary: quantity breaks, time-bound promotion, coupon, loyalty account/reward and store credit, with explicit eligibility/stacking/tax/returns/permissions. Do not introduce arbitrary expression language.
  Parallelization: Wave 5 | Blocked by: 12, 15 | Blocks: 24 | Can parallelize: 19-22
  References: sale pricing/totals/payments/customer accounts, `wave-2-librarian-promotions-loyalty.md`
  Acceptance criteria: each primitive has isolated persistence/calculation/audit; combinations follow precedence table; returns reverse earned/redeemed value correctly.
  QA scenarios: Tool `Jest/Vitest` → BOGO/quantity/coupon/loyalty/store-credit fixtures with returns → Expected: exact totals, non-stack behavior and no tax/payment conflation.
  Commit: N | No commit without explicit user request.

- [ ] 24. Finalize profiles, mixed-business onboarding and capability-scoped UX
  What to do / Must NOT do: Ship tested profile presets and mixed combinations; setup explains recommended capabilities, unsupported/deferred items and hardware requirements; modules load only required data. Update user docs and support matrix.
  Parallelization: Wave 5 | Blocked by: 5, 11, 17, 19-23 | Blocks: Final wave
  References: all previous tasks, `docs/planificacion-multirubro-completa.md`, App/Sidebar/Settings/setup wizard, Odoo loader evidence `SYNTHESIS.md#arquitectura-recomendada`
  Acceptance criteria: profile matrix maps every enabled capability to implemented backend/UI/test; mixed examples operate without new code; legacy remains unchanged; unsupported capability cannot be selected.
  QA scenarios: Tools `Jest/Vitest + build + Playwright if user servers available` → apply every preset and mixed pet-shop/minimarket/electronics/wholesale fixture → Expected: correct module/data loading, no runtime errors and speed budgets met.
  Commit: N | No commit without explicit user request.

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit — every profile/capability maps to implementation, tests and docs; no placeholders.
- [ ] F2. Code quality review — module boundaries, types, transactions, migrations, performance and no scattered profile-name checks.
- [ ] F3. Real manual QA — packaged local install, setup, sale, return, restore and representative mixed profiles; never auto-start user dev servers.
- [ ] F4. Scope fidelity — no SaaS, multi-location, multi-currency, services, pharmacy, WMS or generic rules engine.

## Commit strategy
- This plan does not authorize commits.
- If explicitly requested later: use atomic phase commits; implementation and direct tests stay together; migration file and `migrations.ts` registration stay together.
- Before commits/deploys invoke project `/code-review`; never commit generated bundles/logs unless release scope explicitly requests them.

## Success criteria
- Existing client runs under `legacy` with no visible or data behavior regression.
- All eight retail families are represented by composable, tested capabilities rather than forks.
- Common tools—import, labels, stocktake, returns, restore and diagnostics—are complete before dependent profiles promise them.
- Scan/recalc/submit performance budgets pass on local DB and low-end reference hardware.
- Quantity/UOM, packs, variants, lots, serials, ownership and pricing preserve exact historical snapshots.
- Returns are partial/idempotent, stock-aware, payment-aware and fiscally linked when applicable.
- Every schema migration is unconditional by profile, registered and consistency-tested.
- Product owner can select a profile/mixed capabilities without developer code changes.
- All final reviewers approve and every blocked manual-runtime check is explicitly reported rather than bypassed.

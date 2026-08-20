---
slug: retail-multirubro-roadmap
status: complete
intent: clear
review_required: true
pending-action: none
approach: Un núcleo local compartido, capacidades componibles y roadmap por dependencias para ocho familias retail.
---

# Draft: retail-multirubro-roadmap

## Components (topology ledger)
<!-- Lock the SHAPE before depth. One row per top-level component that can succeed or fail independently. -->
<!-- id | outcome (one line) | status: active|deferred | evidence path -->
| id | outcome | status | evidence path |
| --- | --- | --- | --- |
| core | Proteger núcleo actual y velocidad de caja | active | `SYNTHESIS.md#estado-actual-del-producto` |
| profiles | Perfiles humanos que aplican capacidades, sin lógica por rubro | active | `SYNTHESIS.md#arquitectura-recomendada` |
| common-tools | Importación, labels, stocktake, returns y restore comunes | active | `SYNTHESIS.md#capacidades-comunes-a-todos-los-rubros` |
| quantity-uom | Cantidad decimal, UOM, packs y snapshots | active | `SYNTHESIS.md#semánticas-que-no-deben-mezclarse` |
| weight | Peso/medida, tara, PLU, variable barcode y balanza acotada | active | `SYNTHESIS.md#3-peso-o-medida` |
| variants | Parent/variant con identidad y stock propios | active | `SYNTHESIS.md#4-variantes` |
| lot-expiry | Lote, FEFO, bloqueo, recall y trazabilidad | active | `SYNTHESIS.md#5-lotes-y-vencimientos` |
| serial-warranty | Serial/IMEI, garantía y lifecycle unitario | active | `SYNTHESIS.md#6-series-y-garantías` |
| wholesale | Price lists, quantity breaks, crédito y bultos | active | `SYNTHESIS.md#8-minoristamayorista-híbrido` |
| consignment | Ownership, split, aging y settlement | active | `SYNTHESIS.md#7-consignaciónreventa` |
| promotions | Promos/cupones/loyalty avanzados después de estructuras | deferred | `wave-2-librarian-promotions-loyalty.md` |

## Open assumptions (announced defaults)
<!-- Record any default you adopt instead of asking, so the user can veto it at the gate. -->
<!-- assumption | adopted default | rationale | reversible? -->
| assumption | adopted default | rationale | reversible? |
| --- | --- | --- | --- |
| Instalación | Un local, una DB, una moneda | Preserva producto local y evita enterprise scope | Sí, proyecto futuro |
| Perfiles | Composición de capacidades | Comercios mezclan familias | Sí |
| Returns MVP | Requiere venta original; no negative sale independiente | Seguridad fiscal/stock/pago | Sí |
| Labels iniciales | Barcode/precio en PDF; drivers raw después | Menor riesgo de hardware | Sí |
| Stocktake | Sesión con snapshot, variación y aprobación | Evita ajustes no auditables | Sí |
| Peso inicial | Manual/variable barcode antes de bridge directo | Valor sin prometer hardware genérico | Sí |
| Speed budget | scan p95 ≤300ms; recálculo 20 líneas ≤100ms; submit local ≤2s sin ARCA/print | Hace verificable la prioridad del usuario | Sí |

## Findings (cited - path:lines)
- Current quantities are integer-oriented across product, stock movement, sale and purchase (`apps/backend/src/modules/products/entities/product.entity.ts:71`, `apps/backend/src/modules/sales/entities/sale-item.entity.ts:44`).
- Current cancellation reverses effects but is not a return/exchange document (`apps/backend/src/modules/sales/sales.service.ts:630-710`).
- No operator import, product-label subsystem or stocktake sessions exist (`.omo/ulw-research/20260808-retail-multirubro/wave-2-explore-import-label-stocktake.md`).
- Restore/printer/scale/drawer productization gaps are confirmed (`wave-1-explore-desktop.md`).
- UOM, sellable packs, bundles and logistics packages have distinct semantics (`wave-2-librarian-packs-uom.md`).
- Argentina return/credit-note and lot/expiry claims were gated in `claim-ledger.md`; unsupported metrics/claims are excluded.
- Differentiators per family and common tools are consolidated in `SYNTHESIS.md`.

## Decisions (with rationale)
- One codebase/schema/migration stream; no vertical forks.
- Profile is a preset; capability/policy controls behavior; backend is authoritative.
- Common retail infrastructure precedes vertical features.
- Roadmap order follows structural dependencies, not market labels.
- Promotions/loyalty are separate domains and not prerequisites for structural families.
- Single location/currency and no services/pharmacy/gastronomy.
- Existing install migrates to `legacy` with no visible change.

## Scope IN
- Eight retail families and mixed-business combinations.
- Essential, optional and differentiating functions per family.
- Common core/tooling and productization requirements.
- Architecture boundaries and dependency-first roadmap.
- Verified Argentina fiscal/consumer/lot-expiry constraints relevant to planning.
- Acceptance outcomes, risks, exclusions and future phase gates.

## Scope OUT (Must NOT have)
- Product-code implementation in this planning cycle.
- SaaS, multi-tenancy, remote capability control plane.
- Multi-location/transfers, multi-currency, WMS/enterprise ERP.
- Gastronomy, appointments/services, regulated pharmacy.
- E-commerce/omnichannel, repairs platform, generic promo rules engine.
- Unsupported claims on offline fiscal contingency, universal scale support or vendor waste metrics.

## Open questions
- No blocking question. The announced defaults above can be vetoed at approval.

## Approval gate
status: approved
evidence: User said "Continua con esto por favor" after the approval prompt was interrupted.
review: Momus OKAY — plan references, dependencies, QA and scope are executable with no critical blockers.
pending: none; implementation requires a new explicit user request.
<!-- When exploration is exhausted and unknowns are answered, set status: awaiting-approval. -->
<!-- That durable record is the loop guard: on a later turn read it and resume at the gate instead of re-running exploration. -->

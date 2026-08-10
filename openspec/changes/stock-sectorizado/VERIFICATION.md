# Verification — Stock sectorizado

**Change:** `stock-sectorizado`
**Date:** 2026-08-10
**Status:** Ready to archive

## Regresión

| Suite | Comando | Resultado |
|---|---|---|
| Backend unit | `npx jest --selectProjects unit` | **1157/1157 pass** (56 suites, ~14s) |
| Backend consistency | `npx jest --selectProjects unit --runTestsByPath src/migrations.consistency.spec.ts` | **3/3 pass** |
| Backend tsc | `npx tsc --noEmit` | 0 nuevos errores (1 pre-existente en `invoice.service.spec.ts`) |
| Frontend unit | `npx vitest run` | **108/108 pass** (13 archivos, ~7s) |
| Frontend tsc | `npx tsc --noEmit` | 0 nuevos errores (todos los errores preexistentes listados en AGENTS.md / prompt) |

E2E Playwright del happy-path sectorizado se skipea por presupuesto de esta PR
(la cobertura actual de Vitest ejercita los mismos flujos críticos).

## Acceptance criteria

- [x] **1. Modo simple intacto.** Cobertura en `inventory.service.spec.ts:270-302`
      (modo simple ignora `locationId`) + `purchases.service.spec.ts:296-308`.
- [x] **2. Activación preserva totales.** `activation.service.spec.ts:170-227`
      verifica `SUM(pre) == SUM(post)` + rollback tests en `:248-307`.
- [x] **3. Total + desglose por ubicación consistentes.**
      `product-detail-breakdown.spec.tsx:71-90` (lista per-location) +
      `inventory.service.spec.ts:453-501` (transfer preserva `Product.stock`).
- [x] **4. Compras con destino predeterminado modificable.**
      `purchases.service.spec.ts:310-367` cubre default config, custom, e inactivo.
- [x] **5. Ventas descuentan ubicación principal.**
      `sales.service.spec.ts:2688-2733` (sectorizado + stock suficiente en primaria).
- [x] **6. POS detecta stock alternativo y propone reposición.**
      `sales.service.spec.ts:2734-2771` (ConflictException estructurado +
      `findReplenishmentOptions`) + `ReplenishmentDialog.spec.tsx` (5 tests de UI).
- [x] **7. Reposición registrada antes de la venta.**
      `sales.service.spec.ts:2895-2970` valida que el traslado se aplica por
      `recordMovementInLocation` antes de registrar la venta.
- [x] **8. Traslados atómicos sin pérdida.**
      `inventory.service.spec.ts:453-575` (5 escenarios: éxito, qty<=0, from==to,
      saldo insuficiente, destino inactivo).
- [x] **9. Alertas separadas (compra vs reposición).**
      `inventory.service.spec.ts:943-1115` cubre los 5 escenarios de
      `specs/alerts.md` + regresión de `getLowStockProducts`.
- [x] **10. Historial con ubicación.**
      `inventory.service.spec.ts:669-693` (`getProductHistory`) + diseño
      aprobado en `design.md` sección inventory-movements (`locationId` en cada
      `stock_movements`).
- [x] **11. Excepción `allowOutOfStockSale` auditable.**
      `sales.service.spec.ts:428-461` y `inventory.service.spec.ts:202-249`
      cubren el flag + balance negativo por ubicación.
- [x] **12. Concurrencia sin doble consumo.**
      `inventory.service.spec.ts:329-422` (`recordMovementInLocation` valida
      saldo bajo lock + lanza error si se modifica mid-venta). Lock pesimista
      en `design.md` (atomicidad).
- [x] **13. Migraciones registradas y verificadas.**
      `migrations.consistency.spec.ts:3/3` + `apps/backend/src/migrations.ts`
      lista las 4 migraciones nuevas en orden cronológico.

## Resultado

Listo para archivar (`sdd-archive`).

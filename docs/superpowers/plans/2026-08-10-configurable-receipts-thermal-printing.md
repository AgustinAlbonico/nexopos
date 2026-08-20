# Configurable Receipts and Thermal Printing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable 58/80 mm fiscal and non-fiscal tickets, automatic Electron printing, test printing, and safe reprinting without changing the existing AFIP fallback or PDF flows.

**Architecture:** The backend owns global business/receipt settings and a historical snapshot on each sale. `@sistema/shared` owns JSON-safe contracts and a pure, escaped HTML renderer. Electron owns per-workstation printer settings, printer discovery, hidden-window rendering, and physical printing; React coordinates configuration, preview, auto-print, and reprint.

**Tech Stack:** TypeScript, NestJS 10, TypeORM/PostgreSQL, Jest, React 18, React Query, Vitest, Electron 30, npm workspaces/Turborepo.

**Source design:** `docs/plans/2026-08-10-configurable-receipts-thermal-printing-design.md`

**Repository constraints:** Do not start NestJS or Vite automatically. If manual QA needs them, ask the user to start them. Every migration must be registered in `apps/backend/src/migrations.ts`. No commit may be created unless the user explicitly requests commits.

---

## File map

| Area | Files and responsibility |
|---|---|
| Shared contracts | `packages/shared/src/receipts/types.ts` — JSON-safe receipt and printer contracts |
| Shared validation | `packages/shared/src/receipts/safe-content.ts` — escaping and safe image-data URL parsing |
| Shared renderer | `packages/shared/src/receipts/render-receipt-html.ts` — deterministic 58/80 mm HTML |
| Backend profile | `apps/backend/src/modules/configuration/entities/business-profile.entity.ts`, DTO, service, controller |
| Backend receipt settings | `apps/backend/src/modules/configuration/entities/receipt-settings.entity.ts`, DTO, service, controller |
| Historical snapshot | `apps/backend/src/modules/sales/value-objects/receipt-snapshot.ts`, `sale.entity.ts` JSONB column |
| Canonical document | `apps/backend/src/modules/sales/services/receipt-document.service.ts` |
| Canonical API | Existing `apps/backend/src/modules/sales/invoice.controller.ts` under `/invoices/sale/:saleId/receipt-document` |
| Frontend settings | `apps/frontend/src/features/receipt-settings/**` and `pages/settings/ReceiptSettingsPage.tsx` |
| Frontend sale printing | `apps/frontend/src/features/sales/hooks/useSaleReceiptPrinting.ts` plus existing confirmation/detail components |
| Electron local settings | `apps/desktop/electron/printing/printer-settings.store.ts` |
| Electron printing | `apps/desktop/electron/printing/receipt-printer.service.ts`, `printer-ipc.ts` |
| Electron bridge | Existing `preload.ts` and `apps/frontend/src/types/electron.d.ts` |

Keep each production TypeScript/TSX file below 250 logical lines. Split helpers instead of extending `SettingsPage.tsx`, `main.ts`, or `invoice.service.ts` further.

---

### Task 1: Activate `@sistema/shared` with JSON-safe contracts

**Files:**
- Create: `packages/shared/src/receipts/types.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/receipts/types.spec.ts`
- Modify: `packages/shared/package.json`
- Modify: `packages/shared/tsconfig.json`
- Modify: `apps/backend/package.json`
- Modify: `apps/frontend/package.json`
- Modify: `apps/desktop/package.json`

- [ ] **Step 1: Write the failing contract test**

Create `packages/shared/src/receipts/types.spec.ts` with a compile-time fixture and runtime JSON round-trip:

```ts
import { describe, expect, it } from 'vitest';
import type { ReceiptDocument } from './types';

describe('ReceiptDocument contract', () => {
  it('round-trips using JSON-safe ISO date strings', () => {
    const document: ReceiptDocument = {
      saleId: 'sale-1', saleNumber: 'VENTA-1', issuedAt: '2026-08-10T12:00:00.000Z',
      documentKind: 'sale_receipt', fiscalStatus: 'non_fiscal', isReprint: false,
      customer: null, items: [], payments: [],
      totals: { subtotal: 0, discount: 0, surcharge: 0, tax: 0, total: 0 },
      fiscal: null,
      snapshot: {
        businessName: 'Nexo', address: '', phone: '', email: '', logoDataUrl: null,
        footerMessage: '', showLogo: false, showAddress: false, showPhone: false,
        showCustomer: true, showPayments: true, designVersion: 1,
      },
    };
    expect(JSON.parse(JSON.stringify(document))).toEqual(document);
  });
});
```

- [ ] **Step 2: Run the test and verify failure**

Run from the repository root:

```powershell
npm run test --workspace=@sistema/shared -- --run src/receipts/types.spec.ts
```

Expected: FAIL because the shared package has no test script and `./types` does not exist.

- [ ] **Step 3: Define the strict wire contracts**

Create `types.ts` with these exact public shapes; all dates are ISO strings and nullable fields use `null`, not omitted values:

```ts
export type PaperWidthMm = 58 | 80;
export type FiscalStatus = 'authorized' | 'non_fiscal' | 'error';

export interface ReceiptSnapshot {
  businessName: string; address: string; phone: string; email: string;
  logoDataUrl: string | null; footerMessage: string;
  showLogo: boolean; showAddress: boolean; showPhone: boolean;
  showCustomer: boolean; showPayments: boolean; designVersion: number;
}

export interface ReceiptDocument {
  saleId: string; saleNumber: string; issuedAt: string;
  documentKind: 'invoice' | 'sale_receipt'; fiscalStatus: FiscalStatus;
  isReprint: boolean;
  customer: { name: string; documentLabel: string; documentNumber: string } | null;
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  payments: Array<{ method: string; amount: number }>;
  totals: { subtotal: number; discount: number; surcharge: number; tax: number; total: number };
  fiscal: { invoiceLabel: string; number: string; cae: string; caeExpiresAt: string; qrDataUrl: string } | null;
  snapshot: ReceiptSnapshot;
}

export interface PrinterInfo { deviceName: string; displayName: string; isDefault: boolean; status: number; }
export interface PrinterSettings {
  deviceName: string | null; displayName: string | null; paperWidthMm: PaperWidthMm;
  autoPrint: boolean; lastTestedAt: string | null; lastTestSucceeded: boolean;
}
export interface PrintReceiptRequest { document: ReceiptDocument; settings: PrinterSettings; }
export type PrintResult =
  | { ok: true; printedAt: string }
  | { ok: false; code: 'NO_PRINTER' | 'PRINTER_MISSING' | 'LOAD_FAILED' | 'PRINT_FAILED' | 'TIMEOUT'; message: string };
```

- [ ] **Step 4: Make the package buildable and testable**

Set `packages/shared/package.json` entry points to `dist/index.js` and `dist/index.d.ts`; add scripts `build: tsc -p tsconfig.json` and `test: vitest run`; add TypeScript/Vitest dev dependencies. Export contracts from `src/index.ts`. Add `"@sistema/shared": "0.1.0"` to backend, frontend, and desktop workspace dependencies so npm links the workspace without importing raw TypeScript at runtime.

- [ ] **Step 5: Verify contracts and build**

```powershell
npm install
npm run test --workspace=@sistema/shared -- --run src/receipts/types.spec.ts
npm run build --workspace=@sistema/shared
```

Expected: test PASS; `packages/shared/dist/index.js` and `dist/index.d.ts` exist.

---

### Task 2: Build the safe thermal HTML renderer

**Files:**
- Create: `packages/shared/src/receipts/safe-content.ts`
- Create: `packages/shared/src/receipts/render-receipt-html.ts`
- Create: `packages/shared/src/receipts/render-receipt-html.spec.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write renderer security and layout tests**

Tests must assert: malicious text is escaped; unsafe `javascript:` and non-image data URLs are rejected; QR uses `<img src="data:image/...">`; 58 and 80 produce matching `width:mm`; `box-sizing:border-box` is present; hidden fields and fiscal blocks are omitted when disabled/null.

```ts
expect(renderReceiptHtml(documentWithName('<script>alert(1)</script>'), 58))
  .toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
expect(renderReceiptHtml(documentWithUnsafeLogo(), 80)).not.toContain('javascript:');
expect(renderReceiptHtml(fiscalDocument(), 80)).toContain('<img class="receipt-qr" src="data:image/png;base64,');
expect(renderReceiptHtml(baseDocument(), 58)).toContain('width:58mm');
expect(renderReceiptHtml(baseDocument(), 80)).toContain('width:80mm');
expect(renderReceiptHtml(baseDocument(), 80)).toContain('box-sizing:border-box');
```

- [ ] **Step 2: Verify the tests fail**

```powershell
npm run test --workspace=@sistema/shared -- --run src/receipts/render-receipt-html.spec.ts
```

Expected: FAIL because renderer and safe-content modules do not exist.

- [ ] **Step 3: Implement centralized content safety**

`safe-content.ts` exports `escapeHtml(value: string): string` replacing `& < > " '` and `safeImageDataUrl(value: string | null): string | null`, accepting only `data:image/png;base64,`, `data:image/jpeg;base64,`, or `data:image/webp;base64,` with valid Base64 payload.

- [ ] **Step 4: Implement deterministic renderer**

`renderReceiptHtml(document, paperWidthMm)` must call `escapeHtml` for every text value and `safeImageDataUrl` for logo/QR. Use `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })`, CSS `@page { size: ${width}mm auto; margin: 0; }`, and `html, body { width:${width}mm; box-sizing:border-box; }`. Render authorized fiscal data only when `fiscalStatus === 'authorized' && fiscal !== null`; otherwise render “COMPROBANTE NO VÁLIDO COMO FACTURA”. Render “REIMPRESIÓN” only when requested.

- [ ] **Step 5: Verify renderer and shared build**

```powershell
npm run test --workspace=@sistema/shared
npm run build --workspace=@sistema/shared
```

Expected: all shared tests PASS and build exits 0.

---

### Task 3: Add backend business profile, receipt settings, and sale snapshot schema

**Files:**
- Create: `apps/backend/src/modules/configuration/entities/business-profile.entity.ts`
- Create: `apps/backend/src/modules/configuration/entities/receipt-settings.entity.ts`
- Create: `apps/backend/src/modules/sales/value-objects/receipt-snapshot.ts`
- Modify: `apps/backend/src/modules/sales/entities/sale.entity.ts`
- Create: `apps/backend/src/migrations/1770000000000-AddReceiptConfiguration.ts`
- Modify: `apps/backend/src/migrations.ts`
- Modify: `apps/backend/src/entities.ts`
- Modify: `apps/backend/src/modules/configuration/configuration.module.ts`
- Test: `apps/backend/src/migrations.consistency.spec.ts`

- [ ] **Step 1: Write entity/default tests**

Add `business-profile.entity.spec.ts` and `receipt-settings.entity.spec.ts` asserting singleton defaults and a `receiptSnapshot: ReceiptSnapshot | null` compile-time assignment on `Sale`. Receipt settings contain only global presentation flags/default preview width; they must not contain `deviceName`, printer display name, or auto-print.

- [ ] **Step 2: Verify entity tests fail**

```powershell
npx jest --selectProjects unit --runTestsByPath src/modules/configuration/entities/business-profile.entity.spec.ts src/modules/configuration/entities/receipt-settings.entity.spec.ts
```

Expected: FAIL because the entities do not exist.

- [ ] **Step 3: Implement focused entities and snapshot type**

`BusinessProfile` is singleton table `business_profile` with UUID, businessName, address, phone, email, nullable text `logoDataUrl`, timestamps. `ReceiptSettings` is singleton table `receipt_settings` with footerMessage, visibility booleans, `previewPaperWidthMm` constrained by DTO to 58/80, `designVersion`, timestamps. Add `@Column({ type: 'jsonb', nullable: true }) receiptSnapshot!: ReceiptSnapshot | null` to `Sale`.

- [ ] **Step 4: Create and register chronological migration**

Create migration class `AddReceiptConfiguration1770000000000` that creates both singleton tables and adds `receiptSnapshot` JSONB to `sales`; `down` removes them in reverse order. Import it after `AllowOutOfStockSale1769200000000` in `migrations.ts`. Add both entities to `entities.ts` and `ConfigurationModule` `forFeature`.

- [ ] **Step 5: Verify schema registration**

```powershell
npx jest --selectProjects unit --runTestsByPath src/migrations.consistency.spec.ts
npm run build
```

Run from `apps/backend`. Expected: migration consistency PASS and TypeScript build exits 0.

---

### Task 4: Implement validated global configuration APIs

**Files:**
- Create: `apps/backend/src/modules/configuration/dto/business-profile.dto.ts`
- Create: `apps/backend/src/modules/configuration/dto/receipt-settings.dto.ts`
- Create: `apps/backend/src/modules/configuration/business-profile.service.ts`
- Create: `apps/backend/src/modules/configuration/receipt-settings.service.ts`
- Create: `apps/backend/src/modules/configuration/business-profile.controller.ts`
- Create: `apps/backend/src/modules/configuration/receipt-settings.controller.ts`
- Create tests beside each service/controller
- Modify: `apps/backend/src/modules/configuration/configuration.module.ts`

- [ ] **Step 1: Write failing service/controller tests**

Cover singleton initialization; GET/PATCH round-trips; business name trimming; logo max length and image data URL validation; footer max length; paper width rejecting values other than 58/80; and confirmation that printer identity is not accepted by either DTO.

- [ ] **Step 2: Verify failures**

```powershell
npx jest --selectProjects unit --runTestsByPath src/modules/configuration/business-profile.service.spec.ts src/modules/configuration/receipt-settings.service.spec.ts src/modules/configuration/business-profile.controller.spec.ts src/modules/configuration/receipt-settings.controller.spec.ts
```

Expected: FAIL because services/controllers are missing.

- [ ] **Step 3: Implement APIs**

Expose authenticated endpoints:

```text
GET   /configuration/business-profile
PATCH /configuration/business-profile
GET   /configuration/receipt-settings
PATCH /configuration/receipt-settings
```

Services create defaults on module initialization using repository count/save, follow existing configuration service patterns, and return entity DTOs without printer fields. DTOs use `class-validator`; logo accepts `null` or a size-limited safe image data URL.

- [ ] **Step 4: Verify APIs**

Run the Step 2 command again. Expected: all four suites PASS. Then run `npm run build`; expected exit 0.

---

### Task 5: Capture stable snapshots and expose canonical receipt documents

**Files:**
- Create: `apps/backend/src/modules/sales/services/receipt-snapshot.service.ts`
- Create: `apps/backend/src/modules/sales/services/receipt-document.service.ts`
- Create tests beside both services
- Modify: `apps/backend/src/modules/sales/sales.service.ts`
- Modify: `apps/backend/src/modules/sales/invoice.controller.ts`
- Modify: `apps/backend/src/modules/sales/invoice.controller.spec.ts`
- Modify: `apps/backend/src/modules/sales/sales.module.ts`

- [ ] **Step 1: Write failing snapshot tests**

Test that sale creation stores the current merged profile/layout snapshot once; later global configuration changes do not alter it; existing sales with null snapshot receive a deterministic fallback snapshot on first document request and persist it.

- [ ] **Step 2: Write failing canonical document tests**

Cover: authorized invoice includes invoice label/number/CAE/expiry/QR image data URL; non-fiscal sale includes `fiscal:null`; fiscal error remains `fiscalStatus:'error'`; `reprint=true` changes only `isReprint`; no receipt-document path calls `generateInvoice`, `retryAuthorization`, or AFIP; after a separately successful fiscal retry the same historical snapshot is retained while fiscal fields become authorized.

- [ ] **Step 3: Verify failures**

```powershell
npx jest --selectProjects unit --runTestsByPath src/modules/sales/services/receipt-snapshot.service.spec.ts src/modules/sales/services/receipt-document.service.spec.ts src/modules/sales/invoice.controller.spec.ts
```

Expected: FAIL because the services and endpoint do not exist.

- [ ] **Step 4: Implement services and wiring**

`ReceiptSnapshotService.capture(): Promise<ReceiptSnapshot>` merges `BusinessProfile` and `ReceiptSettings`. `ReceiptDocumentService.getForSale(saleId: string, isReprint: boolean): Promise<ReceiptDocument>` loads sale/customer/items/payments/invoice, persists missing snapshot once, and maps authorized versus non-fiscal/error states without mutating fiscal state.

Add to existing `InvoiceController`:

```ts
@Get('sale/:saleId/receipt-document')
getReceiptDocument(
  @Param('saleId', ParseUUIDPipe) saleId: string,
  @Query('reprint') reprint?: string,
): Promise<ReceiptDocument> {
  return this.receiptDocumentService.getForSale(saleId, reprint === 'true');
}
```

Keep `/invoices/sale/:saleId/receipt`, `/note-pdf`, and invoice PDF unchanged. Add providers to `SalesModule`.

- [ ] **Step 5: Verify backend receipt behavior**

Run Step 3 again; expected PASS. Run relevant existing invoice/sales suites and backend build; expected all PASS/exit 0.

---

### Task 6: Add frontend API, settings route, forms, and preview

**Files:**
- Create: `apps/frontend/src/features/receipt-settings/api/receipt-settings.api.ts`
- Create: `apps/frontend/src/features/receipt-settings/hooks/useReceiptSettings.ts`
- Create: `apps/frontend/src/features/receipt-settings/components/BusinessProfileForm.tsx`
- Create: `apps/frontend/src/features/receipt-settings/components/ReceiptLayoutForm.tsx`
- Create: `apps/frontend/src/features/receipt-settings/components/ThermalReceiptPreview.tsx`
- Create: `apps/frontend/src/features/receipt-settings/components/PrinterSetupCard.tsx`
- Create: `apps/frontend/src/pages/settings/ReceiptSettingsPage.tsx`
- Create tests beside components/hooks
- Modify: `apps/frontend/src/pages/settings/SettingsPage.tsx`
- Modify: `apps/frontend/src/App.tsx`

- [ ] **Step 1: Write failing UI tests**

Assert forms load/save separate backend endpoints; invalid image and footer lengths block submit; preview uses `renderReceiptHtml` for 58/80; printer controls are disabled with a clear Desktop-only message when `window.electronAPI` is absent; SettingsPage only adds a navigation card; App lazy-loads `/settings/receipts`.

- [ ] **Step 2: Verify failures**

```powershell
npm run test --workspace=@sistema/frontend -- --run src/features/receipt-settings src/pages/settings/ReceiptSettingsPage.test.tsx
```

Expected: FAIL because the feature and route do not exist.

- [ ] **Step 3: Implement focused API/hooks/page**

Use React Query keys `['business-profile']` and `['receipt-settings']`; API methods match Task 4 endpoints. `ThermalReceiptPreview` renders shared HTML in a sandboxed iframe `sandbox=""` via `srcDoc`. `ReceiptSettingsPage` composes the four focused cards and contains no printer persistence logic itself. Add a card in `SettingsPage` and a lazy route in `App.tsx`.

- [ ] **Step 4: Verify UI and build**

Run Step 2 again, then `npm run build --workspace=@sistema/frontend`. Expected: tests PASS and Vite build exits 0.

---

### Task 7: Implement tested per-workstation printer storage

**Files:**
- Create: `apps/desktop/electron/printing/printer-settings.store.ts`
- Create: `apps/desktop/electron/printing/printer-settings.store.spec.ts`
- Modify: `apps/desktop/package.json`
- Modify: `apps/desktop/tsconfig.json` only if test types require a dedicated `tsconfig.test.json`

- [ ] **Step 1: Write failing store tests**

With injected filesystem and userData path adapters, test defaults, valid load, corrupted JSON fallback with logged error, rejection of widths outside 58/80, atomic write to temporary file followed by rename, and preservation of previous file when rename fails.

- [ ] **Step 2: Verify failure**

```powershell
npm run test --workspace=@sistema/desktop -- --run electron/printing/printer-settings.store.spec.ts
```

Expected: FAIL because desktop has no test script/store.

- [ ] **Step 3: Implement store**

`PrinterSettingsStore` receives `{ readFile, writeFile, rename, unlink, userDataPath, now, log }`, validates unknown JSON into the exact `PrinterSettings` contract, stores `printer-settings.json` under `app.getPath('userData')`, and writes `printer-settings.json.tmp` before atomic rename. Add Vitest test dependencies/script without affecting Electron production build.

- [ ] **Step 4: Verify store**

Run Step 2 again. Expected: all store tests PASS.

---

### Task 8: Implement Electron printer discovery and hidden-window printing

**Files:**
- Create: `apps/desktop/electron/printing/receipt-printer.service.ts`
- Create: `apps/desktop/electron/printing/receipt-printer.service.spec.ts`
- Create: `apps/desktop/electron/printing/printer-ipc.ts`
- Create: `apps/desktop/electron/printing/printer-ipc.spec.ts`
- Modify: `apps/desktop/electron/main.ts`

- [ ] **Step 1: Write failing printer service tests**

Using injected BrowserWindow/webContents adapters, test mapping `PrinterInfo.name` to `deviceName` and `displayName`; missing configured device; waiting for `did-finish-load`; `did-fail-load`; print callback success/failureReason; 30-second timeout; cleanup exactly once in every path; and custom page size width 58,000/80,000 microns with a finite content height accepted by Electron/driver tests.

- [ ] **Step 2: Write failing IPC tests**

Test handlers for `receipt-printer:list`, `settings:get`, `settings:save`, `test`, and `print`; validate every request before service calls; return discriminated `PrintResult`; never expose Electron objects.

- [ ] **Step 3: Verify failures**

```powershell
npm run test --workspace=@sistema/desktop -- --run electron/printing
```

Expected: FAIL because service/IPC modules do not exist.

- [ ] **Step 4: Implement service and handlers**

`ReceiptPrinterService.listPrinters()` calls `mainWindow.webContents.getPrintersAsync()`. `print(request)` verifies selected `deviceName`, renders with shared `renderReceiptHtml`, loads a `data:text/html;charset=utf-8` URL in a hidden secure BrowserWindow, waits for load, then calls `webContents.print({ silent:true, deviceName, printBackground:true, margins:{ marginType:'none' }, pageSize:{ width, height } }, callback)`. Always close/destroy the hidden window and clear timeout. `registerPrinterIpc()` wires handlers; `main.ts` only constructs dependencies and registers them after app readiness.

- [ ] **Step 5: Verify Electron service**

Run Step 3 again, then `npm run build:electron --workspace=@sistema/desktop`. Expected: tests PASS and TypeScript build exits 0.

---

### Task 9: Expose one secure Electron API and validate packaged shared dependency

**Files:**
- Modify: `apps/desktop/electron/preload.ts`
- Modify: `apps/frontend/src/types/electron.d.ts`
- Modify: `apps/desktop/scripts/copy-deps.js`
- Modify: `apps/desktop/electron-builder.yml` if workspace package is not already included by builder
- Create: `apps/desktop/electron/preload.spec.ts`

- [ ] **Step 1: Write failing bridge contract test**

Assert one `window.electronAPI.receipts` object exposes `listPrinters`, `getPrinterSettings`, `savePrinterSettings`, `testPrint`, and `printReceipt`; method argument/return types exactly match shared contracts; no raw `ipcRenderer` is exposed.

- [ ] **Step 2: Verify failure**

```powershell
npm run test --workspace=@sistema/desktop -- --run electron/preload.spec.ts
```

Expected: FAIL because receipt methods are absent.

- [ ] **Step 3: Implement bridge and matching frontend declaration**

Each preload method invokes one Task 8 channel. Update `ElectronAPI` in `apps/frontend/src/types/electron.d.ts` to use identical signatures under `receipts`; preserve existing app/window methods and optional `window.electronAPI`.

- [ ] **Step 4: Package the compiled shared workspace**

Ensure the desktop build runs `npm run build --workspace=@sistema/shared` before Electron compilation and copies/includes `packages/shared/dist` so packaged `main.js` can resolve `@sistema/shared`. Do not copy `src/*.ts`. Add a build-time script assertion that requires `@sistema/shared` from the staged packaged dependency tree.

- [ ] **Step 5: Verify bridge and packaged resolution**

```powershell
npm run test --workspace=@sistema/desktop -- --run electron/preload.spec.ts
npm run build --workspace=@sistema/shared
npm run build:electron --workspace=@sistema/desktop
npm run package:dir --workspace=@sistema/desktop
```

Expected: tests/builds exit 0 and the unpacked app resolves `@sistema/shared`. This packages only; do not start backend/frontend servers.

---

### Task 10: Add exactly-once auto-print and reprint actions

**Files:**
- Modify: `apps/frontend/src/features/sales/api/sales.api.ts`
- Create: `apps/frontend/src/features/sales/hooks/useSaleReceiptPrinting.ts`
- Create: `apps/frontend/src/features/sales/hooks/useSaleReceiptPrinting.test.tsx`
- Create: `apps/frontend/src/features/sales/components/ReceiptPrintButton.tsx`
- Create: `apps/frontend/src/features/sales/components/ReceiptPrintButton.test.tsx`
- Modify: `apps/frontend/src/features/sales/components/SaleConfirmationModal.tsx`
- Modify: `apps/frontend/src/features/sales/components/InvoiceActions.tsx`

- [ ] **Step 1: Write failing exactly-once tests**

Assert auto-print runs once for a `(sale.id, modal-open cycle)` when local `autoPrint` is true; rerenders do not duplicate; closing and reopening the same confirmation does not auto-print again unless a new sale id arrives; absent Electron/disabled auto-print does nothing; backend document failure and printer failure show “Venta registrada, no se pudo imprimir”; success shows printed state.

- [ ] **Step 2: Write failing reprint tests**

Assert manual buttons request `/api/invoices/sale/:saleId/receipt-document?reprint=true`, call `window.electronAPI.receipts.printReceipt`, remain available after failure, and never call invoice generate/retry endpoints. Existing PDF buttons remain unchanged.

- [ ] **Step 3: Verify failures**

```powershell
npm run test --workspace=@sistema/frontend -- --run src/features/sales/hooks/useSaleReceiptPrinting.test.tsx src/features/sales/components/ReceiptPrintButton.test.tsx
```

Expected: FAIL because hook/button do not exist.

- [ ] **Step 4: Implement API, hook, and focused button**

Add `invoicesApi.getReceiptDocument(saleId, isReprint)` returning `ReceiptDocument`. The hook owns a `Set<string>`/ref keyed by completed sale id and only marks attempted after the auto-print request begins. `ReceiptPrintButton` handles manual reprint status. Compose them into confirmation/detail without moving PDF or AFIP retry logic.

- [ ] **Step 5: Verify sales UI**

Run Step 3 and relevant existing frontend sales tests, then frontend build. Expected: all PASS and build exit 0.

---

### Task 11: Full verification and real-printer QA

- [ ] **Step 1: Run focused quality gates**

```powershell
npm run test --workspace=@sistema/shared
npx jest --selectProjects unit --runTestsByPath src/migrations.consistency.spec.ts
npm run test:unit --workspace=@sistema/backend
npm run test --workspace=@sistema/frontend -- --run
npm run test --workspace=@sistema/desktop -- --run
npm run build --workspace=@sistema/shared
npm run build --workspace=@sistema/backend
npm run build --workspace=@sistema/frontend
npm run build:electron --workspace=@sistema/desktop
```

Run backend commands from `apps/backend` when they rely on Jest project paths. Expected: every command exits 0.

- [ ] **Step 2: Verify migration/entity registration manually**

Confirm migration file exists and is chronologically last in `migrations.ts`; `BusinessProfile` and `ReceiptSettings` are in `entities.ts` and `ConfigurationModule`; no printer `deviceName` appears in backend entities/DTOs.

- [ ] **Step 3: Perform hardware QA only with user-started services**

Ask the user to start the required services/Desktop app. Do not start NestJS or Vite. On real Windows drivers test 58 mm and 80 mm: discovery, selection, test page, accented text, long product names, logo, fiscal QR/CAE, non-fiscal warning, paper out, printer off, renamed/missing device, auto-print, failed-print retry, reprint mark, and unchanged PDF downloads.

- [ ] **Step 4: Record driver-specific evidence**

Capture printer model, driver, configured Windows paper form, selected width, success/failureReason, and screenshots/photos of 58/80 output. Any driver requiring a Windows custom paper form must produce a user-facing setup note rather than a code workaround.

---

## Optional commit checkpoints

**Only if the user explicitly requests commits:** create atomic commits after Tasks 2, 5, 6, 9, and 10, pairing each implementation with its tests. Before every commit, load the project `code-review` skill and `git-master`, inspect status/diff/history, and stage only the files for that checkpoint. Otherwise leave all changes uncommitted.

## Self-review checklist

- [ ] Every approved design requirement maps to Tasks 1–11.
- [ ] No printer identity is stored in PostgreSQL.
- [ ] All shared/wire dates are strings and all nullability is explicit.
- [ ] Existing AFIP fallback and PDF endpoints remain intact.
- [ ] Reprint cannot invoke AFIP.
- [ ] Every user-controlled HTML value is escaped and every image source is validated.
- [ ] Shared package resolution is verified in packaged Electron, not only development.
- [ ] Migration timestamp is later than `1769200000000` and registration test is included.
- [ ] No task starts backend or frontend servers.
- [ ] No code file is planned to exceed 250 logical lines.
- [ ] No commit is allowed without explicit user instruction.

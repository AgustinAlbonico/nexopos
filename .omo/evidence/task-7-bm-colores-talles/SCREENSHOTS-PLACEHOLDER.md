# Screenshots del spec E2E

Este spec NO se ejecutó contra dev servers (regla AGENTS.md §"Servidores de desarrollo").
Los siguientes screenshots son PLACEHOLDERS — se deben capturar durante el Final Wave F3
cuando `pnpm dev` esté arriba y el spec se corra con `pnpm playwright test ... --headed`.

## Screenshots requeridos (F3)

| Archivo | Cuándo se captura | Selector clave |
|---|---|---|
| `01-happy-path-catalog-loaded.png` | Happy path test pasa | `data-testid="catalog-color"` con 7 filas visibles |
| `02-on-the-fly-camel-chip.png` | On-the-fly add test pasa | `data-testid="selected-chip-color-{id-camel}"` |
| `03-case-insensitive-dedupe.png` | Case-insensitive dedupe test pasa | Solo 1 chip "Azul" en selected-color, no se creó "azul" |
| `04-delete-dialog-usage-warning.png` | Delete test pasa | `data-testid="delete-dialog"` con `data-testid="usage-warning"` visible |

## Screenshots de gaps documentados (F3/F4)

| Archivo | Cuándo se captura |
|---|---|
| `10-gap-G1-generate-error.png` | Al implementar productsApi.generateVariants, capturar el toast "Error al generar" o el 200 con variantes creadas |
| `11-gap-G3-capability-blocked.png` | Al implementar capabilities.controller, capturar el panel `data-testid="capability-blocked"` cuando variants=false |
| `12-gap-G2-wired-up.png` | Al wire-up del botón "Generar Matriz" desde ProductForm, capturar el botón + el modal |

## Comando para F3

```powershell
pnpm --filter @sistema/frontend exec playwright test `
  e2e/tests/variant-attribute-options-catalog.spec.ts `
  --project=chromium --headed `
  --reporter=list,html,junit
```

`--headed` muestra el browser. Los screenshots se generan en `apps/frontend/test-results/`
por defecto. Moverlos a esta carpeta con nombres arriba.
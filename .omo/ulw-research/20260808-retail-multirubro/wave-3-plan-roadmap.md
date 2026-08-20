# Wave 3 — Roadmap por dependencias

## Secuencia propuesta
0. Baseline/regresión legacy.
1. Perfil/capability foundation.
2. Quantity/UOM/snapshots de líneas.
3. Importación, stocktake, etiquetas y reason codes.
4. Devoluciones + notas de crédito.
5. Packs/UOM comerciales.
6. Peso/medida y variable barcode; scale hardware después.
7. Variantes.
8. Lotes/vencimientos.
9. Series/garantías.
10. Pricing mayorista.
11. Consignación.

## Invariantes
- Sin lookups remotos en checkout.
- Legacy sin cambios hasta habilitación explícita.
- Backend enforce; frontend sólo guía/visibilidad.
- Snapshots inmutables por línea.
- Migración siempre registrada y testeada.
- Cada fase entrega valor independiente; no build-all.

## EXPAND
- CLOSED BY DEFAULTS: exact capability names, UOM precision, label PDF-first, variant parent/child approach will be resolved in phase-specific designs.

## CLAIMS
- Decimal/UOM and line snapshots are shared structural prerequisites for several families.

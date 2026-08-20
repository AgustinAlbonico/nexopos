# Wave 1 — Series y garantías

## Hallazgos
- Esenciales: GTIN+serial/IMEI en recepción, venta y devolución; warranty terms; original-order lookup; restock decision; history.
- Diferenciadores: anti-duplicate, ownership timeline, warranty expiry/fraud reports and GS1 2D parsing.
- Serial solo no es identidad global; debe combinarse con GTIN/producto.

## Fuentes
- GS1 standards/Digital Link/EPCIS.
- Shopify POS returns docs.
- Odoo serial/lot inventory docs.
- Microsoft serialized return behavior docs.

## EXPAND
- LEAD: SMB-native serialized inventory/report docs — WHY: calibrate minimum depth — ANGLE: Lightspeed/Cin7/Fishbowl official KB.
- DEAD END: repair scheduling and telecom activation outside scope.

## CLAIMS
- Serialized returns must link the physical unit to the original transaction.

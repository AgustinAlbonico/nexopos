# Wave 1 — Patrones de líneas POS maduras

## Hallazgos
- Square usa modes + advanced capabilities; Lightspeed productos/planes verticales; Shopify POS Pro por local; Odoo módulos/presets; Clover apps/permisos.
- Patrón común: core compartido y activación en setup, plan, módulo, permiso o dispositivo.
- Fallos frecuentes: flag debt, mezcla incompatible de modos, drift de sync, confusión base/add-on, hardware no soportado y pérdida de logs.
- Salvaguardas: activar en puntos seguros, mantener checkout mínimo, MDM/device readiness, kill-switches temporales y ownership de flags.

## Fuentes
- Square modes: https://squareup.com/help/us/en/article/8458-use-modes-with-square-point-of-sale
- Square capabilities: https://squareup.com/help/us/en/article/8486-add-advanced-capabilities
- Shopify MDM/locations docs.
- Odoo POS presets/modules docs.
- Martin Fowler Feature Toggles.

## EXPAND
- LEAD: exact Odoo preset contents and regional vendor support docs — WHY: calibrate SMB onboarding — ANGLE: official docs.
- DEAD END: some Clover pages JS-gated; sitemap evidence only.

## CLAIMS
- Mature POS products preserve one core and package vertical behavior through controlled capability bundles.

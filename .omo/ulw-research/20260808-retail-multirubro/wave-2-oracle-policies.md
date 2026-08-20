# Wave 2 — Políticas mínimas

## Hallazgos reutilizables
- Límites propuestos: QuantityPolicy, StockIdentityPolicy, PricePolicy, SaleValidationPolicy, ReceivingPolicy, ReturnPolicy y CapabilityDataLoader.
- La línea de venta debe guardar snapshots de cantidad/UOM/precio/impuesto/costo/identidad para historia y devoluciones.
- Checkout debe cargar sólo datos de capacidades activas y resolver reglas localmente.

## Advertencia de evidencia
- El agente mezcló documentación pública de otro producto llamado NexoPOS con este repositorio.
- Se descartan todas sus afirmaciones sobre campos o features “existentes en NexoPOS”.
- Sólo se conservan patrones generales respaldados por Odoo y razonamiento arquitectónico; la Wave 3 deberá revalidarlos contra `C:/Proyectos/punto_de_venta`.

## EXPAND
- LEAD: repo-only validation of the seven policy boundaries — WHY: eliminate product-name contamination — ANGLE: actual entities/services/tests only.

## CLAIMS
- Capability-scoped data loading is a plausible performance safeguard, pending repo-specific validation.

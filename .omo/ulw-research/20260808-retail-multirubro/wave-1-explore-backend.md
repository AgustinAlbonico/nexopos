# Wave 1 — Núcleo backend

## Hallazgos
- Núcleo implementado: catálogo, inventario, ventas, compras, caja, cuentas, reportes, AFIP, auditoría y configuración.
- Unidad simple: cubierta. Alta rotación: parcial. Peso: sólo un campo latente. Variantes/lotes/series/consignación/precios mayoristas: ausentes.
- No se encontró autorización por capacidades/roles de negocio; sólo autenticación JWT.
- Hay buena base de tests en configuración, ventas, productos, caja, reportes y migraciones.

## EXPAND
- LEAD: exact family gap matrix and implementation buckets — WHY: roadmap needs evidence — ANGLE: core/config/module/structural.

## CLAIMS
- Advanced SKU/inventory families are not implemented as backend modules.

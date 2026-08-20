# Wave 1 — Deep dive Odoo

## Evidencia
- SHA: `0ea5b86d8eec81ac5b42067350cd145319883061`.
- Carga POS centralizada por modelos y delta temporal: https://github.com/odoo/odoo/blob/0ea5b86d8eec81ac5b42067350cd145319883061/addons/point_of_sale/models/pos_session.py#L138-L166
- Config valida pricelists/moneda/compañía: https://github.com/odoo/odoo/blob/0ea5b86d8eec81ac5b42067350cd145319883061/addons/point_of_sale/models/pos_config.py#L483-L520
- Variantes y atributos via template/product; lots/serials via popup + stock picking.
- Pricelist loader evita cargar relaciones pesadas y prueba precedencia Variant > Template > Category > Global.

## Patrones transferibles
- Config persistente → dataset POS acotado → validación backend → runtime frontend.
- Las capacidades cargan sólo datos necesarios; no toda la complejidad del ERP.
- UOM, lotes y variantes son modelos, no flags visuales.

## EXPAND
- LEAD: transferability matrix against NexoPOS — WHY: avoid copying Odoo complexity — ANGLE: minimum policy/data contracts per capability.

## CLAIMS
- Capability-aware data loading is a checkout-performance safeguard.

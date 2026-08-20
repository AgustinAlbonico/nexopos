# Ola 1 — síntesis

## Coincidencias

- El núcleo común es descuento porcentual/fijo, alcance por ítem o venta y aplicación automática o por código.
- 2x1/BOGO, mínimos, fechas y segmentos son frecuentes, pero posteriores al núcleo.
- Los sistemas maduros separan elegibilidad de efecto y persisten el ajuste aplicado; no sobrescriben el precio base.
- Para un MVP, gana una sola promoción determinística; el stacking multiplica casos monetarios y de devolución.
- Los bundles pertenecen al catálogo/inventario, no al motor de promociones.
- El cajero necesita aplicación automática y una única entrada visible para escanear/escribir códigos, con motivo claro si no aplica.
- Una redención limitada exige control atómico y auditoría de excepciones.
- En Argentina, el descuento conocido al vender debe integrar el comprobante original; ajustes posteriores/devoluciones usan nota de crédito vinculada.

## Riesgos principales

1. Redondeo y asignación de descuentos a líneas.
2. Devoluciones parciales que recalculan condiciones históricas.
3. Doble redención concurrente.
4. Combinación y orden de reglas ambiguos.
5. Mezclar cupón, crédito del cliente y puntos como si fueran el mismo concepto.

## Leads abiertos

- Cupón financiado por tercero y promociones bancarias.
- Política exacta para devolución parcial: congelar asignación original o recalcular.
- Encaje mínimo con los snapshots y devoluciones ya existentes en NexoPOS.
- Determinar si 2x1 debe ser una regla explícita o un descuento derivado por cantidad.

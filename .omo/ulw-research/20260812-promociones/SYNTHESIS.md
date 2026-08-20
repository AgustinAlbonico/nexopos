# Investigación: promociones automáticas en NexoPOS

## Resumen ejecutivo

NexoPOS ya permite descuentos manuales en cabecera y por línea, pero no dispone de promociones administrables y automáticas. El working tree contiene primitivas experimentales para descuentos por cantidad, cupones, fidelidad y crédito; no están integradas y mezclan cuatro problemas distintos.

La recomendación es un MVP de promociones automáticas con tipos explícitos: descuento porcentual o fijo por producto/venta y una regla `buy_get` que cubra 2x1 y compra-X/lleva-Y. No se combinarán promociones: se elige el mayor beneficio y los empates se resuelven por prioridad e ID estable.

El precio base no debe sobrescribirse. Al confirmar la venta se persiste qué promoción ganó, el descuento total y su asignación exacta por línea. Las devoluciones revierten esa asignación histórica sin volver a evaluar reglas.

## Alternativas

### A. Tipos explícitos y acotados — recomendada

- `item_discount`: porcentaje o monto fijo sobre productos seleccionados.
- `order_discount`: porcentaje o monto fijo al superar una condición simple.
- `buy_get`: mismo producto 2x1 o productos X/Y.
- Una sola ganadora por alcance; sin stacking.

Es la opción más auditable, comprobable y pequeña que satisface ofertas automáticas.

### B. Motor genérico de reglas y acciones JSON

Es flexible, pero adelanta complejidad de validación, combinación, seguridad y auditoría que el producto todavía no necesita. No recomendado para el MVP.

### C. Ampliar sólo descuentos manuales actuales

Es el cambio más pequeño, pero no resuelve aplicación automática ni permite reconstruir correctamente una promoción durante una devolución. No satisface el objetivo.

## Alcance recomendado

### Incluido

- Alta, edición, activación y período de vigencia de una promoción.
- Alcance por producto y, luego de validar necesidad, categoría.
- Descuento porcentual/fijo y `buy_get`.
- Aplicación automática al cambiar el carrito.
- Explicación visible de promoción aplicada y ahorro.
- Persistencia de promoción y asignación del descuento por línea.
- Ticket/factura con descuento conocido al momento de venta.
- Devolución proporcional basada en el snapshot original.

### Diferido

- Cupones y límites de redención.
- Puntos/fidelidad y crédito del cliente.
- Promociones financiadas por bancos o billeteras.
- Stacking, campañas acumulativas y segmentación avanzada.
- “El artículo más barato gratis”.
- Bundles a precio fijo y escalas de precios por cantidad.

## Flujo

1. El administrador configura una promoción tipada y su vigencia.
2. Cada cambio del carrito solicita/evalúa promociones activas.
3. El backend calcula candidatos sobre precios base, elige uno determinísticamente y devuelve ajustes por línea.
4. La UI muestra el ahorro y el motivo.
5. Al confirmar, el backend vuelve a evaluar y guarda los ajustes junto con la venta en la misma transacción.
6. Facturación usa los importes netos ya consolidados.
7. Una devolución revierte importes congelados; no consulta promociones actuales.

## Invariantes críticos

- Nunca confiar en el descuento calculado por frontend.
- Nunca mutar el precio base del producto por una promoción.
- La suma de descuentos por línea debe coincidir con el descuento de cabecera.
- Ningún total puede quedar negativo.
- La evaluación debe ser determinística e idempotente.
- Un reintegro de tercero no debe tratarse automáticamente como descuento fiscal del comercio.

## Evidencia principal

- Square Discounts: https://squareup.com/help/us/en/article/3955-create-and-manage-discounts
- Shopify discount combinations: https://help.shopify.com/en/manual/discounts/combining-discounts/discount-combinations
- Medusa application methods: https://github.com/medusajs/medusa/blob/58aaad92748d7a9512eb50b498e0a3b998155b6a/www/apps/resources/app/commerce-modules/promotion/application-method/page.mdx
- Vendure promotion entity: https://github.com/vendurehq/vendure/blob/81cb71893e7a08df0daae9659c4f1a67b892a5c0/packages/core/src/entity/promotion/promotion.entity.ts
- Solidus promotion allocations: https://github.com/solidusio/solidus/blob/62ec49d6fb42fe0ec645603fe38a48beb260d461/promotions/README.md
- ARCA RG 4540/2019: https://biblioteca.arca.gob.ar/search/query/norma.aspx?p=t%3ARAG%7Cn%3A4540%7Co%3A3%7Ca%3A2019%7Cf%3A31%2F07%2F2019
- Mercado Pago report fields: https://www.mercadopago.com.ar/developers/en/docs/reports/account-money/report-fields

## Convergencia

La investigación cubrió código local, seis ejes externos y tres expansiones durante dos olas. Los leads restantes corresponden a funcionalidades diferidas y no cambian la elección del MVP.

# Wave 2 — Packs, UOM y bundles

## Decisión semántica
- Independent SKU: identidad y stock propios.
- UOM conversion: mismo artículo expresado en otra unidad, normalizado a unidad de inventario.
- Sellable pack: presentación comercial con cantidad fija, barcode/GTIN y precio propios.
- Bundle/kit: oferta de varios componentes; descuenta componentes.
- Logistics package: contenedor de movimiento, no producto vendible.
- Variable measure: cantidad real por peso/longitud/volumen.

## Fuentes
- GS1 packaging levels: https://www.help.gs1us.org/packaging-level
- GS1 variable measure: https://www.help.gs1us.org/is-this-item-variable-measure
- Odoo UOM/packaging/packages docs.
- Shopify bundles: https://help.shopify.com/en/manual/products/bundles/shopify-bundles
- Square bundles: https://squareup.com/help/us/en/article/8057-create-managing-bundles-with-square-for-retail

## EXPAND
- none — semantic distinctions covered by primary/vendor docs.

## CLAIMS
- UOM conversion, sellable pack, bundle and logistics package must not share one ambiguous model.

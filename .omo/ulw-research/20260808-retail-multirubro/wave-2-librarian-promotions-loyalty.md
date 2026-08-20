# Wave 2 — Promociones y loyalty

## Taxonomía resuelta
1. Descuento manual.
2. Price override.
3. Quantity break / volume pricing.
4. Bundle/mix-and-match.
5. Promoción automática.
6. Cupón/código.
7. Loyalty account.
8. Store credit como medio/saldo, no descuento.

## Reglas transversales
- Precedencia/stacking, impuestos, devoluciones, grupos de clientes, ventanas temporales, permisos y reason codes deben ser explícitos.
- No construir un rules engine genérico antes de manual discount, price override, quantity breaks y bundles.

## Fuentes
- Square discounts/bundles/loyalty docs.
- Shopify discounts/combinations/bundles/exchanges docs.
- Lightspeed discounts/promotions/store-credit docs.
- Oracle Xstore return/permission docs.

## EXPAND
- CLOSED DUPLICATE: Shopify/Clover/Square edge limits; sufficient vendor diversity already established.

## CLAIMS
- Promotions and loyalty are separate cross-cutting domains; store credit is financial tender/account state.

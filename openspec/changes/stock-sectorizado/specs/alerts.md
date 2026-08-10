# alerts (MODIFIED)

## Purpose

Separar la alerta de "comprar más" (total consolidado vs mínimo general)
de la alerta de "reponer el salón" (stock en ubicación principal vs mínimo
de reposición).

## Requirements

### MODIFIED — Alertas existentes

- `lowStockAlert` (existente, `SystemConfiguration.minStockAlert`) sigue
  alimentando la lista de productos a comprar, comparada contra
  `Product.stock` total consolidado.

### ADDED — Alerta de reposición

- Nuevo método/endpoint `getReplenishmentSuggestions()` (o equivalente en
  el módulo de reportes) devuelve productos donde
  `ProductLocationStock(stock at primarySaleLocationId) <=
  SystemConfiguration.stockMinimoVenta` AND existe stock disponible en
  otra ubicación activa (origen sugerido: la ubicación con mayor saldo).
- Devuelve por producto: stock actual en venta, mínimo de reposición,
  stock en reserva (suma del resto de ubicaciones activas), ubicación de
  origen sugerida, cantidad sugerida a trasladar (cubrir hasta el doble
  del mínimo o hasta agotar origen, lo que sea menor).

### Sin cambio — Modo simple

- Cuando `stockSectorizado = false`, la nueva lista de reposición devuelve
  vacío y solo permanece la alerta de compra.

## Scenarios

### S1 — Producto bajo en total, sin alerta de reposición

**Given** `minStockAlert = 5`, `stockMinimoVenta = 5`, producto P con
`Product.stock = 4`, `P.stockAt(L1) = 4`, `P.stockAt(L2) = 10`
**When** se consultan ambas alertas
**Then** P aparece en "comprar"; NO aparece en "reponer" (el salón tiene
stock suficiente)

### S2 — Producto bajo en salón, sin alerta de compra

**Given** producto P con `Product.stock = 50`, `P.stockAt(L1) = 2`,
`P.stockAt(L2) = 48`
**When** se consultan ambas alertas
**Then** P aparece en "reponer" (origen sugerido L2 con 48 unidades);
NO aparece en "comprar" (el total está sobre el mínimo general)

### S3 — Producto bajo en ambas dimensiones

**Given** producto P con `Product.stock = 3`, `P.stockAt(L1) = 1`,
`P.stockAt(L2) = 2`
**When** se consultan ambas alertas
**Then** P aparece en "comprar" y en "reponer"

### S4 — Sin stock alternativo, no se sugiere reposición

**Given** producto P con `P.stockAt(L1) = 1`, `P.stockAt(L2) = 0`
**When** se consulta la lista de reposición
**Then** P no aparece (no hay de dónde trasladar)

### S5 — Modo simple no expone alerta de reposición

**Given** `stockSectorizado = false`
**When** se consulta la lista de reposición
**Then** devuelve `[]`

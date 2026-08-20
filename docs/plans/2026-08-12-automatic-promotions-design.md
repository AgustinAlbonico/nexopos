# Promociones automáticas — Diseño

> Estado: **Aprobado** el 2026-08-12. Define alcance del MVP y decisiones de diseño. El plan de implementación tarea-a-tarea vive en `docs/superpowers/plans/2026-08-12-automatic-promotions.md`.

## Resumen

NexoPOS ya permite descuentos manuales en cabecera y por línea, pero no dispone de **promociones administrables y automáticas**. Este diseño agrega un MVP que aplica ofertas tipadas al carrito sin combinar promociones, persiste la asignación del descuento y la usa para facturación y devoluciones.

## Decisión

MVP con **tres tipos explícitos de promoción** y **una sola ganadora** por venta.

| Tipo | Cobertura | Acción |
|---|---|---|
| `item_discount` | Producto o categoría | Porcentaje o monto fijo por unidad |
| `order_discount` | Venta completa | Porcentaje o monto fijo al superar un mínimo |
| `buy_get` | Producto X (mismo o distinto) | 2x1 o "comprá N, llevá M" descontando unidades ya en el carrito |

**No hay stacking.** Si varias promociones coinciden, gana el mayor descuento; empates se resuelven por `priority` (asc) y luego `id` (estable).

## Alcance

### Incluido

- Alta, edición, activación/desactivación y vigencia (desde/hasta).
- Alcance por producto y por categoría.
- Aplicación automática al cambiar el carrito.
- Persistencia de la promoción ganadora y la asignación del descuento por línea.
- Ticket/factura con el descuento ya consolidado en el comprobante original.
- Devolución proporcional basada en el snapshot original.

### Diferido (fuera del MVP)

- Cupones con código y límites de redención.
- Puntos/fidelidad y crédito del cliente.
- Promociones financiadas por bancos o billeteras.
- Stacking, campañas acumulativas y segmentación avanzada.
- "El artículo más barato gratis".
- Bundles a precio fijo y escalas de precios por cantidad.

## Arquitectura

### Principios

1. **El backend es autoritativo.** La UI muestra una estimación; al confirmar, el backend recalcula en la misma transacción.
2. **Nunca mutar el precio base.** El descuento se aplica y persiste; `unitPrice` se conserva.
3. **Una sola ganadora.** Cálculo determinístico, idempotente.
4. **Snapshot congelado.** La asignación por línea queda fija; las devoluciones la reverierten sin recalcular.
5. **MVP tipado, sin motor JSON.** Nuevos tipos se agregan con código y migración, no con datos.

### Módulo nuevo: `apps/backend/src/modules/promotions/`

```
promotions/
├── entities/
│   ├── promotion.entity.ts            # cabecera tipada
│   └── sale-promotion.entity.ts       # aplicación + asignación congelada
├── promotions.module.ts
├── promotions.service.ts              # CRUD admin
├── promotions.controller.ts           # endpoints admin
├── promotion-evaluator.ts             # evaluación pura: candidates -> winner -> allocations
├── dto/
│   ├── create-promotion.dto.ts
│   └── update-promotion.dto.ts
└── promotions.constants.ts            # tipos, modos de descuento
```

`promotion-evaluator.ts` es **puro**: entrada `(items, productos, promociones activas)`, salida `{ promoId?, ajustesPorLinea[], totalDescuento }`. Sin DB, sin IO. Esto permite testear dinero sin infraestructura.

### Tablas

**`promotions`**

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `name` | varchar(120) | Visible para admin |
| `kind` | enum `item_discount` \| `order_discount` \| `buy_get` | |
| `discountType` | enum `percent` \| `fixed` | Ignorado en `buy_get` |
| `discountValue` | decimal(20,4) | Porcentaje (0-100) o monto en ARS |
| `scope` | enum `product` \| `category` | |
| `scopeProductIds` | uuid[] (nullable) | Aplica cuando `scope=product` |
| `scopeCategoryIds` | uuid[] (nullable) | Aplica cuando `scope=category` |
| `minOrderAmount` | decimal(20,2) (nullable) | Umbral para `order_discount` |
| `buyQuantity` | int (nullable) | Para `buy_get`: cantidad a comprar |
| `getQuantity` | int (nullable) | Para `buy_get`: cantidad descontada |
| `priority` | int default 100 | Menor valor = mayor prioridad |
| `active` | boolean default true | |
| `startsAt` | timestamptz (nullable) | |
| `endsAt` | timestamptz (nullable) | |
| `createdAt` / `updatedAt` | timestamps | |

**`sale_promotions`** — asignación congelada por venta

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `saleId` | uuid FK + index | |
| `promotionId` | uuid FK (nullable) | Nullable para ventas sin promo |
| `promotionName` | varchar(120) | Snapshot del nombre |
| `promotionKind` | enum | Snapshot |
| `totalDiscount` | decimal(20,2) | Suma de asignaciones |
| `lineAllocations` | jsonb | `[{ saleItemId, amount }]` |

### Integración en `SalesService.create`

Punto de inserción: **entre `calculateSaleTotals` y `createSaleItems`**.

```ts
// pseudocódigo
const activePromos = await this.promotionEvaluator.findActive(new Date());
const result = this.promotionEvaluator.evaluate({
  items: dto.items,
  productsById,
  promotions: activePromos,
});
// result.lineAdjustments: [{ itemIndex, amount, promoId }]
// reasignar descuento por línea antes de persistir
```

- `calculateSaleTotals` ya resta `item.discount` y `dto.discount`. El evaluador produce esos descuentos; el DTO no los envía el frontend cuando hay promo automática.
- En la misma transacción se persiste `sale_promotions` con `lineAllocations` que apuntan a los `saleItemId` recién creados.

### Devoluciones

`SaleReturnService` ya trabaja sobre `SaleItem` originales. Regla: **el `unitRefundAmount` que calcula el backend** debe usar `saleItem.subtotal / saleItem.quantity` (precio ya descontado congelado), nunca recalcular promociones. Esto requiere que el `PreviewSaleReturn` use el snapshot, no el producto vivo.

### Frontend

- **Admin:** nuevo feature module `apps/frontend/src/features/promotions/` con CRUD simple (lista, formulario activar/desactivar, vigencia).
- **Caja:** `SaleForm` llama a un endpoint de evaluación `POST /sales/preview-promotions` con el carrito; muestra ahorro total y nombre de la promo aplicada. No envía `discount`; el backend es autoritativo.
- **Sin escaneo de cupones** en el MVP.

## Invariantes críticos

- La suma de `lineAllocations[].amount` debe ser igual a `totalDiscount`.
- Ningún `unitPrice` se modifica por una promoción.
- Ningún total puede quedar negativo.
- La evaluación es determinística e idempotente.
- Las devoluciones nunca reevalúan promociones actuales.
- Un reintegro de tercero (banco/billetera) **no** se trata como descuento fiscal del comercio.

## Fallos conocidos a prevenir

| Fallo | Prevención |
|---|---|
| Recalcular promociones en devolución | Usar `sale_promotions.lineAllocations` congeladas |
| Stacking accidental | Una sola ganadora por evaluación |
| Guardar sólo precio final | Persistir `sale_promotions` con asignación por línea |
| Confianza en descuento del frontend | Recalcular en backend al confirmar |
| Negativos o rebases | Validar `discountValue <= baseAmount` en el evaluador |

## Fuera del MVP pero evolutivo

El prototipo existente en `apps/backend/src/modules/sales/promotions/primitives.ts` mezcla cantidad, cupones, fidelidad y crédito. **Se cuarentena**: `applyCoupon`, `createLoyaltyAccrual` y `allocateStoreCredit` quedan fuera del flujo. `applyQuantityBreak` se descarta también (las escalas de cantidad son un tipo aparte, diferido). Cuando se agreguen cupones o fidelidad, esos conceptos se modelan como **tipos nuevos** en `promotions` + controles atómicos, no reusando estas primitivas acopladas.

## Validación

- Migración creada y registrada en `apps/backend/src/migrations.ts`; pasa `migrations.consistency.spec.ts`.
- `promotion-evaluator.ts` con cobertura unitaria de: porcentaje/fijo por ítem, porcentaje/fijo por venta, 2x1 mismo producto, buy-X-get-Y, empate por prioridad, empate por ID, sin promo aplicable, máximo descuento.
- Integración: `POST /sales` persiste `sale_promotions`; `POST /sales/preview-promotions` devuelve la asignación.
- Devolución parcial usa `subtotal/quantity` congelado.
- Frontend: render de ahorro y nombre en `SaleTotals`.

## Referencias

- Investigación completa: `.omo/ulw-research/20260812-promociones/SYNTHESIS.md`.
- Patrón de ajustes persistidos: Solidus, Medusa, Vendure (ver síntesis).
- Fiscalidad argentina: ARCA RG 4540/2019; reintegros de terceros son liquidación, no factura del comercio.

# Proposal — Stock sectorizado opcional

**Change:** `stock-sectorizado`
**Status:** proposed
**Date:** 2026-08-10
**Design ref:** `docs/plans/2026-08-10-stock-sectorizado-design.md` (aprobado)

## Why

Los comercios con depósito y salón separados operan a ciegas: no saben cuántas
unidades tienen en cada lugar y, cuando el salón queda sin stock, recurren a
traslados manuales no auditables o a descuentos del depósito "implícitos". El
inventario actual vive en una sola columna (`Product.stock`) y el módulo de
inventario es el único punto donde debería mutarse — regla que este cambio
preserva.

## What changes

Modo **simple** (default) no cambia. Modo **sectorizado** agrega:

- Ubicaciones físicas con función (venta / almacenamiento) y estado activo.
- Saldos por producto y ubicación; el total consolidado pasa a derivarse.
- Asistente de activación transaccional que conserva los totales existentes.
- POS consume la ubicación principal de venta; si falta stock propone
  "Reponer y continuar" con traslado atómico previo a la venta.
- Compras reciben destino predeterminado, modificable por operación.
- Alertas separadas: comprar (total vs mínimo general) vs reponer (salón vs
  mínimo de reposición).
- Historial con ubicación afectada; traslados como operación única visible.

## Goals

1. Saber cuántas unidades de cada producto existen y dónde están físicamente.
2. Detectar stock alternativo cuando la ubicación de venta no puede cubrir una
   operación.
3. Guiar la reposición desde depósitos sin descontar mercadería de una
   ubicación incorrecta.
4. Prevenir quiebres en el salón mediante avisos proactivos de reposición.
5. Mantener una única fuente de verdad y un historial auditable de movimientos.
6. Evitar cualquier complejidad adicional para los comercios que usen
   inventario simple.

## Out of scope

- Sucursales con operación comercial y contabilidad independientes.
- Reservas de stock para pedidos futuros.
- Lotes, vencimientos, números de serie.
- Pasillos, estantes o posiciones exactas dentro de una ubicación.
- Picking, rutas, recepción avanzada (WMS).
- Mínimos de reposición por producto.
- Desactivación libre del modo sectorizado sin consolidación guiada.

## Affected capabilities

- `inventory` — nuevo alcance por ubicación, atomicidad de traslados.
- `products` — `Product.stock` se vuelve derivado cuando el modo está activo.
- `sales` — consume ubicación principal; reposición guiada desde POS.
- `purchases` — destino predeterminado modificable por compra.
- `configuration` — flag de modo + ubicación principal de venta + destino
  predeterminado + mínimo de reposición.
- Frontend — CRUD de ubicaciones, asistente de activación, pantalla de
  reposición, desglose en producto, POS con "Reponer y continuar".

## Risks

| Riesgo | Mitigación |
|---|---|
| Doble fuente de verdad | Saldos por ubicación son operativos; total derivado, no editable. |
| Fricción para comercios chicos | Función off por default; modo simple intacto. |
| Ventas descontadas del lugar equivocado | POS consume ubicación principal; reposición explícita. |
| Traslados incompletos | Origen y destino en una transacción. |
| Saldos incorrectos por concurrencia | Validación y lock dentro de la transacción. |
| Activación riesgosa | Asistente transaccional con verificación de totales antes/después. |

## Acceptance criteria

- [ ] Un comercio puede seguir utilizando inventario simple sin campos ni pasos nuevos.
- [ ] Un administrador puede activar el modo sectorizado sin alterar los totales existentes.
- [ ] Cada producto muestra un total y un desglose consistente por ubicación.
- [ ] Las compras ingresan al destino predeterminado y permiten cambiarlo.
- [ ] Las ventas descuentan la ubicación principal de venta.
- [ ] Si el salón no alcanza, el POS identifica stock alternativo y propone una reposición.
- [ ] Una reposición aceptada se registra antes de completar la venta.
- [ ] Los traslados no modifican el stock total y nunca quedan aplicados a medias.
- [ ] Las alertas distinguen entre necesidad de compra y necesidad de reposición interna.
- [ ] El historial permite reconstruir entradas, salidas y traslados por ubicación.
- [ ] Las ventas sin stock conservan una excepción explícita y auditable.
- [ ] Las operaciones concurrentes no consumen dos veces el mismo saldo.
- [ ] Todas las migraciones necesarias están registradas y verificadas.

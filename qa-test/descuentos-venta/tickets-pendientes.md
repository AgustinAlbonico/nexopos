# Tickets Jira pendientes — `descuentos-venta`

> **Estado:** NO creados en Jira. Borradores listos para crear manualmente con
> `pwsh ./scripts/jira-create.ps1` cuando se disponga de `JIRA_API_TOKEN`.
>
> **Project Key:** `SCRUM` · **URL:** https://nexopos.atlassian.net · **Issue Type:** `Tarea`

---

## 1. [POS] calculateSaleTotals lanza HTTP 500 en POST /api/sales — BLOQUEANTE

**Resumen:** Toda venta nueva falla con `Cannot read properties of undefined (reading 'find')` en `apps/backend/src/modules/sales/sales.service.ts:281`. Imposible cobrar.

### 🎯 Problema / Necesidad
Cualquier intento de registrar una venta (con o sin descuento, 1 o N productos) devuelve HTTP 500. La UI calcula descuentos correctamente en el cliente pero el POST al backend nunca llega a persistir.

### ✅ Criterios de Aceptación
- [ ] `POST /api/sales` retorna 201 con cualquier combinación de productos
- [ ] `calculateSaleTotals` no rompe con DTO sin campo `taxes` o `payments`
- [ ] Test unitario reproduce el caso original (1 producto sin descuento) y queda en verde
- [ ] Smoke E2E: crear venta vía UI → ver número de venta nuevo en listado

### 🛠️ Especificación Técnica
- **Base de Datos / Migraciones:** N/A
- **Backend (NestJS):** Revisar `calculateSaleTotals` en `apps/backend/src/modules/sales/sales.service.ts:281`. Probable null-safety en `dto.taxes?.find(...)` o `dto.payments?.find(...)`. Considerar defaults en `CreateSaleDto`.
- **Frontend (React/Vite):** N/A (cambiar manejo de error 500 a mensaje más accionable es opcional).

### ⛔ Fuera de Alcance
Cambios en la fórmula de cálculo, refactor del servicio completo, migración de datos.

---

## 2. [POS] Sin validación: descuento > subtotal permite total negativo

**Resumen:** La UI acepta descuentos que producen `total < 0` y el botón "Confirmar Venta" queda clickeable. Riesgo: cajero paga al cliente.

### 🎯 Problema / Necesidad
Con subtotal $3.000 + descuento $4.000 → total -$1.000. Con 200% sobre $800 → total -$800. El número aparece en rojo pero el CTA sigue activo. Además, el bloque "Pagos" muestra "Faltan: -$ 800".

### ✅ Criterios de Aceptación
- [ ] Input de descuento % cap a 100; $ cap al subtotal
- [ ] Backend rechaza con `400` si `discount > subtotal`
- [ ] UI muestra "Descuento no puede superar el subtotal" inline
- [ ] "Confirmar Venta" deshabilitado si `totalFinal ≤ 0`
- [ ] Bloque "Pagos" reemplaza "Faltan: -$X" por "Total inválido" cuando total ≤ 0

### 🛠️ Especificación Técnica
- **Base de Datos / Migraciones:** N/A
- **Backend (NestJS):** Validación en `CreateSaleDto` con `class-validator` (`@Max`, custom validator). Guard en `sales.service.ts`.
- **Frontend (React/Vite):** Validación reactiva en `SaleTotals.tsx` + `disabled` en botón de confirmar. Outline rojo en input de descuento cuando se excede el subtotal.

### ⛔ Fuera de Alcance
Validación de recargos > subtotal (mismo bug, ticket aparte si querés cubrirlo).

---

## 3. [POS] Falta campo de descuento por ítem en SaleItemsList

**Resumen:** No se puede descontar un ítem específico; solo descuento global o promo chips.

### 🎯 Problema / Necesidad
Cada fila del carrito (`SaleItemsList`) solo expone cantidad, notas y eliminar. No hay input de descuento por ítem. Atajo F2 enfoca cantidad, no descuento. El backend ya soporta `items[].discount` y `items[].discountPercent` (`sale-item.entity.ts`).

### ✅ Criterios de Aceptación
- [ ] Cada fila del carrito tiene input de descuento (% o $)
- [ ] Subtotal del item refleja el descuento (recálculo en vivo)
- [ ] Total recalculado en vivo
- [ ] Atajo F2 sobre la fila enfoca el input de descuento
- [ ] Backend persiste `items[].discount` y `items[].discountPercent`

### 🛠️ Especificación Técnica
- **Base de Datos / Migraciones:** Verificar columnas en `sale_items` (ya existen según scout). Si falta, generar migración.
- **Backend (NestJS):** Confirmar que `CreateSaleDto` acepta `items[].discount` y `items[].discountPercent`.
- **Frontend (React/Vite):** Editar `SaleItemsList.tsx` y `useSaleFormEffects.ts`. Reusar patrón de `SaleTotals.tsx` para el input %/$.

### ⛔ Fuera de Alcance
Auto-promo por combinación de items, promos en cascada.

---

## 4. [POS] Promo 2x1 aplica descuento de 2 unidades en lugar de 1

**Resumen:** Con 2 Coca ($1.500 c/u) + 2 Agua ($800 c/u) → subtotal $4.600, click "2x1" descuenta $1.600 (las 2 unidades del más barato), no $800 (1 sola unidad).

### 🎯 Problema / Necesidad
Inconsistente con la semántica usual de "2x1 = 1 unidad gratis". El operador no puede predecir el efecto del chip.

### ✅ Criterios de Aceptación
- [ ] 2x1 descuenta exactamente 1 unidad del producto más barato
- [ ] Chip "2da 50%" descuenta 50% de la 2da unidad
- [ ] Chips muestran el monto en tooltip antes de aplicar
- [ ] Test unitario sobre `promotions/primitives.ts` con varios escenarios

### 🛠️ Especificación Técnica
- **Base de Datos / Migraciones:** N/A
- **Backend (NestJS):** Revisar `applyCoupon` / lógica de 2x1 en `apps/backend/src/modules/sales/promotions/primitives.ts`.
- **Frontend (React/Vite):** Tooltip en cada chip con el monto calculado en vivo.

### ⛔ Fuera de Alcance
Promociones de 3x2, promos por categoría, promos por cliente.

---

## 5. [POS] Combobox del modal de venta no refresca tras crear producto

**Resumen:** Sprite 1.5L creado en `/#/products` (visible, stock 100) no aparece en el dropdown del modal de venta. Sospecha: cache stale de React Query.

### 🎯 Problema / Necesidad
El tester tuvo que usar Pepsi como sustituto porque Sprite (recién creado) no aparecía en el dropdown. Inconsistente con la creación de datos: si el producto está en `/#/products`, debe estar disponible inmediatamente en la venta.

### ✅ Criterios de Aceptación
- [ ] Al volver al modal, el producto recién creado aparece en la lista
- [ ] Cache invalidado al crear/editar producto
- [ ] No se introducen refetch innecesarios (optimistic update)
- [ ] Test E2E: crear producto → abrir modal → ver producto en dropdown

### 🛠️ Especificación Técnica
- **Base de Datos / Migraciones:** N/A
- **Backend (NestJS):** N/A
- **Frontend (React/Vite):** Revisar `queryKey` y `invalidateQueries` del listado de productos usado en `SaleForm`. Probablemente falte `invalidateQueries(['products'])` en el `onSuccess` del `ProductForm`.

### ⛔ Fuera de Alcance
Búsqueda por scanner barcode, búsqueda fuzzy.

---

## Cómo crear todos los tickets de una vez (cuando haya token)

```powershell
$env:JIRA_URL="https://nexopos.atlassian.net"
$env:JIRA_USERNAME="agusalbo2024@gmail.com"
$env:JIRA_API_TOKEN="<token>"

# 1
"[POS] calculateSaleTotals lanza HTTP 500 en POST /api/sales" `
  | ./scripts/jira-create.ps1 -Summary "[POS] calculateSaleTotals lanza HTTP 500 en POST /api/sales" -ModuleName POS

# Repetir para 2-5
```

**Tip:** cada ticket acepta Markdown por stdin (descripción completa) si se quiere más detalle.

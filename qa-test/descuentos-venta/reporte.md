# Reporte QA — Flujo `descuentos-venta`

**Fecha:** 2026-08-18  
**Git SHA:** `1391ed1cdb5a22e104f21a3f176575284088833a`  
**Módulo:** POS / Ventas — descuentos  
**Scope:** Global %, global $, promo chips, combinado, por ítem, bordes

---

## Veredicto
**❌ NO PASA** — bug crítico backend bloquea `POST /api/sales` (HTTP 500) e impide cobrar cualquier venta. La UI de descuentos sí funciona, pero falta validación de descuentos > subtotal.

---

## Tabla de casos

| # | Caso | Resultado | Clicks | Total cobrado | Evidencia |
|---|------|-----------|-------:|---------------|-----------|
| 1 | Promo chip 10% (1 click) | ❌ FALLO (backend 500) | 6 | — | `caso-01-totales.png` + `caso-01-error-backend.png` |
| 2 | Descuento global % manual (10%) | ❌ FALLO (backend 500) | 6 | — | `caso-02-totales-manual.png` |
| 3 | Descuento global $ fijo | ⚠️ PARCIAL UI / FALLO backend | 8 | — | `caso-03-descuento-fijo.png` + `caso-03-borde-mayor-subtotal.png` |
| 4 | Promo 2x1 | ⚠️ PARCIAL UI / FALLO backend | 6 | — | `caso-04-2x1-totales.png` |
| 5 | Descuento por ítem | ❌ FALLO (feature ausente) | 4 | — | `caso-05-sin-descuento-item.png` |
| 6 | Combinado chip + global $ | ⚠️ PARCIAL UI / FALLO backend | 7 | — | `caso-06-combinado-totales.png` |
| 7 | Borde: descuento > subtotal | ❌ FALLO (sin validación) | 3 | — | `caso-07-borde-descuento-mayor.png` |

**Score UX:** 5/10 (UI cuidada pero descuentos excesivos sin bloqueo son bloqueantes para producción).

---

## Hallazgos UX (top 5)

| # | Sev | Pantalla | Hallazgo | Recomendación |
|---|-----|----------|----------|---------------|
| 1 | CRÍTICO | `caso-03-borde-mayor-subtotal.png`, `caso-07-borde-descuento-mayor.png` | Total puede quedar negativo y el botón "Confirmar Venta" sigue activo. Cajero puede terminar PAGÁNDOLE al cliente. | Cap input para que descuento ≤ subtotal; `disabled` en "Confirmar Venta" cuando total ≤ 0 con mensaje inline. |
| 2 | CRÍTICO | mismos bordes | El bloque "Pagos" muestra "Faltan: -$ 800" cuando el total es negativo. Incoherente con el dominio. | Reemplazar por "Total inválido — revisá el descuento" cuando total ≤ 0. |
| 3 | ALTO | `caso-04-2x1-totales.png` | Chips de promo sin semántica visible ("2x1" aplicó -$1.600 sobre $4.600 — operador no puede predecir el efecto). | Texto explícito en cada chip ("2x1: 2da unidad gratis") + tooltip con monto calculado. |
| 4 | MEDIO | `caso-01-totales.png` | Input de descuento y su efecto "-$445" están en columnas separadas. Eye-jump constante. | Pegar el monto calculado al lado del input o en el placeholder. |
| 5 | MEDIO | `caso-07-borde-descuento-mayor.png` | Input `%` sin `max="100"`; 200% aceptado sin advertencia visual. | `max="100"` + outline rojo + mensaje "Descuento no puede superar el subtotal". |

---

## Detalle de fallos

### Bug crítico backend — `POST /api/sales` HTTP 500
- **Síntoma:** `Cannot read properties of undefined (reading 'find')` en `calculateSaleTotals` (`apps/backend/src/modules/sales/sales.service.ts:281`).
- **Reproducción:** cualquier intento de cobrar una venta (con o sin descuento, 1 o N productos).
- **Impacto:** imposible registrar ventas. UI funciona, cálculos locales correctos, falla el round-trip al backend.
- **Tickets Jira sugeridos:**
  - `[POS] calculateSaleTotals: Cannot read properties of undefined (reading 'find')` — **bloqueante**
  - `[POS] No hay campo de descuento por item en SaleItemsList` — feature ausente (CU-05)
  - `[POS] Sin validación de descuento mayor al subtotal` — agujero UX + regla de negocio (CU-03/07)
  - `[POS] Promo 2x1 aplica descuento distinto al esperado` — discrepancia con spec
  - `[POS] Sprite 1.5L no aparece en dropdown tras crearlo` — bug de cache del combobox

### CU-05 — Feature ausente
- No existe campo inline de descuento por ítem en `SaleItemsList`. Solo hay cantidad, eliminar y notas. F2 enfoca cantidad, no descuento.
- Workaround actual: usar descuento global únicamente.

### CU-03 / CU-07 — Sin validación de descuento
- `$4.000` sobre subtotal `$3.000` → total `-$1.000` con "Vuelto a Entregar $1.000".
- 200% sobre `$800` → descuento `-$1.600`, total `-$800`.
- Botón "Confirmar Venta" clickeable en ambos casos.

### CU-04 — Promo 2x1 con monto inesperado
- Con 2x Coca ($1.500 c/u) + 2x Agua ($800 c/u) → subtotal $4.600.
- Click en chip "2x1" → descuento $1.600 (se esperaba $800, una unidad gratis).
- Aplica a las 2 unidades del producto más barato, no a una sola como sugiere el nombre.

### Hallazgo colateral — Cache del combobox
- Sprite 1.5L se creó correctamente en `/#/products` (visible, stock 100) pero nunca apareció en el dropdown del modal de venta. El tester tuvo que usar Pepsi 1.5L como sustituto.

---

## Atajos de teclado (probados)

| Atajo | Acción esperada | ¿Funcionó? |
|-------|-----------------|------------|
| F1 | Abrir buscador de producto | ✅ |
| F2 | Enfocar cantidad del primer item | ✅ |
| F8 | Confirmar venta | ⚠️ Dispara POST → backend devuelve 500 |
| F9 | Posponer | No probado |
| ESC | Cancelar ítem pendiente | No probado |

---

## Datos creados (en la DB por el tester)

| Producto | Precio | Stock | Origen |
|----------|-------:|------:|--------|
| Coca-Cola 1.5L | $1.500,00 | 100 | modificado (estaba $0 / stock 1) |
| Sprite 1.5L | $1.400,00 | 100 | nuevo |
| Agua Kin 500ml | $800,00 | 100 | nuevo |
| Pepsi 1.5L | $1.450,00 | 100 | nuevo |

**Caja:** abierta con $5.000 inicial. **Cliente:** Consumidor Final (default).

## Datos ficticios usados (referencia)
Set completo aprobado: ver tabla de 4 productos arriba + cliente default + caja abierta.

---

## Evidencia (screenshots)
Carpeta: `C:\Proyectos\punto_de_venta\qa-test\descuentos-venta\screenshots\`  
Total: 16 archivos (3 setup + 13 ejecuciones de casos).

---

## Conclusión
**El cajero cobra cómodo en <10 clicks con descuento**, pero el bug crítico de backend y la falta de validación de descuentos excesivos bloquean el pase a producción. Recomendado: arreglar el 500 de `calculateSaleTotals` primero, después endurecer bordes, después agregar feature de descuento por ítem.

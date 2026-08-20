# Guía de Validación y Cobertura: 05. Control de Vencimientos y Lotes 📅🧪

> **Objetivo:** Impersonar una Veterinaria, Perfumería / Cosmética o Almacén de Perecederos para validar la trazabilidad de lotes, fechas de vencimiento, sistema FEFO (First Expired, First Out) y alertas preventivas de productos próximos a vencer.

---

## 📌 1. Ficha del Perfil de Negocio

* **Nombre comercial de prueba:** *Veterinaria & Pet Shop "Mi Mascota"* / *Perfumería "Aroma"*
* **Perfil Técnico:** `expiry-tracking`
* **Rubros representados:** Perfumería, Cosmética, Veterinaria, Almacén de Alimentos Perecederos.

### Capacidades Requeridas (Matriz de Configuración)
| Capacidad | Estado Requerido | Razón de Uso |
| :--- | :--- | :--- |
| `expiryTracking` | **ACTIVO** | Control de Lote y Fecha de Vencimiento obligatorios o sugeridos |
| `feffoStrategy` | **ACTIVO** | Sugerencia de despacho del lote con vencimiento más próximo |
| `productLabels` | **ACTIVO** | Impresión de etiquetas con Lote y Vencimiento visible |
| `barcodeScanner` | **ACTIVO** | Lector para agilidad en caja |
| `variantMatrix` | *INACTIVO* | Salvo perfumes con distintas medidas (ml) |
| `serialNumbers` | *INACTIVO* | No aplica |

---

## 🧪 2. Matriz de Pruebas de Cobertura Completa

### Escenario 1: Recepción de Mercadería con Lote y Fecha de Vencimiento 📦
* **Acción:** Registrar ingreso de mercadería del producto **"Vacuna Quíntuple VET"** o **"Crema Facial Hidratante"**.
* **Ingreso:**
  * Lote `LOT-2026-A`: 20 unidades - Vence: `2026-11-30`
  * Lote `LOT-2027-B`: 50 unidades - Vence: `2027-05-15`
* **Resultado esperado:**
  * El producto registra un stock total de 70 unidades desglosado en 2 lotes independientes.

### Escenario 2: Despacho FEFO (First Expired, First Out) en Punto de Venta 🛒
* **Acción:** Realizar una venta de 5 unidades del producto.
* **Resultado esperado:**
  * El sistema descuenta automáticamente las 5 unidades del **Lote `LOT-2026-A`** (el que vence primero).
  * En el ticket o remito interno se detalla el lote despachado.

### Escenario 3: Alerta Preventiva de Vencimientos Próximos ⚠️
* **Acción:** Consultar el reporte de vencimientos a 30/60/90 días.
* **Resultado esperado:**
  * El reporte resalta los lotes próximos a vencer para permitir acciones comerciales (ofertas de remate o devolución al laboratorio/proveedor).

### Escenario 4: Bloqueo de Venta de Lote Vencido 🚫
* **Acción:** Intentar vender un producto cuyo lote tiene fecha de vencimiento menor a la fecha actual.
* **Resultado esperado:**
  * El sistema emite una advertencia o bloquea la venta del lote vencido para proteger al negocio de multas o riesgos sanitarios.

---

## 📋 Checklist de Validación de Cobertura

- [ ] **Trazabilidad:** ¿Se conoce con precisión qué lote se le vendió a cada cliente?
- [ ] **Descuento FEFO:** ¿El stock descuenta siempre del lote más antiguo/próximo a vencer?
- [ ] **Alertas:** ¿El tablero principal muestra alertas de productos a vencer en los próximos 30 días?
- [ ] **Control Sanitario:** ¿Bloquea o advierte la salida de productos caducados?

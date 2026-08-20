# Guía de Validación y Cobertura: 01. Venta Simple (Kiosco / Retail) 🏪

> **Objetivo:** Impersonar un Kiosco, Librería, Bazar o Cotillón para validar que la venta de alta velocidad, escaneo rápido de código de barras y cobro fluido funcionen sin fricción ni pantallas sobrecargadas.

---

## 📌 1. Ficha del Perfil de Negocio

* **Nombre comercial de prueba:** *Kiosco / Dragstore "San Martín 24hs"*
* **Perfil Técnico:** `simple-retail`
* **Rubros representados:** Kiosco, Librería, Juguetería, Bazar, Cotillón.

### Capacidades Requeridas (Matriz de Configuración)
| Capacidad | Estado Requerido | Razón de Uso |
| :--- | :--- | :--- |
| `barcodeScanner` | **ACTIVO** | Lector de código de barras para cobranza en menos de 5 segundos |
| `productLabels` | **ACTIVO** | Impresión de etiquetas de gondola / precio unitario |
| `promotionsAndDiscounts` | **ACTIVO** | Descuentos manuales rápidos y combos (ej. Alfajor + Gaseosa) |
| `variantMatrix` | *INACTIVO* | Productos unitarios simples |
| `decimalQuantities` | *INACTIVO* | Solamente unidades enteras (1, 2, 3) |
| `scalesIntegration` | *INACTIVO* | No requiere balanza pesable |
| `expiryTracking` | *INACTIVO* | Desactivado en la interfaz rápida |
| `serialNumbers` | *INACTIVO* | No aplica a golosinas/bazar |

---

## 🧪 2. Matriz de Pruebas de Cobertura Completa

### Escenario 1: Alta de Producto Rápida por Código de Barras 🍫
* **Acción:** Dar de alta un alfajor o gaseosa escaneando el código EAN13 directo del paquete.
* **Campos cargados:** Nombre, Código EAN13, Precio Costo, Precio Venta, Stock inicial (ej: 48 unidades).
* **Resultado esperado:** Guardado instantáneo sin obligar a llenar campos irrelevantes.

### Escenario 2: Cobranza de Alta Velocidad (Flujo Multi-ítem en Mostrador) ⚡
* **Acción:** Simular una fila de clientes cobrando 3 artículos distintos por escáner.
* **Pasos:** Escanear ítem 1 -> Escanear ítem 2 -> Escanear ítem 3 -> Presionar tecla de cobro rápido (Efectivo) -> Finalizar.
* **Resultado esperado:**
  * Tiempo total de operación < 5 segundos.
  * Cálculo automático de cambio / vuelto.
  * Impresión o emisión de ticket rápida.

### Escenario 3: Búsqueda Rápida por Nombre sin Código de Barras 🔍
* **Acción:** Vender un producto sin código impreso (ej. "Fotocopia A4" o "Caramelo suelto").
* **Pasos:** Escribir en buscador "Foto..." -> Seleccionar con enter o clic -> Cobrar.
* **Resultado esperado:** Búsqueda predictiva ágil con teclado o pantalla táctil.

### Escenario 4: Apertura y Cierre de Caja (Arqueo Diario) 💰
* **Acción:**
  1. Abrir caja con monto inicial (ej. $10.000).
  2. Registrar 5 ventas en efectivo y 3 en MercadoPago / Tarjeta.
  3. Realizar un egreso de caja (ej. $2.000 para pagar al proveedor de pan).
  4. Realizar Cierre de Caja (X/Z).
* **Resultado esperado:**
  * Conciliación exacta de efectivo esperado vs contado.
  * Discriminación clara de ventas por medio de pago.

### Escenario 5: Control de Stock Crítico y Alerta de Faltantes 📉
* **Acción:** Configurar stock mínimo de 10 unidades en un artículo. Vender hasta quedar en 8 unidades.
* **Resultado esperado:** El sistema marca el producto en la lista de repuestos pendientes o alerta de stock bajo.

---

## 📋 Checklist de Validación de Cobertura

- [ ] **Simplicidad:** ¿La interfaz está completamente despejada de funciones avanzadas que no usa un kiosco?
- [ ] **Teclado:** ¿Es posible operar el punto de venta casi 100% con teclado y escáner sin tocar el mouse?
- [ ] **Velocidad:** ¿El cobro de 3 artículos toma menos de 5 segundos?
- [ ] **Caja:** ¿El arqueo de caja cuadra exacto con el efectivo real y medios electrónicos?
- [ ] **Stock:** ¿Se descuentan correctamente las unidades vendidas?

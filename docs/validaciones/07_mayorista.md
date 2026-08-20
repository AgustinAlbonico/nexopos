# Guía de Validación y Cobertura: 07. Mayorista y Distribuidora 📦🚛

> **Objetivo:** Impersonar una Distribuidora o Comercio Mayorista para validar listas de precio diferenciadas por cliente, descuentos por escala de volumen, venta por packs/bultos y control de cuenta corriente / límites de crédito.

---

## 📌 1. Ficha del Perfil de Negocio

* **Nombre comercial de prueba:** *Distribuidora Mayorista "El Surtidor"*
* **Perfil Técnico:** `wholesale`
* **Rubros representados:** Mayorista genérico, Distribuidora de bebidas/alimentos, Golosinas al por mayor.

### Capacidades Requeridas (Matriz de Configuración)
| Capacidad | Estado Requerido | Razón de Uso |
| :--- | :--- | :--- |
| `priceLists` | **ACTIVO** | Múltiples listas de precios (Minorista, Mayorista A, Distribuidor, E-Commerce) |
| `tierDiscounts` | **ACTIVO** | Descuentos automáticos por escala de volumen (ej: +10 cajas = 15% off) |
| `productPacksAndBundles` | **ACTIVO** | Venta por bulto cerrado / pack de 12 u vs unidad suelta |
| `customerAccounts` | **ACTIVO** | Cuenta corriente de clientes, saldos, límites de crédito y recibos |
| `bulkImport` | **ACTIVO** | Actualización masiva de listas de precio |
| `variantMatrix` | *OPCIONAL* | Según el tipo de artículo distribuido |

---

## 🧪 2. Matriz de Pruebas de Cobertura Completa

### Escenario 1: Asignación de Lista de Precio por Cliente 🏷️
* **Acción:** Crear dos clientes:
  * Cliente A: *Kiosco La Estación* -> Asignado a **Lista Mayorista A**
  * Cliente B: *Consumidor Final* -> Asignado a **Lista Minorista**
* **Venta:** Cobrar el producto "Gaseosa 2.25L" a cada cliente.
* **Resultado esperado:**
  * Al seleccionar Cliente A, el precio unitario se ajusta automáticamente al valor de Lista Mayorista A sin requerir descuentos manuales.

### Escenario 2: Escala de Descuentos por Volumen (Tier Pricing) 📉
* **Acción:** Configurar regla de precio para "Galletitas Pack":
  * 1 a 5 unidades: $1.000 c/u
  * 6 a 11 unidades: $900 c/u (-10%)
  * 12+ unidades (Bulto): $800 c/u (-20%)
* **Venta:** Agregar 15 unidades al carrito.
* **Resultado esperado:**
  * El sistema aplica automáticamente la escala de $800 c/u al superar las 12 unidades.

### Escenario 3: Venta por Bulto Cerrado vs Unidad 📦
* **Acción:** Vender 2 Bultos de Gaseosa (Cada bulto contiene 6 botellas).
* **Resultado esperado:**
  * Descuento en stock de 12 unidades individuales o 2 bultos registrados.
  * Correcta valorización en la factura / comprobante.

### Escenario 4: Venta en Cuenta Corriente con Límite de Crédito 💳
* **Acción:**
  1. Configurar Cliente C con Límite de Crédito de $100.000 y saldo actual de $80.000.
  2. Intentar realizar una venta a plazo por $30.000.
* **Resultado esperado:**
  * El sistema advierte o bloquea la operación por superar el límite de crédito configurado ($110.000 exceden los $100.000 permitidos).
  * Permite cobrar un pago/recibo a cuenta para liberar crédito y proceder.

---

## 📋 Checklist de Validación de Cobertura

- [ ] **Listas de Precios:** ¿Cambia el valor de los artículos de forma transparente según el cliente seleccionado?
- [ ] **Descuento por Volumen:** ¿Aplica las escalas automáticas en el carrito de venta?
- [ ] **Cuenta Corriente:** ¿Registra el saldo deudor y actualiza el disponible de crédito en tiempo real?
- [ ] **Comprobantes:** ¿Genera la factura/remito con el detalle de bultos y descuentos aplicados?

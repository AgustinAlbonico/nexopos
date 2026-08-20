# Guía de Validación y Cobertura: 02. Venta por Peso / Balanza ⚖️

> **Objetivo:** Impersonar una Fiambrería, Dietética, Verdulería o Venta a Granel para validar el pesaje en tiempo real, integración con balanzas comerciales y lectura de etiquetas pesadas con código de barras de balanza autónoma.

---

## 📌 1. Ficha del Perfil de Negocio

* **Nombre comercial de prueba:** *Fiambrería y Rotisería "El Buen Gusto"* / *Dietética "Vida Sana"*
* **Perfil Técnico:** `weight`
* **Rubros representados:** Fiambrería, Dietética, Verdulería, Rotisería, Venta a granel.

### Capacidades Requeridas (Matriz de Configuración)
| Capacidad | Estado Requerido | Razón de Uso |
| :--- | :--- | :--- |
| `decimalQuantities` | **ACTIVO** | Venta fraccionada por kg/gramos (ej: 0,250 kg de Jamón) |
| `scalesIntegration` | **ACTIVO** | Lectura directa por puerto serie (RS232/USB) o código de barras de balanza (EAN20/EAN13) |
| `productLabels` | **ACTIVO** | Etiquetas por precio por kg y peso fraccionado |
| `variantMatrix` | *INACTIVO* | Productos pesables continuos |
| `serialNumbers` | *INACTIVO* | No aplica |
| `expiryTracking` | **OPCIONAL** | Activable para fiambres/lacteos con vencimiento de horma |

---

## 🧪 2. Matriz de Pruebas de Cobertura Completa

### Escenario 1: Venta con Peso Directo de Balanza Conectada (RS232/USB) ⚖️
* **Acción:** Colocar producto sobre balanza conectada al puerto COM/USB (ej. Systel, Kretz, HASAR).
* **Pasos:** Seleccionar producto "Queso Tybo" en pantalla -> El sistema obtiene el peso exacto (ej. `0.345` kg) -> Se agrega a la venta.
* **Resultado esperado:**
  * El peso ingresa automáticamente sin tipear manualmente.
  * El subtotal calcula `0.345 kg * $12.000/kg = $4.140`.

### Escenario 2: Lectura de Código de Barras de Balanza Autónoma (EAN13 con Peso o Importe) 🏷️
* **Acción:** Escanear una etiqueta pegada en una bandeja de fiambrería generada por una balanza Systel/Systel Cuora.
* **Formatos probados:**
  * Estructura EAN13: `20 + PPPPP + WWWWW + C` (Donde `PPPPP` es código de producto y `WWWWW` es peso en gramos o importe total).
* **Resultado esperado:**
  * El escáner lee el ticket fraccionado.
  * El POS identifica automáticamente el producto y desglosa el peso e importe total exacto.

### Escenario 3: Ingreso Manual de Peso Fraccionado ✍️
* **Acción:** Caso donde no hay balanza conectada por cable. Vender `0.150` kg de "Almendras".
* **Resultado esperado:** Permitir ingresar decimales (`0,15` o `0.150`) mediante teclado numérico o pantalla.

### Escenario 4: Venta Combinada (Pesables + Productos Unidad) 🧀🥤
* **Acción:** Cobrar en una misma venta:
  * 0.200 kg de Salame ($2.400)
  * 1 Coca Cola 1.5L (Unidad - $2.500)
  * 0.500 kg de Pan (Pesable - $1.200)
* **Resultado esperado:**
  * El ticket discrimina claramente unidades (`1 u`) de pesables (`0.200 kg @ $12.000/kg`).

---

## 📋 Checklist de Validación de Cobertura

- [ ] **Precisión Decimal:** ¿Los importes con 3 decimales de kg (ej: 0.125 kg) se multiplican sin errores de redondeo?
- [ ] **Balanza RS232:** ¿Captura el peso de la balanza en tiempo real en la pantalla de cobro?
- [ ] **Etiquetas EAN20/28:** ¿Decodifica correctamente los códigos de barras generados por balanzas autónomas?
- [ ] **Unidades de Medida:** ¿Se visualiza el precio por kg/gr claramente para el cliente?

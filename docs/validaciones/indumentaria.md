# Guía de Validación y Cobertura: Perfil Indumentaria y Calzado 👗👠

> **Objetivo:** Impersonar una tienda de Indumentaria, Calzado o Mercería para ejecutar una batería de pruebas de campo de extremo a extremo (E2E), garantizando la cobertura funcional total antes de la comercialización del sistema.

---

## 📌 1. Ficha del Perfil de Negocio

* **Nombre comercial de prueba:** *Boutique / Tienda de Ropa "Moda Total"*
* **Perfil Técnico:** `apparel` (Indumentaria / Variantes)
* **Rubros representados:** Indumentaria, Calzado, Mercería / Telas por metro.

### Capacidades Requeridas (Matriz de Configuración)
| Capacidad | Estado Requerido | Razón de Uso |
| :--- | :--- | :--- |
| `variantMatrix` | **ACTIVO** | Matriz de Talles (S, M, L, XL, 38, 40) y Colores (Negro, Blanco, etc.) |
| `productLabels` | **ACTIVO** | Impresión de etiquetas de código de barras / Hangtags para prendas |
| `decimalQuantities` | **ACTIVO** | Requerido para corte de telas por metros (ej. 1.50 mts) |
| `creditNotesAndReturns` | **ACTIVO** | Cambios de prendas por talle/color o devoluciones con voucher |
| `promotionsAndDiscounts` | **ACTIVO** | Liquidación de fin de temporada y promociones 2x1 |
| `barcodeScanner` | **ACTIVO** | Agilidad en caja leyendo etiquetas de variante |
| `expiryTracking` | *INACTIVO* | No aplica a prendas de vestir |
| `serialNumbers` | *INACTIVO* | No aplica números de serie únicos |
| `scalesIntegration` | *INACTIVO* | No requiere balanza comercial |

---

## 🧪 2. Matriz de Pruebas de Cobertura Completa

### Escenario 1: Alta de Producto con Matriz de Variantes 👕
* **Acción:** Crear producto base **"Remera Básica Algodón"**.
* **Matriz de atributos:**
  * **Talles:** S, M, L, XL
  * **Colores:** Negro, Blanco, Azul
* **Resultado esperado:**
  * El sistema genera automáticamente **12 combinaciones/SKUs** de variantes (ej: `REM-ALG-NEGRO-S`, `REM-ALG-NEGRO-M`, etc.).
  * Permite asignar código de barras propio a cada variante o autogenerarlo.
  * Permite definir costo/precio global o diferido por talle/color si fuera necesario (ej: talle XXL más caro).
  * Permite asignar stock inicial independiente por cada combinación.

### Escenario 2: Generación e Impresión de Etiquetas Hangtag 🏷️
* **Acción:** Seleccionar 3 variantes de la Remera creada y enviar a imprimir etiquetas.
* **Resultado esperado:**
  * La etiqueta muestra: **Nombre del producto + Variante (Talle / Color) + Precio + Código de barras escaneable**.
  * La lectura con escáner láser de la etiqueta impresa identifica de forma **unívoca** la variante correspondiente.

### Escenario 3: Venta Rápida en Mostrador por Escaneo 💳
* **Acción:** Simular una venta cobrando 1 Remera Negra Talle L y 1 Par de Zapatillas Negras N° 41.
* **Prueba de flujo:**
  1. Escanear el código de barras de la variante L/Negra.
  2. Verificar que en la línea de venta figure explícitamente **"Remera Básica Algodón - Negro / L"**.
  3. Seleccionar medio de pago (Efectivo / Tarjeta / Transferencia).
  4. Finalizar venta e imprimir ticket.
* **Resultado esperado:**
  * Descuento en stock **únicamente** de la variante `Negro / L` (el stock de `Negro / M` o `Blanco / L` debe permanecer intacto).
  * Ticket fiscal/comprobante detalla talle y color.

### Escenario 4: Cambio de Prenda por Talle (Flujo Crítico en Indumentaria) 🔄
* **Caso A (Mismo valor):** El cliente regresa con la Remera Talle M y pide cambiarla por Talle L del mismo modelo.
  * **Acción:** Procesar devolución de Talle M y emisión de Talle L en el mismo comprobante/operación.
  * **Resultado:** Saldo a pagar $0. El stock de Talle M aumenta +1, el stock de Talle L disminuye -1.
* **Caso B (Diferencia a favor de la tienda):** Devuelve prenda de $15.000 y lleva prenda de $22.000.
  * **Acción:** Generar Nota de Crédito / Devolución por $15.000 y aplicar al nuevo cobro.
  * **Resultado:** Cobro en caja del remanente ($7.000). Stock de ambos ítems actualizado correctamente.

### Escenario 5: Venta por Metros (Mercería / Telas) ✂️
* **Acción:** Crear producto **"TELA JEAN AZUL"** con unidad de medida en metros.
* **Venta:** Registrar venta por `2.35` metros de tela.
* **Resultado esperado:**
  * El sistema permite ingresar números decimales en la cantidad.
  * Multiplica correctamente `2.35 x Precio por metro`.
  * El stock descuenta exactamente `2.35` mts del total en depósito.

### Escenario 6: Liquidación de Fin de Temporada y Promociones 🏷️🔥
* **Acción:** Configurar descuento del 20% en prendas seleccionadas o promoción 2x1 en remetas.
* **Venta:** Aplicar la promoción en la venta de mostrador.
* **Resultado esperado:**
  * Descuento reflejado claramente en el ticket.
  * Total cobrado correcto y registración contable/caja consistente.

### Escenario 7: Inventario Rápido por Escaneo en Local 🔍
* **Acción:** Iniciar sesión de toma de inventario (Stocktake) en la categoría Indumentaria.
* **Procedimiento:** Escanear de corrido las prendas colgadas en la tienda con el lector físico.
* **Resultado esperado:**
  * El conteo acumula las cantidades por código de variante.
  * Reporte de diferencias muestra sobrantes o faltantes por talle y color (ej: "Falta 1 talle M, sobra 1 talle L").

---

## 📋 Checklist de Validación de Cobertura (Aprobado / Rechazado)

- [ ] **Configuración:** ¿El modo técnico permitió activar `apparel` sin fricción?
- [ ] **Carga de Productos:** ¿Es ágil crear 20 variantes sin escribir 20 productos distintos a mano?
- [ ] **Visibilidad:** ¿El cajero ve claramente el talle y color durante la venta?
- [ ] **Stock Integridad:** ¿El stock por variante se mantiene 100% exacto tras 5 ventas de prueba?
- [ ] **Devoluciones:** ¿El flujo de cambio por talle es realizable en menos de 30 segundos en caja?
- [ ] **Etiquetas:** ¿Los códigos de barras de las prendas son legibles por el lector?
- [ ] **Sin Ruido:** ¿La pantalla de venta está libre de campos innecesarios (lotes, vencimientos, IMEI)?

---

## 🚀 Próximos Pasos para la Prueba Físico-Funcional
1. Entrar al sistema y realizar Onboarding / Selección de perfil **Indumentaria**.
2. Ejecutar los 7 escenarios de prueba punto por punto.
3. Marcar checklist de validación y registrar cualquier ajuste necesario.

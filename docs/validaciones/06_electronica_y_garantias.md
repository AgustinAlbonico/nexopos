# Guía de Validación y Cobertura: 06. Electrónica y Garantías 💻📱

> **Objetivo:** Impersonar una Tienda de Electrónica, Computación, Electrodomésticos o Celulares para validar el seguimiento unívoco de Números de Serie / IMEI, comprobante de garantía e historial de servicio.

---

## 📌 1. Ficha del Perfil de Negocio

* **Nombre comercial de prueba:** *Tech Store "Electro & Celulares"*
* **Perfil Técnico:** `electronics`
* **Rubros representados:** Electrónica, Computación, Celulares y accesorios, Electrodomésticos.

### Capacidades Requeridas (Matriz de Configuración)
| Capacidad | Estado Requerido | Razón de Uso |
| :--- | :--- | :--- |
| `serialNumbers` | **ACTIVO** | Números de serie / IMEI unívocos por unidad física |
| `warrantyManagement` | **ACTIVO** | Impresión de Certificado de Garantía con plazo y condiciones |
| `creditNotesAndReturns` | **ACTIVO** | Tramitación de RMA / Devoluciones por falla técnica |
| `barcodeScanner` | **ACTIVO** | Escaneo de IMEI / Serial en caja |
| `variantMatrix` | **OPCIONAL** | Para capacidad de almacenamiento / color de celular |
| `expiryTracking` | *INACTIVO* | No aplica |
| `scalesIntegration` | *INACTIVO* | No aplica |

---

## 🧪 2. Matriz de Pruebas de Cobertura Completa

### Escenario 1: Ingreso de Stock con Captura de Seriales / IMEIs 📦
* **Acción:** Dar de alta compra de 3 unidades del producto **"Notebook Lenovo IdeaPad"** o **"iPhone 13 128GB"**.
* **Ingreso:** Capturar los 3 números de serie individuales:
  * `SN-LEN-9901`
  * `SN-LEN-9902`
  * `SN-LEN-9903`
* **Resultado esperado:**
  * El stock contable es 3 u, pero cada una identificada individualmente por su Serial/IMEI.

### Escenario 2: Venta en Mostrador Seleccionando el Serial Exacto 💳
* **Acción:** Cobrar 1 Notebook Lenovo.
* **Pasos:** Escanear o seleccionar el número de serie de la unidad física que se entrega al cliente (`SN-LEN-9902`).
* **Resultado esperado:**
  * La venta exige especificar el serial emitido.
  * El comprobante y Certificado de Garantía imprimen explícitamente: **"S/N: SN-LEN-9902"**.
  * El serial `SN-LEN-9902` pasa a estado "VENDIDO" con su fecha de venta y cliente asignado.

### Escenario 3: Verificación de Garantía y Reclamo Técnico (RMA) 🛡️
* **Acción:** Un cliente regresa 3 meses después indicando que la pantalla no enciende.
* **Pasos:** Buscar por el número de serie `SN-LEN-9902`.
* **Resultado esperado:**
  * El sistema encuentra de inmediato la venta original, fecha de emisión, datos del cliente y estado de la garantía (VIGENTE / VENCIDA).
  * Permite iniciar un comprobante de RMA / Recepción de servicio técnico.

### Escenario 4: Devolución o Cambio por Defecto de Fábrica 🔄
* **Acción:** Reemplazar el equipo defectuoso por una unidad nueva (`SN-LEN-9903`).
* **Resultado esperado:**
  * Ajuste de stock: la unidad defectuosa entra a servicio/proveedor y la unidad nueva sale con garantía renovada o vinculada.

---

## 📋 Checklist de Validación de Cobertura

- [ ] **Serial Obligatorio:** ¿Impide finalizar la venta de un producto con seriales si no se escaneó/eligió el S/N exacto?
- [ ] **Certificado de Garantía:** ¿Genera e imprime el documento de garantía con los datos del equipo y del cliente?
- [ ] **Búsqueda por Serial:** ¿Permite encontrar en 1 segundo una factura de hace 6 meses simplemente digitando el IMEI o S/N?
- [ ] **Trazabilidad:** ¿Diferencia claramente las unidades en stock de las ya vendidas?

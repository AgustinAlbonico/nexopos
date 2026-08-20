# Guía de Validación y Cobertura: 04. Ferretería y Medidas 🔧🎨

> **Objetivo:** Impersonar una Ferretería o Pinturería para validar fraccionados por metros/litros/kilos, unidades de medida, importación masiva de catálogos con +5.000 SKUs y ventas en fraccionado (suelto vs. caja/pack).

---

## 📌 1. Ficha del Perfil de Negocio

* **Nombre comercial de prueba:** *Ferretería & Pinturería "El Progreso"*
* **Perfil Técnico:** `hardware`
* **Rubros representados:** Ferretería, Pinturería, Bulonera, Materiales eléctricos.

### Capacidades Requeridas (Matriz de Configuración)
| Capacidad | Estado Requerido | Razón de Uso |
| :--- | :--- | :--- |
| `decimalQuantities` | **ACTIVO** | Venta fraccionada de cable por metro, pintura por litro, clavos por kg |
| `unitOfMeasure` | **ACTIVO** | Discriminación de unidades (mts, lts, kg, u, bolsa, caja) |
| `bulkImport` | **ACTIVO** | Importación masiva de listas de precios de distribuidores (+5000 SKUs) |
| `productPacksAndBundles` | **ACTIVO** | Venta de unidades sueltas extraídas de una caja/pack (ej. 1 tornillo suelto vs Caja x 100) |
| `productLabels` | **ACTIVO** | Etiquetas para góndola y cajoneras de bulonería |
| `variantMatrix` | *INACTIVO* | No requiere matriz talle/color |
| `expiryTracking` | *INACTIVO* | No aplica salvo adhesivos/selladores puntuales |

---

## 🧪 2. Matriz de Pruebas de Cobertura Completa

### Escenario 1: Importación Masiva de Catálogo (+5.000 SKUs desde Excel/CSV) 📥
* **Acción:** Importar lista de precios de distribuidor ferretero en formato CSV (Código, Descripción, Unidad, Costo, Margen %, Precio Venta).
* **Resultado esperado:**
  * Carga masiva rápida en < 10 segundos.
  * Correcta asignación de unidades de medida (mts, kg, u).

### Escenario 2: Venta Fraccionada por Medidas (Cable por Metro / Pintura por Litro) 📏
* **Acción:** Vender `15.5` metros de "Cable Unipolar 2.5mm" y `2.5` litros de "Látex Interior".
* **Resultado esperado:**
  * Multiplicación exacta por el precio de lista.
  * Descuento exacto del stock en decimales (`-15.5 mts`).

### Escenario 3: Conversión de Pack a Suelto (Bulonería / Tornillos) 🔩
* **Acción:** El negocio compra "Caja de Tornillos 6x1" (100 u) y vende 12 tornillos sueltos.
* **Resultado esperado:**
  * El sistema permite vender unidades sueltas descontando proporcionalmente del stock de la caja o vinculando la unidad al pack.

### Escenario 4: Búsqueda Avanzada por Código Técnico o Equivalencias 🔎
* **Acción:** Buscar en caja por código de marca ("SIN-104"), por descripción parcial ("Caño PVC 110") o por medidas ("1/2 pulgada").
* **Resultado esperado:**
  * La búsqueda encuentra rápidamente el ítem exacto aun con miles de artículos cargados.

---

## 📋 Checklist de Validación de Cobertura

- [ ] **Rendimiento de Búsqueda:** ¿La búsqueda en un catálogo de +5.000 productos responde de inmediato?
- [ ] **Unidades de Medida:** ¿La pantalla muestra claramente si el precio es por metro, litro o kilo?
- [ ] **Fraccionado:** ¿Descuenta decimales del stock sin distorsionar el total en inventario?
- [ ] **Importación CSV:** ¿Soporta actualización masiva de precios por porcentaje de costo?

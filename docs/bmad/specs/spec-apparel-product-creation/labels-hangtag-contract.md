# Especificación de Etiquetas Térmicas y Hangtags de Indumentaria

Este documento define el formato visual, formatos de impresión y flujo de emisión inmediata post-creación de productos de indumentaria (CAP-6), inspirado en Dragonfish y Jazz POS.

## 1. Tipos de Etiquetas para Indumentaria

1. **Etiqueta de Colgar (Hangtag Textil):**
   - Formato típicamente impreso en cartulina perforada o rollo continuo de cartulina (ej: 40×80mm o 50×90mm).
   - **Elementos obligatorios:**
     - Nombre de la Marca (encabezado destacado).
     - Nombre del Modelo / Prenda.
     - **TALLE EN RECUADRO GIGANTE** (Centrado, tipografía bold extra grande, fondo contrastante).
     - Color / Variante.
     - Código de Barras (Code 128 / EAN-13) + SKU legible.
     - Precio de Venta (opcional según configuración de tienda).
     - Composición y Leyenda legal de cuidado/origen.

2. **Etiqueta Autoadhesiva Térmica (Zebra / Argox / Xprinter):**
   - Formatos estándar de 1, 2 o 3 columnas:
     - `50×30 mm` (Estándar rollos térmicos directos).
     - `29×90 mm` (Estándar Brother / Dymo).
     - `33×22 mm` (Mini joyería / accesorios).

---

## 2. Flujo de Emisión Post-Guardado en Frontend

1. **Trigger automático tras éxito:**
   - Inmediatamente después de recibir `201 Created` en `POST /api/products/matrix`, se despliega un modal interactivo:
     - *"¡Modelo guardado con éxito! Se generaron X variantes con Y unidades de stock."*
     - Selector: `[ ] Imprimir etiquetas ahora`.
2. **Opciones del Diálogo de Impresión:**
   - Selector de Formato: `Etiquetas de Colgar (Hangtag 50x90mm)` | `Térmica 50x30mm` | `Hoja A4 Adhesiva (3x8)`.
   - Cantidad a emitir:
     - *Opción A:* 1 etiqueta por cada unidad de stock cargada (ej: si entraron 10 M y 5 L, imprime 15 etiquetas).
     - *Opción B:* 1 etiqueta por cada variante (para muestrario / perchero).
3. **Generación e Impresión:**
   - El frontend consume el endpoint `POST /api/products/labels/print-batch` que genera el PDF renderizado en el cliente o envía comandos ZPL/TSPL directos si la impresora térmica está configurada vía QZ Tray / Print Service.

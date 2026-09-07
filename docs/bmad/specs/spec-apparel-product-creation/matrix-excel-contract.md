# Contrato de Importación y Exportación Masiva Excel en Formato Matriz 2D

Este documento define el formato del archivo `.xlsx`, validaciones y pipeline de importación bidireccional para indumentaria (CAP-5), inspirado en Dux Software y Tango.

## 1. Estructura del Archivo Excel 2D

La plantilla descargable contiene dos bloques principales en una sola hoja:
1. **Columnas Maestras del Modelo (Fijas a la izquierda):**
   - `CODIGO_ESTILO` (Texto, opcional, ej: `REM-101`)
   - `NOMBRE_MODELO` (Texto, requerido, ej: `Remera Algodón Cuello Redondo`)
   - `CATEGORIA` (Texto, opcional, ej: `Remeras`)
   - `MARCA` (Texto, opcional, ej: `Levis`)
   - `TEMPORADA` (Texto, opcional, ej: `Primavera-Verano 2026`)
   - `COLECCION` (Texto, opcional, ej: `Línea Urbana`)
   - `COLOR` (Texto, requerido por fila, ej: `Negro`, `Blanco`)
   - `HEX_COLOR` (Texto, opcional, ej: `#18181b`)
   - `COSTO_BASE` (Numérico, opcional)
   - `PRECIO_BASE` (Numérico, opcional)

2. **Columnas de Talles (Dinámicas a la derecha):**
   - Columnas con prefijo `T_` o encabezado directo del talle: `XS`, `S`, `M`, `L`, `XL`, `XXL` (o números `38`, `40`, `42`, etc.).
   - El valor de la celda representa la **cantidad de stock** a ingresar para esa combinación `Color × Talle`.

### Ejemplo visual de la planilla:

| CODIGO_ESTILO | NOMBRE_MODELO | CATEGORIA | MARCA | COLOR | COSTO_BASE | PRECIO_BASE | S | M | L | XL | XXL |
|---|---|---|---|---|---|---|---|---|---|---|---|
| REM-101 | Remera Lisa Urban | Remeras | Levis | Negro | 4500 | 8900 | 5 | 10 | 10 | 5 | 2 |
| REM-101 | Remera Lisa Urban | Remeras | Levis | Blanco | 4500 | 8900 | 4 | 8 | 8 | 4 | 2 |
| PAN-204 | Jean Regular Fit | Pantalones | Taverniti | Azul Marino | 9500 | 18500 | 0 | 4 | 6 | 6 | 2 |

---

## 2. Pipeline de Procesamiento Backend

1. **Lectura y Detección de Columnas:**
   - Detecta automáticamente cuáles columnas son de metadatos y cuáles son talles dinámicos.
2. **Agrupación Transaccional por Modelo:**
   - Agrupa filas consecutivas con el mismo `CODIGO_ESTILO` o `NOMBRE_MODELO` bajo un único producto padre (`isVariantParent = true`).
3. **Generación de Variantes Hijas:**
   - Para cada celda `(Color, Talle)` con o sin stock, genera la variante hija con SKU estructurado `[ESTILO]-[COLOR]-[TALLE]`.
4. **Validación Previa (Dry-Run / Preview):**
   - El endpoint `POST /api/products/import/matrix/preview` devuelve un resumen antes de impactar:
     - `totalModels`: Cantidad de modelos padre a crear.
     - `totalVariants`: Cantidad de SKUs a generar.
     - `totalStockUnits`: Unidades totales de stock ingresadas.
     - `errors`: Lista de errores por fila (ej: nombre vacío, categoría inexistente, etc.).
5. **Impacto Atómico:**
   - `POST /api/products/import/matrix/commit` ejecuta la creación dentro de una transacción TypeORM (`EntityManager.transaction`).

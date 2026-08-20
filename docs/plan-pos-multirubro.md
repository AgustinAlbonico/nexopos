# Preparar NexoPOS para distintos tipos de comercios

> Este es el resumen breve. La planificación completa está en [planificacion-multirubro-completa.md](./planificacion-multirubro-completa.md).

## Objetivo

Mantener **un único sistema** y adaptarlo mediante perfiles, capacidades y módulos. No habrá versiones de código diferentes para kioscos, dietéticas, indumentaria u otros rubros.

## Familias de comercios

Los comercios se agrupan por cómo manejan sus productos y stock:

| Familia | Ejemplos | Diferencia principal |
| --- | --- | --- |
| Unidad simple | Bazar, librería, juguetería, accesorios | Un código, precio y stock por producto |
| Alta rotación | Kiosco, almacén, bebidas, limpieza | Muchos productos, packs, reposición y venta rápida |
| Peso o medida | Dietética, verdulería, carnicería, telas | Cantidades decimales y precio por kg o metro |
| Variantes | Indumentaria, calzado, lencería | Talles, colores y modelos con stock propio |
| Lotes y vencimientos | Alimentos, cosmética, perfumería | Stock separado por lote y fecha de vencimiento |
| Series y garantías | Celulares, electrónica, herramientas | Cada unidad puede tener serie y garantía propia |
| Consignación o reventa | Ropa usada, antigüedades, artículos de terceros | El stock puede pertenecer a otra persona |
| Minorista y mayorista | Corralones, repuestos, distribuidores | Listas de precios, bultos y condiciones por cliente |

Un comercio puede combinar familias. Por ejemplo, un pet shop puede vender bolsas por unidad y alimento suelto por peso.

## Tipos de diferencias

### Configuraciones

Opciones que no cambian la estructura del sistema: escáner, venta sin stock, módulos visibles, margen, stock mínimo, medios de pago y reportes.

### Módulos opcionales

Procesos que algunos comercios necesitan: promociones, garantías, listas mayoristas, consignación o gestión de vencimientos.

### Capacidades estructurales

Cambios que afectan productos, compras, ventas, inventario y reportes: cantidades decimales, variantes, lotes, números de serie y packs.

## Cómo se personalizará

El sistema tendrá cinco partes:

1. **Núcleo común:** ventas, compras, caja, clientes, proveedores, AFIP, reportes, usuarios y backups.
2. **Perfil comercial:** plantilla inicial como kiosco, dietética, indumentaria o electrónica.
3. **Capacidades:** peso, variantes, vencimientos, series, precios mayoristas, etc.
4. **Módulos opcionales:** pantallas y procesos visibles sólo cuando correspondan.
5. **Modelo de inventario:** estructura común que soportará correctamente todas las capacidades.

El perfil sólo seleccionará capacidades recomendadas. No contendrá código exclusivo del rubro.

| Perfil de ejemplo | Capacidades recomendadas |
| --- | --- |
| Kiosco o almacén | Venta rápida, códigos de barras, packs y promociones |
| Dietética | Cantidades decimales, peso y balanza |
| Indumentaria | Variantes de talle, color y modelo |
| Perfumería | Venta por unidad y lotes/vencimientos opcionales |
| Electrónica | Series, garantías y devoluciones por unidad |
| Mayorista/minorista | Listas de precios, bultos y condiciones por cliente |

## Funcionamiento

1. Durante la instalación se selecciona el tipo de comercio.
2. El backend guarda el perfil y sus capacidades.
3. El frontend muestra únicamente las funciones necesarias.
4. El backend también controla que las operaciones estén habilitadas.
5. Todos reciben las mismas migraciones y actualizaciones.
6. Las instalaciones actuales permanecen en modo `legacy`, sin cambios visibles.

## Orden de desarrollo

1. Crear el perfil `legacy` y el catálogo de capacidades.
2. Comunicar las capacidades entre backend y frontend.
3. Agregar la selección de perfil durante la instalación.
4. Generalizar cantidades, unidades de medida e inventario.
5. Incorporar venta por peso.
6. Incorporar variantes.
7. Incorporar lotes y vencimientos.
8. Incorporar series y garantías.
9. Incorporar precios mayoristas.
10. Incorporar consignación.

## Decisión principal

NexoPOS será un **sistema modular para comercios minoristas de productos físicos**. Cada diferencia se desarrollará una sola vez y podrá combinarse según las necesidades del comercio, sin crear versiones separadas.

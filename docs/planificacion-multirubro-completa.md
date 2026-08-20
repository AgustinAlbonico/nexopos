# Planificación completa de NexoPOS multi-rubro

## Resumen ejecutivo

NexoPOS debe evolucionar como **un único sistema modular para comercios minoristas de productos físicos**. No habrá una versión distinta por rubro. Cada instalación elegirá un perfil que activará capacidades ya soportadas por el sistema.

La investigación identificó ocho familias operativas. Algunas diferencias son configuraciones; otras son módulos opcionales; y otras cambian profundamente productos, ventas e inventario. El roadmap prioriza primero la base compartida y luego incorpora cada capacidad una sola vez para poder combinarla.

## Principios del producto

1. Un único código, instalador, esquema de base y camino de actualizaciones.
2. Un perfil es una plantilla; nunca contiene lógica exclusiva del rubro.
3. El backend controla las reglas; el frontend muestra sólo lo necesario.
4. Un comercio puede combinar capacidades de varias familias.
5. La caja debe continuar siendo rápida, directa y operable por teclado o scanner.
6. Las instalaciones actuales permanecen en modo `legacy` hasta elegir otro perfil.
7. No se promete una capacidad hasta que funcione en venta, compra, stock, devolución, comprobantes y reportes.

## Núcleo común para todos los comercios

NexoPOS ya tiene gran parte del núcleo: catálogo, ventas, compras, stock, proveedores, clientes, cuentas corrientes, caja, AFIP, reportes, usuarios, scanner, backups y aplicación de escritorio.

Antes de desarrollar diferencias verticales deben completarse estas funciones comunes:

| Función común | Alcance esperado | Prioridad |
| --- | --- | --- |
| Importación de productos | Archivo validado, vista previa, detección de duplicados, errores por fila y confirmación | Muy alta |
| Etiquetas | Barcode/precio, plantillas, vista previa, calibración y cola de impresión | Alta |
| Conteos de stock | Sesión de conteo, cantidades esperadas/contadas, diferencias, aprobación y motivos | Muy alta |
| Devoluciones y cambios | Venta original, devolución parcial/total, reingreso o cuarentena, diferencia y reembolso | Muy alta |
| Notas de crédito | Vinculación con comprobante original y flujo AFIP correspondiente | Muy alta |
| Restauración | Restaurar backup con validaciones, rollback y prueba de integridad | Muy alta |
| Diagnóstico | Logs exportables y pruebas de scanner, impresora, cajón y balanza soportada | Alta |
| Packs y unidades | Diferenciar unidad, caja, pack, bundle y unidad de compra/venta | Muy alta |
| Auditoría de inventario | Motivos estructurados para ajustes, devoluciones, mermas y conteos | Alta |

## Familias comerciales

### 1. Venta por unidad simple

**Negocios:** bazares, librerías, jugueterías, decoración, accesorios y ferreterías simples.

**Funciones esenciales**

- Producto con SKU/barcode, precio, costo y stock.
- Venta rápida, pagos, caja, compras y proveedores.
- Devoluciones, importación, etiquetas y conteos.
- Alertas de stock y reportes de rotación/rentabilidad.

**Funciones opcionales**

- Precios por categoría.
- Descuentos manuales con permiso y motivo.
- Bundles o kits sencillos.
- Cuentas corrientes.

**Diferenciador real**

No necesita una estructura especial: su valor es una experiencia simple, rápida y confiable. Será el perfil base del producto.

### 2. Productos envasados de alta rotación

**Negocios:** kioscos, almacenes, bebidas, limpieza y pet shops con productos envasados.

**Funciones esenciales**

- Caja orientada al scanner y búsquedas inmediatas.
- Packs, cajas y venta por unidad.
- Reposición, mínimos/máximos y sugerencias de compra.
- Recepción rápida de mercadería.
- Conteos parciales, mermas, roturas y diferencias.
- Reportes de productos rápidos, lentos y faltantes.

**Funciones opcionales**

- Promociones simples por cantidad.
- Fiado mediante cuentas corrientes.
- Etiquetas de góndola/precio.
- Catálogo de proveedor para actualizaciones masivas.

**Diferenciador real**

El circuito completo **faltante → pedido → recepción → reposición**, junto con packs correctos y velocidad de caja.

### 3. Venta por peso o medida

**Negocios:** dietéticas, verdulerías, carnicerías, fiambrerías, telas y materiales por metro.

**Funciones esenciales**

- Cantidades decimales y precisión definida por unidad.
- Precio por kilogramo, gramo, litro, metro u otra medida.
- Tara, PLU y códigos con peso o precio incorporado.
- Compra y stock en unidades compatibles.
- Merma, rendimiento y devoluciones fraccionadas.
- Comprobantes y reportes con cantidades decimales correctas.

**Funciones opcionales**

- Impresión de etiquetas con peso/precio.
- Integración directa con modelos concretos de balanza.
- Fecha/lote para productos perecederos.
- Conversión entre unidades de compra y venta.

**Diferenciador real**

Un flujo rápido que combina productos por unidad y por peso en el mismo carrito, con lectura confiable de balanza o etiqueta.

### 4. Productos con variantes

**Negocios:** indumentaria, calzado, lencería, marroquinería y accesorios de moda.

**Funciones esenciales**

- Producto principal con variantes por talle, color, modelo u otros atributos.
- SKU/barcode, precio y stock por combinación vendible.
- Creación masiva mediante matriz.
- Importación y etiquetas por variante.
- Cambios con reingreso correcto y cobro/devolución de diferencia.
- Reportes de venta y stock por variante y producto principal.

**Funciones opcionales**

- Imágenes por variante.
- Colecciones, temporadas y etiquetas comerciales.
- Precio adicional según variante.
- Kits o conjuntos.

**Diferenciador real**

Una matriz fácil de administrar y un cambio de producto rápido en la caja. Mostrar colores no alcanza si el stock por variante no es correcto.

### 5. Productos con lote y vencimiento

**Negocios:** alimentos, cosmética, perfumería y productos perecederos.

**Funciones esenciales**

- Recepción con lote y fecha de vencimiento/validez.
- Stock separado por lote.
- Sugerencia FEFO: vender primero lo que vence primero.
- Bloqueo o advertencia de lote vencido.
- Cuarentena para productos dañados, retirados o vencidos.
- Trazabilidad y retiro por producto/lote.
- Alertas de próximo vencimiento, merma y devolución a proveedor.

**Funciones opcionales**

- Descuentos por proximidad de vencimiento.
- Etiquetas GS1 2D con lote/fecha.
- Notificación a compradores identificados.
- Monitoreo de temperatura cuando corresponda.

**Diferenciador real**

Trazabilidad completa y capacidad de ejecutar un retiro real. Un simple campo “vencimiento” no resuelve este modelo.

### 6. Productos con serie y garantía

**Negocios:** celulares, electrónica, electrodomésticos, herramientas y artículos de alto valor.

**Funciones esenciales**

- Número de serie o IMEI por unidad física.
- Registro al recibir, vender y devolver.
- Prevención de seriales duplicados o ya vendidos.
- Garantía con fecha de inicio, duración y condiciones fotografiadas en la venta.
- Búsqueda de venta y cliente por serial.
- Devolución vinculada a la unidad original.

**Funciones opcionales**

- Flujo RMA o entrega a servicio técnico sin convertirse en sistema de reparaciones.
- Historial de propiedad.
- Alertas de garantía.
- Controles antifraude.

**Diferenciador real**

Conocer el ciclo de vida de cada unidad y resolver una garantía usando el serial, no solamente el nombre del producto.

### 7. Consignación y reventa

**Negocios:** ropa usada, antigüedades, artículos de terceros y locales de consignación.

**Funciones esenciales**

- Consignante y contrato.
- Propietario real de cada artículo.
- Comisión o porcentaje por producto/categoría.
- Descuentos por antigüedad y fechas de vencimiento del contrato.
- Liquidaciones, retenciones, pagos y reversos.
- Devolución del artículo al propietario.
- Reportes de stock, ventas y saldo por consignante.

**Funciones opcionales**

- Portal o envío de reportes al consignante.
- Pago masivo.
- Alquiler de espacio/stand para antigüedades.
- Reglas de descuento configurables por contrato.

**Diferenciador real**

Separar propiedad, comisión y liquidación. El stock consignado no debe tratarse como inventario comprado por el comercio.

### 8. Minorista y mayorista híbrido

**Negocios:** corralones, repuestos, materiales eléctricos y distribuidores con mostrador.

**Funciones esenciales**

- Grupos de clientes y listas de precios.
- Descuentos por cantidad y mínimos/incrementos de compra.
- Unidad, caja, bulto y otras presentaciones.
- Cuenta corriente, límite de crédito y condiciones de pago.
- Datos fiscales completos por cliente.
- Cotización, pedido, entrega parcial y facturación.
- Recepción de mercadería separada del pago al proveedor.

**Funciones opcionales**

- Precio/catálogo específico por cliente.
- Anticipos y pagos parciales.
- Vendedor, comisión y objetivos.
- Visibilidad de margen durante cotización.

**Diferenciador real**

Atender consumidor final y cliente comercial desde el mismo sistema, aplicando automáticamente precio, cantidad y condición correcta.

## Combinaciones frecuentes

| Comercio | Perfil base | Capacidades adicionales |
| --- | --- | --- |
| Pet shop mixto | Alta rotación | Peso/medida |
| Perfumería | Unidad simple | Lotes/vencimientos opcionales |
| Mini mercado con fiambrería | Alta rotación | Peso + lotes/vencimientos |
| Electrónica con venta a empresas | Series/garantías | Variantes + mayorista |
| Mayorista de indumentaria | Variantes | Pricing mayorista |
| Local de ropa usada | Consignación | Variantes + unidad simple |
| Ferretería/corralón | Minorista/mayorista | Packs + medida por metro |

## Modelo de personalización

### Perfil

Nombre entendible que propone configuraciones y capacidades. Ejemplos: `kiosco`, `dietética`, `indumentaria`, `electrónica`, `mayorista`.

### Capacidad

Función soportada por el producto, como `decimal_quantities`, `variant_inventory`, `lot_tracking`, `serial_tracking` o `wholesale_pricing`.

### Módulo

Pantallas y procesos opcionales: importación, etiquetas, stocktake, promociones, loyalty, garantía o liquidaciones.

### Política

Regla centralizada que define cantidad válida, identidad de stock, precio, validación de venta, recepción y devolución. Evita condicionales del tipo `si es kiosco` o `si es dietética` distribuidos por el código.

## Promociones y fidelización

No se implementará inicialmente un motor genérico. Se separarán:

1. Descuento manual.
2. Cambio manual de precio con permiso.
3. Descuento por cantidad.
4. Bundle o mix-and-match.
5. Promoción automática con fechas/condiciones.
6. Cupón o código.
7. Loyalty con puntos/niveles.
8. Crédito a favor como saldo/medio de pago.

Cada tipo tendrá reglas explícitas de combinación, impuestos, devoluciones, permisos y auditoría.

## Roadmap por dependencias

| Fase | Entrega principal | Negocios beneficiados |
| --- | --- | --- |
| 0 | Baseline de pruebas y velocidad | Todos; protege cliente actual |
| 1 | Perfil `legacy`, capacidades y configuración | Todos |
| 2 | Cantidad/UOM y snapshots históricos | Base estructural |
| 3 | Importación, etiquetas, stocktakes y auditoría | Unidad simple y alta rotación |
| 4 | Devoluciones/cambios y notas de crédito | Todos |
| 5 | Packs y unidades comerciales | Kioscos, bebidas, mayoristas |
| 6 | Peso/medida y códigos variables | Dietéticas, frescos, telas |
| 7 | Variantes | Indumentaria y calzado |
| 8 | Lotes/vencimientos/recall | Alimentos, cosmética, perfumería |
| 9 | Series/garantías | Electrónica y durables |
| 10 | Pricing y condiciones mayoristas | Minorista/mayorista |
| 11 | Consignación y liquidaciones | Reventa y terceros |
| 12 | Promociones/cupones/loyalty avanzados | Diferenciación transversal |

## Requisitos de velocidad y seguridad

- Un producto escaneado debe aparecer en la venta en menos de 300 ms p95 con base local.
- Recalcular un carrito de 20 líneas debe tardar menos de 100 ms p95.
- Finalizar localmente una venta debe tardar menos de 2 segundos p95, sin contar ARCA ni impresión.
- La caja no mostrará decisiones administrativas durante una venta normal.
- Las reglas se validarán en backend; ocultar una pantalla nunca será el único control.
- Ventas, compras, devoluciones y conteos conservarán snapshots históricos.
- Las migraciones serán iguales para todas las instalaciones y siempre se registrarán en el índice obligatorio.
- Backup, restore y actualizaciones tendrán pruebas de recuperación.
- Cada periférico tendrá modelos/protocolos soportados y una pantalla de prueba.

## Fuera de alcance

- SaaS, multiempresa o control remoto de capacidades.
- Múltiples sucursales, transferencias y depósitos complejos.
- Multimoneda.
- Gastronomía, turnos/servicios y farmacia regulada.
- E-commerce, omnicanalidad o WMS enterprise.
- Sistema completo de reparaciones.
- Soporte genérico para cualquier balanza/impresora.

## Resultado esperado

NexoPOS podrá adaptarse a comercios distintos combinando capacidades probadas, manteniendo una caja rápida y un único producto mantenible. Cada nueva familia se habilitará cuando su capacidad estructural funcione de punta a punta y no mediante parches específicos por cliente.

## Fuentes principales

La investigación completa, los claims verificados y las fuentes están documentados en `.omo/ulw-research/20260808-retail-multirubro/SYNTHESIS.md`.

# Auditoría Funcional e Integral del Sistema POS para el Rubro Indumentaria, Calzado y Accesorios

**Fecha de Auditoría:** 12 de Agosto de 2026  
**Sistema Evaluado:** NexoPOS (`punto_de_venta`)  
**Alcance:** Evaluación funcional completa de punta a punta frente al ciclo operativo real de una tienda de indumentaria.

---

## 1. Resumen Ejecutivo

Actualmente, el sistema **NexoPOS presenta una base arquitectónica robusta en sus aspectos transversales** (facturación electrónica AFIP, gestión de caja chica/diaria, ventas en cuenta corriente, múltiples ubicaciones depósito/salón y auditoría de operaciones). Sin embargo, **NO está preparado en su estado actual para ser utilizado de punta a punta en un negocio de indumentaria sin recurrir a herramientas externas**.

El principal cuello de botella reside en la **desconexión entre el modelo de datos de variantes (backend) y la experiencia operativa en la interfaz (frontend)**, sumado a la **ausencia de flujos clave del rubro textil**:
1. **Inoperatividad de la matriz de variantes (Talle x Color)** en la interfaz de alta de productos y en el punto de venta (POS).
2. **Ausencia de un flujo integrado de Cambios de Prenda (1 a 1 y por diferencia de valor)** directo en el mostrador.
3. **Falta de emisión e impresión de Etiquetas de Código de Barras con Talle/Color/Marca** para etiquetar percheros y prendas.
4. **Falta de vales de cambio / crédito en tienda (Store Credit Vouchers)** para clientes no registrados o compras de regalo.
5. **Inexistencia de un motor de promociones del rubro textil** (2x1, 3x2, 2da unidad al 50%, descuentos por medio de pago/billeteras).
6. **Inexistencia de reportes por curva de talles y colores**.

En consecuencia, si un negocio de indumentaria implementa el sistema en su estado actual, la cajera y el encargado terminarán usando **calculadoras para promociones/cambios**, **papel/cuadernos para anotar vales de cambio**, **Excel o BarTender externo para imprimir etiquetas** y **planillas secundarias para controlar compras por curva de talles**.

---

## 2. Relevamiento Independiente de Procesos y Necesidades del Rubro Indumentaria

Un negocio de ropa y calzado opera bajo una dinámica con características únicas respecto al retail tradicional:

### A. Estructura de Catálogo y Productos
* **Dimensión de Variantes (Matriz Talle x Color)**: Un mismo modelo ("Remera Oversize Cotton") posee múltiples colores (Negro, Blanco, Beige) y talles (S, M, L, XL, XXL). Representa entre 15 y 40 SKUs individuales por producto base.
* **Atributos Textiles**: Marca, Temporada (ej. Primavera/Verano 2026), Colección, Género (Hombre, Mujer, Niños, Unisex), Composición (100% Algodón, Jean, Lino).
* **Códigos de Barras por Variante**: Cada talle/color requiere su propio código EAN-13 / Code128 o la lectura del código del fabricante.

### B. Recepción e Ingreso de Mercadería
* **Carga de Compras por Matriz**: Recepción de cajas del proveedor con surtido de talles y colores. La carga manual ítem por ítem es inviable; se requiere ingresar cantidades directamente sobre la grilla Talle x Color.
* **Etiquetado Físico (Hangtags / Stickers térmicos)**: Las prendas llegan sin precio o con etiquetas del fabricante. El local debe imprimir sus propias etiquetas colgantes o adhesivas con Marca, Modelo, Color, Talle, Precio y Código de Barras para escáner.

### C. Operación en Punto de Venta (POS)
* **Búsqueda y Verificación Veloz de Stock por Talle/Color**: El vendedor en el mostrador necesita saber en 2 segundos si hay "Talle L en Negro" en el depósito sin tener que ir a buscarlo físicamente.
* **Escaneo Directo e Instantáneo**: Al escanear con la lectora de código de barras la etiqueta de la prenda, el ítem debe sumarse al carrito inmediatamente sin popups ni clics de confirmación.
* **Carritos Guardados / Ventas en Espera**: Clientes que se están probando más ropa mientras el vendedor atiende a otro.
* **Promociones ComercialesComplejas**: 3x2 en remeras, 20% en la 2da unidad, 10% OFF pago en efectivo/transferencia, recargos por cuotas (3 cuotas sin interés vs cuotas con interés).

### D. Cambios, Devoluciones y Regalos (CRÍTICO: representan 30%-40% de las operaciones diarias)
* **Ticket de Cambio (Sin Precio)**: Emisión de comprobante de regalo con código de barras y validez de 30 días.
* **Cambio Talle por Talle (Mismo valor)**: Trae talle S, se lleva talle M del mismo modelo. Transacción con saldo $0, pero con movimiento de stock inverso en ambas prendas.
* **Cambio por Diferente Valor**: Trae remera ($20.000) y se lleva campera ($35.000). El sistema debe descontar la devolución, cobrar la diferencia ($15.000) y emitir el comprobante unificado.
* **Vale de Cambio / Crédito en Tienda**: Si el cliente no encuentra nada para llevarse en el momento, se genera un vale impreso o digital con un código único por el valor devuelto.
* **Prendas Defectuosas / Falladas**: La devolución por falla no debe volver al stock de venta, sino ir a la ubicación "Depósito de Fallados/Baja".

### E. Análisis Comercial y Curva de Talles
* **Reporte de Curva de Talles/Colores**: Identificar si los talles "S" o "M" son los primeros en agotarse para ajustar los próximos pedidos al proveedor.
* **Rotación y Percheros de Liquidación**: Detectar prendas "clavadas" (slow movers) para pasarlas a descuento.

---

## 3. Funcionalidades Correctamente Resueltas en el Sistema Actual

Las siguientes capacidades de NexoPOS están bien construidas y listas para operar:

1. **Gestión de Caja Chica y Cierres (Cash Register)**:
   * Apertura, arqueo, cierres de caja, control de movimientos manuales de egreso/ingreso y consistencia de totales por medio de pago.
2. **Facturación Electrónica (AFIP ARCA)**:
   * Generación de comprobantes A, B, C y Notas de Crédito fiscales vinculadas.
3. **Cuentas Corrientes y Clientes (Customer Accounts)**:
   * Venta a cuenta corriente ("fiado"), límites de crédito, registro de entregas/pagos a cuenta e historial de saldos.
4. **Sectorización de Inventario (Depósito vs. Salón)**:
   * Modelo multi-ubicación (`ProductLocationStock`), transferencias de stock entre depósito y salón de ventas, y alertas de reposición.
5. **Auditoria de Operaciones**:
   * Registro detallado de acciones de usuarios (`AuditLog`) para cambios de precio, descuentos y anulaciones.
6. **Marcas y Categorías Básicas**:
   * Entidad de marcas con autocomplete y asociación jerárquica con categorías.

---

## 4. Funcionalidades Existentes Pero Mejorables (UX y Eficiencia)

1. **Formulario de Alta / Edición de Producto (`ProductForm.tsx`)**:
   * **Problema**: Flujo lineal no optimizado para carga masiva. No permite duplicar un producto base para crear una variante rápidamente ni copiar atributos.
   * **Mejora**: Añadir botón "Guardar y Crear Variante" o "Duplicar Producto".
2. **Búsqueda de Productos en el POS (`ProductSearch.tsx`)**:
   * **Problema**: El buscador es un desplegable combobox que exige varios clics. Si se escanea un código de barras pero el foco no está en el input exacto, el escaneo falla o escribe en otro campo.
   * **Mejora**: Implementar un `listener` global de código de barras en la pantalla del POS que capture el escaneo automáticamente independientemente del foco.
3. **Gestión de Marcas en la Creación de Productos**:
   * **Problema**: Permite crear marcas al vuelo, pero no cuenta con un panel dedicado para gestionar logotipos de marcas o corregir errores tipográficos de marcas creadas.
4. **Cierre de Venta y Cobro Combinado (`SaleForm.tsx`)**:
   * **Problema**: Para cobrar con 2 medios de pago (ej. $10.000 Efectivo + $15.000 MercadoPago), el proceso requiere varios pasos manuales para agregar cada línea de pago.
   * **Mejora**: Teclado numérico en pantalla y botones de acceso rápido para "Efectivo Justo", "Mitad y Mitad", etc.

---

## 5. Funcionalidades Parcialmente Cubiertas

1. **Gestión de Variantes de Productos**:
   * **Estado Actual**: El backend soporta `isVariantParent`, `parentProductId` y `ProductVariantAttribute`. El servicio `ProductsService` tiene la función `generateVariants`.
   * **Deficiencia**: En el frontend (`ProductForm.tsx`) **no existe ninguna interfaz visual para definir atributos (Talle/Color) ni para generar la matriz**. En `ProductSearch.tsx` se filtran y ocultan los productos padre (`isVariantParent`), obligando al usuario a manejar cada variante como un producto completamente aislado.
2. **Devoluciones de Ventas (`SaleReturnService.ts` / `ReturnDialog.tsx`)**:
   * **Estado Actual**: Permite registrar devoluciones de ítems de una venta previa, acreditar el dinero en caja o ajustar la cuenta corriente del cliente.
   * **Deficiencia**: No existe la operación unificada de **"Cambio de Prenda" en el POS**. Si un cliente devuelve un talle y se lleva otro, hay que hacer primero una devolución completa y luego cargar una venta independiente, generando dos tickets separados y perdiendo la agilidad del mostrador.
3. **Manejo de Descuentos y Promociones**:
   * **Estado Actual**: Permite descuentos globales o por ítem expresados en monto fijo o porcentaje.
   * **Deficiencia**: No existen promociones automáticas (2x1, 3x2, descuento en la segunda unidad, etc.). El cajero debe calcular mentalmente o con calculadora el descuento a aplicar.

---

## 6. Funcionalidades Faltantes (Gaps Críticos para Indumentaria)

1. **Módulo de Generación e Impresión de Etiquetas de Código de Barras**:
   * **Necesidad**: Diseñar e imprimir etiquetas para prendas en impresoras térmicas (Zebra, Xprinter) o planchas A4/Autoadhesivas.
   * **Campos requeridos en la etiqueta**: Nombre de Producto, Marca, Talle, Color, Precio de Venta, Código de Barras EAN-13 / Code128.
2. **Matriz de Carga de Compras e Ingreso de Stock por Talle x Color**:
   * **Necesidad**: En la pantalla de compras (`PurchaseForm.tsx`), al ingresar una prenda del proveedor, debe desplegarse una grilla bidimensional (Filas: Color, Columnas: Talle) para colocar cantidades ingresadas por celda.
3. **Vales de Cambio / Crédito en Tienda (Store Credit Vouchers)**:
   * **Necesidad**: Generación de un voucher con código único y saldo a favor cuando un cliente realiza una devolución y no se lleva otra prenda en el momento. El vale debe poder escanearse/aplicarse como medio de pago en ventas futuras.
4. **Ticket de Cambio (Comprobante de Regalo)**:
   * **Necesidad**: Opción al finalizar la venta para imprimir un "Ticket de Cambio" que no muestre los precios de las prendas pero sí incluya el código de la venta, la fecha límite de cambio (30 días) y un código de barras para escanear en devoluciones.
5. **Motor de Reglas de Promociones Comerciales de Indumentaria**:
   * **Necesidad**: Configuración de reglas automáticas:
     * Promociones por volumen (2x1, 3x2).
     * Descuento cruzado en prenda de menor valor (ej. 50% en la 2da unidad).
     * Descuentos por medio de pago (10% OFF Efectivo / Transferencia).
     * Recargos/Financiación por cuotas con tarjeta (3 cuotas sin interés, 6 cuotas con 15% recargo).
6. **Reporte de Análisis por Curva de Talles, Colores y Marcas**:
   * **Necesidad**: Reportes que consoliden las ventas agrupadas por Talle (XS, S, M, L, XL, XXL) y Color, independientemente del modelo de prenda, para detectar descalces en la rotación del inventario.
7. **Atributos Específicos del Rubro Indumentaria**:
   * **Necesidad**: Campos de Temporada (ej. SS26, FW26), Género, Colección y Composición en la ficha técnica del producto.

---

## 7. Procesos que Podrían Terminar Fuera del Sistema (Riesgo Operativo)

Si el negocio opera con el sistema actual, terminará utilizando herramientas externas para los siguientes procesos:

| Proceso | Herramienta Externa Impuesta | Causa Raíz en el Sistema |
| :--- | :--- | :--- |
| **Etiquetado de prendas / perchas** | Excel / BarTender / Impresora Zebra externa | Inexistencia de motor de diseño e impresión de etiquetas de código de barras con Talle y Color. |
| **Emisión de Vales de Cambio** | Cuaderno en papel / Notas de WhatsApp | Falta de vouchers/créditos en tienda con código único para clientes ocasionales. |
| **Cálculo de Promociones (3x2, 2da unidad -50%)** | Calculadora física o del celular | Ausencia de motor de reglas de promociones automáticas en el POS. |
| **Carga de remitos de compra de proveedores** | Planillas de Excel secundarias | Inexistencia de grilla de carga bidimensional Talle x Color en las compras. |
| **Regalos y Ticket de Cambio** | Abrochar ticket común tapando el precio con fibrón | Inexistencia de la función de impresión de "Ticket de Cambio" sin montos. |
| **Análisis de reposición de talles** | Análisis manual revisando perchero por perchero | Ausencia de reportes agregados por curva de talles y colores. |

---

## 8. Casos Borde y Situaciones Reales de Producción

1. **Devolución de Prenda de Temporada Pasada o en Liquidación**:
   * *Situación*: Un cliente compró un abrigo a $40.000 en temporada. Lo devuelve meses después cuando está en liquidación a $25.000.
   * *Riesgo*: El sistema debe tomar la devolución al **precio histórico de compra pagado en el ticket original** (no al precio actual de catálogo) para evitar pérdidas financieras o fraudes.
2. **Cambio de Prenda Defectuosa / Con Falla de Fábrica**:
   * *Situación*: Devuelven un pantalón con el cierre roto.
   * *Riesgo*: Si el sistema realiza un "restock" automático, la prenda fallada vuelve al inventario disponible para la venta. Debe solicitarse el destino del ítem: *Stock de venta* vs *Baja/Fallado*.
3. **Escaneo de Código de Barras Duplicado entre Marcas**:
   * *Situación*: Dos proveedores distintos usan el mismo código corto interno para dos prendas distintas (ej. "1001").
   * *Riesgo*: Al escanear en la venta, el sistema puede tomar el producto equivocado si no hay validación de unicidad o ámbito por marca.
4. **Venta en Espera mientras el Cliente prueba otra prenda**:
   * *Situación*: Un cliente deja 3 prendas en caja para ir a buscar un talle distinto al probador.
   * *Riesgo*: La cajera debe pausar la venta para atender a otros clientes. Si la venta pausada no reserva temporalmente el stock, otro vendedor podría vender esa misma prenda de mostrador.

---

## 9. Problemas de UX y Eficiencia Operativa

* **Falta de Modales de Matriz Talle x Color en el POS**: Para cargar 3 remeras de distinto talle del mismo modelo, el vendedor debe buscar 3 veces el producto en lugar de buscar "Remera Oversize", abrir una matriz visual y marcar `S:1`, `M:1`, `L:1`.
* **Foco Automático en Escaneo de Código de Barras**: Si la ventana del POS pierde el foco del input, la lectura con la pistola de código de barras se pierde o dispara atajos no deseados en la pantalla.
* **Teclado Numérico y Cobro Rápido**: Falta de atajos de teclado (`F1` para buscar, `F2` para cobrar, `F4` para pausar venta, `ENTER` para confirmar pago en efectivo con vuelto).

---

## 10. Inconsistencias o Riesgos de Integridad de Datos

1. **Gestión de Stock al Modificar Variantes**:
   * Si se edita un producto padre sin actualizar en cascada sus productos hijos (variantes), el stock consolidado puede presentar descalces frente al stock por variante.
2. **Cancelación / Devolución de Ventas en Cuenta Corriente**:
   * Al hacer una devolución de una venta que fue realizada a cuenta corriente y aún no está saldada, el ajuste debe ir directamente a restar la deuda del cliente y no a egresar efectivo de la caja física.

---

## 11. Matriz de Cobertura Funcional

| Necesidad / Caso de Uso | Estado Actual | Módulo Relacionado | Problema Detectado | Mejora Necesaria | Prioridad |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **Matriz Talle x Color en Alta de Producto** | 🔴 No cubierto | Products | Backend preparado pero frontend sin interfaz de matriz. Carga lenta ítem por ítem. | Crear UI de grilla Talle x Color para generación masiva de variantes. | **Crítica** |
| **Matriz Talle x Color en Búsqueda POS** | 🔴 No cubierto | Sales / POS | No permite seleccionar variantes desde un producto padre en la venta. | Modal selector de Talle/Color al elegir producto padre en POS. | **Crítica** |
| **Impresión de Etiquetas con Código de Barras** | 🔴 No cubierto | Inventory / Products | No existe motor de impresión de etiquetas para prendas/perchas. | Módulo de diseño e impresión térmica/A4 de etiquetas con Talle/Color. | **Crítica** |
| **Flujo de Cambio de Prenda en Mostrador** | 🟡 Parcial | Sales / Returns | Exige hacer devolución por un lado y venta por otro en 2 transacciones. | Flujo unificado de Cambio en POS (Devolución + Cobro de Diferencia). | **Crítica** |
| **Ticket de Cambio (Sin Precios)** | 🔴 No cubierto | Sales / Invoicing | La impresión de venta siempre incluye precios y totales. | Opción de imprimir "Ticket de Cambio" con código de barras de venta. | **Crítica** |
| **Vales de Cambio / Store Credit** | 🔴 No cubierto | Sales / Accounts | No se pueden emitir vales a favor de clientes anónimos/ocasionales. | Módulo de emisión y redención de Vales de Cambio (Vouchers). | **Importante** |
| **Motor de Promociones (2x1, 3x2, 2da -50%)** | 🔴 No cubierto | Sales / Config | Descuentos solo manuales o por monto fijo/porcentaje básico. | Motor de reglas automáticas de promociones textiles y medios de pago. | **Importante** |
| **Carga de Compras por Matriz** | 🔴 No cubierto | Purchases | Formulario de compras lineal (ítem por ítem). | Grilla de carga de compras por Talle x Color. | **Importante** |
| **Reporte de Curva de Talles y Colores** | 🔴 No cubierto | Reports | Reportes de productos no desglosan por atributos ni curvas. | Reporte consolidado de ventas y stock por Talle/Color/Marca. | Recomendada |
| **Listener Global de Código de Barras** | 🟠 Mejorable | Sales / POS | El escáner requiere tener el foco en el input de búsqueda. | Capture global de eventos de escáner en la pantalla del POS. | Recomendada |
| **Cobro con Multi-Pago Rápido** | 🟠 Mejorable | Sales / POS | Varios pasos para registrar pagos divididos (Efectivo + Tarjeta). | UI optimizada de cobro con montos predeterminados y vuelto. | Recomendada |
| **Manejador de Fallados en Devolución** | 🟡 Parcial | Returns / Stock | Las devoluciones reingresan stock a venta directamente. | Selector de disposición: Stock Venta vs Depósito de Fallados. | Opcional |

---

## 12. Priorización de Mejoras

### A. Críticas Antes de Producción (Bloqueantes para operar una tienda de ropa)
1. **Interfaz Frontend para Matriz de Variantes (Alta y Selección en POS)**: Implementar la grilla visual de Talle x Color tanto en la ficha de producto como en el buscador del POS.
2. **Impresión de Etiquetas de Código de Barras (con Talle, Color, Precio y Marca)**: Módulo de etiquetado para rotular prendas y percheros.
3. **Flujo Integrado de Cambios de Prenda en POS**: Permitir ingresar prendas devueltas y prendas vendidas en el mismo carrito, cobrando la diferencia o generando nota de crédito/vale.
4. **Ticket de Cambio**: Emisión de comprobantes de regalo sin montos visibles.

### B. Importantes (Primera actualización post-lanzamiento)
1. **Vales de Cambio / Store Credit Vouchers**: Gestión de saldo a favor con código de barras impreso para consumo futuro.
2. **Motor de Reglas de Promociones Textiles**: Descuentos automáticos (2x1, 3x2, 2da unidad al 50%, descuentos por efectivo).
3. **Carga de Compras de Proveedores por Matriz**: Grilla bidimensional en el módulo de compras.

### C. Mejoras Recomendadas
1. **Reporte de Curva de Talles y Colores**.
2. **Listener de Escáner Global y Atajos de Teclado en POS**.
3. **Optimización de Cobro Multi-Medio de Pago**.

### D. Opciones / Secundarias
1. **Destino de Devolución a Stock de Fallados/Bajas**.
2. **Composición de Tela y Atributos de Temporada en Filtros**.

---

## 13. Conclusión Final

### ¿Puede actualmente un negocio de indumentaria operar completamente desde este sistema sin necesitar ninguna herramienta externa para gestionar su punto de venta?

**RESPUESTA: NO.**

### ¿Qué falta exactamente para llegar a ese punto?

Para que NexoPOS sea 100% operativo y autosuficiente en el rubro indumentaria, es indispensable desarrollar los **4 pilares críticos**:

1. **Frontend de Variantes (Matriz Talle x Color)**: Habilitar la creación masiva por grilla y la selección de variantes desde el POS mediante modal interactivo.
2. **Módulo de Impresión de Etiquetas**: Capacidad nativa para imprimir etiquetas de prendas con código de barras, marca, talle, color y precio.
3. **Flujo de Cambios y Ticket de Cambio**: Transacción de cambio directa en mostrador (devuelve X, se lleva Y, cobra diferencia) e impresión de ticket de regalo sin precios.
4. **Vales de Cambio (Store Credit)**: Emisión de saldo a favor en voucher para clientes que realizan devoluciones sin compra inmediata.

Una vez implementados estos 4 pilares, NexoPOS se convertirá en una solución sólida, competitiva y perfectamente adaptada al mercado textil y de calzado.

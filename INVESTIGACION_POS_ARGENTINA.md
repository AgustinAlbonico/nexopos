# 🇦🇷 Investigación y Benchmark: Punto de Venta en el Mercado Argentino

## 📌 Objetivo

Este documento consolida una investigación profunda sobre los sistemas de punto de venta (POS) y ERPs comerciales líderes en el mercado argentino (*Dragonfish/Zoo Logic, Tango POS/Axoft, Dux Software, Líder Gestión, Cianbox, Maxipos/GDS, Gestiobox*).

El propósito es identificar las **funcionalidades indispensables y los diferenciadores clave** que nuestro sistema debe tener para competir y ganar en el mercado argentino.

---

## 🇦🇷 Realidades del Comercio en Argentina (Desafíos Únicos)

Cualquier sistema POS que quiera tener éxito en Argentina debe resolver problemas específicos de nuestra economía e idiosincrasia comercial:

1. **Inflación y Actualización Frecuente de Precios:** Los comercios necesitan modificar listas de precios completas (por proveedor o porcentaje) en minutos e imprimir etiquetas de góndola solo para los productos que cambiaron hoy.
2. **Exigencia Fiscal ARCA (ex AFIP):** Emisión nativa y transparente de Facturas A, B, C, M, Notas de Crédito y Débito.
3. **Inestabilidad de Conexión (Modo Offline Obligatorio):** Si se cae la conexión a internet, la caja NO puede detenerse. Debe seguir vendiendo localmente y sincronizar con la nube/servidor al restablecerse.
4. **Pagos Mixtos y Billeteras Virtuales:** Combinación constante en un solo cobro de Efectivo + MercadoPago (QR), MODO, Cuenta DNI, Transferencia bancaria o Tarjeta.
5. **Prevención de Pérdidas y Control de Caja:** Cierre ciego de turno para evitar manipulación de arqueos de dinero por empleados.
6. **Cuentas Corrientes ("Fiados"):** Gestión de crédito a clientes habituales con control de límites y entregas a cuenta.

---

## 🏬 Análisis Detallado por Rubro Comercial

---

### 1. 🏪 Kiosco / Drugstore / Minimarket
> **Competidores de referencia:** Maxipos, LioPOS, KioscoSoft, Gestiobox.

#### Desafíos Operativos
* **Horas pico con filas largas:** 100+ transacciones por hora. Cada segundo de demora en caja genera filas en la vereda.
* **Productos sin código de barras:** Caramelos sueltos, criollitos, hielo, bolsas, fotocopias, cargas virtuales.
* **Manejo de billetes de alta denominación:** Dar vuelto rápido sin cometer errores de tipeo.

#### Funcionalidades Estrella a Implementar
* ⚡ **Modo "Teclado Puro":** Operar el 100% de la caja mediante atajos de teclado (`F1` a `F12`, `ESC`, `ENTER`) sin tocar el mouse.
* 💵 **Botones de Billetes Rápidos y Vuelto Instantáneo:** Botones táctiles y de teclado (`Paga con $1.000`, `$2.000`, `$5.000`, `$10.000`, `$20.000` y `Efectivo Exacto`). El sistema muestra el vuelto en letras gigantes.
* 🔒 **Cierre Ciego de Caja (*Blind Closing*):** Al finalizar el turno, el empleado ingresa el dinero contado sin saber cuánto calcula el sistema. El sobrante/faltante solo lo ve el dueño.
* 🔲 **Grilla de Accesos Rápidos Táctiles:** Botonera personalizable con íconos/colores para ítems sueltos o servicios sin código.

---

### 2. 🔧 Ferretería / Pinturería / Materiales
> **Competidores de referencia:** Líder Gestión, Dux Software, Cianbox, Flexxus.

#### Desafíos Operativos
* **Catálogos masivos:** Más de 10.000 SKUs con nombres técnicos difíciles de recordar (*"Taco Fischer Nylon 8mm"* vs *"Tarugo"*).
* **Ventas en Acopio:** El cliente compra materiales para congelar precio pero retira en entregas parciales durante meses.
* **Presupuestos y Cotizaciones:** Clientes/gremios que piden presupuestos con validez de pocos días por cambios de precio.

#### Funcionalidades Estrella a Implementar
* 🏗️ **Gestión de Acopios (Venta Anticipada con Entrega Diferida):** Registrar la venta cobrada, mantener el stock en estado "Reservado" y emitir **Remitos de Entrega Parcial** a medida que el cliente retira mercadería.
* 🔍 **Búsqueda por Sinónimos y Equivalencias:** Si el vendedor busca *"tarugo"*, el sistema encuentra *"Taco Fischer Nylon 8mm"*. Si busca *"broca"*, encuentra *"Mecha para hormigón"*.
* 📄 **Conversión Rápida Presupuesto → Venta/Remito:** Transformar una cotización previa en factura o remito de despacho en 1 click sin reingresar ítems.
* 📦 **Unidades de Medida Múltiples:** Comprar en bulto/caja/pallet, almacenar en cajas y vender fraccionado por metro, litro o unidad.

---

### 3. 👗 Indumentaria / Calzado / Telas
> **Competidores de referencia:** Dragonfish (Zoo Logic), Tango Retail, Lencería POS.

#### Desafíos Operativos
* **Matriz Talle x Color:** Multiplicación de SKUs (una remera en 5 talles y 4 colores son 20 variantes).
* **Alta tasa de cambios y devoluciones:** Clientes que regresan a cambiar prendas continuamente.
* **Comisiones de venta:** Vendedores que cobran porcentaje por prenda vendida.

#### Funcionalidades Estrella a Implementar
* 🔲 **Matriz de Carga y Venta en Grilla (Talle x Color):** Despliegue de tabla bidimensional en pantalla para cargar stock o vender múltiples variantes de una prenda en un solo paso.
* 🔄 **Cambio Directo en el Mismo Ticket:** En la misma pantalla de cobro, escanear la prenda devuelta (ingresa crédito a favor) y la prenda nueva (ingresa venta). El sistema cobra o devuelve solo la diferencia.
* 🏷️ **Etiquetas Térmicas con Detalle de Variante:** Impresión de códigos de barras internos que incluyen Marca, Modelo, Talle y Color.
* 👤 **Tag de Vendedor por Ítem:** Asignar qué empleado vendió cada producto del ticket para el reporte mensual de comisiones.

---

### 4. ⚖️ Venta por Peso / Fiambrería / Dietética / Granel
> **Competidores de referencia:** Hasar POS, Kretz Sistemas, Systel.

#### Desafíos Operativos
* **Venta por importe fijo:** El cliente pide *"$2.000 de queso de máquina"* en lugar de pedir gramos.
* **Integración con balanzas de mostrador y de etiquetas:** Lectura automática de balanzas comerciales.

#### Funcionalidades Estrella a Implementar
* 💰 **Venta por Importe Fijo:** El cajero ingresa "$2.000", y el POS calcula automáticamente la fracción exacta en kilos (ej: `0.285 kg`) según el precio por kg.
* 🏷️ **Parser de Código EAN-13 de Balanza:** Lectura automática de etiquetas impresas por balanzas (prefijos `20` o `21`) extrayendo el código de producto y el peso/monto de forma transparente.
* ⚖️ **Descuento Automático de Tara:** Descontar el peso de recipientes, bandejas o envases reutilizables según la categoría.

---

### 5. 💻 Electrónica / Celulares / Electrodomésticos

#### Desafíos Operativos
* **Trazabilidad por Serial / IMEI:** Garantía y seguimiento individual de cada equipo.
* **Demoras en caja:** Pedir el número de serie al iniciar el carrito frena la atención.

#### Funcionalidades Estrella a Implementar
* 📲 **Asignación Tardía de Serial (*Lazy Serial Scanning*):** Cargar productos al carrito libremente y requerir el escaneo de IMEI/Serial **únicamente en la pantalla final de cobro**.
* 📋 **Ficha de Garantía Adjunta:** Emisión automática del certificado de garantía con número de serie vinculado al ticket de venta.

---

### 6. 📅 Control de Vencimiento / Perfumería / Veterinaria

#### Desafíos Operativos
* **Rotación de productos perecederos:** Evitar pérdidas por vencimiento de remedios, cremas o alimentos.

#### Funcionalidades Estrella a Implementar
* ⚠️ **Alerta Visual de Salida Rápida:** Advertencia destacada en el POS al escanear un lote próximo a vencer, sugiriendo descuento de remate o priorización en mostrador.
* 🏷️ **Trazabilidad Lote + Vencimiento:** Registro del lote de origen en el movimiento de stock.

---

### 7. 📦 Mayorista / Distribuidora
> **Competidores de referencia:** Tango ERP, Dragonfish Mayorista, Dux Software.

#### Desafíos Operativos
* **Precios diferenciados por cliente:** Minorista, Mayorista, Gremio, Revendedor.
* **Venta por bulto/volumen:** Descuentos al alcanzar ciertos umbrales de cantidad.

#### Funcionalidades Estrella a Implementar
* 🏷️ **Conmutador de Lista de Precios en Vivo:** Recalcular todo el carrito al cambiar el tipo de cliente seleccionado.
* 📉 **Reglas de Descuento Escalonado por Volumen:** Aplicación automática de descuentos cuando la cantidad supera umbrales (ej: 1-9 unid: $1.000 / 10+ unid: $850).
* 💳 **Cuenta Corriente con Límite de Crédito:** Alerta y bloqueo automático si la compra supera el cupo de crédito otorgado al cliente.

---

## 🚀 Innovaciones Tecnológicas de Alto Impacto (Diferenciadores)

1. 📱 **Ticket Digital por WhatsApp Directo:** Botón de envío en 1 click al número de WhatsApp del cliente.
2. 🏷️ **Cola de Impresión de Etiquetas por Cambio de Precio:** Generar automáticamente etiquetas de góndola solo para los productos cuyo precio haya variado hoy.
3. 🔒 **Modo Técnico Protegido por Clave:** Gobernanza estricta donde solo el desarrollador/administrador técnico puede alterar el perfil de negocio o realizar *overrides* de capabilities.

---

## 📌 Conclusión y Hoja de Ruta

Este benchmark confirma que nuestra arquitectura de **7 Perfiles Técnicos y Capabilities Granulares** es la forma correcta de construir un sistema versátil y competitivo en Argentina. Nos permite ofrecer la velocidad de un software de kiosco junto con la potencia de un ERP especializado para ferreterías, indumentaria o mayoristas.

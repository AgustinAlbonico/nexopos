# Auditoría funcional — NexoPOS como sistema para tienda de indumentaria y calzado

- **Fecha:** 2026-08-12
- **Evaluación:** revisión estática del sistema (no se levantó la app).
- **Audiencia:** dueño, encargado, supervisor de caja, responsable de stock.
- **Alcance:** madurez del producto frente a la operatoria real de un local de indumentaria y calzado.

> **Aviso:** esta auditoría no constituye asesoramiento legal, contable ni fiscal. Las menciones a normativa Argentina son referencias para clasificar capacidades, no interpretaciones jurídicas. Para obligaciones específicas, consulte fuentes oficiales y un profesional habilitado.

---

## Respuesta directa (lea esto primero)

**Hoy, NexoPOS puede:** vender, cobrar, facturar, manejar caja y llevar un stock básico en un local de indumentaria, **pero no puede operar todo el ciclo apparel** (comprar, recibir por talles/colores, etiquetar, cambiar con diferencia, devolver con varios medios, controlar dos cajas contra el mismo stock, asignar permisos por rol) **sin apoyarse en herramientas externas**.

**En una palabra:** la base es la de un buen sistema de tienda minorista genérico; **le falta el "ADN apparel"** para funcionar como POS de indumentaria de forma autónoma.

---

## Metodología y limitaciones (resumen breve)

- Se revisó el código del sistema (sin ejecutarlo), sus migraciones y sus pantallas principales.
- **No se levantó la app** ni se ejecutaron flujos en vivo. Las conclusiones sobre pantallas reflejan el código y la configuración observables, **no se observó el comportamiento real del usuario**.
- Se ejecutaron compilaciones y suites de tests focalizadas; todo pasó (ver anexo técnico).
- El sistema revisado es la copia de trabajo actual, no necesariamente la versión publicada.
- Las menciones normativas son contextuales, no interpretaciones legales.

**Una sola nota de método:** el sistema se clasifica en tres niveles simples de madurez para personas no técnicas:

- **Listo para usar** — la pantalla existe, está conectada al proceso y un cajero o encargado puede usarla sin ayuda.
- **Existe parcialmente** — la lógica o el archivo existe pero al usuario le falta la pantalla, el paso o la confirmación.
- **No disponible** — el sistema no lo tiene y hay que resolverlo con planilla, papel, calculadora o app externa.

Cuando una capacidad está construida pero no se pudo probar de punta a punta, se aclara dentro de "Existe parcialmente".

---

## 1. Resumen ejecutivo

**¿Puede NexoPOS operar razonablemente como sistema de tienda de indumentaria y calzado hoy?** **No, no de forma autosuficiente.** Resuelve el camino transaccional genérico (vender, cobrar, facturar, abrir caja, controlar stock, hacer respaldo), pero el ciclo apparel (variantes con pantalla, recepción parcial, devoluciones cableadas, identidad única de cada producto, control contra doble click, control de stock cuando hay varias cajas abiertas, permisos por rol) tiene huecos demostrables.

**Lo que sí está y se puede confiar (resumen):**
- Ventas con varios medios de pago, ventas a cuenta corriente, ventas "estacionadas" (carrito pausado).
- Caja registradora con apertura, cierre, arqueo y resumen por medio de pago.
- Compras básicas con impacto en stock como operación plena (no modela recepción parcial — ver §6).
- Cuentas corrientes de clientes con movimientos, pagos y aplicación de notas de crédito.
- Stock por ubicación (modo sectorizado), transferencias y conteos físicos con registro de aprobación.
- Respaldos manuales y herramientas de seguridad de restauración.
- Reportes genéricos y facturación electrónica AFIP con cimientos.
- Algunos formularios bloquean clicks repetidos y las ventanas emergentes manejan correctamente el foco; las ventas y devoluciones todavía necesitan protección contra operaciones duplicadas.

**Lo que bloquea la operación en una tienda de indumentaria real (resumen):**
- El botón **"Devolver"** en el listado de ventas **no completa la devolución**: el cajero lo ve pero no puede terminar el proceso desde la pantalla.
- Si la venta se pagó con varios medios, **el reembolso usa sólo el primero**, aunque el cliente haya pagado parte con tarjeta y parte con efectivo.
- El **cambio de mercadería con diferencia** está calculado pero **no se cobra ni se devuelve** desde la pantalla.
- **Dos productos pueden tener el mismo SKU o el mismo código de barras**, lo que habilita vender el talle equivocado o contar mal.
- **Doble click o reintento después de un corte de red** durante una venta puede generar ventas duplicadas, aunque otros formularios sí deshabilitan el botón mientras procesan.
- **Dos cajas simultáneas pueden vender la misma última unidad** si intentan venderla al mismo tiempo.
- **Cualquier usuario logueado puede llegar a pantallas sensibles** si conoce la dirección interna.
- El flujo de facturación electrónica no fue probado de punta a punta contra producción.

**Lo que el sistema no modela y la tienda sí necesita:**
- Cada talle/color como producto distinto con su SKU y código propios (hoy lo es, pero la pantalla no muestra la matriz ni el stock por variante).
- Ciclo de compra con recepción parcial, sobrantes/faltantes y motivo del ajuste.
- Estados de stock: apartado en probador, dañado, en tránsito.
- Temporada/colección y sistema de talles (SUNITI, US/EU/UK, horma y ancho).
- Política de devolución diferenciada (producto final, sin cambio, con plazo).
- Datos de composición, materiales y origen para el rotulado textil/calzado argentino.

**Operación realista con el sistema actual:** **imposible sin herramientas externas.** La tienda compensa con Excel, papel, etiquetadora, calculadora y WhatsApp (ver §7).

---

## 2. Procesos y necesidades del negocio (universo del rubro)

Esta sección describe **el día completo en una tienda de indumentaria y calzado**, tal como debería poder resolverse en un sistema integral. No se limita a lo que hoy existe; cubre todo lo que la tienda vive, compre o no lo que el sistema ofrezca. Temas como reserva con seña, gift cards o fidelización aparecen como **opcionales**, no como críticos del POS.

### 2.1 Catálogo y producto
- Identidad vendible por combinación estilo/color/talle/calzado (en calzado también horma y ancho).
- Carga inicial, mantenimiento y codificación consistente (SKU, código de barras, código interno).
- Atributos: marca, temporada, colección, género, composición, origen, cuidados.
- Sistema de talles: SUNITI, US, EU, UK; horma y ancho para calzado.

### 2.2 Precios y promociones
- Precio desde costo + margen por producto, categoría o sistema.
- Listas mayorista, efectivo y lista; cambios de precio programados; liquidaciones por temporada.
- Reglas de promoción: 2x1, NxM, porcentaje sobre marca o categoría, combos, cupones con o sin vigencia.

### 2.3 Compras y recepción
- Alta de orden de compra, recepción por escaneo, recepción parcial, sobrantes, faltantes.
- Motivos de ajuste: rotura, robo, diferencia con remito, conteo.
- Devoluciones a proveedor y notas de crédito.

### 2.4 Inventario
- Stock por ubicación (depósito, salón, góndola, probador); transferencias entre ubicaciones.
- Stock reservado (venta no confirmada o en probador), dañado o en merma, en tránsito, en consignación.
- Conteos físicos con ajustes auditados y registro de quién contó, cuándo y la diferencia.

### 2.5 Venta en mostrador (POS)
- Búsqueda por nombre, código, SKU o lector de código de barras.
- Carrito con descuentos, recargos, retenciones, impuestos y redondeo.
- Varios medios de pago, pagos parciales, vuelto mixto.
- Ventas a cuenta corriente, ventas "estacionadas" (carrito pausado), presupuestos.
- Comprobantes: ticket, factura A, B o C, nota de crédito.

### 2.6 Devoluciones y cambios
- Devolución parcial o total eligiendo ítems y cantidades.
- Política por tienda, producto o promo (producto final, sólo cambio por talle, plazos).
- Reintegro al mismo medio o a uno nuevo, crédito a favor, diferencia a cobrar.
- Destino del ítem devuelto: reintegrar al stock, cuarentena, merma o devolución a proveedor.

### 2.7 Caja
- Apertura con efectivo inicial, cierre con arqueo y diferencia.
- Movimientos manuales (gastos, ingresos, retiros, depósitos).
- Resumen por medio de pago, por turno, por cajero.

### 2.8 Clientes y cuenta corriente
- Alta y mantenimiento de cliente (datos fiscales, contacto, límite de crédito).
- Venta a cuenta corriente, pagos parciales, aplicación de notas de crédito.
- Estado de cuenta, antigüedad de deuda, avisos de mora.

### 2.9 Proveedores
- Datos de contacto, situación fiscal, lista de precios pactada.
- Cuenta corriente del proveedor, pagos, notas de crédito. (Las notas de débito proveedor no están evidenciadas.)

### 2.10 Reportes y control de gestión
- Ventas por día, turno o vendedor; por medio de pago; ranking de productos.
- Compras, cuentas a pagar, deuda de clientes.
- Stock valorizado, rotación y merma.
- Bitácora de cambios importantes (quién modificó qué y cuándo).

### 2.11 Cumplimiento fiscal (Argentina)
- Facturación electrónica AFIP/ARCA: homologación y producción, CAE, libros.
- Tipos de comprobante A, B y C; notas de crédito y débito.
- Retenciones y percepciones (Ingresos Brutos, IVA, Ganancias).
- Etiquetado físico textil/calzado (composición, origen, cuidados).

### 2.12 Seguridad, auditoría y resiliencia
- Autenticación, autorización y segregación por rol.
- Bitácora de cambios sensibles (precios, descuentos).
- Respaldo y recuperación, manejo de cortes de red, POS offline.

### 2.13 Opcionales (no críticos para el POS)
- Reserva con seña (layaway).
- Gift cards y lista de regalos.
- Programa de fidelización (puntos, niveles).
- Omnicanalidad (tienda online, marketplace, WhatsApp integrado).
- Sugerencia automática de reposición.

---

## 3. Funcionalidades correctamente resueltas (Listo para usar)

Capacidades que la tienda puede usar en el día a día sin necesidad de parches. El detalle por fila está en §11.

- **Ventas en mostrador:** crear venta con varios medios de pago, ventas a cuenta corriente y ventas estacionadas (carrito pausado). El sistema no deja cobrar si la caja no está abierta.
- **Caja registradora:** apertura, cierre, movimientos manuales, arqueo con diferencias y resumen por medio de pago.
- **Stock por ubicación y transferencias:** modo sectorizado, saldos por ubicación y traslados entre ubicaciones.
- **Cuentas corrientes de clientes:** alta de cliente, venta a cuenta, pagos, registro contra pagos repetidos, límite de crédito.
- **Facturación AFIP con cimientos:** CAE, tipos A/B/C, modo homologación y producción. **Aún no probado de punta a punta contra producción real.**
- **Reportes genéricos:** ventas por período, productos más vendidos, clientes más frecuentes, ventas por medio de pago, deuda y stock valorizado.
- **Respaldos con verificación de restauración:** backup manual y herramientas de seguridad para restaurar.
- **Prevención parcial de clicks repetidos:** algunos formularios deshabilitan el botón mientras procesan, pero ventas y devoluciones no tienen una garantía contra operaciones duplicadas.
- **Verificaciones técnicas focalizadas:** las comprobaciones seleccionadas del sistema y de sus pantallas pasaron correctamente; el detalle está en el anexo.

---

## 4. Funcionalidades mejorables (Listo para usar con fricción)

Cubren el caso de uso pero con tropiezos visibles en la operatoria diaria. El detalle por fila está en §11.

- **Recepción de compras todo-o-nada:** no existe un proceso separado de recepción; al registrar o pagar la compra se impacta la mercadería completa. No puede indicarse "recibí 8 de 10, falta el talle M".
- **Reembolso con varios medios:** si la venta se pagó con tres medios (por ejemplo, parte efectivo, parte tarjeta, parte transferencia), el sistema usa sólo el primero para devolver.
- **Cambio de mercadería:** la diferencia de precio se calcula pero no se cobra ni se devuelve automáticamente; el cajero termina haciendo la cuenta a mano.
- **Búsqueda en el POS:** la pantalla busca por nombre pero no tolera errores de tipeo ni ordena por relevancia; con tres campos por variante se vuelve lenta.
- **Precio desde margen:** existe el cálculo automático pero no se aplica cuando se crea una variante nueva; hay que completarlo a mano.
- **Venta simultánea de la última unidad:** si dos cajas venden al mismo tiempo, ambas podrían confirmar la misma última prenda.
- **Reportería de negocio:** los resúmenes principales no descuentan devoluciones; el costo de lo vendido se aproxima con compras pagadas y faltan indicadores clave del rubro (talle, color, temporada).
- **Pantallas largas:** formularios extensos sin pestañas, scroll vertical largo.

---

## 5. Funcionalidades parcialmente cubiertas (Existe parcialmente)

Cumplen una parte significativa pero dejan huecos no obvios para el rubro. El detalle por fila está en §11.

- **Variantes por talle y color:** el sistema puede generarlas, pero la pantalla no muestra la matriz ni el stock por variante. Cada combinación es un producto distinto con su SKU y código, igual que en cualquier tienda.
- **Carga inicial por planilla (CSV):** se puede importar pero sin asistente de validación, ni vista previa, ni mapeo de columnas.
- **Impresión de etiquetas:** se genera un PDF con código QR, SKU, código de barras y precio, pero no hay pantalla para disparar la impresión ni integración con la impresora.
- **Conteos físicos:** el sistema registra quién aprobó, cuándo y las notas; pero no hay pantalla para capturar el conteo ni para que el sistema lo conecte con la bitácora de auditoría.
- **Etiquetas fiscales y tickets:** la configuración de ticket existe, pero no se probó de punta a punta imprimir un ticket A4 o de 80 mm con todos los descuentos aplicados.
- **Permisos por pantalla:** la pantalla oculta opciones según el rol, pero el sistema de fondo no valida esos permisos; un usuario que conozca la dirección interna puede entrar a pantallas sensibles.
- **Notas de crédito:** el cimiento existe y se emite desde el sistema, pero no se emite con un solo click al hacer una devolución; hay pasos manuales.

---

## 6. Funcionalidades faltantes (No disponible)

Bloquean o degradan la operatoria diaria. El detalle por fila está en §11.

### 6.1 Devolución no se puede completar desde la pantalla
El botón "Devolver" aparece en el listado de ventas, pero al tocarlo la pantalla no termina el proceso. El cajero necesita iniciar la devolución por otro camino o pedir ayuda.

### 6.2 Identidad de producto no robusta
Dos productos pueden terminar con el mismo SKU y dos productos pueden terminar con el mismo código de barras. Esto habilita vender un talle equivocado o contar mal en un conteo físico. Los números de venta, los números de compra y el código de paquete sí son únicos.

### 6.3 Protección incompleta contra doble click y reintento
Algunos formularios bloquean clicks repetidos mientras procesan, pero una venta o una devolución repetida por doble click o reintento de red puede quedar registrada más de una vez.

### 6.4 Reembolso ignora medios posteriores al primero
Si la venta se cobró con tres medios (efectivo + tarjeta + transferencia), al hacer una devolución el sistema devuelve el dinero sólo al primer medio. El cajero tiene que hacer el reparto a mano.

### 6.5 Cambio de mercadería sin cobro de diferencia
Cuando un cliente cambia una remera talle M por un talle L más caro, el sistema calcula cuánto debe cobrar pero no permite cobrarlo desde el mismo flujo. El cajero cobra la diferencia con un segundo movimiento.

### 6.6 Recepción de compras sin estados parciales
Cuando llega el camión con sólo 8 de 10 cajas pedidas, o con 10 cajas pero sobran 2, el sistema no tiene cómo registrar la recepción real: la compra se trata como una operación completa y no conserva líneas pendientes.

### 6.7 Sin devoluciones a proveedor
No existe el flujo para devolver mercadería al proveedor con emisión de nota de crédito.

### 6.8 Sin estados de stock reservado, dañado o en tránsito
El sistema maneja "stock" y "stock por ubicación". No hay forma de marcar un producto como "apartado en probador", "dañado" o "en camino desde el proveedor".

### 6.9 Sin temporada ni colección
No hay forma de agrupar productos por temporada (verano 2026, invierno 2026) ni por colección. La liquidación por temporada se hace en planilla.

### 6.10 Sin sistema de talles
No hay diccionario de talles (SUNITI, US, EU, UK), ni horma ni ancho. Cada talle es un producto distinto pero la pantalla no ayuda a gestionarlos.

### 6.11 Sin datos de composición, materiales ni origen
El sistema no tiene los campos que el rotulado textil/calzado argentino exige (composición, origen, cuidados). La tienda puede gestionar los datos en una planilla aparte, pero quedan desconectados del producto.

### 6.12 Sin política de devolución diferenciada
Cualquier producto es retornable. No existe "producto final", "sin cambio" ni "cambio sólo por talle".

### 6.13 Reportes sin ventas netas de devoluciones
Los resúmenes principales (ventas, financiero, flujo de caja) suman las devoluciones como si fueran ventas positivas, no las descuentan. Los rankings de productos pueden mostrar la cantidad neta, pero hay que revisar caso por caso.

### 6.14 Sin indicadores del rubro
No hay ranking por talle, curva de talles ni "sell-through" por temporada. La decisión de reposición se hace a ojo.

### 6.15 Permisos por rol no aplicados en el sistema de fondo
La pantalla oculta opciones según el rol, pero un usuario con conocimiento técnico puede llegar igual a Configuración si conoce la dirección interna.

### 6.16 Cierre de sesión por inactividad
No se observa configuración de auto-logout por inactividad. Un cajero que deja la terminal abierta deja la tienda expuesta.

### 6.17 Sin exportación a sistemas contables
No hay interfaz para Tango, Bejerman ni SIAP. La carga mensual contable se hace a mano.

### 6.18 Ventas estacionadas sólo en el navegador
El carrito pausado se guarda en el navegador local. Si el cajero cambia de equipo o se rompe la máquina, pierde lo que tenía en el carrito.

### 6.19 Respaldos: backup manual
Se puede hacer respaldo a mano y hay herramientas para verificar la restauración. No hay programación automática ni pantalla para restaurar.

### 6.20 Negocio fuera del POS (no crítico)
Omnicanalidad (tienda online, marketplace, WhatsApp), fidelización y puntos, lista de regalos, sugerencia de reposición, integraciones automáticas con proveedor, recursos humanos, contabilidad completa. Quedan como opcionales según el contexto del local.

---

## 7. Procesos que probablemente terminarán fuera del sistema

El sistema resuelve lo que resuelve y deja el resto para una caja de herramientas complementaria. Esto describe **lo que probablemente va a pasar en la práctica**, no una afirmación de uso obligatorio. Algunas tiendas resuelven varias con un único sistema externo; otras prefieren tener todo dentro del POS.

| Brecha | Herramienta probable | Consecuencia si se ignora |
|---|---|---|
| Matriz de variantes (modelo × talle × color) | Planilla (Excel o Google Sheets) | Carga manual, errores con volumen alto |
| Calendario de temporadas y colecciones | Planilla + calendario externo | Liquidación y compra reactivas, tarde |
| Indicadores apparel (talle, sell-through, curva) | Planilla o BI externo (Power BI, Looker, Metabase) conectado a la base | Decisión de reposición a ciegas |
| Recepción parcial vs. remito del proveedor | Papel + lectora, después carga manual | Doble tipeo, propensión a error |
| Conteos físicos | Planilla + lectora externa | Tiempo extra del personal, captura propensa a error |
| Impresión de etiquetas | Software externo (Bartender, NiceLabel, ZebraDesigner) sobre CSV | Incompatibilidad de impresoras, costo extra |
| Cambio o devolución con varios medios | Calculadora o planilla para escenarios complejos | Vueltos mal liquidados en horario pico |
| Margen neto real por venta | Planilla (precio - costo - comisión - impuestos) | Decisiones con margen falseado |
| Comunicación con proveedor | WhatsApp o correo para notas de crédito, faltantes, canjes | Sin trazabilidad sistemática |
| Reservas y apartados | Anotación en papel o libreta | Pérdida de rastro entre turnos |
| Conciliación bancaria | Planilla diaria contra extractos de tarjeta, transferencia, MP | Descuadres descubiertos tarde |
| Tabla maestra de talles y hormas | Planilla (SUNITI, US, EU, UK, ancho) | Dobles digitaciones, errores de talle |
| Política de devolución y cambios | Documento Word o PDF | Aplicación inconsistente entre operadores |
| Auditoría de cambios sensibles (precio, descuento) | Consulta manual a la bitácora | Discrepancias sin causa identificable |

---

## 8. Casos borde y situaciones reales (lo que rompe al sistema)

Situaciones que la tienda enfrentará y cómo responde el sistema. La numeración referencia filas de §11.

- **8.1 Doble click del cajero al cobrar.** Aunque algunos formularios deshabilitan botones mientras procesan, una venta repetida no tiene una garantía propia contra duplicados. Descubrimiento: cierre Z con conteo físico.
- **8.2 Venta sin stock.** Configurable por el dueño; el valor por defecto es **no permitirla**. Negativo sólo si se activa explícitamente.
- **8.3 Devolución con cambio de talle.** La diferencia de precio no se cobra automáticamente. Descubrimiento: arqueo descuadrado.
- **8.4 Devolución de venta con tres medios.** Sólo se devuelve al primer medio. Descubrimiento: queja del cliente o auditoría.
- **8.5 Compra con remito con faltante.** La pantalla no admite el caso. Descubrimiento: mercadería no llega, la tienda arma un remito interno paralelo.
- **8.6 Producto sin código de barras.** La búsqueda por nombre funciona pero es más lenta.
- **8.7 Cliente que pide factura A en el momento.** La emisión AFIP tiene cimientos pero requiere todos los datos fiscales al cobro; no se probó de punta a punta.
- **8.8 Escaneo del talle equivocado.** Cada talle es un producto distinto; depende de capacitación.
- **8.9 Cajero nuevo con dudas.** No hay guía paso a paso ni ambiente de práctica.
- **8.10 Devolución sin comprobante.** El sistema pide el comprobante original.
- **8.11 Producto devuelto a cuarentena, no reintegrado.** La disposición existe pero el proceso de reinspección no está en la pantalla.
- **8.12 Devolución de producto en promoción.** El sistema no distingue "final-sale" ni "promo no retornable".
- **8.13 Cambio de precio a mitad de comprobante.** No hay registro automático de quién cambió el precio ni cuándo.
- **8.14 Venta repetida por error manual.** Las validaciones de importes reducen errores de carga, pero ventas y devoluciones no tienen una garantía propia contra doble click o reintento.
- **8.15 Servidor se cae durante la venta.** No hay modo degradado ni ventas offline; la venta se pierde.
- **8.16 Token de sesión vencido.** Al expirar, el cajero debe volver a iniciar sesión; no hay auto-logout por inactividad.
- **8.17 Reimpresión de comprobante.** Hay algunas rutas pero no una sola opción consolidada.
- **8.18 Recepción fuera de horario.** No hay turnos diferenciados por operador en la recepción.
- **8.19 Devolución con factura A y nota de crédito.** Hay notas de crédito, pero el flujo no está unificado en un solo click.
- **8.20 Venta con tarjeta rechazada.** Si el operador reintenta con otro medio, la conciliación se hace afuera del flujo observado.

---

## 9. Problemas de UX y eficiencia (operación diaria)

Puntos resumidos. El detalle por fila está en §11.

- **Velocidad de venta:** la búsqueda no tiene ranking ni tolerancia a errores de tipeo; los tres campos por variante (talle, color, modelo) hacen la búsqueda lenta.
- **Atajos de teclado:** existen teclas de función para navegación y tareas de venta, además de Escape y Enter; faltan accesos rápidos para devoluciones, importación, etiquetas y conteos.
- **Densidad de pantalla:** SKU y código de barras largos en columnas angostas; formularios extensos sin pestañas.
- **Estados vacíos:** el buscador de productos avisa cuando no hay coincidencias; el resto de los buscadores no.
- **Confirmaciones:** la ventana emergente protege el foco, pero el texto no guía a la próxima acción.
- **Visor de imágenes:** no hay galería de fotos en el POS.
- **Indicador de red:** no hay aviso de "sin red" ni "modo degradado".
- **Modo portable y tablet:** el diseño se adapta pero no fue auditado contra uso real.
- **Localización:** los mensajes están en español sin estructura de claves para otros idiomas.
- **Mensajes de error:** técnicos, sin sugerencia al operador.
- **Modo oscuro:** depende de la configuración visual, sin auditoría en este informe.
- **Modo entrenamiento:** no hay ambiente de práctica ni recorrido guiado.
- **Accesibilidad puntual:** la base cubre foco, Escape y retorno de foco en ventanas emergentes. Hay siete brechas puntuales confirmadas (casilla de login, mensajes de error, filas de ventas estacionadas, selector de marca, ventana de devolución) que se cierran con ajustes pequeños.

---

## 10. Inconsistencias y riesgos

### 10.1 Prerrequisito (no es defecto del sistema)
- **Cambios sin confirmar en la copia de trabajo.** Imposible asegurar que la versión publicada contenga esta superficie. Tratar como condición previa antes de pasar a producción.

### 10.2 Críticas antes de producción
- **C1.** Devolución sin terminar desde la pantalla (botón existe, flujo no).
- **C2.** Reembolso con varios medios usa sólo el primero.
- **C3.** Cambio de mercadería con diferencia no cobrado ni devuelto.
- **C4.** Identidad de producto: dos productos pueden compartir SKU y código de barras.
- **C5.** Sin protección contra doble click ni reintento en ventas y devoluciones.
- **C6.** Dos terminales pueden confirmar la venta de la misma última unidad si operan simultáneamente.
- **C7.** Permisos por rol sólo en la pantalla, no en el sistema de fondo.
- **C8.** Flujo de facturación electrónica sin prueba de punta a punta contra producción.

### 10.3 Importantes (degradan calidad)
- **I1.** Variantes, packs, importación, etiquetas, temporada, talles, composición y política de devolución sin recorrido completo en pantalla.
- **I2.** Recepción de compras todo-o-nada.
- **I3.** Sin devoluciones a proveedor.
- **I4.** Sin estados de stock reservado, dañado o en tránsito.
- **I5.** Reportes sin descontar devoluciones; rotación con dato vacío cuando no hay ventas.
- **I6.** Costo de lo vendido aproximado con compras pagadas.
- **I7.** Sin reporte de merma, de cobertura de recepción ni de performance por proveedor ni por temporada.
- **I8.** Sin galería de imágenes por producto.
- **I9.** Política de devolución única.
- **I10.** Sin registro automático de cambios de precio.
- **I11.** Sin sistema de talles, horma ni ancho.
- **I12.** Sin temporada ni colección.
- **I13.** Sin composición, origen ni rotulado textil en el modelo.
- **I14.** Sin moneda extranjera: ventas en dólares a cuenta corriente sólo reflejan el valor del día.
- **I15.** Conteos físicos sin pantalla de captura.
- **I16.** Sin notas de débito (sólo notas de crédito evidenciadas).
- **I17.** Hay piezas iniciales para promociones, pero no reglas configurables por el encargado ni una pantalla de cupones.

### 10.4 Recomendadas (mejora continua)
- **R1.** Formularios largos sin pestañas.
- **R2.** Mensajes de error técnicos.
- **R3.** Validación inline incompleta en algunos formularios.
- **R4.** Modo oscuro no auditado.
- **R5.** Sin auto-logout por inactividad.
- **R6.** Sin exportación contable.
- **R7.** Bitácora sin pantalla propia para auditoría.
- **R8.** Listas con filtros sin estado vacío consistente.
- **R9.** Cerrar las siete brechas puntuales de accesibilidad.

### 10.5 Opcionales (no bloqueantes)
- **O1.** Omnicanalidad.
- **O2.** Fidelización y puntos.
- **O3.** Lista de regalos.
- **O4.** Sugerencia automática de reposición.
- **O5.** Reserva con seña.
- **O6.** Integración automática con proveedor.
- **O7.** Multi-país y multi-moneda.

### 10.6 De proceso (no del sistema)
- **P1.** Cambios sin confirmar en la copia de trabajo (prerrequisito).
- **P2.** Verificación contra base de datos vacía no ejecutada (mitiga con revisión de consistencia y smoke manual).
- **P3.** Herramientas de desarrollo con tiempo de respuesta limitado durante la auditoría.
- **P4.** No se ejecutaron pruebas automatizadas de extremo a extremo.
- **P5.** App no se levantó (regla del repositorio), sin verificación visual de pantallas.

---

## 11. Matriz de cobertura

Leyenda de estado: **✅ Cubierto** (listo para usar), **🟠 Mejorable** (listo con fricción), **🟡 Parcial** (existe parcialmente), **🔴 No cubierto** (no disponible).

Prioridades: **Crítica antes de producción**, **Importante**, **Recomendada**, **Opcional**.

### 11.1 Catálogo y producto

| # | Necesidad / situación real | Estado | ¿Qué puede hacer hoy? | Problema para el negocio | Qué debería mejorar | Prioridad |
|---|---|---|---|---|---|---|
| 1 | Producto con SKU y código de barras únicos | 🔴 | Cargar SKU y código por producto, pero sin garantía de unicidad | Dos productos pueden compartir código y confundirse en la venta o el conteo | Hacer únicos el SKU y el código de barras | Crítica antes de producción |
| 2 | Precio desde costo más margen | 🟠 | Calcular precio sugerido desde margen al crear un producto común | En las variantes el cálculo no se completa automáticamente y requiere intervención manual | Aplicar el margen automático a cada variante | Recomendada |
| 3 | Cambios de precio con registro de quién y cuándo | 🔴 | Cambiar el precio manualmente | No hay registro de quién cambió el precio, ni fecha ni motivo; no hay cambios programados | Bitácora de cambios de precio y programación por fecha | Importante |
| 4 | Listas de precios mayorista y minorista | 🔴 | Sólo una lista de precio | El local no puede diferenciar precio mayorista, efectivo o lista según el cliente | Tabla de listas y selector por cliente | Importante |
| 5 | Promociones y cupones | 🔴 | Aplicar descuento manual por línea o total | No hay motor de promociones: 2x1, NxM, porcentaje por marca, combos y cupones con vencimiento no están | Motor de reglas con vigencia y pantalla para cargarlas | Opcional |
| 6 | Carga inicial por planilla | 🟡 | Importar productos desde un archivo | El importador existe pero no hay asistente de validación ni vista previa | Asistente con validación y mapeo de columnas | Importante |
| 7 | Variantes por talle, color y horma | 🟡 | Generar combinaciones de talles y colores desde un producto base | La pantalla no muestra la matriz ni el stock por variante; cada combinación es un producto aparte | Pantalla de matriz con stock por variante | Crítica antes de producción |
| 8 | Etiquetas físicas con código de barras y precio | 🟡 | El sistema arma un PDF con QR, SKU, código y precio | No hay botón para disparar la impresión ni integración con la impresora | Pantalla de impresión y compatibilidad con la impresora del local | Importante |
| 9 | Imágenes múltiples por producto | 🔴 | Sin modelo de imágenes | El cajero no ve la foto del producto en el POS | Galería de fotos por producto y visor en POS | Importante |
| 10 | Temporada y colección | 🔴 | Sin agrupar por temporada | El local no puede liquidar por temporada ni ver qué se vendió del verano 2026 | Campos de temporada y colección con filtros | Importante |
| 11 | Sistema de talles y hormas | 🔴 | Sin diccionario de talles | El local debe mantener su tabla de talles aparte; cada talle es un producto pero sin ayuda visual | Diccionario (SUNITI, US, EU, UK, horma, ancho) y campo en producto | Importante |
| 12 | Composición, materiales y origen | 🔴 | Sin campos para esos datos | El rotulado textil/calzado argentino pide composición y origen; la tienda los lleva en planilla aparte | Campos para gestionar esos datos (la impresión puede tercerizarse) | Importante |
| 13 | Política de devolución por producto | 🔴 | Toda devolución se acepta | No se puede marcar producto final, sin cambio o con plazo | Atributo por producto y excepción por promo | Importante |
| 14 | Reserva con seña, gift cards y fidelización (opcional agregado) | 🔴 | Nada de eso | No hay reserva con seña, gift cards ni puntos | Módulo o integración externa; no crítico para el POS | Opcional |

### 11.2 Compras y proveedores

| # | Necesidad / situación real | Estado | ¿Qué puede hacer hoy? | Problema para el negocio | Qué debería mejorar | Prioridad |
|---|---|---|---|---|---|---|
| 15 | Alta y pago de compra con impacto en stock | ✅ | Cargar compra, pagarla y actualizar stock | Sin estados explícitos de la recepción | Mostrar el estado de recepción | Recomendada |
| 16 | Recepción parcial con desvíos | 🟠 | Cargar la compra e impactar toda la mercadería | No existe un paso separado para registrar cuánto llegó realmente ni dejar líneas pendientes | Recepción parcial con cantidades recibidas, pendientes y motivo | Crítica antes de producción |
| 17 | Venta sin stock | 🟠 | Configurable; por defecto no se permite | Si se activa "permitir venta sin stock" se puede vender en negativo | Documentar y mostrar claramente la configuración | Importante |
| 18 | Devoluciones a proveedor con nota de crédito | 🔴 | No existe | Cuando llega mercadería fallada o equivocada, no hay forma de devolverla con NC | Reutilizar el patrón de devolución con nota de crédito al proveedor | Importante |
| 19 | Cuenta corriente proveedor | 🟡 | Cargar datos del proveedor | No hay cuenta corriente explícita ni movimientos | Modelo de cuenta corriente con movimientos y notas de débito | Importante |
| 20 | Performance o score de proveedor | 🔴 | Nada | El local no puede comparar proveedores por cumplimiento ni calidad | Indicadores en planilla o pantalla | Opcional |

### 11.3 Inventario y stock

| # | Necesidad / situación real | Estado | ¿Qué puede hacer hoy? | Problema para el negocio | Qué debería mejorar | Prioridad |
|---|---|---|---|---|---|---|
| 21 | Stock por ubicación | ✅ | Manejar varias ubicaciones y saldos por cada una | Ninguno en este punto | Mantener y exponer saldos | Recomendada |
| 22 | Transferencias entre ubicaciones | ✅ | Trasladar stock entre ubicaciones | Ninguno en este punto | Mantener | Recomendada |
| 23 | Conteos físicos con ajustes auditados | 🟡 | Registrar quién aprobó, cuándo y notas | No hay pantalla para cargar el conteo ni para reflejarlo en la bitácora | Pantalla de conteo con lectora y conexión a la bitácora | Importante |
| 24 | Venta simultánea de la última unidad | 🔴 | Restar stock al vender | Dos cajas pueden confirmar la misma última prenda al mismo tiempo | Garantizar que una sola caja pueda adjudicarse la última unidad | Crítica antes de producción |
| 25 | Estados reservado, dañado y en tránsito | 🔴 | Sólo stock y stock por ubicación | El probador, la merma y la mercadería en camino no tienen estado | Modelo de estados con sus movimientos | Importante |

### 11.4 POS, pagos y ventas

| # | Necesidad / situación real | Estado | ¿Qué puede hacer hoy? | Problema para el negocio | Qué debería mejorar | Prioridad |
|---|---|---|---|---|---|---|
| 26 | Alta de venta con varios medios | ✅ | Cobrar mezclando efectivo, tarjeta y transferencia | Ninguno en este punto | Mantener | Recomendada |
| 27 | Moneda extranjera y tipo de cambio | 🔴 | Sólo pesos | Ventas en dólares a cuenta corriente reflejan el valor del día; no hay registro histórico del tipo de cambio | Modelo de moneda y tipo de cambio | Importante |
| 28 | Vueltos mixtos | 🟠 | Calcular diferencia simple | El vuelto se calcula de una sola forma; no se prioriza por medio | Vuelto por medio con prioridad | Importante |
| 29 | Venta a cuenta corriente | ✅ | Vender cargando a la cuenta del cliente | Ninguno en este punto | Mantener | Recomendada |
| 30 | Carrito pausado o presupuesto | ✅ | Dejar el carrito sin cobrar y recuperarlo después | El carrito se guarda en el navegador; si cambia el equipo se pierde | Guardado del lado del servidor para presupuestos | Recomendada |
| 31 | Protección contra doble click y reintento | 🔴 | Sin protección | Doble click o corte de red puede duplicar la venta | Marca de unicidad por operación | Crítica antes de producción |
| 32 | Anulación o cancelación de venta | ✅ | Anular venta revirtiendo inventario | Ninguno en este punto | Mantener | Recomendada |
| 33 | Búsqueda con lector de código de barras | 🟠 | Lector conectado a la pantalla de venta | Desactivado por defecto y por configuración; no detecta eventos cuando el foco está en otro campo | Activar por defecto y selector de foco | Importante |
| 34 | Reimpresión de comprobante | 🟡 | Algunas rutas desde la pantalla de venta | No hay un solo botón "reimprimir" para cualquier venta | Botón único por venta | Importante |
| 35 | Modo degradado u offline | 🔴 | No existe | Si se cae la red o el servidor, la venta se pierde | Cola local y sincronización | Importante |

### 11.5 Devoluciones y cambios

| # | Necesidad / situación real | Estado | ¿Qué puede hacer hoy? | Problema para el negocio | Qué debería mejorar | Prioridad |
|---|---|---|---|---|---|---|
| 36 | Devolución desde la pantalla de ventas | 🔴 | El botón "Devolver" está visible pero el flujo no termina | El cajero ve la opción pero no puede completar la devolución | Terminar el flujo y mostrar la ventana de devolución | Crítica antes de producción |
| 37 | Reembolso al mismo medio de pago | 🟠 | El sistema devuelve a un medio | Si la venta se pagó con tres medios, devuelve sólo al primero | Repartir el reembolso según los medios originales o permitir elegir | Crítica antes de producción |
| 38 | Cambio de mercadería con cobro de diferencia | 🔴 | Calcula la diferencia | El sistema no carga el producto nuevo ni cobra ni devuelve la diferencia | Cargar el producto nuevo y cobrar o devolver la diferencia en un solo flujo | Crítica antes de producción |
| 39 | Destino del producto devuelto (reintegrar, cuarentena, merma, proveedor) | 🟡 | El sistema admite la disposición | No hay flujo de reinspección en la pantalla | Pantalla de cuarentena y reinspección | Importante |
| 40 | Política de producto final o no retornable | 🔴 | Todo se devuelve | No se puede distinguir un producto final de uno retornable | Atributo por producto y excepción por promo | Importante |
| 41 | Protección contra devolución mayor a lo vendido | ✅ | El sistema bloquea devolver más de lo vendido | Ninguno en este punto | Mantener | Recomendada |
| 42 | Borradores de devolución duplicados | 🟠 | Crea borrador | Dos clicks pueden generar dos borradores | Marca de unicidad por operación | Crítica antes de producción |
| 43 | Nota de crédito AFIP enlazada | 🟡 | Emite nota de crédito | El flujo no está unificado con la devolución | Emisión con un click desde la devolución | Importante |

### 11.6 Caja y clientes

| # | Necesidad / situación real | Estado | ¿Qué puede hacer hoy? | Problema para el negocio | Qué debería mejorar | Prioridad |
|---|---|---|---|---|---|---|
| 44 | Caja: apertura, cierre, movimientos, arqueo | ✅ | Abrir caja con efectivo inicial, cerrarla con arqueo, registrar gastos e ingresos y resumir por medio de pago | Ninguno en este punto | Mantener | Recomendada |
| 45 | Cliente con datos fiscales | ✅ | Cargar cliente con CUIT, domicilio e IVA | Ninguno en este punto | Mantener | Recomendada |
| 46 | Cuenta corriente con límite y estado | ✅ | Vender a cuenta, registrar pagos, aplicar notas de crédito, índice contra pagos repetidos y límite de crédito | Ninguno en este punto | Mantener | Recomendada |

### 11.7 Reportes, fiscal y auditoría

| # | Necesidad / situación real | Estado | ¿Qué puede hacer hoy? | Problema para el negocio | Qué debería mejorar | Prioridad |
|---|---|---|---|---|---|---|
| 47 | Reportes genéricos | ✅ | Ventas por período, productos más vendidos, clientes más frecuentes, ventas por medio de pago, deuda y stock valorizado | Ninguno en este punto | Mantener | Recomendada |
| 48 | Resúmenes con ventas netas de devoluciones | 🔴 | Resúmenes principales disponibles | Los resúmenes no descuentan devoluciones; los rankings pueden mostrar cantidad neta según la consulta, hay que revisar caso por caso | Cruzar devoluciones en los resúmenes | Importante |
| 49 | Indicadores apparel (talle, sell-through, curva) | 🔴 | Nada | El local no puede decidir reposición por talle ni ver qué temporada rindió | Modelar y reportar | Importante |
| 50 | Reporte de merma o shrinkage | 🔴 | Nada | El costo de lo vendido se aproxima con compras pagadas; no hay reporte dedicado de merma, rotura ni robo | Reporte dedicado de merma, rotura y devoluciones | Importante |
| 51 | Reporte de cobertura de recepción | 🔴 | Nada | No se puede ver qué órdenes de compra quedaron con mercadería pendiente | Cruzar orden de compra con recepción | Importante |
| 52 | Reporte de performance de proveedor | 🔴 | Nada | El local no puede comparar proveedores por cumplimiento ni calidad | Construir con datos de proveedor y recepciones | Opcional |
| 53 | Bitácora de auditoría | 🟡 | Registra cambios sensibles | No hay pantalla para consultarla | Pantalla o reporte de la bitácora | Importante |
| 54 | Facturación A, B y C AFIP | 🟡 | Cuenta con emisión de CAE y comprobantes A/B/C | No se validó el recorrido completo en homologación ni una puesta controlada | Validar en homologación y luego realizar una puesta controlada | Crítica antes de producción |
| 55 | Notas de crédito | 🟡 | Emite nota de crédito | El flujo no está unificado con la devolución | Emisión con un click desde la devolución | Importante |
| 56 | Notas de débito | 🔴 | No hay evidencia | No hay nota de débito ni para proveedor ni para venta | Extender el módulo fiscal | Importante |
| 57 | Exportación contable (Tango, Bejerman, SIAP) | 🔴 | Nada | La carga contable se hace a mano | CSV o interfaz con sistemas contables | Opcional |

### 11.8 Seguridad, auditoría y resiliencia

| # | Necesidad / situación real | Estado | ¿Qué puede hacer hoy? | Problema para el negocio | Qué debería mejorar | Prioridad |
|---|---|---|---|---|---|---|
| 58 | Inicio de sesión | ✅ | Inicia sesión con usuario y contraseña | Ninguno en este punto | Mantener | Recomendada |
| 59 | Permisos por rol en el sistema de fondo | 🔴 | Sólo en la pantalla | Un usuario con conocimiento técnico puede llegar a Configuración por la dirección interna | Validar permisos en el sistema de fondo | Crítica antes de producción |
| 60 | Permisos por pantalla | ✅ | La pantalla oculta opciones según el rol | Ninguno en este punto | Alinear con el sistema de fondo | Recomendada |
| 61 | Cierre de sesión por inactividad | 🔴 | No se observa | Un cajero que deja la terminal abierta deja la tienda expuesta | Auto-logout por inactividad | Importante |
| 62 | Respaldo y restauración | 🟡 | Respaldo manual y herramientas de verificación | Sin programación automática ni pantalla para restaurar | Programación automática y pantalla de restauración | Importante |
| 63 | Manejo de cortes y degradación | 🔴 | No existe | Si se cae la red, la venta se pierde | Cola local y sincronización | Importante |
| 64 | Prevención de operaciones duplicadas | 🟠 | Algunos formularios deshabilitan el botón mientras procesan | Ventas y devoluciones pueden repetirse por doble click o reintento de red | Garantizar una única registración por operación | Crítica antes de producción |
| 65 | Manejo de foco en ventanas emergentes | ✅ | Foco, Escape y retorno cubiertos | Ninguno en este punto | Mantener | Recomendada |
| 66 | Accesibilidad puntual | 🟠 | Base de accesibilidad en ventanas emergentes | Siete brechas puntuales confirmadas (casilla de login, mensajes de error, filas de ventas estacionadas, selector de marca, ventana de devolución) | Cerrar las siete brechas puntuales | Recomendada |

---

## 12. Priorización de mejoras

### 12.1 Reglas
- **Crítica antes de producción:** bloqueante operativo o riesgo de inconsistencia de datos.
- **Importante:** degrada calidad de la operación diaria sin bloquear.
- **Recomendada:** mejora visible, tolerable con un plan B.
- **Opcional:** depende del contexto del local (omnicanalidad, fidelización, lista de regalos, sugerencia de reposición, contabilidad completa, recursos humanos, e-commerce, reserva con seña, multi-moneda).

No se inflan prioridades. Las funciones opcionales quedan en **Opcional** salvo que el contexto del local lo exija.

### 12.2 Prerrequisito de release
- **P0.** Confirmar la versión que va a producción. Sin esto, los hitos siguientes no aseguran que el local los reciba.

### 12.3 Hitos mínimos (sin estimación de tiempo)
1. **Estabilización de la versión** (P0).
2. **Cerrar las críticas C1 a C8** (§10.2): devolución completa, reembolso correcto con varios medios, cambio con cobro de diferencia, unicidad de SKU y código de barras, protección contra operaciones duplicadas, venta segura de la última unidad, permisos por rol en todo el sistema y facturación validada en homologación con una puesta controlada.
3. **Bloque apparel indispensable** (§11.1 filas 7, 10-13): variantes con pantalla, sistema de talles y hormas, temporada y colección, política de devolución diferenciada, datos de composición y origen.
4. **Recepción parcial y devoluciones a proveedor** (§11.2 filas 16, 18).
5. **Estados de stock** (§11.3 fila 25).
6. **Reportería del rubro** (§11.7 filas 48-52): ventas netas de devoluciones, indicadores apparel, merma, cobertura de recepción, performance de proveedor.
7. **Cierre de brechas importantes restantes** (§10.3).
8. **Mejoras recomendadas y accesibilidad** (§10.4).
9. **Opcionales según contexto** (§10.5).

### 12.4 Lo que tiene que ser cierto para operar sólo con NexoPOS (checklist)
- Cada producto tiene SKU y código de barras únicos; el lector funciona por defecto.
- El cajero completa una devolución con varios medios sin hacer cuentas a mano.
- El cajero hace un cambio de mercadería cobrando o devolviendo la diferencia en un solo flujo.
- La tienda recibe un camión con faltantes o sobrantes y los registra.
- Dos terminales no venden la misma última unidad.
- Cada cajero ve sólo lo que le corresponde según su rol.
- La facturación electrónica fue validada en homologación y cuenta con un procedimiento controlado de puesta en marcha.
- Los resúmenes principales ya descuentan las devoluciones.
- Los productos tienen temporada, talles y composición cargados.
- La tienda cuenta con un plan de respaldo automático o una rutina diaria de backup manual con verificación.

Si alguna de estas líneas no se cumple, el local va a necesitar una herramienta externa para esa parte del proceso.

---

## 13. Conclusión final

NexoPOS, en su estado actual, es **un sistema minorista genérico con bases sólidas y buena calidad de código**, no un POS de indumentaria listo para producción. La diferencia no es de calidad de ingeniería sino de **cobertura del rubro**: la tienda de indumentaria vive de variantes por talle y color, de talles y hormas, de temporadas y colecciones, de recepción parcial contra remito, de cambios con diferencia cobrada, de devoluciones con varios medios, de rotación por talle y de sell-through por temporada. Esas piezas son justamente las que el sistema tiene **como cimiento técnico pero no como flujo completo en pantalla**, o directamente no las tiene.

La buena noticia es que hay una base útil: ventas, caja, cuentas corrientes, stock por ubicación, facturación AFIP con cimientos y respaldos. Eso resuelve buena parte del mostrador. La mala noticia es que **el mostrador no alcanza** para operar una tienda apparel de punta a punta sin cerrar devoluciones, variantes, recepción y controles contra operaciones duplicadas.

**Recomendación al dueño o al encargado:** usar NexoPOS para el camino transaccional del día (vender, cobrar, facturar, cerrar caja, ver el stock) **y complementar** con planilla, software de etiquetas y WhatsApp para los huecos descritos. Si se decide avanzar hacia producción, **no pasar a operación real sin cerrar las ocho críticas** (§10.2) **ni los hitos del bloque apparel** (§12.3).

El sistema tiene el potencial de ser un buen POS de indumentaria: la base está, el camino es claro, y la mayoría de los faltantes son evolutivos, no estructurales.

---

## Anexo técnico breve (para desarrolladores que necesiten trazabilidad)

**No es necesario leer este anexo para entender el informe.**

### Evidencia verificable ejecutada (2026-08-12)
| Verificación | Comando (desde `apps/backend` o `apps/frontend`) | Resultado |
|---|---|---|
| Build backend | `npm run build` | OK |
| Build frontend | `npm run build` | OK |
| Suites backend focalizadas | `npx jest --selectProjects unit --runTestsByPath src/migrations.consistency.spec.ts src/modules/sales/sale-return.service.spec.ts src/modules/sales/sales.service.spec.ts src/modules/inventory/inventory.service.spec.ts src/modules/purchases/purchases.service.spec.ts --runInBand` | 5 suites, 191 tests pasaron |
| Suites frontend focalizadas | `npx vitest run src/features/sales/components/ReturnDialog.spec.tsx src/features/sales/components/SaleForm.spec.tsx src/pages/settings/CapabilitiesTab.spec.tsx src/components/Sidebar.spec.tsx src/features/products/schemas/product.schema.spec.ts` | 5 archivos, 21 tests pasaron |
| Migración contra base vacía | — | No ejecutada |
| Conexión `http://localhost:5173` | — | No se intentó (regla del repositorio) |

### Anclas de evidencia clave
- Botón "Devolver": `apps/frontend/src/features/sales/components/SaleList.tsx`; diálogo: `ReturnDialog.tsx`; servicio: `apps/backend/src/modules/sales/sale-return.service.ts`.
- Ventas: `apps/backend/src/modules/sales/sales.service.ts` (create/cancel/markAsPaid).
- Productos y variantes: `apps/backend/src/modules/products/products.service.ts`, entidad `product.entity.ts`.
- Compras: `apps/backend/src/modules/purchases/purchases.service.ts` (create/receive/markPaid).
- Inventario y conteos: `apps/backend/src/modules/inventory/inventory.service.ts`, `stocktake.service.ts`.
- Etiquetas PDF: `apps/backend/src/modules/products/labels/labels.service.ts`.
- Reportes: `apps/backend/src/modules/reports/reports.service.ts`, `apps/frontend/src/features/reports/components/ReportsPage.tsx`.
- Registro de migraciones: `apps/backend/src/migrations.ts`.
- Autenticación y permisos: `apps/backend/src/modules/auth/guards/jwt-auth.guard.ts`.
- Lector en POS: `apps/frontend/src/features/sales/components/SaleForm.tsx`.
- Bitácora de investigación: `.omo/ulw-research/20260812-020959/expansion-log.md`.

### Fuentes externas consultadas
- GS1 (estándar de código de barras): `https://www.gs1.org/standards`
- Shopify Retail POS (referencia de práctica): `https://www.shopify.com/pos`
- Microsoft Dynamics 365 Commerce: `https://learn.microsoft.com/dynamics365/commerce`
- Oracle Xstore: `https://www.oracle.com/industries/retail/xstore/`
- ARCA / AFIP (factura electrónica): `https://www.afip.gob.ar/fe/`

### Aviso legal repetido
Esta auditoría no constituye asesoramiento legal, contable ni fiscal. Para obligaciones específicas en Argentina, consulte ARCA y un profesional habilitado.

# Comprobantes configurables e impresión térmica en NexoPOS

**Estado:** aprobado  
**Fecha:** 2026-08-10

NexoPOS incorporará tickets de 58/80 mm como formato de salida para ventas fiscales y no fiscales. La facturación AFIP seguirá definiendo la validez fiscal; Electron resolverá la detección de impresoras, la impresión automática y la reimpresión por estación de trabajo.

## Decisión resumida

| Tema | Decisión |
|---|---|
| Fiscalidad | Independiente del formato: una factura AFIP o un comprobante no fiscal pueden representarse como ticket. |
| Fuente de datos | El backend genera un `ReceiptDocument` canónico por venta. |
| Presentación | Un renderer compartido convierte el documento en HTML/CSS térmico. |
| Impresión | Electron lista impresoras y usa impresión silenciosa sobre el dispositivo elegido. |
| Configuración global | Perfil comercial, logo, pie, campos visibles y estilo base. |
| Configuración local | Impresora, ancho 58/80 mm, autoimpresión y última prueba por computadora. |
| Recuperación | Un fallo de impresión nunca revierte venta, pagos, stock ni factura. |
| Historial | La confirmación y el detalle de venta permiten reimprimir sin volver a llamar a AFIP. |

## Objetivos

1. Permitir configurar tickets desde una interfaz guiada con vista previa.
2. Imprimir automáticamente al completar una venta desde NexoPOS Desktop.
3. Representar correctamente una factura AFIP autorizada o un comprobante no fiscal.
4. Detectar, seleccionar y probar impresoras instaladas en Windows.
5. Mantener disponibles los PDFs actuales de factura y nota de venta.
6. Garantizar que las reimpresiones reproduzcan los datos históricos de la venta.

## Fuera del primer alcance

- Editor libre de plantillas.
- Comandos ESC/POS, corte automático y apertura de cajón.
- Impresión automática desde navegador.
- Cola central o auditoría remota de trabajos de impresión.
- Configuración centralizada de impresoras para múltiples estaciones.

## Estado actual relevante

- `SalesService` puede intentar generar una factura AFIP durante la creación de la venta.
- El backend expone PDFs de factura y nota de venta, además de un HTML no fiscal imprimible.
- La confirmación y el detalle de venta descargan PDFs manualmente.
- Electron ya crea una ventana oculta para `printToPDF`, pero no expone APIs de impresoras.
- `SystemConfiguration` es global; no es apropiado para identificar una impresora física por estación.

## Arquitectura

### Backend

El backend será la fuente de verdad para:

- venta, ítems, pagos y totales;
- estado y metadatos fiscales;
- perfil comercial;
- personalización global del comprobante;
- snapshot histórico aplicado a cada venta;
- construcción del `ReceiptDocument` canónico.

El documento distinguirá explícitamente:

- `fiscalStatus`: autorizado, no fiscal o error fiscal;
- `documentKind`: factura o comprobante de venta;
- datos AFIP opcionales: tipo, número, CAE, vencimiento y QR;
- datos comerciales y configuración visual tomada del snapshot;
- marca de reimpresión solicitada por el cliente de impresión.

### Renderer compartido

Un renderer puro y tipado recibirá `ReceiptDocument` y ancho de papel. Producirá HTML/CSS sin depender del acceso a la base de datos ni a Electron.

La misma lógica se usará para:

- vista previa en Configuración;
- impresión de prueba;
- impresión automática;
- reimpresión desde confirmación o historial.

### Electron

La integración seguirá el límite de seguridad existente:

- `main`: `getPrintersAsync()`, ventana oculta y `webContents.print()`;
- `preload`: API mínima mediante `contextBridge`;
- renderer React: selección, prueba y solicitud de impresión.

La API expuesta será equivalente a:

- `listPrinters()`;
- `getPrinterSettings()`;
- `savePrinterSettings(settings)`;
- `testPrint(document)`;
- `printReceipt(document, options)`.

Se guardará `PrinterInfo.name` como `deviceName`; `displayName` se usará solo para mostrarlo en la interfaz.

## Modelo de configuración

### Perfil comercial global

Se administrará fuera de la configuración fiscal e incluirá como mínimo:

- nombre comercial;
- logo;
- dirección;
- teléfono;
- datos de contacto visibles.

La configuración AFIP conservará los datos legales y certificados. Cuando corresponda, el comprobante fiscal usará los datos legales requeridos, aunque la cabecera visual provenga del perfil comercial.

### Comprobante global

El formulario permitirá configurar:

- logo visible o no;
- teléfono y dirección visibles o no;
- mensaje final;
- campos opcionales;
- estilo térmico estable;
- ancho predeterminado 58/80 mm para la vista previa.

### Impresora local

Cada instalación Desktop conservará:

- `deviceName` seleccionado;
- ancho efectivo 58/80 mm;
- autoimpresión habilitada;
- fecha y resultado de la última prueba.

Si Windows deja de informar el dispositivo, la configuración quedará inválida hasta que el usuario seleccione y pruebe otra impresora.

## Flujos

### Configuración inicial

1. El usuario completa Datos del negocio.
2. Personaliza el comprobante y revisa la vista previa.
3. Electron lista las impresoras instaladas.
4. El usuario elige dispositivo y ancho.
5. Ejecuta una impresión de prueba.
6. Activa la autoimpresión y guarda.

### Venta fiscal autorizada

1. El backend registra la venta y solicita autorización a AFIP.
2. AFIP autoriza y el backend conserva número, CAE, vencimiento y QR.
3. El frontend obtiene el `ReceiptDocument` fiscal.
4. Electron imprime automáticamente el ticket.
5. La confirmación muestra el resultado y permite reimprimir.

### Venta no fiscal o con error AFIP

1. La venta queda registrada conforme al comportamiento actual.
2. El documento se marca como no fiscal e incluye la leyenda correspondiente.
3. Si hubo error AFIP, la interfaz lo mantiene visible y ofrece reintento fiscal.
4. El ticket no fiscal puede imprimirse y reimprimirse.
5. Si luego se autoriza la factura, las impresiones posteriores usan el documento fiscal actualizado.

### Fallo de impresión

1. Electron informa `success=false` y el motivo disponible.
2. La interfaz muestra “Venta registrada, no se pudo imprimir”.
3. No se revierte ninguna operación de negocio.
4. El usuario puede reintentar desde la confirmación o el historial.
5. La reimpresión nunca genera una nueva factura ni solicita un nuevo CAE.

## Snapshot histórico

Cada venta conservará los datos visuales necesarios para reproducir su comprobante: identidad comercial, logo o referencia estable, campos visibles, mensaje final y versión del diseño. Los datos transaccionales y fiscales continuarán proviniendo de la venta y de su factura.

El snapshot evita que una reimpresión antigua cambie al modificar posteriormente el nombre, domicilio, logo o pie del negocio.

## Seguridad y robustez

- Escapar textos antes de incorporarlos al HTML.
- Validar formato y tamaño del logo.
- Validar los mensajes IPC con tipos/esquemas cerrados.
- Mantener `nodeIntegration: false` y `contextIsolation: true`.
- Esperar `did-finish-load` antes de imprimir y destruir siempre la ventana oculta.
- Resolver el resultado mediante el callback de `webContents.print()`.
- Mostrar una advertencia si el driver no respeta el tamaño seleccionado.
- No considerar la prueba exitosa como garantía permanente: el dispositivo puede desconectarse después.

## Estrategia de pruebas

### Backend

- Documento fiscal autorizado con todos los metadatos obligatorios.
- Documento no fiscal sin campos AFIP.
- Error AFIP que conserva la venta y habilita comprobante no fiscal.
- Snapshot histórico estable después de cambiar el perfil.
- Reimpresión que no vuelve a autorizar con AFIP.
- Migraciones registradas en `apps/backend/src/migrations.ts`.

### Renderer y frontend

- Layouts 58 y 80 mm.
- Logo presente/ausente y campos opcionales.
- Vista previa equivalente al HTML enviado a impresión.
- Estados de configuración incompleta, prueba, impresión, fallo y reintento.
- Acciones de reimpresión en confirmación y detalle de venta.

### Electron

- Listado y mapeo de `name`/`displayName`.
- Dispositivo seleccionado ausente.
- Impresión de prueba exitosa y fallida.
- Callback exitoso/fallido de impresión silenciosa.
- Limpieza de la ventana oculta ante éxito, error y timeout.

### QA con hardware

- Impresora 58 mm con su driver real.
- Impresora 80 mm con su driver real.
- Papel agotado, dispositivo apagado y desconexión.
- Márgenes, escala, caracteres acentuados, QR y logo.
- Venta fiscal, venta no fiscal y reimpresión.

## Migración y compatibilidad

1. Crear y registrar migraciones para perfil, configuración y snapshot.
2. Inicializar el perfil desde datos existentes cuando estén disponibles, sin exigir AFIP.
3. Mantener los endpoints y botones actuales de PDF.
4. Dejar autoimpresión desactivada hasta completar selección y prueba.
5. Activar tickets por configuración, sin modificar ventas históricas existentes.

Toda migración creada en `apps/backend/src/migrations/` deberá importarse y agregarse cronológicamente a `apps/backend/src/migrations.ts`.

## Criterios de aceptación

- [ ] Un negocio sin AFIP puede configurar e imprimir un ticket no fiscal.
- [ ] Una factura AFIP autorizada se imprime como ticket con datos fiscales y QR.
- [ ] Desktop detecta, selecciona y prueba impresoras instaladas.
- [ ] La autoimpresión ocurre después de registrar la venta.
- [ ] Un fallo de impresión no modifica la venta.
- [ ] La confirmación y el historial permiten reimprimir.
- [ ] La reimpresión no vuelve a invocar AFIP.
- [ ] Los comprobantes históricos conservan el perfil aplicado al vender.
- [ ] Los PDFs actuales siguen disponibles.
- [ ] El diseño funciona con drivers reales de 58 y 80 mm.

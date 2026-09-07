---
id: SPEC-apparel-product-creation
companions:
  - size-palette-schema.md
  - keyboard-navigation-ergonomics.md
  - matrix-excel-contract.md
  - labels-hangtag-contract.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Módulo Avanzado de Carga de Productos y Catálogo Matricial (Indumentaria & Retail)

## Why

El comercio de indumentaria y calzado en Argentina maneja catálogos tridimensionales de alta rotación (Modelo × Color × Talle × Ubicación), compras por curvas de distribución y necesidad de carga ultrarrápida sin fricción. Los 5 sistemas líderes del mercado local (Dragonfish, Lince, Dux, Tango y Jazz POS) destacan en aspectos específicos: rigidez matricial estructurada, velocidad de teclado, plantillas reutilizables, importación Excel en grilla e impresión inmediata de etiquetas colgantes. 

Para que NexoPOS se consolide como la mejor solución del mercado argentino, es indispensable transformar su módulo de alta y edición de productos en una suite de catálogo integral, ergonómica y de alto rendimiento que combine lo mejor de las 5 soluciones líderes en una experiencia web moderna y fluida.

## Capabilities

- **CAP-1**
  - **intent:** El usuario puede crear, editar, guardar y reutilizar plantillas maestras de escalas de talles y paletas de colores tanto desde la configuración del sistema como "on-the-fly" desde la grilla matricial.
  - **success:** Al seleccionar una plantilla guardada, la grilla 2D se puebla inmediatamente con los talles y colores asociados; al hacer clic en "Guardar como plantilla", la combinación activa queda persistida en el maestro y reutilizable para futuros modelos.

- **CAP-2**
  - **intent:** El usuario puede aplicar modificadores de precios y costos específicos para talles especiales (recargos porcentuales +X% o montos fijos +$Y) y ejecutar ediciones masivas por fila (color) o columna (talle) en la matriz 2D.
  - **success:** Al definir una regla de talle especial (ej: +15% a talles XXL y 50+), los costos y precios de las columnas seleccionadas se recalculan automáticamente sin alterar los talles estándar; la edición masiva por fila/columna actualiza todas las celdas afectadas en un solo paso.

- **CAP-3**
  - **intent:** El operador de mostrador puede navegar la grilla matricial 2D completa y completar stock, precios y SKUs utilizando exclusivamente el teclado (`↑`, `↓`, `←`, `→`, `Tab`, `Shift+Tab`, `Enter`).
  - **success:** Una matriz de 20 celdas (5 talles × 4 colores) puede ser completada en stock y precios en menos de 15 segundos sin recurrir al mouse ni perder el foco.

- **CAP-4**
  - **intent:** El usuario puede clonar/duplicar un modelo de indumentaria existente con su estructura de variantes, escalas de talles, colores, ficha técnica textil y márgenes con un solo clic.
  - **success:** Al presionar "Clonar Modelo" desde el listado o la ficha, se abre el formulario de alta pre-cargado con los atributos del modelo base, permitiendo cambiar el nombre/código de estilo y generar las nuevas variantes de forma inmediata.

- **CAP-5**
  - **intent:** El usuario puede descargar una plantilla Excel estructurada en formato matriz bidimensional (filas: modelos y colores, columnas: talles con cantidades, costos y precios), completarla masivamente e importarla con previsualización y validación previa.
  - **success:** Un archivo Excel 2D con más de 50 modelos y cientos de variantes se importa en una única transacción atómica con reporte visual de filas válidas, alertas de SKUs duplicados y creación correcta de padres e hijos.

- **CAP-6**
  - **intent:** El usuario puede disparar la emisión de etiquetas autoadhesivas térmicas y etiquetas de colgar (Hangtags) con talle visible en recuadro gigante y código de barras inmediatamente tras guardar el modelo o recibir stock.
  - **success:** Al completar la creación del producto matricial, se presenta un diálogo para imprimir de inmediato las etiquetas de todas las variantes con stock cargado en formatos estándar (térmico 50x30mm, 29x90mm o PDF listo para colgar).

## Constraints

- Toda funcionalidad visual o de backend vinculada a indumentaria y variantes DEBE estar estrictamente condicionada por el motor de capacidades (`useCapabilities()` en frontend con `STRUCTURAL.variants` y `configService.getCapabilitiesManifest()` en backend).
- Las nuevas entidades y tablas maestras (plantillas de talles/colores) DEBEN crearse con migraciones TypeORM registradas en `apps/backend/src/migrations.ts` y validadas por `migrations.consistency.spec.ts`.
- La solución debe seguir la pirámide de testing estricta: tests unitarios en frontend (Vitest), unitarios e integración en backend (Jest) y validación de flujo y variantes en interfaz real con Playwright.
- Las tablas y componentes de grilla matricial deben mantener compatibilidad con modo oscuro (`dark mode`) y diseño responsivo sin desbordamiento horizontal no controlado.

## Non-goals

- Sincronización bidireccional en tiempo real con APIs de e-commerce externos (Tiendanube / MercadoLibre) queda reservada para la fase de Omnicanalidad.
- Trazabilidad de talleres fasoneros externos, órdenes de corte textil y despiece de rollos de tela queda fuera del alcance de este módulo de catálogo comercial.
- Venta fraccionada por metro o peso textil queda delegada al módulo de productos pesables/medibles (`isMeasure`).

## Success signal

Un comercio de indumentaria puede configurar sus escalas y paletas personalizadas, cargar una colección completa de 20 modelos con 200 variantes mediante la grilla 2D o vía Excel matricial en menos de 5 minutos, aplicar recargos a talles especiales sin cálculos manuales e imprimir sus etiquetas de colgar al instante.

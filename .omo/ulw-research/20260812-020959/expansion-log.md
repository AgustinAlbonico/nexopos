# Auditoría funcional POS de indumentaria — registro de expansión

## Plan

- Construir el catálogo operativo real sin tomar los módulos existentes como punto de partida.
- Contrastar ese catálogo contra dominio/backend, frontend, escritorio y comportamiento observable.
- Clasificar cobertura, riesgo, dependencia de herramientas externas y prioridad productiva.
- Producir un informe español autosuficiente, con matriz completa y evidencia trazable.

## Escenarios de auditoría

1. **Camino habitual:** alta o recepción de una prenda con talle/color, disponibilidad, venta, cobro, comprobante, impacto en stock y caja. Pasa si cada etapa está cubierta o la brecha queda demostrada con fuente concreta.
2. **Alternativas y bordes:** cambio, devolución parcial/total, diferencia de precio, venta sin stock, corrección humana, concurrencia, promociones y múltiples medios de pago. Pasa si cada estado e impacto contable-operativo queda clasificado.
3. **Regresión adyacente:** compras, proveedores, inventarios, cuentas de clientes, reportes, respaldos y configuración. Pasa si se determina si los flujos principales preservan consistencia o fuerzan trabajo externo.
4. **Eficiencia real:** teclado, lector de código, búsqueda, variantes y operaciones repetitivas. Pasa si se mide el recorrido observable o se fundamenta su limitación desde código.

## Estado actual

- Repositorio: `C:/Proyectos/punto_de_venta`.
- Rama observada: `docs/agents-git-workflow`.
- El árbol contiene numerosos cambios preexistentes no confirmados; la auditoría será estrictamente read-only sobre código funcional y no alterará esos cambios.
- CodeGraph disponible en `.codegraph/`.
- No se iniciarán servidores NestJS ni Vite; solo se usarán superficies que ya estén levantadas.

## Hallazgos iniciales

- La copia de trabajo incluye funcionalidades en desarrollo no confirmadas (variantes, devoluciones, promociones, unidades, conteos, importación y capacidades), por lo que el reporte distinguirá explícitamente evidencia presente en el estado actual del working tree de madurez productiva demostrada.
- Existen documentos de investigación/planificación previos en el árbol, pero se tratarán como contexto y no como prueba de implementación.

## Oleadas

### Oleada 0 — Descomposición

- Ejes: operación real de indumentaria; catálogo/variantes/precios; compras/recepción/proveedores; inventario; POS/ventas/devoluciones/promociones; caja/clientes; reportes/control; UX/desktop; riesgos transaccionales y estados.
- Fuentes: código local, pruebas, configuración, comportamiento observable y fuentes externas primarias/sectoriales.
- Próximo paso: oleada paralela de investigadores especializados y exploración estructural por CodeGraph.

### Oleada 1 — Saturación inicial

Trabajadores completados: 8 (4 código, 4 dominio externo).

#### Operación externa

- Cada combinación estilo/color/talle debe ser una identidad vendible propia, con SKU/GTIN/código y stock a nivel variante.
- El ciclo real exige recepción parcial y por escaneo, sobrantes/faltantes/no planificados, etiquetado, estados de stock, transferencias, inventarios, ajustes con motivo y trazabilidad.
- Caja/venta requiere medios mixtos, reintentos idempotentes, devolución al medio permitido, cambios con diferencia, políticas de excepción, degradación offline explícita y comprobantes reimprimibles.
- La indumentaria agrega temporada/colección, remarcaciones, SUNITI/talles y datos de rotulado textil/calzado.
- Fuentes principales: GS1, Shopify POS, Microsoft Dynamics 365 Commerce, Oracle Xstore, ARCA y normativa argentina oficial (acceso 2026-08-12).

#### Sistema actual

- Fortalezas: ventas transaccionales, caja, cuentas corrientes, compras básicas, stock por ubicación, transferencias, inventarios físicos, cantidades decimales, facturación, devoluciones backend, respaldos y reportes existentes.
- Variantes, packs, bundles, importación CSV, etiquetas y devoluciones están presentes principalmente en cambios no confirmados del working tree; varias capacidades carecen de recorrido UI.
- Brechas críticas encontradas: devolución visible pero no conectada desde `SalesPage`; reembolso mixto usa solo el primer medio; cambio no consume la diferencia; recepción de compras es todo-o-nada; sin devoluciones a proveedor; sin estados reservado/dañado/tránsito; sin unicidad robusta de código de producto; sin idempotencia integral.
- Riesgos: efectos financieros posteriores al commit toleran fallos; actualización/marcado pago de compras tiene secuencias de inventario menos atómicas; actualizaciones de stock sin locks explícitos; venta sin stock puede producir saldo negativo deliberado.

#### Leads abiertos para expansión

1. Confirmar la discrepancia del botón de devolución y alcance real del wiring frontend.
2. Confirmar unicidad de SKU/código y posibilidad de colisiones en búsqueda/venta.
3. Auditar reportes y caja contra decisiones reales de indumentaria, no solo su existencia.
4. Auditar estados, permisos, auditoría y capacidad de recuperación ante doble envío/fallos.
5. Verificar compilación/pruebas relevantes del working tree actual sin iniciar servidores.
6. Completar segundo pase UX: estados vacíos/error, foco modal, doble envío y densidad.

Convergencia: no alcanzada; quedan leads accionables. Se abre oleada 2.

### Oleada 2 — Expansión dirigida

- Schema: todas las migraciones presentes están registradas en orden y el test de consistencia pasó; módulos y entidades están conectados. Falta prueba sobre DB realmente vacía.
- Frontend: se confirmó que devoluciones es una acción visible sin `onReturn`; variantes, importación, etiquetas e inventario físico son backend-only. Compras sí bloquea doble submit en UI.
- Integridad: producto no garantiza unicidad de SKU/código; venta no tiene idempotency key; devoluciones bloquean sobredevolución al confirmar pero pueden crear borradores duplicados; stock no usa lock explícito por fila; control de permisos es autenticación JWT, no RBAC.
- Reportes: cubren POS genérico, caja, deuda e inventario valorizado; no cubren ventas netas de devoluciones, temporada/estilo, merma, recepción, desempeño proveedor ni trazabilidad fiscal completa. Además, COGS se aproxima con compras pagadas y la baja rotación tiene campos sin calcular.
- Verificación ejecutada: backend build OK; frontend build OK; 191 tests backend y 21 frontend focalizados pasaron. LSP no disponible por timeout del daemon. Web no levantada y no se inició por regla del repo.

#### Leads de cierre

1. Resolver contradicción puntual sobre migración de unicidad y precisar qué identificadores carecen de constraint.
2. Cerrar accesibilidad/foco y shortcuts sin abrir una auditoría visual imposible con la app detenida.
3. Revisar severidades y completitud de requisitos desde una perspectiva escéptica.

Convergencia: casi alcanzada; se abre oleada 3 final únicamente para estos tres leads.

### Oleada 3 — Cierre y revisión escéptica

- Identidad resuelta: `saleNumber` y `purchaseNumber` sí tienen constraints únicos por migración registrada; `pack_barcode` también. `Product.barcode` solo está indexado y `Product.sku` no tiene unicidad. Las cuentas corrientes sí poseen índice idempotente parcial por referencia.
- Accesibilidad: Radix cubre foco/Escape/retorno de foco en diálogos; se confirmaron siete defectos puntuales (login, ventas estacionadas, combobox de marca y selector de destino de devolución), sin nuevas categorías operativas.
- Oracle: confirma que el árbol actual demuestra un POS genérico en desarrollo, no madurez productiva para indumentaria. Ratifica como bloqueantes devoluciones/cambios, identidad, idempotencia, concurrencia de stock, RBAC y prueba de release/fiscalidad real.
- No quedan leads de investigación sin resolver. Las mejoras avanzadas de omnicanalidad, fidelización o automatización de proveedor se clasifican como opcionales, no críticas.

Convergencia alcanzada después de 3 oleadas: cero leads accionables pendientes.

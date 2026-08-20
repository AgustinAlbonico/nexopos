# Plan Maestro de Implementación — NexoPOS para Indumentaria y Calzado

- **Fecha de creación:** 2026-08-12
- **Documento base:** `docs/auditoria-funcional-pos-indumentaria-2026-08-12.md`
- **Objetivo:** Implementación completa y autónoma de NexoPOS para tiendas de indumentaria y calzado.

---

## Principio de Clasificación por Perfil / Capacidad

1. **Capacidad General (A):** Disponible para todos los perfiles sin excepción (seguridad, idempotencia, consistencia de stock, devoluciones base, auditoría, permisos por rol en backend).
2. **Capacidad Específica de Indumentaria (B):** Activa únicamente cuando el perfil de negocio es `Indumentaria` (`apparel`) o `Calzado` (matriz de variantes por talle/color/horma/ancho, temporada/colección, curva de talles, sell-through, composición textil/calzado, política de devolución indumentaria).
3. **Capacidad Compartida Opcional (C):** Integrada al sistema de capacidades (`capabilities`), configurable por el negocio (compras parciales, conteos físicos con lector, deudas/cuentas corrientes de proveedor, etc.).

---

## Matriz del Plan Maestro por Olas de Implementación

| ID Audit | Necesidad / Requisito | Solución Propuesta | Clasificación (A/B/C) | Módulos Afectados | Migraciones Necesarias | Pruebas Necesarias | Validación Operativa | Ola | Estado |
|---|---|---|---|---|---|---|---|---|---|
| **C1** / #36 | Devolución incompleta en pantalla | Conectar modal `ReturnDialog` con backend `SaleReturnController`. Manejar flujo completo de selección de ítems y emisión | A | `sales` (BE/FE) | Ninguna (tabla `sale_returns` ya existe) | `sale-return.service.spec.ts`, `ReturnDialog.spec.tsx` | Abrir lista de ventas, hacer click en Devolver, seleccionar ítems y procesar retorno | Ola 1 | Completado |
| **C2** / #37 | Reembolso con varios medios usa sólo el 1ro | Permitir devolver monto proporcional o elegir medio explícito al procesar devolución | A | `sales` (BE/FE) | Sí (soporte multi-medio en `sale_returns`) | `sale-return.service.spec.ts` | Devolución de venta abonada con Efectivo + Tarjeta | Ola 1 | Completado |
| **C3** / #38 | Cambio de mercadería con cobro de diferencia | Implementar flujo unificado de cambio: devolución de ítem devuelto + adición de ítem nuevo + cobro/reintegro de diferencia | A | `sales` (BE/FE) | Sí (tabla/relación `sale_exchanges` o transacción en `sales`) | `sale-exchange.spec.ts` | Cambiar remera M por L más cara y cobrar saldo | Ola 1 | Completado |
| **C4** / #1 | SKU y Código de Barras duplicados | Agregar constraints únicas `UNIQUE(sku)` y `UNIQUE(barcode)` en `products` y `product_variants` con filtro parcial para nulos | A | `products` (BE/FE) | Sí (`AddUniqueConstraintsSkuBarcode`) | `products.entity.spec.ts`, `migrations.consistency.spec.ts` | Intentar crear variante/producto con SKU o Barcode existente | Ola 0 | Completado |
| **C5** / #31, #42, #64 | Sin protección contra doble click/reintentos | Implementar Idempotency-Key guard en endpoints críticos (`/sales`, `/sales/returns`, `/purchases`) y deshabilitar botones en UI | A | `common`, `sales`, `purchases` (BE/FE) | Sí (tabla `idempotency_keys` si es en DB, o cache transaccional) | `idempotency.guard.spec.ts` | Simular envíos simultáneos idénticos | Ola 0 | Completado |
| **C6** / #24 | Venta simultánea de última unidad | Bloqueo pesimista (`SELECT ... FOR UPDATE`) o check atómico de stock disponible antes de confirmar venta | A | `sales`, `inventory` (BE) | Ninguna | `sales-concurrency.spec.ts` | Dos terminales vendiendo la última unidad simultáneamente | Ola 0 | Completado |
| **C7** / #59 | Permisos por rol no aplicados en Backend | Decorar endpoints sensibles con `@Roles()` y `RolesGuard` NestJS en controllers de `configuration`, `inventory`, `products`, `reports` | A | Todos los módulos (BE) | Ninguna | `roles.guard.spec.ts`, `auth.integration.spec.ts` | Petición HTTP directa de cajero a endpoint admin | Ola 0 | Completado |
| **C8** / #54 | Facturación AFIP sin prueba E2E | Crear suite de prueba completa WSFE en homologación con fallback seguro y verificación de CAE | A | `sales` (AFIP/WSFE) (BE) | Ninguna | `wsfe.integration.spec.ts` | Emitir comprobante A/B/C en AFIP Homologación | Ola 0 | Completado |
| #7, #11 | Matriz talle × color × horma × ancho y diccionario de talles | Crear entidad `SizeSystem`, atributos de variante (horma, ancho) y UI de matriz interactiva en `ProductForm` y POS | B | `products` (BE/FE) | Sí (`AddApparelVariantsMatrix`) | `variant-matrix.spec.ts` | Crear producto modelo con matriz de 5 talles × 3 colores y vender variante específica | Ola 2 | Completado |
| #10 | Temporada y Colección | Campos `season` y `collection` en `products` y `product_variants` con filtros en catálogo y reportes | B | `products`, `reports` (BE/FE) | Sí (`AddSeasonCollectionColumns`) | `products.spec.ts` | Filtrar catálogo y reportes por "Verano 2026" | Ola 2 | Completado |
| #12 | Composición, materiales, origen y cuidados | Campos para ley de rotulado textil/calzado argentino en `products` | B | `products` (BE/FE) | Sí (`AddTextileCareColumns`) | `products.spec.ts` | Ver ficha técnica de prenda con composición | Ola 2 | Completado |
| #13, #40 | Política de devolución por producto/promo | Atributo `return_policy` (`standard`, `final_sale`, `size_exchange_only`, `time_limited`) evaluado en devoluciones | B | `products`, `sales` (BE/FE) | Sí (`AddReturnPolicyColumns`) | `return-policy.spec.ts` | Intentar devolver ítem "Final Sale" | Ola 2 | Completado |
| #8 | Impresión de etiquetas para indumentaria | Vista previa e impresión de etiquetas térmicas con SKU, Variante, Código de Barras y Precio desde UI | B | `products` (BE/FE) | Ninguna | `labels.spec.ts` | Disparar impresión de etiqueta de variante desde el catálogo | Ola 2 | Completado |
| #6 | Importación masiva por planilla con vista previa | Asistente de importación CSV/Excel con mapeo dinámico de columnas, vista previa y reporte de errores | A / C | `products` (BE/FE) | Ninguna | `csv-import.spec.ts` | Importar archivo de 100 variantes con vista previa | Ola 2 | Completado |
| #9 | Imágenes por producto/variante | Galería de fotos por producto y visualización en tarjetas de productos del POS | B | `products` (BE/FE) | Sí (`AddProductImageColumns`) | `product-images.spec.ts` | Cargar foto a modelo y verla al escanear en POS | Ola 2 | Completado |
| #16, #51 | Recepción parcial de compras y líneas pendientes | Modela `PurchaseReceipt` con recepción total/parcial, registrar sobrantes/faltantes y trazabilidad a orden de compra | C | `purchases`, `inventory` (BE/FE) | Sí (`AddPurchaseReceiptsTables`) | `purchase-receipt.spec.ts` | Recibir 8 de 10 unidades pedidas y ver saldo pendiente | Ola 3 | Pendiente |
| #18 | Devoluciones a proveedor | Módulo de `SupplierReturn` con ajuste de inventario y generación de Nota de Crédito de proveedor | C | `purchases`, `inventory` (BE/FE) | Sí (`AddSupplierReturnsTables`) | `supplier-return.spec.ts` | Devolver 2 prendas falladas a proveedor | Ola 3 | Pendiente |
| #19 | Cuenta corriente de proveedor | Registrar movimientos de saldo, facturas y notas de crédito/débito de proveedor | C | `suppliers`, `purchases` (BE/FE) | Sí (`AddSupplierLedgerTables`) | `supplier-ledger.spec.ts` | Consultar estado de cuenta corriente de proveedor | Ola 3 | Pendiente |
| #25 | Estados de stock (disponible, reservado, dañado, cuarentena, tránsito) | Campo `status` en stock y movimientos de transferencia entre estados | A / C | `inventory` (BE/FE) | Sí (`AddInventoryStockStatus`) | `inventory-status.spec.ts` | Mover 3 prendas dañadas a cuarentena y reinspeccionar | Ola 4 | Pendiente |
| #23 | Conteos físicos con lectora y auditoría | Pantalla de inventario físico rápido optimizada para escáner, cálculo de diferencia y aprobación | A / C | `inventory` (BE/FE) | Ninguna (entidad `StocktakeSession` existe) | `stocktake.spec.ts` | Realizar conteo físico de 20 prendas con lectora | Ola 4 | Pendiente |
| #48 | Ventas netas de devoluciones en reportes | Descontar devoluciones de totales de venta, ingresos y flujo de caja en reportes | A | `reports` (BE/FE) | Ninguna | `reports.service.spec.ts` | Generar reporte diario tras realizar devolución | Ola 5 | Pendiente |
| #49 | Indicadores Apparel (curva de talles, sell-through, rotación) | Pantalla de reportes específicos para Indumentaria | B | `reports` (BE/FE) | Ninguna | `apparel-reports.spec.ts` | Consultar curva de talles vendida de una colección | Ola 5 | Pendiente |
| #50 | Reporte de merma y ajustes | Reporte agrupado de mermas, robos, fallados y ajustes manuales | A / C | `reports`, `inventory` (BE/FE) | Ninguna | `shrinkage-report.spec.ts` | Consultar mermas del mes por responsable | Ola 5 | Pendiente |
| #33, UX | UX POS con foco en escáner y atajos de teclado | Foco automático en buscador POS tras cada acción y accesos rápidos (F1-F12, Esc, Enter) | A | POS FE | Ninguna | `keyboard-shortcuts.spec.tsx` | Realizar venta completa sólo usando teclado y escáner | Ola 6 | Pendiente |
| #61, #66 | Auto-logout y accesibilidad | Cierre de sesión por inactividad y resolución de las 7 brechas de accesibilidad identificadas | A | FE / Auth | Ninguna | `accessibility.spec.tsx` | Navegar modal de devolución con tabulador y lector | Ola 6 | Pendiente |

---

## Resumen de Olas de Trabajo

- **Ola 0:** Base y seguridad (Unicidad SKU/Barcode, Idempotencia, Concurrencia de Stock, RolesGuard en BE, Consistency Spec).
- **Ola 1:** Cambios, Devoluciones y Reembolsos (Devolución total/parcial, Reembolso multi-medio, Cambio con cobro de diferencia, Comprobante y NC AFIP).
- **Ola 2:** Catálogo de Indumentaria (Matriz Talle/Color/Horma/Ancho, Temporada/Colección, Composición/Cuidados, Política de Cambio, Importador masivo, Etiquetas).
- **Ola 3:** Compras y Recepción (Recepción parcial, Sobrantes/Faltantes, Devoluciones a proveedor, Cuenta corriente proveedor).
- **Ola 4:** Inventario Operativo (Estados de stock: cuarentena, reservado, dañado, tránsito; Conteos físicos con escáner, Aprobación de ajustes).
- **Ola 5:** Reportes de Negocio (Ventas netas de devoluciones, Curva de talles, Sell-through, Stock valorizado por temporada, Reporte de mermas).
- **Ola 6:** UX, Eficiencia y Accesibilidad (Escáner sin fricción, Atajos de teclado, Auto-logout, Cierre de 7 brechas de accesibilidad).

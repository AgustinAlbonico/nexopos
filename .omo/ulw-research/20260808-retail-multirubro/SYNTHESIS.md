# Síntesis de investigación: NexoPOS multi-rubro

Workers: 31 task runs · Waves: 3 (1 inicial + 2 expansiones) · Fuentes: 30+ primarias/oficiales · Verificaciones: repo, normas y claim ledger

## Resumen ejecutivo

NexoPOS ya contiene un núcleo fuerte para comercio minorista por unidad: catálogo, código de barras, ventas, compras, inventario, proveedores, clientes/cuentas, caja, reportes, AFIP, backups y escritorio local. Sin embargo, su identidad de stock sigue siendo el producto simple y todas las cantidades transaccionales son enteras; no existen variantes, lotes, series, consignación ni pricing mayorista estructural [C1][C2][C3].

La planificación no debe construir ocho programas. Debe conservar un núcleo compartido y combinar capacidades. Las familias identificadas describen comportamientos: peso es medición; variantes son identidad comercial; lotes/series son identidad de stock y trazabilidad; consignación es propiedad/settlement; wholesale es pricing/condiciones. Los productos POS maduros usan presets/modes/modules sobre un core común, no forks [S21][S22][S23].

La investigación también demostró que varias funciones importantes son transversales y deben desarrollarse antes o junto a los verticales: devoluciones reales, importación validada, stocktakes, etiquetas, restore probado, periféricos diagnosticables, packs/UOM y una taxonomía clara de descuentos/promociones [S8][S9][S10][S11].

## Estado actual del producto

### Cubierto

- Catálogo simple con SKU/barcode, categoría, marca, costo, precio/margen y stock [C1].
- Venta scanner-first con pagos, impuestos, cuentas, caja y facturación A/B/C [C4][C8].
- Compras que actualizan stock cuando quedan pagadas; inventario con ledger de movimientos [C4].
- Configuración para scanner, stock mínimo y venta sin stock [C5].
- Electron/NSIS, updater, setup PostgreSQL, logs, PDF y backups [C6][C7].

### Brechas confirmadas

- Cantidades y stock enteros en producto, movimientos, venta y compra [C1][C2].
- Un solo precio/stock por producto; no parent/variant, lot, serial, owner o price list [C1].
- Cancelación de venta revierte efectos, pero no hay devolución parcial/cambio ni nota de crédito AFIP [C4].
- No hay importación operativa, etiquetas de producto, stocktake por sesión ni reason codes/auditoría de inventario.
- Backup sin restore UI/API; scanner sí, printer/scale/drawer bridges no [C6][C7].

## Capacidades comunes a todos los rubros

| Capacidad | Nivel recomendado | Motivo |
| --- | --- | --- |
| Caja rápida, barcode y atajos | Core | Diferenciador global de NexoPOS, no vertical [C8] |
| Importación validada | Common module | Catálogos grandes exigen staging, stable key, preview, errores y commit [S10] |
| Etiquetas producto/precio | Common module | Requieren template, preview y calibración de hardware [S8] |
| Stocktake | Common module | Debe ser sesión con snapshot, variación, revisión y reconcile [S9][S28][S29] |
| Devoluciones/cambios | Core retail phase | Cruzan stock, caja, cuentas, fiscalidad y original sale [S11][S12] |
| Restore/diagnóstico/update seguro | Productization core | Backup no vale sin restore probado; dispositivos requieren protocolos explícitos [S24][S25] |
| Descuento manual/price override | Core/config | Operación común con permiso/reason code |
| Promos/cupones/loyalty | Optional modules | Objetos y settlement distintos; evitar rules engine temprano |

## Funcionalidades por familia y diferenciador real

### 1. Unidad simple

**Ejemplos:** bazar, librería, juguetería, accesorios, ferretería simple.

- Esencial: núcleo actual, barcode, búsqueda rápida, compras, stock, caja y devoluciones.
- Importante: importación, etiquetas, stocktakes, ajuste con reason code, dead-stock/best-seller reports.
- Diferenciador real: ninguno estructural; debe ser el perfil base más simple y rápido.
- Diferenciador falso: dashboard, barcode o variantes; son core/transversales.

### 2. Alta rotación / envasados

**Ejemplos:** kiosco, almacén, bebidas, limpieza, pet shop envasado.

- Esencial: scanner-first, reposición, purchase receiving, packs, conteos rápidos, shrink reasons, fast movers.
- Importante: promociones simples, shelf/price labels, supplier/barcode catalogs, fiado usando cuentas existentes.
- Diferenciador: loop reorder→purchase→receive y pack-aware identity; no simplemente “checkout rápido” [S1][S3][S4].
- Dependencias: common tools + UOM/packs.

### 3. Peso o medida

**Ejemplos:** dietética, verdulería, carnicería/fiambrería, telas/materiales por metro.

- Esencial: cantidades decimales, UOM, precisión/rounding, precio por kg/litro/metro, tara, PLU y variable barcode [S2][S3].
- Importante: merma, yield/receiving, etiqueta peso/precio, manual weight y scanner de etiqueta.
- Diferenciador: integración directa con modelos de balanza soportados y test de lectura; no “cualquier USB”.
- Dependencias: quantity/UOM foundation + sellable pack semantics.

### 4. Variantes

**Ejemplos:** indumentaria, calzado, lencería, marroquinería.

- Esencial: parent product + sellable variants, SKU/GTIN/barcode/stock por combinación, bulk matrix e import [S5].
- Importante: etiquetas por variante, collections/tags, exchange in-cart y reportes sell-through.
- Diferenciador: matrix editing usable y cambios con reingreso/diferencia; no color swatches decorativos.
- Dependencias: line snapshots + import/labels + devoluciones.

### 5. Lotes y vencimientos

**Ejemplos:** alimentos, cosmética, perfumería, perecederos.

- Esencial: recibir por lote/fecha, stock por lote, FEFO, bloqueo vencido/cuarentena, recall y trazabilidad [S6][S15][S16][S17][S18].
- Importante: near-expiry alerts, markdowns, write-off reasons, return-to-supplier y recall report.
- Diferenciador: trazabilidad end-to-end y recall efectivo; no un campo fecha aislado.
- Dependencias: stock identity + receiving + returns + stocktake.

### 6. Series y garantías

**Ejemplos:** celulares, electrónica, electrodomésticos, herramientas.

- Esencial: GTIN/producto + serial/IMEI al recibir, vender y devolver; warranty snapshot y original-sale linkage.
- Importante: RMA handoff, quarantine, duplicate/fraud checks, ownership history.
- Diferenciador: lifecycle por unidad y warranty lookup; no texto de garantía en ticket.
- Dependencias: stock identity + returns + variants cuando corresponda.

### 7. Consignación/reventa

**Ejemplos:** ropa usada, antigüedades, artículos de terceros.

- Esencial: consignante/contrato, ownership, split/comisión, aging/markdown, payout ledger y return-to-owner [S30].
- Importante: bulk settlement, holds/reversals, portal/report export y booth rent para antigüedades.
- Diferenciador: contabilidad de propiedad y liquidación; no supplier stock común.
- Dependencias: line snapshots + returns + audit + stock ownership.

### 8. Minorista/mayorista híbrido

**Ejemplos:** corralón, repuestos, materiales eléctricos, distribuidor con mostrador.

- Esencial: customer groups, price lists, quantity breaks, bultos/UOM, crédito y datos fiscales [S19][S20].
- Importante: quotes/orders, partial fulfilment, depósitos/anticipos, salesperson y margin view.
- Diferenciador: B2C+B2B en la misma caja con pricing/terms determinísticos; no una segunda interfaz temática.
- Dependencias: UOM/packs + customer pricing + receiving separado de payment.

## Semánticas que no deben mezclarse

| Concepto | Significado |
| --- | --- |
| UOM conversion | Mismo artículo expresado en unidad distinta, normalizado a base stock [S3] |
| Sellable pack | Presentación comercial con cantidad, barcode/GTIN y precio propios [S1][S4] |
| Bundle/kit | Oferta con componentes cuyo stock se descuenta por componente [S7][S27] |
| Logistics package | Contenedor de movimiento, no vendible [S4] |
| Variant | Combinación vendible de atributos, con identidad/stock propio [S5] |
| Lot | Grupo trazable compartiendo batch/expiry [S6] |
| Serial | Unidad física identificada individualmente |
| Consignment | Stock cuya propiedad sigue siendo de tercero [S30] |

## Arquitectura recomendada

1. **Shared core:** ventas, compras, caja, clientes, proveedores, AFIP, reportes, auth, backup.
2. **Business profile:** preset humano; no contiene lógica.
3. **Capability registry:** fuente backend para capacidades activas; frontend deriva visibilidad.
4. **Policy boundaries:** quantity, stock identity, price resolution, sale validation, receiving y returns.
5. **Optional modules:** import, labels, stocktake, promotions, loyalty, warranty UI, settlement.
6. **Structural models:** UOM/pack, variant, lot, serial, ownership y price list.

El esquema/migraciones debe ser uno para todos; perfiles nunca bifurcan migraciones. Legacy conserva el comportamiento actual. El checkout no consulta servicios remotos ni interpreta esquemas dinámicos [C3][C5][S21][S22].

## Roadmap por dependencias

| Fase | Entrega | Habilita |
| --- | --- | --- |
| 0 | Baseline de regresión y performance | Proteger cliente actual y caja rápida |
| 1 | Perfil legacy + capability registry | Personalización controlada |
| 2 | Quantity/UOM + snapshots inmutables | Base para packs, peso y trazabilidad |
| 3 | Importación + labels + stocktake + reason codes | Alta rotación y operación confiable |
| 4 | Devoluciones/cambios + notas de crédito | Retail completo y after-sale [S12][S13][S14] |
| 5 | Packs/UOM comerciales | Kiosco, bebidas y wholesale |
| 6 | Peso/medida + variable barcode; scale bridge después | Dietética, verdulería, carnicería, telas |
| 7 | Variantes | Indumentaria/calzado |
| 8 | Lotes/vencimientos/recall | Alimentos, cosmética/perfumería |
| 9 | Series/garantías | Electrónica/durables |
| 10 | Pricing/terms mayoristas | Retail/wholesale híbrido |
| 11 | Consignación/settlement | Reventa/terceros |
| 12 | Promociones/cupones/loyalty avanzados | Diferenciación comercial transversal |

## Invariantes de velocidad y seguridad

- Scan→línea visible: objetivo p95 ≤300 ms en DB local.
- Recalcular basket: p95 ≤100 ms para 20 líneas.
- Finalización local: p95 ≤2 s excluyendo espera externa de ARCA/impresión.
- Ninguna decisión administrativa dentro del cobro normal.
- Backend es autoridad; ocultar UI nunca habilita/inhabilita reglas por sí solo.
- Sale/purchase/return/stocktake conservan snapshots históricos y transacciones atómicas.
- Toda migración se registra en `apps/backend/src/migrations.ts` y pasa el consistency test [C3].
- Restore debe probarse; updater, logs y dispositivos deben tener diagnóstico [S24][S25].

## Exclusiones

- SaaS/multi-tenancy/control plane remoto.
- Multi-location real y transfers.
- Multi-currency.
- Gastronomía, servicios/turnos y farmacia regulada.
- WMS/ERP enterprise, e-commerce/omnichannel y repairs completos.
- Rules engine promocional genérico en fases tempranas.

## Contradicciones resueltas

- **“Ocho rubros” vs capacidades transversales:** perfiles componen capacidades; no se crean módulos por nombre de rubro.
- **Packs vs bundles vs UOM:** se modelan como semánticas distintas [S1][S3][S4][S7].
- **Cancelación vs devolución:** la cancelación actual no sustituye documento parcial/credit note [C4][S12].
- **EU cosméticos vs Argentina:** normativa UE no se usa como autoridad local; se usan ANMAT/MERCOSUR [S16][S17].
- **Promotions vs loyalty/store credit:** objetos y settlement separados.
- **“Cualquier balanza” vs soporte real:** integración acotada por modelo/protocolo; metrología se valida por deployment.

## Gaps deliberadamente no resueltos

- ARCA: contingencia fiscal offline genérica no verificada; no se promete.
- Balanzas: periodicidad/metrología provincial y modelo aprobado se validan por instalación.
- Métricas vendor de reducción de desperdicio se omiten por sesgo/evidencia insuficiente.
- Umbral consumidor final 2026 no se usa en decisiones hasta verificación dedicada.

## Fuentes de código

- [C1] `apps/backend/src/modules/products/entities/product.entity.ts:20-114`
- [C2] `apps/backend/src/modules/sales/entities/sale-item.entity.ts:39-91`; `apps/backend/src/modules/purchases/entities/purchase-item.entity.ts`
- [C3] `apps/backend/src/migrations.ts`; `apps/backend/src/migrations.consistency.spec.ts`
- [C4] `apps/backend/src/modules/sales/sales.service.ts:286-1050`; `apps/backend/src/modules/inventory/inventory.service.ts`
- [C5] `apps/backend/src/modules/configuration/entities/system-configuration.entity.ts`; `configuration.service.ts`
- [C6] `apps/desktop/electron/main.ts`; `setup-wizard.ts`; `electron-builder.yml`
- [C7] `apps/backend/src/modules/backup/backup.service.ts`; `apps/frontend/src/pages/settings/BackupPage.tsx`
- [C8] `apps/frontend/src/features/sales/components/SaleForm.tsx`; `useBarcodeScanner.ts`; `KeyboardShortcutsProvider.tsx`

## Fuentes externas priorizadas

- [S1] GS1 Argentina — https://www.gs1.org.ar/Site/Sectores_Bootstrap5/CodigoBarra.html
- [S2] GS1 2D Retail POS — https://ref.gs1.org/guidelines/2d-in-retail/1.1.0/GS1-2DRetailPOS-Guideline-i1.1-r-2025-12-15
- [S3] Odoo UOM — https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/configure/uom.html
- [S4] Odoo Packaging — https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/configure/packaging.html
- [S5] Shopify Variants — https://help.shopify.com/en/manual/products/variants
- [S6] Odoo Tracking/Expiry — https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/product_tracking.html
- [S7] Square Bundles — https://squareup.com/help/us/en/article/8057-create-managing-bundles-with-square-for-retail
- [S8] Square Labels — https://squareup.com/help/us/en/article/6093-create-and-print-bar-code-labels-with-square-for-retail
- [S9] Square Inventory Counts — https://squareup.com/help/us/en/article/8249-conduct-full-inventory-counts-with-square-for-retail
- [S10] Lightspeed Import — https://retail-support.lightspeedhq.com/hc/en-us/articles/115004963387-Importing-and-updating-items-using-a-spreadsheet
- [S11] Shopify Exchange — https://help.shopify.com/en/manual/sell-in-person/shopify-pos/order-management/exchange
- [S12] ARCA RG 4540 — https://biblioteca.arca.gob.ar/search/query/norma.aspx?p=t%3ARAG%7Cn%3A4540%7Co%3A3%7Ca%3A2019%7Cf%3A31%2F07%2F2019
- [S13] ARCA RG 5866 — https://biblioteca.arca.gob.ar/search/query/norma.aspx?p=t%3ARAG%7Cn%3A5866
- [S14] Ley 24.240 — https://www.argentina.gob.ar/normativa/nacional/ley-24240-638/actualizacion
- [S15] Alimentos Res. 149/2005 — https://www.argentina.gob.ar/normativa/nacional/norma-110017/texto
- [S16] Cosméticos Disp. 374/2006 — https://www.argentina.gob.ar/normativa/nacional/norma-113577/texto
- [S17] Cosméticos Res. 48/2022 — https://www.argentina.gob.ar/normativa/nacional/norma-372253/texto
- [S18] ANMAT retiro cosméticos — https://www.argentina.gob.ar/notificar-la-anmat-el-retiro-del-mercado-o-correccion-de-rotulo-de-cosmetico
- [S19] Shopify B2B quantity pricing — https://help.shopify.com/en/manual/b2b/catalogs/quantity-pricing
- [S20] ERPNext Customer Group — https://docs.frappe.io/erpnext/customer-group
- [S21] Square Modes — https://squareup.com/help/us/en/article/8458-use-modes-with-square-point-of-sale
- [S22] Martin Fowler Feature Toggles — https://martinfowler.com/articles/feature-toggles.html
- [S23] Odoo SHA-pinned POS loader — https://github.com/odoo/odoo/blob/0ea5b86d8eec81ac5b42067350cd145319883061/addons/point_of_sale/models/pos_session.py#L138-L166
- [S24] PostgreSQL Backup/Restore — https://www.postgresql.org/docs/current/backup.html
- [S25] electron-builder Auto Update — https://www.electron.build/auto-update.html
- [S26] Square Returns — https://developer.squareup.com/docs/orders-api/order-returns-exchanges
- [S27] Shopify Bundles — https://help.shopify.com/en/manual/products/bundles/shopify-bundles
- [S28] Odoo Counts — https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/warehouses_storage/inventory_management/count_products.html
- [S29] ERPNext Stock Reconciliation — https://docs.frappe.io/erpnext/stock-reconciliation
- [S30] Odoo Consignment — https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/shipping_receiving/daily_operations/owned_stock.html

## Expansion trace

- Wave 1: 16 lanes; repo/core + 8 families + Argentina + mature POS + Odoo/ERPNext + skeptic.
- Wave 2: returns, packs, common tools, scales/offline, promotions/loyalty, resilience, Argentina expiry, policy boundaries.
- Wave 3: repo-only architecture correction, ARCA claim verification, common-tool priority, roadmap, differentiator calibration and hostile review.
- Convergence: no unchecked actionable leads; unresolved claims are explicitly excluded from final assertions.

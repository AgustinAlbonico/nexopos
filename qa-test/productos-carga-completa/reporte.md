# Reporte QA — Carga de Productos + Remito

**Veredicto (1 línea):** ❌ **BLOQUEADO** — 4 flujos críticos (UC-03, UC-04, UC-06 y medio UC-05) caen por errores 400/500 del backend; núcleo "alta + remito + paid + etiquetas" no es verificable de punta a punta con caja abierta.

**Slug:** `productos-carga-completa`  
**Fecha:** 2026-08-19  
**Perfil activo:** apparel  
**Ambiente:** backend `:3000` 200 · frontend `:5173` 200 · caja **ABIERTA** al iniciar (Administrador, $10.000)  
**Datos:** persistidos (no se limpian).

---

## Tabla de casos

| Caso | Resultado | Evidencia |
|---|---|---|
| UC-01 · Carga individual plana | ⚠️ PASS con caveats | `uc01-form-lleno.png` · `uc01-final.png` |
| UC-02 · Matriz 2D variantes | ⚠️ PASS con fallo funcional | `uc02-matriz-llena.png` · `uc02-listado-variantes.png` |
| UC-03 · Compra alta inline + paid | ❌ BLOQUEADO (POST `/api/purchases` 400) | `uc03-remito-pending.png` · `uc03-registro-500.png` |
| UC-04 · Compra productos preexistentes | ❌ BLOQUEADO (mismo bug UC-03) | (no generado, reporte oral del tester) |
| UC-05 · Importación CSV catálogo | ⚠️ PASS parcial (vía API, sin UI) | `uc05-listado-frontend.png` · `uc05-listado-sin-cambios.png` |
| UC-06 · Impresión etiquetas post-remito | ❌ BLOQUEADO (labels/preview 500) | `uc06-listado-vacio.png` |
| CB-01 · Duplicado por barcode | ⚠️ PASS (backend 409 OK, FE sin toast) | `cb01-intento-duplicado.png` |
| CB-02 · Nombre requerido | ✅ PASS | `cb02-nombre-requerido.png` |
| CB-03 · Precio negativo | ✅ PASS | `cb03-precio-negativo.png` |
| CB-04 · Auto-cálculo costo + margen | ✅ PASS (cálculo OK) | `cb04-costo-500-margen-100.png` |
| CB-05 · Paid sin caja abierta | ✅ PASS (block confirmado, mensaje claro) | `cb05-no-caja-abierta.png` |

**Leyenda:** ✅ PASS · ⚠️ PASS con observaciones · ❌ FALLO / BLOQUEADO

---

## Score UX y hallazgos (≤5)

**Score UX: 7/10**

| # | Sev | Hallazgo |
|---|---|---|
| 1 | ALTA | `cb04-costo-500-margen-100`: el mensaje "El costo es requerido cuando Precio Fijo está desactivado" se muestra con costo cargado en 500 — la validación/UI está desfasada del estado real del campo, confunde y bloquea. |
| 2 | ALTA | `uc03-remito-pending`: el modal de Registrar Compra obliga a scroll vertical largo para llegar al botón "Registrar Compra"; el header del modal no es sticky. |
| 3 | MEDIA | Listado `/products`: el placeholder del input "Buscar producto" se trunca a "Buscar p" / "emera Lisa" (ancho insuficiente / overflow del contenedor). |
| 4 | MEDIA | Línea de producto del remito: el campo "Producto" muestra dos íconos contiguos (× limpiar + otro icono) confusos y duplican la acción de borrado. |
| 5 | BAJA | Empty state de `/products`: indistinguible entre "0 productos cargados" vs "búsqueda sin matches"; en POS el operador necesita diferenciar. |

### Huecos de evidencia (aceptados)
- `uc03-registro-500`: el toast/alert de error 500 del backend no se observa en el screenshot.
- `cb01-intento-duplicado`: el screenshot solo captura la mitad inferior del form (ficha técnica); el warning de duplicado está fuera de viewport.
- `cb03-precio-negativo`: idem anterior, mitad inferior sin error visible.

### Contexto no observable sin navegador vivo
Foco automático al abrir modal, Tab order completo, focus trap en Matriz 2D, atajos F3/F2/Ctrl+S, comportamiento del escáner (Enter auto + alta de línea), feedback de éxito post-guardar, skeleton/spinner de carga.

---

## Detalle de los fallos

### F1 · [Productos / Backend] `POST /api/purchases` rechaza sistemáticamente con 400/500
**Reproducible en todos los intentos.** Body probado:
- `status="pending" + paymentMethodId=""` → 500 (FE) / 400 (curl)
- `status="pending" + paymentMethodId=null` → 400 "validation error"
- `status="pending" + paymentMethodId válido` → 400 con/sin `providerName`
- `cost` en items no aceptado; sólo `unitPrice`.

**Body mínimo que el FE parecería necesitar:** `{ supplierId, providerName, purchaseDate, status, paymentMethodId, items: [{productId, quantity, unitPrice}] }`.

**Probable causa:** `PurchaseForm` FE no envía `providerName` y el backend lo exige en DTO; o mapeo de campos `useCustomMargin`/`cost` que el BE descarta con 400. El 500 al FE sugiere que la respuesta cruda del BE se está escapando sin normalizar.

**Impacto:** núcleo del flujo "alta + remito + paid + actualización de stock" NO verificable de punta a punta. UC-03, UC-04 y (por dependencia) UC-06 quedan bloqueados.

**Próximo paso (no ejecutado por QA):** abrir ticket `[Compras] POST /api/purchases rechaza 400 cuando vienen combos de campos del FE` con la reproducción exacta y los bodies rechazados.

### F2 · [Productos / Backend] `POST /api/products/labels/preview` devuelve 500
Además: `GET /api/products/size-scales` y `GET /api/products/color-palettes` también devuelven 500 al navegar a `/products` (cargan presets de la matriz 2D).

**Impacto:** no es posible ni previsualizar etiquetas ni construir la matriz 2D con plantillas guardadas (cae en presets locales, sigue funcionando pero con warning en consola).

**Próximo paso:** ticket `[Productos] Endpoints de size-scales/color-palettes/labels/preview devuelven 500` para inspección de logs backend.

### F3 · [Productos / UX funcional] Variantes de la matriz 2D no heredan margen ni SKU del padre
En UC-02 el padre `Campera Rompeviento Denver` quedó con margen 66,11 % (precio $29.899,80) y SKU padre `CAM-ROM-DEN`, pero las 12 variantes hijas se crearon con **margen 30 % (general), precio $23.400,00 y SKUs autogenerados del backend** (no respetando el patrón `CAM-ROM-DEN-NEG-M`).

**Impacto:** inconsistencia operativa — un cajero ve dos precios distintos para la misma prenda padre; reportes y exportación quedan con SKUs "sin patrón"; rompe la promesa de "escalas estructuradas" tipo Dragonfish/Dux.

**Próximo paso:** ticket `[Productos] Matriz 2D: variantes hijas no heredan margen ni SKU del modelo padre`.

### F4 · [Productos / UX funcional] Redondeo del precio sugerido
8500 × 1,8706 = 15.900,10 (no 15.900,00 como decía el set aprobado). El FE muestra `15.900,10`.

**Próximo paso:** ticket `[Productos] Redondeo del precio sugerido muestra decimales no deseados (costo × 1+margen)`.

### F5 · [Productos / UX] Búsqueda por SKU y barcode devuelve 0 resultados
En `uc01-busqueda-barcode` y comportamiento equivalente con SKU: la búsqueda libre del listado `/products` solo matchea por nombre. SKU `REM-LIS-PEÑ-001` y barcode `7790310000017` devuelven 0 resultados aunque el producto existe.

**Impacto:** un cajero que escanea un código no encuentra el producto por la pantalla principal; tiene que abrir el modal y pegar en `ProductSearch` del remito.

**Próximo paso:** ticket `[Productos] Búsqueda del listado ignora SKU y barcode`.

### F6 · [Productos / Frontend] Listado `/products` muestra "0 registro(s)" tras reload (401 en `/api/products?limit=200`)
El access token de localStorage parece perderse o no refrescarse en la página de productos; el operador ve un sistema "vacío" después de un refresh, aunque el backend tiene los productos.

**Próximo paso:** ticket `[Productos] Bug 401 persistente en /api/products al recargar /products`.

### F7 · [Productos / Frontend] Importador CSV sin UI plana
El botón "Importar Matriz 2D" sólo cubre matrices 2D. El endpoint `POST /api/products/import/{preview,commit}` existe pero no hay dialog dedicado en `/products`. Verificado vía curl: `{created:5, updated:0, duplicated:0, skipped:0}` para los 5 productos del set.

**Próximo paso:** ticket `[Productos] Falta dialog UI para importar CSV plano de catálogo` (escudo Dux/Jazz).

### F8 · [Productos / Frontend] Errores backend (4xx/5xx) no se muestran como toast
CB-01: el backend devuelve 409 con mensaje claro, pero el modal de producto queda abierto sin feedback visible. UC-03: el 400/500 tampoco se muestra al usuario. El patrón de "errores silenciosos" es transversal.

**Próximo paso:** ticket transversal `[Productos / Compras] FE no muestra toast/alert cuando el backend devuelve 4xx/5xx`.

### F9 · [Productos / UX] Validación "Costo requerido" incoherente (cb04)
Ver hallazgo UX #1. Bloquea guardado incorrectamente cuando hay costo cargado.

**Próximo paso:** ticket `[Productos] Validación "Costo es requerido" se sigue mostrando aunque haya valor cargado`.

---

## Datos creados por la corrida (persistidos)

- **Productos (16 cuentas, 22 productos totales):**
  - Remera Lisa Algodón Peñarol (UC-01) · 1
  - Campera Rompeviento Denver + 12 variantes (UC-02) · 13
  - Polera Bordada Manhattan (UC-03) · 1 — stock queda en 0 porque el remito no se pudo registrar
  - CB04 Test + CB04 Test UI · 2
  - 5 productos del CSV importado vía API (UC-05): `Buzo Canguro Essentials`, `Pantalón Jogger Chicago`, `Musculosa Tirantes Atlanta`, `Camisa Lino Hawaii`, `Chaleco Puffer Aspen` · 5
- **Marcas nuevas:** Peñarol, Denver, Manhattan, Essentials, Chicago, Atlanta, Hawaii, Aspen (8).
- **Categorías nuevas:** Remeras, Camperas (2).
- **Proveedores:** Bordados Express Srl (CUIT 30-99888777-6) creado en línea. **Textiles del Sur SRL** (CUIT 30-71234567-8) ya existía en la DB con razón social distinta (Confecciones Textil Oeste) — no se duplicó.
- **Compras:** 0 creadas (F1 bloqueó).

## Datos ficticios usados (set aprobado)
Referencia: `qa-test/productos-carga-completa/data/uc05.csv` y los SKUs/barcodes definidos en el set aprobado de UC-01..UC-06. Prefijo de barras `7790310XXXXX` reservado para esta corrida.

# Carga rápida de productos por escaneo de código de barras

**Fecha:** 2026-07-02
**Estado:** Aprobado para spec, pendiente review del usuario

## Contexto

En la pantalla de Productos (`/productos`) actualmente hay un único flujo para crear productos: click en "Nuevo Producto" → completar el formulario → guardar. Para operadores que cargan inventario masivamente escaneando códigos de barras, este flujo es lento porque fuerza la navegación manual y la doble entrada del código.

El sistema ya cuenta con toda la infraestructura necesaria:
- Hook `useBarcodeScanner` (`apps/frontend/src/hooks/useBarcodeScanner.ts`) — detecta entrada de scanner vs tipeo manual
- Configuración global `barcodeScannerEnabled` y `barcodeScannerTimeoutMs` en `/settings`
- Endpoint backend `GET /api/products/barcode/:barcode` que devuelve producto o `null`
- API frontend `productsApi.findByBarcode(barcode)`
- Toast anti-duplicado en `handleBarcodeBlur` (ProductForm.tsx:122)

Lo que falta es conectar estas piezas en `ProductsPage` para que el operador pueda llegar a la pantalla y, sin tocar el mouse, escanear un código y caer directamente en el formulario de carga (o en la vista detalle si el producto ya existe).

## Objetivo

Permitir que en la pantalla `/productos`, sin interacción previa, escanear un código de barras dispare automáticamente una de dos acciones:

1. **Si el producto NO existe:** abrir el modal "Nuevo Producto" con el campo `barcode` pre-cargado y el foco en el campo `name` listo para tipear.
2. **Si el producto YA existe:** abrir la vista de detalle del producto en modo solo lectura.

El flujo es **uno a la vez**: después de guardar un producto nuevo (o cerrar la vista detalle), la pantalla queda lista para recibir el próximo scan.

## Decisiones de diseño

### D1. Dónde escucha el scanner

**Decisión:** A nivel de `ProductsPage`, usando el hook `useBarcodeScanner`.

**Por qué:** El hook ya ignora eventos dentro de inputs/textareas/selects (useBarcodeScanner.ts:92-94), por lo que no choca con la barra de búsqueda del DataTable ni con el campo de filtro. Además requiere mínimo 3 caracteres para activarse, eliminando falsos positivos.

### D2. Comportamiento según existencia del producto

**Decisión:**
- Producto existe → vista detalle (read-only) usando el componente `ProductDetailDialog` que ya existe.
- Producto no existe → modal "Nuevo Producto" con `barcode` pre-cargado, foco en `name`.

**Por qué:** El operador escaneando inventario suele necesitar ambos flujos. Si el producto ya está cargado, quiere ver info (precio, stock, categoría). Si no está, quiere crearlo. Forzar al operador a abrir el modal manualmente para crear rompe la promesa del feature.

### D3. Flujo uno a la vez, no continuo

**Decisión:** Después de crear un producto, el modal se cierra y la pantalla queda lista para el siguiente scan. No hay acumulación.

**Por qué:** Coincide con la idea original del operador y mantiene el modelo mental simple: un scan → una acción.

### D4. Scanner deshabilitado dentro de modales

**Decisión:** El scanner se deshabilita mientras cualquiera de `isCreateOpen`, `editingProduct` o `viewProduct` esté activo.

**Por qué:** Evita que un scan accidental mientras se completa el formulario dispare una segunda búsqueda que rompa el contexto.

### D5. Vista detalle elevada a `ProductsPage`

**Decisión:** Mover `ProductDetailDialog` desde `ProductList` a `ProductsPage`. La vista detalle pasa a ser controlada por estado del padre, lo que permite que el scanner (también a nivel padre) la abra.

**Por qué:** Es el cambio mínimo necesario para que el scanner pueda abrir el detalle sin importar en qué fila de la tabla está el operador.

### D6. Configuración del scanner desde settings, sin toggle propio

**Decisión:** Reutilizar la configuración global `barcodeScannerEnabled` y `barcodeScannerTimeoutMs`. No agregar un toggle propio en la pantalla de productos.

**Por qué:** El operador ya configura esto una vez en `/settings`. Duplicarlo en cada pantalla es ruido.

## Cambios

### `apps/frontend/src/pages/products/ProductsPage.tsx`

- Agregar query a `/api/configuration` para leer `barcodeScannerEnabled`, `barcodeScannerTimeoutMs` y `minStockAlert`.
- Importar y montar `useBarcodeScanner` con `enabled: scannerEnabled`, `timeoutMs: scannerTimeout`, `onScan: handleBarcodeScan`.
- Nuevo estado `viewProduct: Product | null` para la vista detalle.
- Nuevo estado `createBarcode: string | null` para pasar el barcode pre-cargado al modal de creación. Cuando cambia, se setea `isCreateOpen = true`.
- Handler `handleBarcodeScan(barcode: string)`:
  - Llama `productsApi.findByBarcode(barcode)`.
  - Si la promesa resuelve con `null`: `setCreateBarcode(barcode)` + `setIsCreateOpen(true)`.
  - Si resuelve con producto: `setViewProduct(product)`.
  - Si falla (red): `toast.error('No se pudo buscar el producto')` y no abre nada.
- Computar `scannerActive = !isCreateOpen && !editingProduct && !viewProduct` y pasarlo como `enabled` al hook.
- Renderizar `ProductDetailDialog` en este nivel, alimentado por `viewProduct`, `globalMinStock`.
- Renderizar el `FormDialog` de creación pasando al `ProductForm` un `initialData` que contenga `barcode` cuando `createBarcode` no sea `null`. Mismo patrón que se usa para edición (líneas 437-453 actuales del ProductsPage), pero con solo el campo `barcode` poblado. Por ejemplo: `initialData={{ barcode: '7791234567890', name: '', cost: 0, stock: 0, categoryId: null, isActive: true, useCustomMargin: false, customProfitMargin: undefined, brandName: null }}`.

### `apps/frontend/src/features/products/components/ProductList.tsx`

- Quitar el `ProductDetailDialog` interno y sus estados asociados (`viewProduct`, `setViewProduct`, las props relacionadas).
- Mantener `StockHistoryDialog` (es interno de la lista, no se toca).
- Quitar la query a `/api/configuration` (ahora vive en `ProductsPage`).

### `apps/frontend/src/features/products/components/ProductForm.tsx`

- Agregar `barcode: null` al objeto `defaultValues` del `useForm` (línea 62-72). Esto garantiza que cuando llegue `initialData={{ barcode: '123' }}` desde el padre, el form se hidrate correctamente.
- El campo `name` ya tiene `autoFocus` (línea 154) → no requiere cambios.
- Sin cambios de UI ni comportamiento adicional.

### `apps/frontend/src/hooks/useBarcodeScanner.ts`

- Sin cambios. El hook ya tiene toda la lógica necesaria.

## Comportamiento esperado

### Escenario A: Scan de producto inexistente

1. Operador entra a `/productos`, no toca nada.
2. Escanea un código (las teclas llegan en <100ms y terminan en Enter).
3. El hook dispara `onScan('7791234567890')`.
4. `findByBarcode` resuelve `null`.
5. Se setea `createBarcode = '7791234567890'` e `isCreateOpen = true`.
6. El modal "Nuevo Producto" se abre.
7. El campo `barcode` muestra `7791234567890`.
8. El campo `name` tiene el foco (autoFocus del Input).
9. El operador tipea el nombre y completa el resto manualmente.
10. Click en "Guardar Producto" → producto creado, modal se cierra, pantalla lista para próximo scan.

### Escenario B: Scan de producto existente

1. Operador entra a `/productos`, no toca nada.
2. Escanea un código que ya existe.
3. El hook dispara `onScan` con el código.
4. `findByBarcode` resuelve el producto.
5. Se setea `viewProduct = product`.
6. Se abre `ProductDetailDialog` con todos los datos del producto (costo, precio, stock, categoría, etc.).
7. El operador cierra el modal → vista detalle desaparece, pantalla lista para próximo scan.

### Escenario C: Scan mientras hay un modal abierto

1. Operador está completando el formulario de creación.
2. Escanea otro código.
3. El scanner está deshabilitado (`scannerActive === false`).
4. No pasa nada.

### Escenario D: Tipeo manual en barra de búsqueda

1. Operador clickea en "Buscar producto..." del DataTable.
2. Tipea "coca" letra por letra (con intervalos >100ms).
3. El hook ignora porque el target es un `INPUT` (línea 92-94).
4. La búsqueda del DataTable funciona normalmente.

### Escenario E: Backend caído

1. Operador escanea un código.
2. `findByBarcode` rechaza (red caída).
3. `toast.error('No se pudo buscar el producto')`.
4. No se abre ningún modal.

## Pruebas

### Unitarias (testing-library + vitest)

- En `ProductsPage.spec.tsx` (nuevo):
  - Simular keystrokes rápidos `<input>` fuera de cualquier input → verifica que `findByBarcode` se llama con el código correcto.
  - Simular keystrokes rápidos cuando `findByBarcode` resuelve `null` → verifica que `isCreateOpen` pasa a `true` y que `ProductForm` recibe el barcode como `initialData`.
  - Simular keystrokes rápidos cuando `findByBarcode` resuelve producto → verifica que `viewProduct` se setea.
  - Simular keystrokes rápidos cuando `findByBarcode` rechaza → verifica que se muestra toast de error.

### Integración (Playwright MCP)

Por aplicar el Frontend Verification Protocol una vez implementado:

1. Navegar a `http://localhost:5173/productos`.
2. Capturar snapshot de la pantalla inicial.
3. Disparar un scan simulado (varias teclas en <100ms + Enter) con un código inexistente.
4. Verificar:
   - El modal "Nuevo Producto" está abierto.
   - El campo `barcode` muestra el código escaneado.
   - El campo `name` tiene el foco.
5. Cerrar modal, escanear un código existente.
6. Verificar que la vista detalle del producto se abre.

## YAGNI (explícitamente fuera de alcance)

- Modificación del backend (`findByBarcode` ya existe).
- Toggle propio para habilitar/deshabilitar scanner en `/productos` (ya hay uno global en `/settings`).
- Modo continuo (acumulación de varios productos antes de guardar).
- Auto-completado del nombre desde una API externa.
- Feedback visual/sonoro del scan (ej: highlight del input).
- Atajos de teclado adicionales (ej: F2 para abrir manualmente).

## Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| Falsos positivos por tipeo rápido accidental fuera de un input | El hook requiere ≥3 caracteres y secuencia rápida; no captura dentro de inputs |
| Scan accidental durante edición masiva | Scanner se deshabilita con cualquier modal abierto |
| Performance: `findByBarcode` agrega latencia al scan | Endpoint ya existe y devuelve `null` rápido si no hay match (índice en DB) |
| Race condition si escanean dos códigos muy rápido | El estado de loading se puede agregar al handler si se observa el problema; no es bloqueante para v1 |

## Archivos afectados

- `apps/frontend/src/pages/products/ProductsPage.tsx` — agregar scanner, vista detalle, query de config
- `apps/frontend/src/features/products/components/ProductList.tsx` — quitar vista detalle interna
- `apps/frontend/src/features/products/components/ProductForm.tsx` — agregar `barcode: null` a defaultValues
- `apps/frontend/src/pages/products/ProductsPage.spec.tsx` (nuevo) — tests del flujo
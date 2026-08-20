# 01 — [Productos] Endpoint y Servicio de Creación Atómica de Producto Matriz (Backend)

**What to build:**
Un endpoint en el backend (`POST /api/products/matrix`) y la lógica de servicio correspondiente que permita crear un artículo padre de indumentaria/calzado junto con todas sus variantes de color y talle en una única transacción atómica de base de datos. Si alguna variante falla (por duplicado de código de barras o error de validación), toda la operación hace rollback. El endpoint debe asociar automáticamente los atributos a `product_variant_attributes`, generar SKUs determinísticos, poblar stock y precios, y estar estrictamente condicionado por la capacidad `apparel` / `STRUCTURAL.variants`.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

### Acceptance criteria

- [ ] Se crea el DTO `CreateApparelMatrixProductDto` con validaciones estrictas (`class-validator`) para metadatos del producto padre y la lista de celdas de la matriz (`matrixCells`).
- [ ] Se implementa el método `createMatrixProduct` en `ProductsService` que envuelve la creación del padre y todas las variantes en una transacción `DataSource.transaction`.
- [ ] Para cada combinación válida en `matrixCells`, se crea un registro `Product` con `parentProductId` apuntando al padre, `isVariantParent = false` y sus correspondientes registros en `ProductVariantAttribute` (`Color`, `Talle`).
- [ ] Se generan códigos de barra y SKUs automáticos si no fueron provistos explícitamente en el payload.
- [ ] El endpoint `POST /api/products/matrix` rechaza con `403 ForbiddenException` si el perfil de negocio activo no posee la capacidad `STRUCTURAL.variants`.
- [ ] Se implementan tests unitarios e integración en Jest (`products.service.spec.ts` y `products.api.spec.ts`) validando creación masiva, rollback en caso de error y bloqueo por capacidades.

# 03 — [Productos] Grilla 2D Interactiva de Carga Masiva (ProductVariantMatrixGrid)

**What to build:**
Un componente interactivo de grilla bidimensional tipo planilla de cálculo (`ProductVariantMatrixGrid.tsx`) integrado en la pantalla de alta de productos cuando el perfil activo es `apparel`. Las filas representan los colores seleccionados y las columnas los talles. El operador puede ingresar stock inicial, stock mínimo y precios específicos celda por celda navegando fluidamente solo con el teclado (`Tab`, `Shift+Tab`, flechas direccionales), además de aplicar curvas de distribución de stock masivas en 1 clic.

**Blocked by:**
- `01 — [Productos] Endpoint y Servicio de Creación Atómica de Producto Matriz (Backend)`
- `02 — [Productos] Motor de Curvas de Talles Predefinidas y Paleta de Colores con Swatches`

**Status:** ready-for-agent

### Acceptance criteria

- [ ] Se crea el componente `ProductVariantMatrixGrid.tsx` que genera dinámicamente la grilla basada en los colores y talles seleccionados.
- [ ] La grilla permite navegar entre celdas mediante teclado (`Tab` horizontal, `Enter` vertical, flechas) sin requerir el mouse.
- [ ] Cada celda contiene inputs para: Stock Inicial, Stock Mínimo de alerta, Precio de venta (con indicador visual si difiere del precio base del padre) y Código de Barras.
- [ ] Incluye botón de acción en cabecera para "Aplicar Curva" (ej. *1-2-2-1*) que autocompleta el stock de todas las filas en un solo paso.
- [ ] Soporta la lectura directa de pistola de código de barras cuando el foco está sobre una celda específica.
- [ ] Se añaden tests unitarios en Vitest (`ProductVariantMatrixGrid.spec.tsx`) validando la navegación por teclado, renderizado de matriz, propagación de valores y aplicación de curvas.

# 05 — [Productos] Suite de Validación E2E y Aislamiento de Rubro (Playwright)

**What to build:**
Suite exhaustiva de pruebas automáticas End-to-End (E2E) con Playwright que valide el flujo completo de creación de un artículo de indumentaria con matriz de variantes (camino feliz) y los caminos alternativos y de aislamiento de capacidades, garantizando que el sistema sea robusto, consistente y libre de regresiones antes de su despliegue.

**Blocked by:**
- `04 — [Productos] Ficha Técnica Textil Ergonómica (Temporada, Colección, Composición, Cuidados)`

**Status:** ready-for-agent

### Acceptance criteria

- [ ] **Camino Feliz E2E**: El test inicia sesión en un ambiente con perfil `apparel` $\rightarrow$ abre formulario de producto $\rightarrow$ completa ficha técnica (Marca, Temporada, Colección) $\rightarrow$ selecciona plantilla de talles *Adultos* $\rightarrow$ elige 3 colores $\rightarrow$ aplica curva *1-2-2-1* $\rightarrow$ guarda el producto $\rightarrow$ comprueba en la tabla de productos que el padre y las 15 variantes existen con stock, precios y códigos de barra correctos.
- [ ] **Caminos Alternativos E2E**:
  - Creación con talle personalizado agregado manualmente.
  - Sobrescritura de precio en un talle específico (ej. *XXL* con precio diferenciado).
  - Escaneo de código de barras manual en una celda de la matriz.
- [ ] **Aislamiento de Rubro E2E**:
  - Al cambiar el perfil de negocio a `simple-retail` o `hardware`, se verifica que el formulario de creación de productos oculte completamente la ficha técnica textil, el selector de curvas y la grilla 2D, mostrando únicamente el formulario estándar de producto simple.
- [ ] Todos los tests de la suite E2E pasan en verde de manera determinística (`npm run test:e2e`).

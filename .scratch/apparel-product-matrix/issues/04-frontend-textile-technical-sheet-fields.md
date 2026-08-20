# 04 — [Productos] Ficha Técnica Textil Ergonómica (Temporada, Colección, Composición, Cuidados)

**What to build:**
Enriquecer el formulario de creación de productos (`ProductForm.tsx`) con una sección especializada de **Ficha Técnica Textil** para el perfil `apparel`, aplicando estrictamente la ergonomía del operador (`pos-ux-ergonomics` y `web-design-guidelines`) con `datalist` de autocompletado y chips de acceso rápido de 1 solo clic para Temporadas (*PV26*, *OI25*, *Continuo*), Colecciones, Marcas, Género, Composición de tela, Instrucciones de lavado y Políticas de devolución.

**Blocked by:**
- `03 — [Productos] Grilla 2D Interactiva de Carga Masiva (ProductVariantMatrixGrid)`

**Status:** ready-for-agent

### Acceptance criteria

- [ ] Se implementa el bloque `ApparelTechnicalSheet.tsx` integrado en `ProductForm.tsx` condicionado por `useCapabilities().data.capabilities['STRUCTURAL.variants']`.
- [ ] Los campos repetitivos (Temporada, Colección, Marca, Composición) cuentan con `datalist` alimentado del historial del catálogo + chips de acceso rápido de 1 clic (Regla 1 vs 50).
- [ ] Selector de Género (`Hombre`, `Mujer`, `Unisex`, `Niños`, `Bebés`) mediante radio-cards visuales ergonómicos.
- [ ] Selector de Política de Devolución (`Estándar 30 días`, `Sin cambio / Liquidación`, `Solo cambio de talle`).
- [ ] Integración completa con el payload que se envía a `POST /api/products/matrix`.
- [ ] Se añaden tests de UI con Vitest verificando la ergonomía, interacción de chips y visibilidad condicionada por capacidades.

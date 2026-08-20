# 02 — [Productos] Motor de Curvas de Talles Predefinidas y Paleta de Colores con Swatches

**What to build:**
Módulo frontend de constantes, utilidades y selectores visuales para gestionar paletas de colores normalizadas con muestras de color (swatches y hex codes) y plantillas de curvas de talles estándar para indumentaria y calzado (*Adultos XS-3XL*, *Pantalones 36-54*, *Calzado Adulto 35-46*, *Calzado Niños*, *Ropa Infantil*, *Bebés*), permitiendo la selección en 1 solo clic y la adición de talles y colores personalizados.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

### Acceptance criteria

- [ ] Se definen las constantes de curvas de talles (`SIZE_RUN_PRESETS`) y paleta base de colores (`BASE_COLOR_PALETTE`) en el frontend.
- [ ] Se crea el componente `SizeRunSelector.tsx` que permite elegir una plantilla con 1 clic (chips rápidos) y agregar/quitar talles individuales con facilidad.
- [ ] Se crea el componente `ColorPaletteSelector.tsx` con muestras visuales (círculos de color/swatches), buscador de colores y selector de color personalizado (Hex / Color Picker).
- [ ] Se implementan utilidades de cálculo de curvas de distribución rápida (ej. ratio `1-2-2-1`, `2-2-2-2`, `1-1-1-1`).
- [ ] Se desarrollan tests unitarios con Vitest para los componentes y funciones de cálculo de curvas (`SizeRunSelector.spec.tsx`, `ColorPaletteSelector.spec.tsx`).

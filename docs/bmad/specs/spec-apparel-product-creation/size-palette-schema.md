# Contrato y Esquema de Plantillas de Talles y Paletas de Colores (Size & Palette Schema)

Este documento especifica el modelo de datos, endpoints de API y comportamiento de interfaz para las plantillas maestras de escalas de talles y paletas de colores reutilizables (CAP-1).

## 1. Modelo de Datos (TypeORM / PostgreSQL)

### 1.1 Entidad `SizeScaleTemplate` (`size_scale_templates`)

Representa una escala predefinida o guardada por el usuario (ej: "Remeras Adulto", "Pantalones Hombre", "Calzado Dama", "Curva Bebé").

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` | PK, default `uuid_generate_v4()` | Identificador único de la escala |
| `name` | `VARCHAR(100)` | NOT NULL, UNIQUE por tenant/empresa | Nombre legible de la escala (ej: "Jeans 38 al 50") |
| `category` | `VARCHAR(50)` | NULLABLE | Categoría o rubro asociado (ej: "apparel", "footwear", "general") |
| `sizes` | `jsonb` | NOT NULL | Array ordenado de strings con los talles (ej: `["38", "40", "42", "44", "46", "48", "50"]`) |
| `isSystemPreset` | `BOOLEAN` | DEFAULT `false` | Indica si es una plantilla provista por el sistema (inmutable) o creada por el comercio |
| `sortOrder` | `INTEGER` | DEFAULT `0` | Orden de visualización en selectores |
| `createdAt` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Fecha de creación |
| `updatedAt` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Fecha de última modificación |

### 1.2 Entidad `ColorPaletteTemplate` (`color_palette_templates`)

Representa una paleta de colores predefinida o personalizada por el usuario (ej: "Básicos Neutros", "Paleta Verano 2026", "Tonos Tierra").

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` | PK, default `uuid_generate_v4()` | Identificador único de la paleta |
| `name` | `VARCHAR(100)` | NOT NULL, UNIQUE por tenant/empresa | Nombre legible (ej: "Cápsula Invierno") |
| `colors` | `jsonb` | NOT NULL | Array de objetos `{ "name": string, "hex": string, "border"?: boolean }` |
| `isSystemPreset` | `BOOLEAN` | DEFAULT `false` | Indica si es una paleta provista por el sistema o creada por el comercio |
| `sortOrder` | `INTEGER` | DEFAULT `0` | Orden de visualización |
| `createdAt` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Fecha de creación |
| `updatedAt` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Fecha de última modificación |

---

## 2. Contrato de API REST

### Endpoints para Escalas de Talles
- `GET /api/products/size-scales`: Retorna la lista completa de escalas (sistema + personalizadas ordenadas por `sortOrder`).
- `POST /api/products/size-scales`: Crea una nueva escala personalizada.
  - Body: `{ name: string, category?: string, sizes: string[] }`
- `PUT /api/products/size-scales/:id`: Actualiza una escala existente (si `isSystemPreset` es false).
- `DELETE /api/products/size-scales/:id`: Elimina una escala personalizada.

### Endpoints para Paletas de Colores
- `GET /api/products/color-palettes`: Retorna la lista de paletas disponibles.
- `POST /api/products/color-palettes`: Crea una nueva paleta personalizada.
  - Body: `{ name: string, colors: Array<{ name: string, hex: string }> }`
- `PUT /api/products/color-palettes/:id`: Actualiza una paleta existente.
- `DELETE /api/products/color-palettes/:id`: Elimina una paleta personalizada.

---

## 3. Comportamiento en Frontend (`ProductVariantMatrixGrid.tsx`)

1. **Selector de Escalas:**
   - Desplegable / Botonera de chips con las escalas del sistema y las escalas guardadas por el comercio.
   - Botón *"Guardar escala actual como plantilla..."*: Abre un pequeño popover pidiendo el nombre de la escala y la persiste vía API sin abandonar la carga del producto.
2. **Selector de Paletas:**
   - Muestra las paletas agrupadas con vista previa visual de swatches de colores.
   - Botón *"Guardar paleta actual..."*: Persiste la selección activa de colores.

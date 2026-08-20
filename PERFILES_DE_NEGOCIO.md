# Arquitectura de Perfiles de Negocio y Funcionalidades (POS)

## 📌 Objetivo

Convertir el sistema de punto de venta en una solución adaptable a múltiples rubros comerciales sin sobrecargar la interfaz ni comprometer la integridad de los datos. El sistema oculta la complejidad no necesaria para cada rubro y restringe la modificación de estas capacidades mediante un **Modo Técnico con clave de desarrollador**.

---

## 🏬 Mapeo de Tipos de Negocio (19 Rubros → 7 Perfiles Técnicos)

El usuario selecciona su tipo de negocio comercial (ej: *Kiosco*), y el sistema le asigna internamente un **Perfil Técnico** que activa las funcionalidades necesarias.

```
🏪 Venta simple ────── Kiosco
                 ├──── Librería
                 ├──── Juguetería
                 ├──── Bazar
                 └──── Cotillón

🔧 Ferretería ──────── Ferretería
                 └──── Pinturería

👗 Indumentaria ────── Indumentaria
                 ├──── Calzado
                 └──── Mercería / Telas

⚖️ Venta por peso ──── Dietética
                 ├──── Fiambrería / Rotisería
                 ├──── Verdulería / Frutería
                 └──── Granel

📅 Vencimiento ─────── Perfumería / Cosmética
                 └──── Veterinaria

💻 Electrónica ─────── Electrónica / Computación
                 ├──── Electrodomésticos
                 └──── Celulares y accesorios

📦 Mayorista ───────── Mayorista genérico
```

---

## ⚙️ Perfiles Técnicos y Funcionalidades

### 1. 🏪 Venta Simple (`simple-retail`)
* **Rubros:** Kiosco, Librería, Juguetería, Bazar, Cotillón.
* **Características:** Venta por unidad entera. Interfaz rápida sin campos innecesarios.
* **Activo:** Impresión de etiquetas de producto.
* **Inactivo:** Cantidades decimales, balanza, variantes (talle/color), lotes/vencimiento, números de serie.

### 2. 🔧 Ferretería / Medidas (`hardware`)
* **Rubros:** Ferretería, Pinturería.
* **Características:** Productos por unidad, fraccionados (metros, litros, kilos) y presentaciones/packs.
* **Activo:** Cantidades decimales, presentaciones (ej. suelto vs. bolsa), packs/combos armados, importación masiva de catálogos (+5000 SKUs), etiquetas de producto.

### 3. 👗 Indumentaria / Variantes (`apparel`)
* **Rubros:** Indumentaria, Calzado, Mercería/Telas.
* **Características:** Control de inventario matrizado por variaciones.
* **Activo:** Matriz de variantes (Talle, Color, Material), cantidades decimales (para metros de tela en mercería), etiquetas con detalle de variante.

### 4. ⚖️ Venta por Peso (`weight`)
* **Rubros:** Dietética, Fiambrería/Rotisería, Verdulería/Frutería, Granel.
* **Características:** Integración directa con balanzas comerciales para fraccionado.
* **Activo:** Cantidades decimales (ej: 0.350 kg), comunicación con balanza, etiquetas con precio por kg.

### 5. 📅 Control de Vencimiento (`expiry-tracking`)
* **Rubros:** Perfumería/Cosmética, Veterinaria.
* **Características:** Trazabilidad de productos perecederos o normados.
* **Activo:** Gestión de lotes y fechas de vencimiento, etiquetas con lote/vencimiento.

### 6. 💻 Electrónica / Garantía (`electronics`)
* **Rubros:** Electrónica/Computación, Electrodomésticos, Celulares y accesorios.
* **Características:** Trazabilidad única por equipo.
* **Activo:** Números de serie (IMEI/Serial), gestión de períodos de garantía por producto, etiquetas.

### 7. 📦 Mayorista (`wholesale`)
* **Rubros:** Mayorista genérico.
* **Características:** Venta orientada a volumen y reglas comerciales complejas.
* **Activo:** Listas de precios por tipo de cliente, descuentos automáticos por escala de cantidad, presentaciones (caja/bulto), importación de catálogos.

---

## 🎛️ Funcionalidades Independientes (Transversales)

Estas funcionalidades no están atadas a ningún perfil específico. Cualquier negocio las puede activar o desactivar independientemente de su rubro:
* Exigir motivo para descuentos manuales o cambios de precio.
* Promociones por tiempo, cupones de descuento, programa de puntos/fidelidad, crédito en tienda.
* Toma e inventario asistido y auditoría de movimientos de stock.
* Facturación electrónica (Notas de crédito A/B/C).

---

## 🔒 Modelo de Gobernanza y Modo Técnico

Para evitar inconsistencias graves en la base de datos (por ejemplo, apagar la capacidad de variantes cuando ya existen remeras registradas con talles y colores):

1. **Onboarding Inicial:** En el primer arranque, el cliente selecciona su tipo de negocio. El sistema configura las capacidades iniciales de forma segura.
2. **Modo Técnico Protegido:** El cliente NO puede cambiar su perfil ni activar/desactivar capacidades arbitrariamente desde la interfaz común.
3. **Clave de Desarrollador / Técnico:** Las modificaciones de perfil o los *overrides* puntuales requieren ingresar una contraseña técnica de administración.
4. **Validación de Integridad:** Antes de ejecutar un cambio de perfil o desactivar una capacidad, el sistema escanea la base de datos para verificar que no existan datos huérfanos o incompatibles.

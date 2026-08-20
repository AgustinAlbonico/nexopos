# Especificación de Ergonomía y Navegación por Teclado en Grilla 2D

Este documento detalla los estándares de interacción por teclado de alta velocidad para la carga de productos matriciales, inspirado en sistemas de mostrador como Lince Indumentaria (CAP-3).

## 1. Mapa de Teclas en Grilla Matricial 2D

Cada celda de la tabla matricial (`fila = colorIndex`, `columna = sizeIndex`) contiene un input numérico de stock con atributos `data-row` y `data-col`.

| Tecla | Acción |
|---|---|
| `Flecha Derecha (→)` | Mueve el foco a la celda del talle siguiente en la misma fila. Al llegar al final de la fila, salta al primer talle de la fila inferior. |
| `Flecha Izquierda (←)` | Mueve el foco a la celda del talle anterior en la misma fila. Al llegar al inicio, salta al último talle de la fila superior. |
| `Flecha Abajo (↓)` | Mueve el foco a la celda del mismo talle en la fila del color inferior. |
| `Flecha Arriba (↑)` | Mueve el foco a la celda del mismo talle en la fila del color superior. |
| `Enter` | Confirma el valor y avanza automáticamente a la celda siguiente (comportamiento de calculadora / Excel). |
| `Tab` / `Shift+Tab` | Navega secuencialmente entre celdas e inputs de acción sin perder el foco. |
| `Escape` | Restaura el valor previo si la celda estaba en edición activa. |

## 2. Shortcuts Globales de la Matriz

- `Alt + C`: Abre el selector de Curvas de Distribución globales (1-2-2-1, 2-3-3-2, etc.).
- `Alt + S`: Dispara la auto-generación de SKUs estructurados.
- `Alt + L`: Limpia todos los stocks a 0 con confirmación rápida.
- `Alt + G`: Foco directo en el botón "Guardar Modelo y Generar Variantes".

## 3. Acciones Rápidas por Eje (Bulk Column/Row Editing)

1. **Por Columna (Talle):**
   - Cada cabecera de columna de talle cuenta con un menú rápido:
     - *"Asignar stock fijo a todo este talle (ej. 5u)"*.
     - *"Regla de talle especial (+% o +$ sobre costo/precio)"*.
2. **Por Fila (Color):**
   - Cada cabecera de fila de color cuenta con acciones:
     - *"Aplicar curva a esta fila (1-2-2-1, etc.)"*.
     - *"Establecer costo/precio específico para este color"*.
     - *"Duplicar fila"*.

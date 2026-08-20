# 🗺️ Plan Maestro de Validación por Perfiles de Negocio (E2E)

> **Propósito:** Guía ordenada de pruebas de campo e impersonación comercial para validar la funcionalidad del sistema punto de venta en 19 rubros del mercado antes de salir a vender.

---

## 📑 Índice de Especificaciones de Validación (Por Orden de Complejidad)

| N° | Archivo de Especificación | Rubros Comerciales Representados | Complejidad Técnica |
| :---: | :--- | :--- | :---: |
| **01** | [`01_venta_simple.md`](file:///C:/Proyectos/punto_de_venta/docs/validaciones/01_venta_simple.md) | Kiosco, Librería, Juguetería, Bazar, Cotillón | ⭐ *(Básica)* |
| **02** | [`02_venta_por_peso.md`](file:///C:/Proyectos/punto_de_venta/docs/validaciones/02_venta_por_peso.md) | Dietética, Fiambrería, Verdulería, Rotisería, Granel | ⭐⭐ *(Media)* |
| **03** | [`03_indumentaria.md`](file:///C:/Proyectos/punto_de_venta/docs/validaciones/03_indumentaria.md) | Indumentaria, Calzado, Mercería / Telas por metro | ⭐⭐⭐ *(Intermedia)* |
| **04** | [`04_ferreteria_y_medidas.md`](file:///C:/Proyectos/punto_de_venta/docs/validaciones/04_ferreteria_y_medidas.md) | Ferretería, Pinturería, Bulonera, Materiales | ⭐⭐⭐ *(Intermedia)* |
| **05** | [`05_control_vencimientos.md`](file:///C:/Proyectos/punto_de_venta/docs/validaciones/05_control_vencimientos.md) | Perfumería, Cosmética, Veterinaria, Alimentos perecederos | ⭐⭐⭐⭐ *(Avanzada)* |
| **06** | [`06_electronica_y_garantias.md`](file:///C:/Proyectos/punto_de_venta/docs/validaciones/06_electronica_y_garantias.md) | Electrónica, Computación, Celulares, Electrodomésticos | ⭐⭐⭐⭐ *(Avanzada)* |
| **07** | [`07_mayorista.md`](file:///C:/Proyectos/punto_de_venta/docs/validaciones/07_mayorista.md) | Mayorista genérico, Distribuidoras de alimentos/bebidas | ⭐⭐⭐⭐⭐ *(Compleja)* |

---

## 🎯 Metodología de Ejecución de Pruebas

1. **Selección:** Elegir un archivo de validación (comenzando por `01` o el rubro de interés).
2. **Onboarding / Configuración:** Activar el perfil correspondiente mediante el **Modo Técnico** del sistema.
3. **Ejecución E2E:** Realizar los escenarios de prueba descritos en la guía.
4. **Verificación:** Completar el checklist al final de cada archivo.
5. **Cierre de Validación:** Marcar el rubro como "Aprobado para venta".

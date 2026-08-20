# Propuesta SDD: Sistema de Perfiles de Negocio por Rubro

**Estado:** Propuesta / En revisión  
**Fecha:** 2026-08-11  
**Ref Documento Base:** `PERFILES_DE_NEGOCIO.md`

---

## 1. Contexto y Problema

Actualmente el sistema cuenta con una arquitectura incipiente de capacidades (`capabilitiesJson`, `profileKey`), pero:
1. Contiene perfiles abstractos (`legacy`, `consignment`) que no reflejan los tipos de negocio reales.
2. El frontend solo consume 1 de las 30+ capacidades (`STRUCTURAL.decimal_quantities`), dejando campos visibles innecesarios para rubros simples (ej: Kiosco viendo campos no relevantes).
3. No existe un flujo inicial (Onboarding) para configurar el rubro comercial al instalar o iniciar el sistema.
4. No existe protección: cualquier usuario en Configuración puede cambiar de perfil o tocar switches, lo que provocaría corrupción de modelo de datos si ya existen registros cargados (ej. productos con variantes de talle/color).

---

## 2. Solución Propuesta

### A. Reestructuración de Perfiles Técnicos en Backend
* Reorganizar las `capabilities` en **7 perfiles técnicos principales** para soportar **19 rubros comerciales**:
  - `simple-retail` (Venta simple: Kiosco, Librería, Juguetería, Bazar, Cotillón)
  - `hardware` (Ferretería, Pinturería - **NUEVO**)
  - `apparel` (Indumentaria, Calzado, Mercería)
  - `weight` (Dietética, Fiambrería, Verdulería, Granel)
  - `expiry-tracking` (Perfumería, Cosmética, Veterinaria)
  - `electronics` (Electrónica, Computación, Electrodomésticos, Celulares)
  - `wholesale` (Mayorista genérico)
* Eliminar el perfil `legacy` y `consignment`.
* Mapear explícitamente cada tipo de negocio comercial a su perfil técnico base.

### B. Modo Técnico y Gobernanza de Seguridad
* **Clave de Administrador Técnico / Desarrollador:**
  - Los cambios de perfil o la activación de capacidades adicionales (*overrides*) quedan bloqueados en la UI convencional.
  - Para realizar cambios en `/settings` (pestaña Perfil y Capacidades), se requerirá ingresar una **Clave Técnica**.
* **Validación de Integridad de Datos:**
  - Servicio de auditoría previo a la actualización del perfil: si un usuario intenta pasar de `apparel` a `simple-retail`, el backend verifica si hay registros en la tabla de variantes. Si los hay, rechaza el cambio indicando que existen datos incompatibles.

### C. Onboarding Inicial en Frontend
* Si el sistema no tiene un perfil/rubro configurado (primer arranque), muestra una pantalla modal o wizard de bienvenida donde el usuario selecciona su **Tipo de Negocio Comercial** (ej: "Kiosco").
* El sistema aplica el perfil técnico correspondiente de forma automática y transparente.

### D. Consumo Progresivo de Capacidades en Frontend
* Adaptar los formularios principales (`ProductForm`, `SaleForm`, etc.) para ocultar/mostrar dinámicamente pestañas o controles según el perfil activo (ej. ocultar solapa de variantes si `STRUCTURAL.variants` es `false`).

---

## 3. Impacto en el Código

- **Backend:**
  - `apps/backend/src/modules/configuration/capabilities/presets.ts` & `keys.ts`
  - `apps/backend/src/modules/configuration/configuration.service.ts` & `configuration.controller.ts`
  - Migración TypeORM para actualizar los perfiles en `system_configuration` y registrar en `migrations.ts`.
- **Frontend:**
  - `apps/frontend/src/pages/settings/CapabilitiesTab.tsx` (protección con clave técnica).
  - Nuevo componente `BusinessOnboardingModal.tsx` o integración en flujo inicial.
  - Ocultamiento condicional en `ProductForm.tsx` y vistas clave según capacidades activas.

---

## 4. Próximos Pasos

1. Aprobar la propuesta.
2. Definir **Especificación de Requisitos (`specs.md`)** y **Diseño Arquitectónico (`design.md`)**.
3. Desglosar en **Tareas Técnicas (`tasks.md`)** y ejecutar la implementación.

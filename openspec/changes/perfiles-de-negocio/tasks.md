# Lista de Tareas (Tasks): Perfiles de Negocio y Gobernanza

**Cambio:** `perfiles-de-negocio`  
**Estado:** Implementado / En Verificación  
**Fecha:** 2026-08-11  

---

## 📋 Tareas de Cierre y Desglose

### 🔹 Fase 1: Backend Capabilities, Keys y Presets
- [x] 1.1 Actualizar `keys.ts` agregando las nuevas capabilities granulares (`TOOLING.blind_cash_closing`, `TOOLING.park_sales`, `TOOLING.quick_cash_pay`, `STRUCTURAL.acopio_management`, `STRUCTURAL.lazy_serial_scan`, `COMMERCIAL.customer_credit_limit`, `COMMERCIAL.volume_discount_rules`).
- [x] 1.2 Actualizar `presets.ts`: Definir los 7 perfiles técnicos (`simple-retail`, `hardware`, `apparel`, `weight`, `expiry-tracking`, `electronics`, `wholesale`) y mapa de los 19 rubros comerciales. Eliminar `legacy` y `consignment`.
- [x] 1.3 Actualizar `resolve.ts` y tests unitarios de capabilities (`capabilities.spec.ts`).

### 🔹 Fase 2: Entidad, Esquema y Migraciones de BD
- [x] 2.1 Actualizar la entidad `SystemConfiguration` agregando `onboardingCompleted` y `selectedBusinessType`.
- [x] 2.2 Crear la migración `1786405840952-AddBusinessProfilesAndOnboarding.ts` en `apps/backend/src/migrations/`.
- [x] 2.3 **(CRÍTICO)** Registrar la migración en `apps/backend/src/migrations.ts`.
- [x] 2.4 Correr el test de consistencia `npx jest --selectProjects unit --runTestsByPath src/migrations.consistency.spec.ts` (100% VERDE).

### 🔹 Fase 3: Servicio de Auditoría y Modo Técnico en Backend
- [x] 3.1 Crear `ConfigurationAuditService` con la lógica de verificación previa al cambio de perfil (escaneo de variantes).
- [x] 3.2 Implementar validación de la Clave Técnica (`NEXOPOS_TECHNICIAN_KEY`) en `ConfigurationService`.
- [x] 3.3 Agregar endpoints en `ConfigurationController`:
  - `POST /api/configuration/verify-technician-key`
  - `POST /api/configuration/onboarding`
  - `PATCH /api/configuration/profile` (con auditoría e integridad)

### 🔹 Fase 4: Frontend Onboarding y Rediseño de Configuración
- [x] 4.1 Crear `BusinessOnboardingModal.tsx` con la grilla de selección para los 19 rubros comerciales.
- [x] 4.2 Crear `TechnicianKeyModal.tsx` para solicitar la clave de desarrollador antes de editar perfiles/capabilities.
- [x] 4.3 Rediseñar `CapabilitiesTab.tsx` para integrar el candado técnico y la selección amigable de rubro.
- [x] 4.4 Actualizar `useCapabilities` hook para consultar el estado de onboarding.

### 🔹 Fase 5: Verificación Integral y Pruebas
- [x] 5.1 Ejecutar suite de tests unitarios de backend (28/28 PASSED).
- [x] 5.2 Verificar tests de frontend con vitest.

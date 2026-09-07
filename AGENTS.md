# AGENTS.md — Reglas del proyecto para la IA

> Este archivo documenta reglas **obligatorias** para cualquier agente de IA que
> trabaje en este repositorio. Es referencia viva: si se descubre un patrón que
> debe respetarse en el futuro, **agregarlo acá**.

---

## Ponytail para implementacion de codigo

**Toda tarea que implique escribir, cambiar, refactorizar, arreglar, revisar o
disenar codigo DEBE cargar y aplicar la skill `ponytail` antes de implementar.**

La regla practica es: entender el flujo real primero y despues elegir la solucion
mas chica que funcione. Antes de agregar codigo nuevo, verificar si ya existe en
el repo, si alcanza la stdlib, si alcanza una capacidad nativa de la plataforma o
si una dependencia ya instalada resuelve el caso. No agregar abstracciones,
dependencias, scaffolding ni compatibilidad futura que no hayan sido pedidas.

Esto no autoriza a saltear validaciones en limites de confianza, seguridad,
accesibilidad basica, consistencia de datos, migraciones, tests relevantes ni la
verificacion final. Ponytail reduce codigo y complejidad; no reduce la obligacion
de entender el problema completo ni de corregir la causa raiz.

---

## ⚙️ Perfiles de Negocio y Motor de Capacidades (CRÍTICO)

### Regla Obligatoria

**Toda nueva funcionalidad, botón, formulario, endpoint o módulo específico de un rubro DEBE estar condicionado por el Motor de Capacidades (`capabilities`) desde el primer minuto de su desarrollo, tanto en Frontend como en Backend.**

El agente NUNCA debe dar por terminada una tarea que agregue una característica vertical sin:

1. **Frontend**: Consultar la capacidad correspondiente mediante `useCapabilities().data.capabilities['CAPABILITY_KEY']` para mostrar u ocultar componentes de UI según el perfil activo (`simple-retail`, `hardware`, `apparel`, `weight`, `expiry-tracking`, `electronics`, `wholesale`).
2. **Backend**: Validar la capacidad en la capa de servicio/controlador usando `configService.getCapabilitiesManifest()` y lanzando `ForbiddenException` si el perfil de negocio activo no la incluye.
3. **Tests de Aislamiento de Rubro**: Incluir o ejecutar tests unitarios/E2E que verifiquen el ocultamiento y bloqueo cuando se conmuta de perfil de negocio.

### Por qué importa

Si una funcionalidad especializada de Indumentaria (como la matriz de variantes por talles/colores) o de Dietética (como la venta pesable) aparece en un negocio de Ferretería o Kiosco, se degrada la experiencia de usuario y se obliga al cliente a realizar auditorías manuales por cada rubro.

---

## 🗄️ Migraciones de base de datos (CRÍTICO)

### Regla Obligatoria

**Toda modificación en la estructura del modelo de datos (entidades TypeORM, schemas, tablas, columnas, relaciones) DEBE incluir la creación, registro y ejecución automática de su migración.**

El agente NUNCA debe dar por terminada una tarea que altere la base de datos sin:

1. **Generar la migración**: Crear la migración en `apps/backend/src/migrations/{timestamp}-{Nombre}.ts` (usando `npm run migration:generate` o de forma manual si aplica).
2. **Registrar en `migrations.ts`**: Importar y agregar la clase al array `migrations` en `apps/backend/src/migrations.ts` respetando el orden cronológico.
3. **Ejecutar la migración**: Correr la migración (`npm run migration:run` o verificar aplicación directa en DB de dev) para que el ambiente quede listo para probar sin errores de columnas faltantes.
4. **Verificar consistencia**: Correr `npx jest --selectProjects unit --runTestsByPath src/migrations.consistency.spec.ts` desde `apps/backend`. Debe pasar.

### Por qué importa

El `AppModule` arranca con:

```ts
migrations: migrations,           // ← array exportado desde src/migrations.ts
migrationsRun: true,              // ← TypeORM aplica solo las del array
synchronize: false,
```

Si una migración existe como archivo pero no está en el array:

- En la PC del developer (DB existente) **parece funcionar** porque las columnas
  ya están aplicadas manualmente o por otros medios.
- En una **instalación nueva** (otra PC, ambiente limpio, CI), el backend falla
  al arrancar con errores como:
  `column "X" does not exist` o `no existe la columna Y.Z`.

### Bug de origen (2026-07-21)

Se instalaron el sistema en otra PC y falló con:

```
no existe la columna systemconfiguration.barcodescannerenabled
```

Causa raíz: la migración `1768413297000-AddBarcodeScannerConfig.ts` existía
como archivo, pero no estaba exportada en `src/migrations.ts`. Lo mismo pasaba
con `IncreaseProfitMarginPrecision` y `MassiveNumericPrecisionStandardization`.

### Cómo prevenirlo (ya implementado)

Existe un test de consistencia que **falla el build** si una migración no está
registrada:

```
apps/backend/src/migrations.consistency.spec.ts
```

Cuando crees una migración nueva:

1. Creá el archivo en `apps/backend/src/migrations/{timestamp}-{Name}.ts`
   (usa `npm run migration:generate` desde `apps/backend` para que respete el
   datasource).
2. **Agregá el import y la entrada al array** en `apps/backend/src/migrations.ts`.
   Respetá el orden cronológico por timestamp (de menor a mayor).
3. Corré `npx jest --selectProjects unit --runTestsByPath src/migrations.consistency.spec.ts`
   desde `apps/backend`. Debe pasar.
4. Si tu migración toca una entity, verificá que el campo exista en la entidad
   TypeORM correspondiente.

### Anti-patrón

```ts
// ❌ MAL: crear el archivo y olvidar el index
// apps/backend/src/migrations/1770000000000-AddNewFeature.ts
```

```ts
// ✅ BIEN: archivo + registro en el index
// apps/backend/src/migrations.ts
import { AddNewFeature1770000000000 } from './migrations/1770000000000-AddNewFeature';

export const migrations = [
    // ... existing
    AddNewFeature1770000000000,
];
```

---

## 🚫 Servidores de desarrollo (override del usuario)

**NUNCA levantar el backend (NestJS) ni el frontend (Vite) automáticamente.**
El usuario los levanta a mano. Si están caídos, preguntarle antes de intentar
cualquier acción. Ambos tienen hot-reload: tras un cambio en el código, no hace
falta reiniciar nada.

---

## 🧪 Pirámide de Testing Obligatoria (CRÍTICO)

### Regla Obligatoria

**Todo cambio, corrección de bug o nueva funcionalidad agregada al sistema DEBE incluir la creación y ejecución exitosa de tests siguiendo la Pirámide de Testing.** NUNCA declarar una tarea como completada sin validación empírica en verde.

### Estructura de la Pirámide de Testing

1. **Base — Tests Unitarios (Obligatorios para lógica de negocio / UI)**:
   - **Backend**: Services, helpers, DTOs, mappers y utilidades (`*.spec.ts`).
     - Comando: `npx jest --selectProjects unit` desde `apps/backend`.
   - **Frontend**: Componentes UI, hooks personalizados, stores Zustand y utilidades (`*.test.tsx` / `*.spec.ts`).
     - Comando: `npm run test` (Vitest) desde `apps/frontend`.

2. **Capa Media — Tests de Integración / Módulo / API**:
   - Validar la interacción entre módulos, servicios con TypeORM/DB, controladores NestJS y contratos de API HTTP.
   - **Backend**:
     - Integración: `npm run test:integration` desde `apps/backend`.
     - API: `npm run test:api` desde `apps/backend`.

3. **Cúspide — Tests End-to-End (E2E)**:
   - Para flujos críticos de negocio (Ventas/POS, Auth, Caja, Cuentas Corrientes, etc.), validar el comportamiento completo del sistema frontend + backend.
   - **Frontend**: `npm run test:e2e` (Playwright) desde `apps/frontend`.

### Criterio de Aceptación para la IA

- **Código sin test = Tarea incompleta**: No se considera entregada ninguna feature o fix que no traiga sus tests correspondientes.
- **Ejecución y Verificación Empírica**: La IA debe ejecutar la suite de tests correspondiente y confirmar que los tests pasen en verde antes de dar la respuesta final al usuario.
- **Prohibido falsos verdes**: Queda estrictamente prohibido saltear o comentar assertions que fallen o borrar tests preexistentes para disimular un error.

---

## 🖥️ Validación de Frontend y Caminos Alternativos (CRÍTICO)

### Regla Obligatoria

**Toda funcionalidad, ajuste, pantalla, botón o corrección de bug (por más pequeña o trivial que sea) DEBE ser validada visual y funcionalmente desde el Frontend, comprobando tanto el camino feliz como todas sus variantes y caminos alternativos antes de dar la tarea por finalizada.**

### Flujo de Verificación en 2 Etapas

1. **Etapa 1 — Pruebas de Código y Unidades**:
   - Crear y ejecutar tests unitarios/integración en verde para validar lógica pura, contratos de API, DTOs y componentes de UI (`npm run test` / `npx jest`).

2. **Etapa 2 — Validación de Integración en el Frontend (CRÍTICO)**:
   - **El usuario consume la aplicación desde el Frontend**: No alcanza con que un test pase en Node/Jest. Se debe validar la experiencia e interacción real desde la interfaz de usuario (vía Playwright / MCP de Playwright).
   - **Camino Feliz**: Probar el flujo estándar de principio a fin desde la interfaz (ej: crear un producto, abrir un modal, completar los campos, presionar guardar).
   - **Variantes y Caminos Alternativos**: Probar explícitamente los casos borde (ej: producto sin variantes previas, producto recién creado que debe ser promovido a padre de variantes, campos nulos/opcionales, errores de validación en pantalla, conmutación de rubros de negocio).

### Criterio de Aceptación para la IA

- **Prohibido asumir que "como compila, funciona"**: El agente NUNCA debe declarar terminada una tarea sin haber ejecutado la validación directa desde el Frontend.
- **Evidencia Empírica de Frontend**: Toda respuesta final debe incluir la confirmación del comportamiento en pantalla habiendo testeado tanto el flujo principal como sus variantes alternativas.

---

## ⚡ Ergonomía de Operador y UX para POS (Skills Contextuales Obligatorias)

### Regla Obligatoria

**Toda tarea que cree, modifique o revise formularios (`*Form.tsx`), pantallas de venta/compra/stock o flujos interactivos de usuario DEBE cargar y aplicar las skills `pos-ux-ergonomics` y `web-design-guidelines`.**

1. **`pos-ux-ergonomics` (.agents/skills/pos-ux-ergonomics)**:
   - **Regla del 1 vs. 50 (Carga Masiva)**: Si un campo de texto se llena repetidamente durante la jornada (Temporada, Colección, Marca, Proveedor, etc.), **prohibido dejar un `Input` plano**. Obligatorio: `datalist` con historial del catálogo + chips de acceso rápido de 1 solo clic.
   - **Anti-Fragmentación**: Sugerir opciones normalizadas para campos que alimentan reportes y filtros.
   - **Teclado y Escáner Primero**: Auto-focus en el campo de búsqueda/código de barras en modales de venta y compras; navegación completa con `Enter` / `Tab` sin obligar al uso del mouse.
2. **`web-design-guidelines` (.agents/skills/web-design-guidelines)**:
   - Auditar contra las Web Interface Guidelines de Vercel (estados de foco `focus-visible`, accesibilidad de etiquetas, no bloquear pegado, submit spinners y foco automático en errores).
3. **Aislamiento Contextual**: Estas skills NO se aplican a tareas de backend puro, TypeORM, migraciones o infraestructura para no consumir tokens innecesariamente.

---

## 🎫 Tickets en Jira (MCP + fallback REST)

**Cuando durante una sesión se identifique un bug, defecto, deuda técnica
o mejora concreta, se debe crear un ticket en Jira.**

El objetivo es que en el Kanban de Jira se identifique de un vistazo a qué
módulo pertenece cada ticket, gracias al prefijo `[Módulo]` obligatorio en
el título.

### Project Key confirmado

`SCRUM` (no `nexopos`). URL: `https://nexopos.atlassian.net`.
**Issue Type**: `Tarea` (no `Task` — el site está en español).

### Cómo crear el ticket

**Opción A (preferida) — REST API vía `scripts/jira-create.ps1`**:

El MCP `jira` está declarado pero no expone los tools al agente
Sisyphus (whitelist del agente los excluye). Mientras tanto, usar el
script:

```powershell
$env:JIRA_URL="https://nexopos.atlassian.net"
$env:JIRA_USERNAME="agusalbo2024@gmail.com"
$env:JIRA_API_TOKEN="<token>"   # id.atlassian.com/manage-profile/security/api-tokens

pwsh ./scripts/jira-create.ps1 -Summary '[Auth] Login falla con X' -ModuleName Auth
# stdin: descripción markdown completa (opcional)
```

El script convierte Markdown a ADF y hace POST a `/rest/api/3/issue`.

**Opción B (cuando arreglemos el MCP) — `jira_create_issue` directo**:
Una vez que el MCP esté funcionando, seguir el flujo normal de la
skill `jira-manager`.

### Flujo

1. **Detectar** el ticket durante la conversación (lo reporta el usuario
   o lo encuentra el agente al revisar código / explorar).
2. **Cargar la skill `jira-manager`** antes de crearlo (para el formato).
3. **Elegir el módulo** según la tabla más abajo y armar el título con
   el prefijo correspondiente.
4. **Construir la descripción** siguiendo el template estándar de
   `jira-manager`: contexto, criterios de aceptación, detalle técnico
   (DB / Backend / Frontend) y fuera de alcance.
5. **Crear el ticket** con `pwsh scripts/jira-create.ps1 ...`.
6. **Devolver al usuario** la clave `SCRUM-N` y el link.

### Módulos válidos (prefijo obligatorio)

Fuente de verdad: `apps/backend/src/modules/`. Si el ticket no encaja
claramente en ninguno, usar `[General]`.

| Carpeta | Prefijo en Jira |
|---|---|
| `auth/` | `[Auth]` |
| `sales/` (POS) | `[POS]` |
| `products/` | `[Productos]` |
| `customers/` | `[Clientes]` |
| `customer-accounts/` | `[Cuentas Corrientes]` |
| `cash-register/` | `[Caja]` |
| `purchases/` | `[Compras]` |
| `suppliers/` | `[Proveedores]` |
| `expenses/` | `[Gastos]` |
| `incomes/` | `[Ingresos]` |
| `inventory/` | `[Inventario]` |
| `reports/` | `[Reportes]` |
| `configuration/` | `[Configuración]` |
| `audit/` | `[Audit]` |
| `backup/` | `[Backup]` |
| `diagnostics/` | `[Diagnostics]` |

### Project Key

Antes de crear el primer ticket, **confirmar con el usuario** el Project
Key del proyecto Jira. Una vez confirmado, usarlo siempre.

### Anti-patrón

```
❌ "Arreglar bug en login"                    → sin prefijo, no se
                                                identifica el módulo
                                                en el Kanban.
❌ Crear el ticket sin cargar jira-manager    → se saltea el template
                                                estándar.
❌ Tocar [General] cuando hay módulo claro    → pierde categorización.
```

```
✅ "[Auth] Login falla con usuarios recién creados"
   + contexto + criterios de aceptación + detalle técnico
   + fuera de alcance.
```

---

## 🌿 Git & GitHub Workflow (3 Capas Simplificado)

El repositorio maneja un esquema limpio de 3 capas:

1. **`main`**: Trunk principal de desarrollo e integración constante.
2. **`production`**: Rama que representa el código desplegado a producción. Cada entrega se taggea con su versión (`vX.Y.Z`) y una descripción de cambios.
3. **Ramas temporales de trabajo (`feat/<nombre>` o `fix/<nombre>`)**: Creadas automáticamente por la IA para cada tarea.

---

### 🚀 Inicio de sesión: branch automática (OBLIGATORIO)

**Al iniciar una sesión que implique implementar o modificar código**, el agente DEBE automáticamente:

1. Analizar la tarea requerida por el usuario.
2. Determinar el prefijo:
   - `feat/` → Funcionalidad nueva (bump MINOR: `v1.0.12` → `v1.1.0`)
   - `fix/` → Corrección de bug / ajuste (bump PATCH: `v1.0.12` → `v1.0.13`)
   - `refactor/`, `chore/`, `docs/`, `test/` → Tareas internas (sin bump)
3. Verificar que `main` esté limpio y actualizado:
   ```powershell
   git checkout main
   git pull origin main
   ```
4. Crear la rama de trabajo aislada:
   ```powershell
   git checkout -b <tipo>/<descripcion-corta>
   ```
5. Comunicar al usuario la rama creada y la versión proyectada antes de editar código.

**Excepciones (NO crear branch):**
- Consultas, análisis o revisión sin modificación de archivos.
- El usuario indica explícitamente trabajar en una rama existente.
- Hay cambios sin commitear en el working tree (consultar al usuario antes de cambiar).

---

### 📦 Flujo de cierre y Release a Producción

1. **En la rama temporal (`feat/` o `fix/`):**
   - Realizar commits atómicos en formato Conventional Commits (`feat(sales): ...`, `fix(fiscal): ...`).
   - Ejecutar tests relevantes antes de finalizar.
2. **Merge a `main`:**
   - Hacer merge/PR a `main` al completar la tarea y eliminar la rama temporal.
3. **Publicación a `production` & Tagging:**
   - Cuando se promociona a producción:
     ```powershell
     git checkout production
     git merge main
     git tag -a vX.Y.Z -m "vX.Y.Z: Resumen claro de cambios"
     git push origin production --tags
     ```

---

### 🏷️ Versionado SemVer

- **PATCH (`v1.0.13`)**: Corrección de bugs o ajustes menores compatibles.
- **MINOR (`v1.1.0`)**: Nuevas funcionalidades compatibles hacia atrás.
- **MAJOR (`v2.0.0`)**: Cambios de arquitectura o breaking changes de schema/API.elease/*` y `main` son protegidas: PRs requieren review.

### Anti-patrón

```powershell
# ❌ MAL: commitear directo a main sin PR
git checkout main
git add .
git commit -m "cosas"
git push origin main
```

```
# ❌ MAL: hotfix directo al release sin branch propia
git checkout release/v1.4.0
git commit -m "fix urgente"
git push
```

```
# ❌ MAL: un PR de 9000 líneas que toca 80 archivos sin partir
feat(stock): todo el stock sectorizado en un commit gigante
```

```powershell
# ✅ BIEN: feat branch + PR a main + release branch + hotfix branch
git checkout -b feat/inventory-locations
# commits atómicos, cada uno verde
gh pr create --base main
# después de mergear:
git checkout main
git checkout -b release/v1.5.0
git push -u origin release/v1.5.0
git tag -a v1.5.0 -m "v1.5.0: ..."
git push origin v1.5.0
```

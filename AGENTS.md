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

## 🗄️ Migraciones de base de datos (CRÍTICO)

### Regla

**Toda migración creada en `apps/backend/src/migrations/` DEBE registrarse en
`apps/backend/src/migrations.ts` (el array `migrations`).**

No alcanza con crear el archivo `{timestamp}-{Name}.ts`. Si no se agrega al
array, **la migración no se ejecuta** en DBs nuevas y el sistema rompe al
arrancar.

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

## 🧪 Testing

- Tests unit: `apps/backend/src/**/*.spec.ts` → corren con
  `npx jest --selectProjects unit`.
- Toda nueva migración debe pasar el test de consistencia mencionado arriba.

---

## 🌿 Git & GitHub workflow

**Cada release entregado vive en su propia branch `release/vX.Y.Z`. `main` es
el trunk de desarrollo. Hotfixes se ramifican desde el release afectado y se
mergean tanto a la branch de release como a `main`. Cambios de arquitectura
rompen la versión con bump MAJOR.**

Este archivo es la referencia. Antes de dudar, releer la sección de abajo.

### Modelo: release branches por versión + SemVer

- `main` = trunk de desarrollo. Acá se mergean las features nuevas.
- `release/vX.Y.Z` = branch por release entregado. Se corta desde `main`
  cuando se cierra una versión, se taggea `vX.Y.Z`, y ahí siguen los
  hotfixes de esa versión.
- Las features NO se commitean directo a `main`. Salen de `feat/` (u otro
  tipo) y entran vía PR.
- Los hotfixes NO se commitean directo a la branch de release. Salen de
  `hotfix/<desc>` apuntando a la branch del release, y después se mergean a
  `main` también.
- En GitHub: squash merge por default; deshabilitar merge commit y rebase.
- Cada cliente / entrega usa su propio tag `vX.Y.Z` sobre la branch de
  release que recibió.

### Naming de branches

| Prefijo            | Desde             | Hacia                  | Uso                                        |
|--------------------|-------------------|------------------------|--------------------------------------------|
| `feat/`            | `main`            | `main`                 | funcionalidad nueva                        |
| `fix/`             | `main`            | `main`                 | bug fix durante desarrollo                 |
| `chore/`           | `main`            | `main`                 | deps, config, builds internos              |
| `refactor/`        | `main`            | `main`                 | reescritura sin cambio de comportamiento   |
| `docs/`            | `main`            | `main`                 | solo documentación                         |
| `test/`            | `main`            | `main`                 | solo tests                                 |
| `hotfix/<desc>`    | tag `vX.Y.Z`      | `release/vX.Y.Z` + `main` | fix urgente sobre release entregado     |
| `release/vX.Y.Z`   | `main`            | (entrega)              | rama por versión entregada                 |

Ejemplos: `feat/stock-sectorizado`, `fix/invoice-spec-rootdir`,
`hotfix/sale-409-payload`, `release/v1.4.0`, `chore/electron-builder-v1.0.14`.

### Commits: Conventional Commits

Cada commit usa el prefijo del tipo + scope:

```
feat(inventory): add Location entity + migration
fix(sales): handle 409 in ReplenishmentDialog
chore(deps): bump typeorm to 0.3.20
docs(agents): switch to release-branch workflow
refactor(purchases): extract location resolution
```

Scope entre paréntesis = módulo afectado (`inventory`, `sales`, `purchases`,
`configuration`, `products`, `pos`, `frontend`, `desktop`, `docs`, etc.).

### Workflow estándar para una feature

1. Actualizar `main` y crear la branch:
   ```powershell
   git checkout main
   git pull origin main
   git checkout -b feat/<nombre>
   ```
2. Commits atómicos con Conventional Commits (uno por unidad lógica).
3. Push de la branch:
   ```powershell
   git push -u origin feat/<nombre>
   ```
4. Abrir PR a `main`:
   ```powershell
   gh pr create --base main --title "feat(scope): descripción corta"
   ```
5. Verificar tests + `migrations.consistency.spec.ts`.
6. Squash merge con `gh pr merge --squash`.
7. Borrar la branch local y remota después de mergear.

### Workflow para cortar un release

Cuando `main` está verde y querés cerrar una versión:

```powershell
git checkout main
git pull origin main
git checkout -b release/vX.Y.Z
git push -u origin release/vX.Y.Z
git tag -a vX.Y.Z -m "vX.Y.Z: <resumen>"
git push origin vX.Y.Z
gh release create vX.Y.Z --generate-notes
```

A partir de acá, los hotfixes de esta versión se ramifican desde esta branch.

### Workflow para un hotfix

Bug urgente en una versión ya entregada (`vX.Y.Z`):

```powershell
# 1. Crear branch de hotfix desde el tag
git checkout vX.Y.Z
git checkout -b hotfix/<desc>
# 2. Fix + commits atómicos + bump PATCH (vX.Y.(Z+1))
# 3. PR a la branch de release
git push -u origin hotfix/<desc>
gh pr create --base release/vX.Y.Z --title "fix(scope): <desc>"

# 4. Después de mergear en release, mergear a main también
git checkout main
git merge --no-ff release/vX.Y.Z
git push origin main

# 5. Tag del patch + release
git tag -a vX.Y.(Z+1) -m "vX.Y.(Z+1): <hotfix>"
git push origin vX.Y.(Z+1)
gh release create vX.Y.(Z+1) --generate-notes
```

### Cambios grandes: stacked branches

Para features de más de ~400 líneas o múltiples módulos, usar **stacked
branches** en vez de un commit gigante en `main`:

```
main
 └─ feat/stock-sectorizado-foundations   → PR a main
     └─ feat/stock-sectorizado-service       → PR a foundations
         └─ feat/stock-sectorizado-sales         → PR a service
```

Cada nivel es una branch con su PR dirigido a la branch anterior. Cuando la
base se mergea a `main`, rebasear las hijas sobre `main`. Así cada slice queda
revisable y reversible sin tocar `main`.

### Versionado (SemVer, con énfasis en MAJOR)

- **MAJOR** (`v2.0.0`): cambio de arquitectura, breaking change, schema
  destructivo, replataforma. **Es la decisión fuerte**: cualquier refactor que
  invalide upgrades, cambie el modelo de datos, o rompa la API va con bump
  MAJOR. No se queda en v1.x.
- **MINOR** (`v1.1.0`): nueva funcionalidad compatible hacia atrás dentro del
  mismo modelo.
- **PATCH** (`v1.0.14`): bugfix compatible.

Cuando dude entre MAJOR y MINOR: si el cliente que ya está en `vX.Y.Z` tiene
que migrar su DB, su config o re-aprender el flujo → MAJOR. Si solo agrega
funcionalidad nueva → MINOR.

### Reglas de las branches compartidas

- **No `git push --force` a `main` ni a ninguna `release/*`** salvo acuerdo
  explícito del usuario. Rompe clones de otros developers y borra historia
  sin recuperación.
- Activar en GitHub (Settings → Branches): "Do not allow force pushes" para
  `main` y para `release/*` apenas sea posible.
- Las branches `release/*` y `main` son protegidas: PRs requieren review.

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

# AGENTS.md — Reglas del proyecto para la IA

> Este archivo documenta reglas **obligatorias** para cualquier agente de IA que
> trabaje en este repositorio. Es referencia viva: si se descubre un patrón que
> debe respetarse en el futuro, **agregarlo acá**.

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

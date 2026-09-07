# Design: Endurecer la autorización de escrituras

## Technical Approach

Cerrar C01 parcial reusando `JwtAuthGuard`, `RolesGuard`, `@Roles` y `UserRole` ya existentes. El patrón canónico es `configuration.controller.ts` (guards en clase, `@Roles` solo en escrituras). El default `ADMIN` de columna (`user.entity.ts:30`) no se toca: las rutas cubiertas asignan rol en aplicación. Spec: `write-authorization`.

## Architecture Decisions

| Decisión | Opción | Tradeoff | Elección |
|---|---|---|---|
| Alcance de roles en users | `@Roles(ADMIN)` en clase vs handlers `create`/`update`/`toggleStatus` | Clase bloquearía `GET` (fuera de alcance) | Handlers de escritura. Clase: `@UseGuards(JwtAuthGuard, RolesGuard)`. `RolesGuard` sin metadata permite (`roles.guard.ts:21-23`) |
| Default CASHIER | Schema+servicio vs migración de columna | Migración cambia installs y sale del alcance | `CreateUserSchema` `.default('cashier')` y `UsersService.create` `\|\| UserRole.CASHIER`. Columna DB sigue `ADMIN` |
| PATCH no pisa rol | Heredar default de `CreateUserSchema.partial()` vs `role` opcional sin default | Zod puede inyectar default en `UpdateUserSchema.parse({})` | `UpdateUserSchema.extend({ role: z.enum([...]).optional() })` sin default |
| Register | Pipe Zod vs overwrite en servicio | `register` no usa `ZodValidationPipe` (`auth.controller.ts:61`): un body con `role` fugaría al servicio | `{ ...dto, isActive: true, role: UserRole.CASHIER }` (CASHIER gana). Schema sigue sin campo de rol. `@Public()` se conserva |
| Import/etiquetas | Guard de clase vs por handler | `ProductsController` ya usa clase (`products.controller.ts:38`) sin importar `AuthModule` | `@UseGuards(JwtAuthGuard)` en clase. Sin `@Roles`. `matrix-import` ya está cubierto |
| Seed | INSERT con `role` vs `userRepo.create` | El script ya usa SQL crudo | Añadir columna `role` y valor `'admin'` / `UserRole.ADMIN` al `INSERT` (`seed-admin.ts:43-46`) |
| APP_GUARD global | Global vs por controller | Fuera de alcance; el resto de escrituras sigue JWT-only | No |

## Data Flow

```
POST /auth/register (@Public)
  → AuthService.register fuerza role=CASHIER
  → UsersService.create (fallback CASHIER si omiten role)
  → DB (default columna ADMIN solo si el INSERT omite role; seed no omite)

POST|PATCH /users*  JwtAuthGuard → RolesGuard @Roles(ADMIN)
  anónimo → 401 (Jwt primero) | CASHIER/MANAGER → 403 | ADMIN → handler

GET /users*  JwtAuthGuard; sin @Roles → CASHIER autenticado lee

POST /products/import|labels  JwtAuthGuard de clase → 401 anónimo; cualquier rol JWT ok
```

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/backend/src/modules/auth/users.controller.ts` | Modify | Clase: `@UseGuards(JwtAuthGuard, RolesGuard)`. Handlers `create`, `update`, `toggleStatus`: `@Roles(UserRole.ADMIN)`. `findAll`/`findOne` sin `@Roles` |
| `apps/backend/src/modules/auth/users.service.ts` | Modify | L36: `UserRole.CASHIER` |
| `apps/backend/src/modules/auth/dto/index.ts` | Modify | L148 default `'cashier'`; L184 swagger `CASHIER`; `UpdateUserSchema.role` opcional sin default |
| `apps/backend/src/modules/auth/auth.service.ts` | Modify | L100: `role: UserRole.CASHIER` después del spread |
| `apps/backend/src/modules/products/import/import.controller.ts` | Modify | Clase: `@UseGuards(JwtAuthGuard)` |
| `apps/backend/src/modules/products/labels/labels.controller.ts` | Modify | Clase: `@UseGuards(JwtAuthGuard)` |
| `apps/backend/src/scripts/seed-admin.ts` | Modify | `INSERT` incluye `role` = admin |
| `users.controller.spec.ts`, `users.service.spec.ts`, `auth.service.spec.ts`, `roles.guard.spec.ts` | Modify | Metadata Reflector, default, register, MANAGER 403 |
| `import.controller.spec.ts`, `labels.controller.spec.ts`, `scripts/seed-admin.spec.ts` | Create | JWT/`IS_PUBLIC_KEY`; `INSERT` con `role` |

Sin archivos nuevos de producción. Sin factories ni config.

## Interfaces / Contracts

Sin tipos nuevos. Contrato de metadata:

- Guards: `Reflect.getMetadata('__guards__', clase)` ∪ handler.
- Roles: `ROLES_KEY` (`'roles'`) solo `UserRole.ADMIN` en escrituras de users.
- `IS_PUBLIC_KEY` (`'isPublic'`) ausente en users/import/labels.
- `RegisterSchema.parse({ ..., role: 'admin' })` no produce `role: 'admin'` (unknown strip de Zod).
- `JwtStrategy.validate` ya pone `role` en `request.user` (`jwt.strategy.ts:42-46`); `AuthUser` no se cambia.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit RED | Metadata create/update/toggleStatus: ambos guards + roles `[ADMIN]` + sin `isPublic`. GET: JWT, roles vacío, `RolesGuard` true para CASHIER | `Reflector` / `Reflect.getMetadata`, patrón más estricto que `fiscal-configuration.controller.spec.ts:383` |
| Unit RED | `RolesGuard` con `[ADMIN]`: CASHIER y MANAGER → `ForbiddenException`; ADMIN → `true` | Extender `roles.guard.spec.ts` (MANAGER falta) |
| Unit RED | `CreateUserSchema` sin role → `cashier`; `UsersService.create` sin role → `UserRole.CASHIER` | Parse Zod + `repository.create` args |
| Unit RED | `AuthService.register` llama `create` con `CASHIER` aunque el DTO traiga `role`; `RegisterSchema` no emite admin | Extender `auth.service.spec.ts` (el `toEqual` de register omite `role` hoy: actualizarlo) |
| Unit RED | Import `preview`/`commit` y `LabelsController`: `JwtAuthGuard` en clase; sin `isPublic`; sin `@Roles` | Specs nuevos junto al controller |
| Unit RED | `seed-admin.ts` INSERT contiene columna `role` y valor admin | Leer fuente del script |
| Integration/E2E | — | Fuera de alcance (proposal: Jest unit sin server) |

Specs existentes que pueden romperse: `auth.service.spec.ts` register `toEqual` (el servicio ya retorna `role`); `users.service.spec.ts` si alguien asertara `ADMIN` (hoy no). No tocar specs de fiscal/configuración.

## Threat Matrix

Cambio de routing HTTP (guards). Filas del matrix de shell/VCS/PR/ejecutables:

| Boundary | Applicability |
|---|---|
| Documentation-like paths | N/A — no clasifica ni ejecuta archivos |
| Git repository selection | N/A — no invoca git |
| Commit state | N/A — no hace commit |
| Push state | N/A — no hace push |
| PR commands | N/A — no automatiza PRs |

401 anónimo lo da `JwtAuthGuard` (primero). 403 lo da `RolesGuard` con JWT válido. RED: metadata + `canActivate`, no Passport.

## Migration / Rollout

No migration required. El default de columna `ADMIN` queda documentado como deuda: solo seed y callers explícitos deben setear `role`. Reversión: revertir decorators y defaults de aplicación.

## Open Questions

- Ninguna bloqueante.

## Orden de implementación (strict_tdd)

1. RED: schema + `UsersService.create` default; GREEN.
2. RED: register fuerza CASHIER + schema; GREEN.
3. RED: metadata users + `RolesGuard` MANAGER; GREEN (decorators).
4. RED: import/labels JWT; GREEN.
5. RED: seed INSERT; GREEN.

# Tasks: Endurecer la autorización de escrituras

Comandos Jest desde `apps/backend`. Cierre: RED falla; GREEN pasa. Sin migración ni otros controllers.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 180–230 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | PR único |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | C01: CASHIER default/register, ADMIN writes, JWT import/labels, seed ADMIN | PR 1 | `npx jest --selectProjects unit --runTestsByPath src/modules/auth/users.controller.spec.ts src/modules/auth/users.service.spec.ts src/modules/auth/auth.service.spec.ts src/modules/auth/guards/roles.guard.spec.ts src/modules/products/import/import.controller.spec.ts src/modules/products/labels/labels.controller.spec.ts src/scripts/seed-admin.spec.ts` | N/A — unitario sin HTTP server | Revertir 7 prod + 7 specs; sin datos/migración |

## Phase 1: Default CASHIER

- [x] 1.1 RED `users.service.spec.ts`: `CreateUserSchema` sin role → `cashier`; `create` sin role → `UserRole.CASHIER`; `UpdateUserSchema.parse({})` no inyecta role.
- [x] 1.2 GREEN `dto/index.ts`: `.default('cashier')` + swagger CASHIER; `UpdateUserSchema.role` opcional sin default.
- [x] 1.3 GREEN `users.service.ts` L36: `|| UserRole.CASHIER`.
- Verificar: `npx jest --selectProjects unit --runTestsByPath src/modules/auth/users.service.spec.ts`

## Phase 2: Register CASHIER

- [x] 2.1 RED `auth.service.spec.ts`: `register` llama `create` con `UserRole.CASHIER` aunque el DTO traiga role; `RegisterSchema.parse` con `role:"admin"` no emite admin.
- [x] 2.2 GREEN `auth.service.ts` L100: `{ ...dto, isActive: true, role: UserRole.CASHIER }`; ajustar `toEqual` de register.
- Verificar: `npx jest --selectProjects unit --runTestsByPath src/modules/auth/auth.service.spec.ts`

## Phase 3: Metadata users + RolesGuard

- [x] 3.1 RED `users.controller.spec.ts`: create/update/toggleStatus = JwtAuthGuard+RolesGuard, roles `[ADMIN]`, sin `IS_PUBLIC_KEY`; findAll/findOne = JWT, roles vacío.
- [x] 3.2 RED `roles.guard.spec.ts`: `[ADMIN]` → CASHIER/MANAGER `ForbiddenException`, ADMIN `true`; sin roles → `true` para CASHIER.
- [x] 3.3 GREEN `users.controller.ts`: clase `@UseGuards(JwtAuthGuard, RolesGuard)`; escrituras `@Roles(UserRole.ADMIN)`; GET sin `@Roles`.
- [x] 3.4 GREEN: no tocar `roles.guard.ts` si ya deniega MANAGER.
- Verificar: `npx jest --selectProjects unit --runTestsByPath src/modules/auth/users.controller.spec.ts src/modules/auth/guards/roles.guard.spec.ts`

## Phase 4: JWT import/etiquetas

- [x] 4.1 RED crear `import.controller.spec.ts`: preview/commit con JwtAuthGuard de clase; sin `IS_PUBLIC_KEY`; sin `@Roles`.
- [x] 4.2 RED crear `labels.controller.spec.ts`: JwtAuthGuard de clase; sin `IS_PUBLIC_KEY`; sin `@Roles`.
- [x] 4.3 GREEN `import.controller.ts` y `labels.controller.ts`: `@UseGuards(JwtAuthGuard)` en clase.
- Verificar: `npx jest --selectProjects unit --runTestsByPath src/modules/products/import/import.controller.spec.ts src/modules/products/labels/labels.controller.spec.ts`

## Phase 5: Seed ADMIN

- [x] 5.1 RED crear `src/scripts/seed-admin.spec.ts`: INSERT incluye columna `role` y valor `admin`/`UserRole.ADMIN`.
- [x] 5.2 GREEN `seed-admin.ts`: INSERT con `role` explícito. Sin migración ni default de columna.
- Verificar: `npx jest --selectProjects unit --runTestsByPath src/scripts/seed-admin.spec.ts`

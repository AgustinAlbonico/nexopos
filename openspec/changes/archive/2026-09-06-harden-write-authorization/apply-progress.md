# Apply progress: harden-write-authorization

**Change**: harden-write-authorization
**Mode**: Strict TDD
**Fecha**: 2026-09-06
**Workload**: PR único (forecast Low, 180–230 líneas; `size:exception` no aplica)

## Estado por fase

| Fase | Tareas | Tests (comando desde `apps/backend`) | Resultado |
|------|--------|----------------------------------------|-----------|
| 1 Default CASHIER | 1.1–1.3 `[x]` | `npx jest --selectProjects unit --runTestsByPath src/modules/auth/users.service.spec.ts` | Safety net 29/29; RED 2 fail; GREEN 34/34 |
| 2 Register CASHIER | 2.1–2.2 `[x]` | `npx jest --selectProjects unit --runTestsByPath src/modules/auth/auth.service.spec.ts` | Safety net 22/22; RED 1 fail; GREEN 24/24 |
| 3 Metadata + RolesGuard | 3.1–3.4 `[x]` | `npx jest --selectProjects unit --runTestsByPath src/modules/auth/users.controller.spec.ts src/modules/auth/guards/roles.guard.spec.ts` | Safety net 7/7; RED 3 fail (writes); GREEN 16/16. `roles.guard.ts` no modificado |
| 4 JWT import/labels | 4.1–4.3 `[x]` | `npx jest --selectProjects unit --runTestsByPath src/modules/products/import/import.controller.spec.ts src/modules/products/labels/labels.controller.spec.ts` | N/A (nuevos); RED 7 fail; GREEN 7/7 |
| 5 Seed ADMIN | 5.1–5.2 `[x]` | `npx jest --selectProjects unit --runTestsByPath src/scripts/seed-admin.spec.ts` | N/A (nuevo); RED 1 fail; GREEN 2/2 |

## Cierre de suite

```
npx jest --selectProjects unit --runTestsByPath src/modules/auth/users.controller.spec.ts src/modules/auth/users.service.spec.ts src/modules/auth/auth.service.spec.ts src/modules/auth/guards/roles.guard.spec.ts src/modules/products/import/import.controller.spec.ts src/modules/products/labels/labels.controller.spec.ts src/scripts/seed-admin.spec.ts
```

**7 suites, 83 tests passed, 0 failed, 0 skipped.**

## Archivos tocados

Producción: `users.controller.ts`, `users.service.ts`, `dto/index.ts`, `auth.service.ts`, `import.controller.ts`, `labels.controller.ts`, `seed-admin.ts`.

Specs: `users.controller.spec.ts`, `users.service.spec.ts`, `auth.service.spec.ts`, `roles.guard.spec.ts` (modificados); `import.controller.spec.ts`, `labels.controller.spec.ts`, `seed-admin.spec.ts` (creados).

Openspec: `tasks.md` (14/14 `[x]`), este archivo.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `users.service.spec.ts` | Unit | ✅ 29/29 | ✅ Written | ✅ Passed | ✅ omit vs explícito admin | ➖ None needed |
| 1.2 | `users.service.spec.ts` | Unit | (1.1) | ✅ Written | ✅ 34/34 | ✅ schema cashier vs admin; PATCH no inyecta | ➖ None needed |
| 1.3 | `users.service.spec.ts` | Unit | (1.1) | ✅ Written | ✅ Passed | ✅ CASHIER default vs ADMIN explícito | ➖ None needed |
| 2.1 | `auth.service.spec.ts` | Unit | ✅ 22/22 | ✅ Written | ✅ Passed | ✅ DTO admin overwrite + schema strip | ➖ None needed |
| 2.2 | `auth.service.spec.ts` | Unit | (2.1) | ✅ Written | ✅ 24/24 | ✅ register happy-path también aserta CASHIER | ➖ None needed |
| 3.1 | `users.controller.spec.ts` | Unit | ✅ 2/2 | ✅ Written | ✅ Passed | ✅ 3 writes + 2 GET | ➖ None needed |
| 3.2 | `roles.guard.spec.ts` | Unit | ✅ 5/5 | ✅ Written | ✅ Passed | ✅ CASHIER/MANAGER 403 + ADMIN true + sin roles | ➖ None needed |
| 3.3 | `users.controller.spec.ts` | Unit | (3.1) | ✅ Written | ✅ 16/16 | (3.1) | ➖ None needed |
| 3.4 | `roles.guard.spec.ts` | Unit | (3.2) | ➖ producción intacta | ✅ MANAGER ya denegado | ➖ Single | ➖ no tocar `roles.guard.ts` |
| 4.1 | `import.controller.spec.ts` | Unit | N/A (new) | ✅ Written | ✅ Passed | ✅ preview + commit | ➖ None needed |
| 4.2 | `labels.controller.spec.ts` | Unit | N/A (new) | ✅ Written | ✅ Passed | ✅ clase + 4 handlers | ➖ None needed |
| 4.3 | ambos specs import/labels | Unit | (4.1–4.2) | ✅ Written | ✅ 7/7 | (4.1–4.2) | ➖ None needed |
| 5.1 | `seed-admin.spec.ts` | Unit | N/A (new) | ✅ Written | ✅ Passed | ✅ columna role + `UserRole.ADMIN` | ➖ None needed |
| 5.2 | `seed-admin.spec.ts` | Unit | (5.1) | ✅ Written | ✅ 2/2 | (5.1) | ➖ None needed |

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx jest --selectProjects unit --runTestsByPath src/modules/auth/users.controller.spec.ts src/modules/auth/users.service.spec.ts src/modules/auth/auth.service.spec.ts src/modules/auth/guards/roles.guard.spec.ts src/modules/products/import/import.controller.spec.ts src/modules/products/labels/labels.controller.spec.ts src/scripts/seed-admin.spec.ts` — 7 passed, 83 tests, 0 failed |
| Runtime harness command/scenario and exact result | N/A — unitario sin HTTP server (proposal/tasks) |
| Rollback boundary | Revertir 7 prod + 7 specs; sin datos/migración |

## Desvíos

Ninguno — la implementación coincide con `design.md`. `UpdateUserSchema.parse({})` ya no inyectaba role antes del cambio; se reafirmó `.optional()` sin default para no heredar el nuevo default `cashier`.

## Issues

Ninguno. WIP multi-IVA no tocado. Sin commits.

```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:45ef1fdbbdc3dace11cf7cbb4d701ea5ac47abeae48eaf883437655dfd4794fc
verdict: pass
blockers: 0
critical_findings: 0
requirements: 6/6
scenarios: 10/10
test_command: "npx jest --selectProjects unit --runTestsByPath src/modules/auth/users.controller.spec.ts src/modules/auth/users.service.spec.ts src/modules/auth/auth.service.spec.ts src/modules/auth/guards/roles.guard.spec.ts src/modules/products/import/import.controller.spec.ts src/modules/products/labels/labels.controller.spec.ts src/scripts/seed-admin.spec.ts"
test_exit_code: 0
test_output_hash: sha256:f43214bae759c09d5eba0ebaaf31771c6aefe2e421fbbda309102853710774e2
build_command: "npm run build"
build_exit_code: 0
build_output_hash: sha256:07d07446e679737b583e3422e2440e65ed8cfa8b040e678388741479fecd44a1
```

## Verification Report

**Cambio**: `harden-write-authorization`  
**Modo**: Strict TDD

### Resumen ejecutivo
Los 14/14 ítems de `tasks.md` están completos. La suite focal pasó con 7 suites/83 pruebas, la regresión limitada con 12 suites/141 pruebas y el build TypeScript pasó. Los 6 requisitos y los 10 escenarios realmente presentes en la spec tienen evidencia de ejecución satisfactoria.

La entrada operativa indicó 11 escenarios, pero la spec autoritativa tiene 10 encabezados `#### Scenario`; este informe usa 10.

### Completitud
| Métrica | Valor |
|---|---:|
| Tareas totales / completas / incompletas | 14 / 14 / 0 |
| Requisitos | 6 |
| Escenarios | 10 |
| Escenarios con prueba ejecutada | 10/10 |

### Ejecución de build y pruebas
| Verificación | Resultado | Contador | Exit | Hash |
|---|---|---:|---:|---|
| Suite focal | ✅ | 7 suites, 83 passed, 0 failed | 0 | `sha256:f43214bae759c09d5eba0ebaaf31771c6aefe2e421fbbda309102853710774e2` |
| Regresión auth + 3 specs | ✅ | 12 suites, 141 passed, 0 failed | 0 | `sha256:b96764af841d98c9ce7816ee51d9ca5873644a28889fd26dca4c5c3341eef059` |
| Build TypeScript | ✅ | sin diagnósticos | 0 | `sha256:07d07446e679737b583e3422e2440e65ed8cfa8b040e678388741479fecd44a1` |
| Cobertura focal | ⚠️ | 83 passed; umbrales globales fallaron | 1 | `sha256:adfdc0189641792712d6562004570e2ef5abad1e1e54eb64262476b33777154f` |
| Lint focal | ➖ | ESLint sin configuración resoluble | 2 | `sha256:e45de38ebdcecda8723bfc4af1a0c67f6c41b27b7a6591a96181f74c169525d0` |

Comando focal desde `apps/backend`: `npx jest --selectProjects unit --runTestsByPath src/modules/auth/users.controller.spec.ts src/modules/auth/users.service.spec.ts src/modules/auth/auth.service.spec.ts src/modules/auth/guards/roles.guard.spec.ts src/modules/products/import/import.controller.spec.ts src/modules/products/labels/labels.controller.spec.ts src/scripts/seed-admin.spec.ts`.

La regresión usó los 9 specs bajo `src/modules/auth/` más los 3 specs nuevos. No se ejecutó la suite unit completa. El WIP multi-IVA del worktree no fue modificado y no causó fallos en los comandos ejecutados.

La cobertura sale con exit 1 únicamente por los umbrales globales aplicados al repositorio completo (3.29% statements, 1.17% branches, 3.21% lines y 2.01% functions); las 83 pruebas focales pasaron. Es informativa y no bloqueante en Strict TDD.

### Matriz de cumplimiento de la spec
| Requisito | Escenario | Prueba ejecutada | Resultado |
|---|---|---|---|
| Escrituras ADMIN | Metadata de guards y rol | `users.controller.spec.ts` › `create/update/toggleStatus declara JwtAuthGuard, RolesGuard, roles ADMIN y no es público` | ✅ COMPLIANT |
| Escrituras ADMIN | CASHIER/MANAGER denegados; ADMIN permitido | `roles.guard.spec.ts` › `roles requeridos [ADMIN]` › `deniega CASHIER`, `deniega MANAGER`, `permite ADMIN` | ✅ COMPLIANT |
| Default CASHIER API | Schema sin rol | `users.service.spec.ts` › `debería defaultar role a cashier cuando el payload omite role` | ✅ COMPLIANT |
| Default CASHIER API | Servicio sin rol | `users.service.spec.ts` › `debería asignar CASHIER cuando el DTO omite role` | ✅ COMPLIANT |
| Register CASHIER | Register fuerza CASHIER | `auth.service.spec.ts` › `fuerza CASHIER aunque el DTO traiga role admin` | ✅ COMPLIANT |
| Register CASHIER | Cliente no puede pedir ADMIN | `auth.service.spec.ts` › `RegisterSchema.parse con role admin no emite admin` y test de overwrite | ✅ COMPLIANT |
| Seed ADMIN | INSERT con rol literal | `seed-admin.spec.ts` › `incluye columna role` y `asigna valor admin o UserRole.ADMIN` | ✅ COMPLIANT |
| JWT import/labels | Import preview y commit | `import.controller.spec.ts` › `preview/commit declara JwtAuthGuard de clase, sin IS_PUBLIC_KEY y sin @Roles` | ✅ COMPLIANT |
| JWT import/labels | Etiquetas con JWT | `labels.controller.spec.ts` › clase y `templates/preview/queue/status hereda JWT` | ✅ COMPLIANT |
| GET users con JWT sin roles | GET con JWT y sin roles | `users.controller.spec.ts` › `findAll/findOne declara JwtAuthGuard y no declara roles`; `roles.guard.spec.ts` › `permite CASHIER cuando no hay roles requeridos` | ✅ COMPLIANT |

**Resumen de cumplimiento**: 10/10 escenarios conformes; 6/6 requisitos con pruebas cubrientes en verde.

### Corrección estática
| Requisito | Estado | Evidencia |
|---|---|---|
| Escrituras ADMIN | ✅ | `users.controller.ts:35,41,69,84`; `roles.guard.ts:21-43`. |
| Default CASHIER API | ✅ | `dto/index.ts:148,196-199`; `users.service.ts:33-38`. |
| Register CASHIER | ✅ | `auth.service.ts:100-104`; `dto/index.ts:55-63`. |
| Seed ADMIN | ✅ | `seed-admin.ts:44-46`. |
| JWT import/labels | ✅ | `import.controller.ts:25-27`; `labels.controller.ts:37-39`. |
| GET users sin roles | ✅ | `users.controller.ts:35,52-66`; `roles.guard.ts:21-22`. |

`jwt-auth.guard.ts:12-22` delega rutas no públicas a `AuthGuard('jwt')`; sin `IS_PUBLIC_KEY`, JWT se procesa antes de `RolesGuard`.

### Coherencia con el diseño
| Decisión | ¿Cumplida? | Evidencia |
|---|---|---|
| Guards de clase y ADMIN solo en escrituras users | ✅ | `users.controller.ts:35,41,69,84` |
| CASHIER en schema/servicio sin migración DB | ✅ | `dto/index.ts:148,196-199`; `users.service.ts:36` |
| PATCH sin default de rol | ✅ | `dto/index.ts:196-199` |
| Register sobrescribe después del spread | ✅ | `auth.service.ts:100-104` |
| JWT de clase sin roles para import/labels | ✅ | `import.controller.ts:26`; `labels.controller.ts:38` |
| Seed SQL con ADMIN explícito | ✅ | `seed-admin.ts:43-47` |
| GET users mantiene JWT sin roles | ✅ | `users.controller.ts:35,52-66` |

### Cumplimiento TDD
| Control | Resultado | Detalle |
|---|---|---|
| Evidencia TDD reportada | ✅ | `apply-progress.md:34-51` contiene las 14 tareas. |
| Tareas con spec de prueba | ✅ | 14/14 asociadas a los 7 specs existentes. |
| RED confirmado | ⚠️ | 13/14 dicen `✅ Written`; 3.4 dice `➖ producción intacta` y reutiliza la prueba MANAGER de 3.2. |
| GREEN confirmado | ✅ | 83/83 pruebas focales pasan ahora. |
| Triangulación | ✅ | Casos opuestos para defaults/roles; 3.4 es el caso único declarado. |
| Safety net | ✅ | 4 specs modificados con safety net; 3 nuevos como `N/A (new)`. |

**Cumplimiento TDD**: 5/6 controles plenamente conformes; la excepción documental no deja prueba ausente ni fallida.

### Distribución de capas de prueba
| Capa | Pruebas | Archivos | Herramienta |
|---|---:|---:|---|
| Unitarias | 83 | 7 | Jest |
| Integración | 0 | 0 | Jest disponible; fuera del alcance |
| E2E | 0 | 0 | Playwright disponible; fuera del alcance |
| **Total** | **83** | **7** | |

### Cobertura de archivos modificados
| Archivo | Líneas | Branches | Líneas no cubiertas | Evaluación |
|---|---:|---:|---|---|
| `auth.service.ts` | 100% | 100% | — | ✅ Excelente |
| `users.service.ts` | 100% | 100% | — | ✅ Excelente |
| `dto/index.ts` | 90.9% | 0% | 76,163,213,219,271 | ⚠️ Aceptable |
| `users.controller.ts` | 81.81% | 100% | 56,65,80,94 | ⚠️ Aceptable |
| `import.controller.ts` | 72.72% | 0% | 28,34,42 | ⚠️ Baja |
| `labels.controller.ts` | 34.28% | 0% | 41-43,49,60-73,82-84,90-108 | ⚠️ Baja |
| `seed-admin.ts` | 0% | 0% | 6-129 | ⚠️ Baja |

### Calidad de aserciones
| Archivo | Línea | Aserción | Hallazgo | Severidad |
|---|---:|---|---|---|
| `users.controller.spec.ts` | 37-39 | `expect(controller).toBeDefined()` | Smoke/type-only sin comportamiento observable; previo al cambio, auditado por Strict TDD. | WARNING |

**Calidad de aserciones**: 0 CRITICAL, 1 WARNING. Las aserciones agregadas ejercitan metadata, guards, schemas, servicio o fuente SQL de forma concreta.

### Métricas de calidad
- **Lint**: ➖ No disponible en el alcance focal: ESLint está instalado, pero no hay configuración resoluble desde `apps/backend`.
- **Type checker**: ✅ `npm run build` sin diagnósticos.
- **Diff check**: ➖ No concluyente: `rtk git diff --check` devolvió exit 2 sin diagnóstico; no se usa como evidencia ni hallazgo.

### Hallazgos
**CRITICAL (0)**: Ninguno.

**WARNING (5)**:
1. `apply-progress.md:46` no registra `✅ Written` para RED de la tarea 3.4, aunque reutiliza una prueba verde.
2. `users.controller.spec.ts:37-39` conserva una aserción smoke/type-only.
3. `import.controller.ts` tiene 72.72% de líneas en la cobertura focal.
4. `labels.controller.ts` tiene 34.28% de líneas en la cobertura focal.
5. `seed-admin.ts` tiene 0% de líneas porque el test inspecciona SQL sin ejecutar el seed.

**SUGGESTION (1)**:
1. En un cambio futuro, añadir integración HTTP de 401/403 para endpoints críticos; la spec/diseño actual declararon Jest unitario sin servidor.

### Veredicto
**PASS** — no hay requisitos o escenarios sin prueba ejecutada, ni tareas pendientes; regresión acotada y build en verde. Las advertencias son no bloqueantes.

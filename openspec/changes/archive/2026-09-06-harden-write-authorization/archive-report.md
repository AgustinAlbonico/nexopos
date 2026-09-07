# Archive Report: harden-write-authorization

**Cambio**: `harden-write-authorization`  
**Fecha de archivo**: 2026-09-06  
**Tienda de artefactos**: openspec  
**Estado final**: cerrado — SDD cycle complete  
**Rama**: `fix/harden-write-authorization`  
**Commits al archivar**: ninguno (el orquestador hará commit atómico + PR único a `main` después de este archivo)

## Autoridad de estado final

Jerarquía aplicada:

1. Estado nativo `gentle-ai sdd-status` (2026-09-06): `dependencies.archive: ready`, `taskProgress` 14/14, `verifyReport: done`, `reviewGate` ausente, `reviewOffer.available: true` (invitación, no compuerta; se procede a archivo).
2. Artefacto persistido `tasks.md`: 14/14 casillas `[x]`; 0 pendientes.
3. Hechos finales del orquestador (handoff posterior a snapshots): Verify PASS definitivo.
4. `verify-report.md` y `apply-progress.md`: snapshots intermedios; no se reiteran como estado actual las reclamaciones de pendiente/bloqueado.

No hay contradicción no rankeable entre fuentes.

## Compuertas

| Compuerta | Resultado |
|---|---|
| Native Review Receipt Gate | `reviewGate` estructuralmente ausente; archivo bajo política ordinaria |
| Task Completion Gate | Pasa — 14/14 tareas de implementación marcadas |
| CRITICAL en verify | 0 — no bloquea |
| Action Context | `repo-local`; no es `workspace-planning` |
| Merge destructivo | No — solo ADDED; spec principal inexistente previa |

## Evidencia al cierre

| Verificación | Estado al cierre | Detalle |
|---|---|---|
| Suite focal | PASS | 7 suites, 83/83 |
| Regresión auth | PASS | 12 suites, 141/141 |
| Build | PASS | `npm run build` sin diagnósticos |
| CRITICAL | 0 | — |
| WARNING | 5 | follow-ups; no corregidos en este archivo |
| SUGGESTIÓN | 1 | follow-up |
| Ledger runtime | cerrado | intento apply passed (300 líneas; excedente de cap interno autorizado por maintainer vía reset documentado); unidad verify completada; ningún fallo abierto |

Hashes del `verify-report` (snapshot de verificación; el handoff confirma que siguen siendo el PASS definitivo):

- `evidence_revision`: `sha256:45ef1fdbbdc3dace11cf7cbb4d701ea5ac47abeae48eaf883437655dfd4794fc`
- `test_output_hash`: `sha256:f43214bae759c09d5eba0ebaaf31771c6aefe2e421fbbda309102853710774e2`
- `build_output_hash`: `sha256:07d07446e679737b583e3422e2440e65ed8cfa8b040e678388741479fecd44a1`

## Specs sincronizadas

| Dominio | Acción | Detalle |
|---|---|---|
| `write-authorization` | Creada | `openspec/specs/write-authorization/spec.md` — 6 requisitos ADDED consolidados como spec vigente; 0 modificados; 0 eliminados; 0 renombrados |

Requisitos vigentes:

1. Escrituras de usuarios restringidas a ADMIN
2. Rol por defecto CASHIER en creación por API
3. Registro público siempre CASHIER
4. Seed de bootstrap declara ADMIN
5. Importación CSV y etiquetas exigen JWT
6. Lecturas de usuarios autenticadas sin filtro de rol

## Alcance C01

### Cubierto en este cambio

- Registro público: siempre `CASHIER`; el cliente no puede pedir `ADMIN`.
- Roles de escrituras de usuarios: `JwtAuthGuard` + `RolesGuard` + `@Roles(ADMIN)`; `CASHIER` y `MANAGER` reciben 403.
- Defaults de aplicación: schema y `UsersService.create` asignan `CASHIER` si se omite `role`.
- Controllers anónimos de catálogo cubiertos: importación CSV y etiquetas exigen JWT.

### Pendiente de C01 (fuera de este cambio)

- Clave técnica por defecto.
- Validación de mapa efectivo antes de cambiar capacidades.
- Catálogo disponible vs planificado.

Próximo cambio planificado (no parte de este ciclo): `sectorized-stock-locking` (C02).

## Follow-ups (no corregir en este archivo)

### WARNING (5)

1. Tarea 3.4 sin registro `✅ Written` en `apply-progress` (documental; producción intacta).
2. Aserción smoke preexistente en `users.controller.spec.ts:37-39`.
3. Cobertura focal de `import.controller` 72.7%.
4. Cobertura focal de `labels.controller` 34.3%.
5. Cobertura de `seed-admin` 0% (el test inspecciona SQL sin ejecutarlo).

### SUGGESTIÓN (1)

1. Futuro cambio con tests de integración HTTP 401/403.

### Deuda técnica documentada

- Default de columna DB `users.role` sigue `ADMIN` (sin migración en este cambio). Las inserciones SQL directas futuras MUST declarar el rol de forma explícita.

## Contenido archivado

Ruta: `openspec/changes/archive/2026-09-06-harden-write-authorization/`

- `proposal.md` — presente
- `specs/write-authorization/spec.md` — presente (delta original)
- `design.md` — presente
- `tasks.md` — presente (14/14 completas, sin casillas `[ ]` de implementación)
- `apply-progress.md` — presente
- `verify-report.md` — presente
- `archive-report.md` — este informe (aditivo; no formaba parte del snapshot de movimiento)

Directorio activo `openspec/changes/harden-write-authorization/` ya no existe.

## Verificación mecánica del movimiento

`diff -r` del snapshot pre-movimiento vs árbol archivado: vacío (exit 0). El `git mv` falló porque el directorio no estaba tracked (`fatal: source directory is empty`); se usó `mv`. El `archive-report.md` se escribió después del readback.

## Observación Engram

Persistido en proyecto `nexopos`, `topic_key`: `sdd/harden-write-authorization/archive-report`.

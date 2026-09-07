# Propuesta: Endurecer la autorización de escrituras

## Intención

Cerrar la escalada de privilegios y los endpoints anónimos detectados en C01. Hoy un registro público puede crear un administrador, un cajero puede administrar usuarios y dos rutas de catálogo no exigen JWT.

**Trazabilidad C/V:** C01 (parcial) — criterio de aceptación de autorización: anónimo o cajero no autorizado recibe rechazo.

## Alcance

### Dentro del alcance
- Proteger `POST`, `PATCH` y `PATCH /toggle-status` de `users` con `JwtAuthGuard`, `RolesGuard` y `@Roles(ADMIN)`.
- Predeterminar `CASHIER` en el schema/DTO y en `UsersService.create`; el registro público asignará `CASHIER` explícitamente.
- Hacer explícito `UserRole.ADMIN` en `seed-admin`, que hoy depende del default de base de datos.
- Exigir JWT en importación CSV y etiquetas, y cubrir metadata de guards, roles por defecto y registro con pruebas unitarias Jest.

### Fuera del alcance
- Proteger exhaustivamente los demás controllers de escritura o conectar capacidades en backend.
- Cambiar el default `ADMIN` de entidad/migración o introducir una migración: las rutas cubiertas asignarán rol explícito.
- Restringir lecturas de `users`: `GET` seguirá requiriendo JWT y no tendrá `@Roles`, por lo que conserva el acceso autenticado actual.

## Capacidades

### Nuevas capacidades
- `write-authorization`: límites de autenticación y rol para las escrituras administrativas y de catálogo cubiertas.

### Capacidades modificadas
- Ninguna. Las specs existentes (`fiscal-invoicing-wsfe`, `vat-multi-rate`) no describen autorización.

## Enfoque

Aplicar ambos guards a `UsersController` y anotar solo las tres escrituras administrativas con `ADMIN`. Forzar `CASHIER` en `AuthService.register`, además de los defaults defensivos, y declarar el rol del seed en su `INSERT`. Añadir `JwtAuthGuard` a importación y etiquetas. Las pruebas inspeccionarán metadata mediante `Reflector` y verificarán las asignaciones de rol sin levantar servidores.

## Áreas afectadas

| Área | Impacto | Descripción |
|---|---|---|
| `apps/backend/src/modules/auth/` | Modificada | Guards, roles y creación segura de usuarios. |
| `apps/backend/src/modules/products/{import,labels}/` | Modificada | JWT obligatorio. |
| `apps/backend/src/scripts/seed-admin.ts` | Modificada | Rol de bootstrap explícito. |
| `apps/backend/src/modules/**/**/*.spec.ts` | Modificada | Pruebas unitarias de autorización y roles. |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Flujos existentes de cajero para administrar usuarios quedan bloqueados. | Media | Es la política buscada; validar metadata de `ADMIN`. |
| Inserciones directas futuras heredan `ADMIN`. | Media | Documentar el default diferido; asignar roles explícitos en rutas y seed. |

## Plan de reversión

Revertir los decorators/guards y los defaults de aplicación en el mismo cambio; no habrá migración ni datos transformados que revertir.

## Dependencias

- `JwtAuthGuard`, `RolesGuard`, `Roles` y `UserRole` existentes.
- Jest unitario del backend (`npm run test:unit -w @sistema/backend`).

## Criterios de éxito

- [ ] Un anónimo recibe rechazo en importación, etiquetas y escrituras de usuarios; un cajero recibe `403` en esas escrituras administrativas.
- [ ] Crear un usuario sin rol y registrarse públicamente produce `CASHIER`; solo el seed de bootstrap declara `ADMIN`.
- [ ] Las pruebas unitarias de guards/roles, default y registro pasan en verde.

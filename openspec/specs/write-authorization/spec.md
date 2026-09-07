# Especificación: write-authorization

**Dominio**: `write-authorization`  
**Estado**: vigente  
**Versión**: 1.0.0  
**Origen**: cambio `harden-write-authorization` (archivado 2026-09-06)

**Criterio MANAGER:** administrar usuarios es privilegio exclusivo de `ADMIN`. `MANAGER` MUST recibir el mismo 403 que `CASHIER`. No hay `@Roles(MANAGER)` en escrituras de usuarios.

Verificación prevista: Jest unitario sin HTTP server (`Reflect.getMetadata` / `Reflector`, `RolesGuard.canActivate`, parseo de schema, defaults de servicio, inspección del `INSERT` de seed).

## Requirements

### Requirement: Escrituras de usuarios restringidas a ADMIN

`POST /users`, `PATCH /users/:id` y `PATCH /users/:id/toggle-status` MUST declarar `JwtAuthGuard` y `RolesGuard` con `@Roles(ADMIN)`. Anónimo MUST mapear a 401. `CASHIER` y `MANAGER` MUST mapear a 403. `ADMIN` MUST ser permitido.

#### Scenario: Metadata de guards y rol

- GIVEN handlers `create`, `update` y `toggleStatus` de `UsersController`
- WHEN se lee `__guards__` y `roles` con Reflector
- THEN cada handler (o la clase más el handler) declara `JwtAuthGuard` y `RolesGuard`
- AND `roles` es únicamente `ADMIN`
- AND `IS_PUBLIC_KEY` está ausente

#### Scenario: Cajero y manager denegados; admin permitido

- GIVEN `RolesGuard` con roles requeridos `[ADMIN]`
- WHEN `canActivate` recibe `role` `CASHIER` o `MANAGER`
- THEN lanza `ForbiddenException` (403)
- AND con `role` `ADMIN` retorna `true`

### Requirement: Rol por defecto CASHIER en creación por API

Si la creación por API omite `role`, `CreateUserSchema` y `UsersService.create` MUST asignar `CASHIER`. MUST NOT usar el default de columna `ADMIN`.

#### Scenario: Schema sin rol

- GIVEN payload válido de creación sin `role`
- WHEN se parsea `CreateUserSchema`
- THEN `role` es `cashier`

#### Scenario: Servicio sin rol

- GIVEN `UsersService.create` con DTO sin `role`
- WHEN se construye la entidad persistida
- THEN `role` es `UserRole.CASHIER`

### Requirement: Registro público siempre CASHIER

`POST /auth/register` MAY permanecer `@Public()`. El usuario creado MUST ser `CASHIER` y MUST NOT ser `ADMIN`, aunque el cuerpo incluya `role`.

#### Scenario: Register fuerza CASHIER

- GIVEN `AuthService.register` con DTO de registro
- WHEN se invoca `UsersService.create`
- THEN el rol enviado es `UserRole.CASHIER`
- AND el usuario resultante no es `ADMIN`

#### Scenario: Cliente no puede pedir ADMIN

- GIVEN `RegisterSchema` sin campo de rol privilegiado
- WHEN se parsea un cuerpo con `role: "admin"`
- THEN el parseo no produce rol `admin`
- AND el registro sigue asignando `CASHIER`

### Requirement: Seed de bootstrap declara ADMIN

`seed-admin` MUST insertar el usuario inicial con rol `ADMIN` explícito. MUST NOT omitir la columna `role`.

#### Scenario: INSERT con rol literal

- GIVEN el script `apps/backend/src/scripts/seed-admin.ts`
- WHEN se inspecciona el `INSERT` del usuario `admin`
- THEN incluye columna `role` con valor `admin` o `UserRole.ADMIN`

### Requirement: Importación CSV y etiquetas exigen JWT

`POST /products/import/preview`, `POST /products/import/commit` y los handlers de `LabelsController` MUST declarar `JwtAuthGuard`. Anónimo MUST mapear a 401. Este cambio MUST NOT añadir `@Roles` en esas rutas.

#### Scenario: Import preview y commit con JWT

- GIVEN handlers `preview` y `commit` de `ImportController`
- WHEN se lee `__guards__` e `IS_PUBLIC_KEY`
- THEN `JwtAuthGuard` está presente en clase o handler
- AND `IS_PUBLIC_KEY` está ausente

#### Scenario: Etiquetas con JWT

- GIVEN `LabelsController`
- WHEN se lee `__guards__` de la clase o de cada handler
- THEN `JwtAuthGuard` está presente
- AND `IS_PUBLIC_KEY` está ausente

### Requirement: Lecturas de usuarios autenticadas sin filtro de rol

`GET /users` y `GET /users/:id` MUST exigir JWT y MUST NOT declarar `@Roles`. Un `CASHIER` autenticado conserva la lectura.

#### Scenario: GET con JWT y sin roles

- GIVEN handlers `findAll` y `findOne`
- WHEN se lee metadata con Reflector
- THEN `JwtAuthGuard` está presente
- AND `roles` está vacío o ausente
- AND `RolesGuard.canActivate` sin roles requeridos retorna `true` para `CASHIER`

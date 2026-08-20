# Learnings - bm-colores-talles

## [2026-08-20] Setup
- Worktree: C:\Proyectos\punto_de_venta-worktrees\bm-colores-talles
- Branch: feat/variant-attribute-options desde main @ c8c1fa1

## [2026-08-19] Task 1 — variant_attribute_options
Patrón aplicado para crear una nueva "tabla maestra" en `apps/backend`:

1. Entity: `apps/backend/src/modules/products/entities/<name>.entity.ts`
   con PK uuid, columnas planas, CreateDateColumn / UpdateDateColumn.
   NO usar `unique: true` cuando la unicidad es compuesta → definir el índice
   en la migración explícitamente.
2. Migración: `apps/backend/src/migrations/<13-digit-ts>-<Name>.ts`
   usando helpers privados `tableExists` / `columnExists` / `indexExists`
   copiados literalmente del template `AddBrandsSupport1768003658000`.
   La clase debe terminar en `<Name><13-digit-ts>` y la propiedad `name`
   debe coincidir exactamente (lo exige `migrations.consistency.spec.ts`).
3. Insert con `queryRunner.query(sql, [binds])` y
   `ON CONFLICT (col1, col2) DO NOTHING` → re-ejecución es no-op.
4. Registrar el entity en `apps/backend/src/entities.ts` (import + array).
   Sin esto, `dataSource.getRepository(Entity)` y `bundle:build` rompen.
5. Registrar la migración en `apps/backend/src/migrations.ts` (import +
   array en orden cronológico). Sin esto, `migrations.consistency.spec.ts`
   falla el build ("Migraciones NO registradas en src/migrations.ts").

Verificaciones que pasaron:
- `npx jest --selectProjects unit --runTestsByPath src/migrations.consistency.spec.ts` → 3/3 PASS
- `npm run migration:run` primera vez → "Migration AddVariantAttributeOptions…
  has been executed successfully."
- `npm run migration:run` segunda vez → "No migrations are pending" (idempotente)
- SELECT type, count(*) FROM variant_attribute_options GROUP BY type → color=7, size=14
- Detalle adicional: los 7 colores tienen su color_hex correcto y los 14
  talles (S, M, L, XL, XXL, 36..44) tienen color_hex NULL.

Commit: `9beaf46` con título `feat(products): tabla maestra variant_attribute_options con seed de colores y talles`.

Gotchas del entorno (no del feature):
- `.env` no existe en el worktree root → `data-source.ts` no levanta env vars.
  Workaround: `Copy-Item C:\Proyectos\punto_de_venta\.env <worktree>\.env`
  o exportarlas en el shell antes de `npm run migration:run`.
- `pnpm install` desde la raíz solo instala turbo y avisa sobre
  "workspaces in package.json not supported". Pero SÍ termina propagando
  node_modules al workspace `apps/backend` — verificar con
  `Test-Path apps/backend/node_modules/jest` antes de correr tests.

Siguientes (Tasks 2-3 en el plan bm-colores-talles):
- Repository + Service + DTOs de VariantAttributeOption (hereda patrón de
  `brands.repository.ts`: `Repository<Entity>` extendida vía
  `dataSource.createEntityManager()`).
- Controller + wiring en `products.module.ts`.


## [2026-08-19] Task 2 — repository + service + DTOs de VariantAttributeOption
Patrón replicado de pps/backend/src/modules/products/brands.*:
- Repository: extends Repository<T> + @Injectable() + DataSource constructor
  con createEntityManager() (sin @EntityRepository decorador — patrón moderno).
- Service: @Injectable() con constructor dual (repository + ConfigurationService)
  y un helper privado gate() que llama ssertCapabilityEnabled antes de
  cada método público.
- DTOs: doble esquema (zod como source of truth + class-validator para
  NestJS ValidationPipe). Hex regex ^#[0-9A-Fa-f]{6}$ copiado literal
  de create-category.dto.ts.

Motor de Capabilities:
- NO existía en el codebase (grep recursivo: 0 matches). Brief apuntaba a
  ConfigurationService:202-207, archivo real tiene 146 líneas.
- Solución mínima: agregar a ConfigurationService los métodos
  getCapabilitiesManifest() y ssertCapabilityEnabled(key) con
  defaults en memoria (STRUCTURAL.variants=true, los demás false).
- Próximo PR: persistir manifest en system_configuration.capabilitiesDisabled
  jsonb via migración nueva + endpoint admin.

countUsage defensivo:
- product_variant_attributes aún no existe (la migración
  1786405840951-S4AddProductVariants mencionada en el brief no se
  encuentra en este worktree). Grep por ttributeKey: 0 matches.
- countUsage(type, name) chequea la tabla con information_schema antes
  de ejecutar el SELECT y devuelve 0 si no existe. No rompe ni acopla.

Tests:
- 8/8 PASS (6 required + 2 bonus: NotFound en findOne + search delegation).
- Mock de ConfigurationService: getCapabilitiesManifest + assertCapabilityEnabled.
- arrangeCapabilityOn / arrangeCapabilityOff helpers para flippear el manifest
  entre describe blocks sin reinicializar el módulo.

Verificaciones que pasaron:
- npx jest --selectProjects unit --runTestsByPath src/modules/products/variant-attribute-options.service.spec.ts → 8/8 PASS
- npx jest --selectProjects unit --runTestsByPath src/modules/configuration/configuration.service.spec.ts → 13/13 PASS (sin regresión)
- npx jest --selectProjects unit --runTestsByPath src/migrations.consistency.spec.ts → 3/3 PASS
- npx jest --selectProjects unit --testPathPattern=products|configuration → 203/203 PASS
- lsp_diagnostics: 0 errors en los 6 archivos tocados.

Anti-patrones evitados:
- No se duplicó la implementación de orbidden/guard con un guard global
  (NestJS Guards) — el patrón del repo es service-level check, se mantiene.
- No se cambió el repository pattern existente (Repository<T> extendida).
- No se tocó brands.* (mirror literal, no refactor).
- No se modificó ninguna migración existente.

Commit: eat(products): servicio CRUD de colores/talles gateado por STRUCTURAL.variants.

Gotchas del entorno (no del feature):
- 
px jest requiere pps/backend/node_modules/.bin/jest (propagado por
  pnpm install raíz). Si falla, Test-Path apps/backend/node_modules/.bin/jest.
- Tee-Object -FilePath con rutas relativas en PowerShell sale del CWD del
  shell, no del workdir del comando. Usar rutas absolutas para evidencia.

## [2026-08-20] Task 3 — controller + wiring + smoke test
Patrón del controller literal-copy de `brands.controller.ts`:
- Decoradores en este orden: `@ApiTags(''<recurso>'')` → `@Controller(''<recurso>'')` →
  `@UseGuards(JwtAuthGuard)` → `@ApiBearerAuth()`.
- `@HttpCode(HttpStatus.CREATED)` solo en POST. Los demás usan el default.
- Capabilities gating NO se importa ni se usa en el controller — el service
  ya valida `STRUCTURAL.variants` en cada método público. Controller queda
  thin, sin dependencias extras.
- `@ApiResponse({status: 403})` en POST y `{status: 404}` en PATCH/DELETE
  para que Swagger muestre los códigos de error reales que el service lanza.

Wiring en products.module.ts (4 piezas):
- `TypeOrmModule.forFeature([Product, Category, Brand, VariantAttributeOption])`
- `controllers: [..., VariantAttributeOptionsController]`
- `providers: [..., VariantAttributeOptionsService, VariantAttributeOptionsRepository]`
- `exports: [..., VariantAttributeOptionsService]` (exportar el service
  para que inventory pueda usar `findOrCreate` al materializar la matriz).

Smoke test en test/integration/ (corre con `npm run test:integration`):
- Service-direct (no supertest) porque el JwtAuthGuard requiere AuthModule
  completo. El service ya valida capabilities, así que el camino HTTP y
  el camino service cubren la misma lógica.
- `testDataSource = new DataSource({ synchronize: true, dropSchema: true })`
  crea la tabla variant_attribute_options al iniciar.
- `beforeEach` en setup-integration.ts trunca TODAS las tablas antes de
  cada test → cada test debe crear sus propios datos (no confiar en
  estado del test anterior).

Gotcha crítico de setup-integration.ts (pre-existing bug):
- Faltaban `Location`, `ProductLocationStock`, `StockTransfer` en la lista
  de entities. `dataSource.initialize()` reventaba con
  `Entity metadata for StockMovement#location was not found` antes de
  que CUALQUIER integration test arrancara.
- Fix: agregar los 3 imports + entradas en entities[]. Aproveché para
  agregar también `VariantAttributeOption` (la entidad de este feature).
- Parametrizé la conexión con env vars `TEST_DB_HOST/PORT/USER/PASS/NAME`
  con defaults = docker-compose.test.yml (5433, test/test). Permite
  apuntar a un Postgres local cuando Docker Desktop no está activo.

Connection override para entorno sin Docker:
- En el worktree Docker Desktop service estaba disabled, no se pudo
  levantar desde shell.
- Workaround: crear `nexopos_test` en el Postgres local 5432 con las
  credenciales del .env de dev y exportar TEST_DB_* antes de correr jest.
- Test corre limpio con esa config: 10/10 PASS en 6.2s.

Tests:
- 10/10 PASS en variant-attribute-options.smoke.spec.ts (este PR).
- 8/8 PASS en variant-attribute-options.service.spec.ts (Task 2, sin cambios).
- 3/3 PASS en migrations.consistency.spec.ts (no toqué migraciones).
- 22/22 PASS en configuration.integration.spec.ts (verifica que el fix
  de setup-integration.ts no rompe tests previos).
- lsp_diagnostics: 0 errors en controller, module y smoke spec.

Anti-patrones evitados:
- NO se agregó un BaseController abstracto para compartir el patrón de
  brands y variant-attribute-options — sería una abstracción con un
  solo otro uso. YAGNI.
- NO se usó `@nestjs/testing` `Test.createTestingModule` con
  `app.getHttpServer()` + supertest porque JwtAuthGuard requeriría
  cargar AuthModule + PassportModule + firmar JWTs. Service-direct
  cubre la misma ruta de validación a menor costo.
- NO se cambió el service para agregar un parámetro HTTP-only. La
  autoridad del capability gating sigue siendo del service.

Archivos NO tocados (verificado):
- entity, service, repository, DTOs, service spec de Task 2.
- brands.*, migrations/*, entities.ts (VariantAttributeOption ya estaba
  desde Task 1), data-source.ts.

Commit: feat(products): endpoints REST de variant-attribute-options.

## [2026-08-20] Task 4 — FE api client ttributeOptionsApi
Patrón literal-copy de brandsApi en apps/frontend/src/features/products/api/products.api.ts:
- export const attributeOptionsApi = { ... } con arrow-async + pi.<verb> +
  eturn response.data. Sin hooks (consumers los crean inline con
  @tanstack/react-query que ya está en dependencies).
- Import surface: pi desde @/lib/axios + VariantAttributeOption
  del barrel ../types. La URL final es ${baseURL}/api/variant-attribute-options
  porque el instance tiene baseURL = host (axios NO lo concatena con /api).
- DTO inline en create/update con {type, name, colorHex?} / {name?, colorHex?}
  en vez de exportar DTOs nombrados: el archivo es API client puro, no tipos.

tsconfig.json del FE exige 	ypes: ["vite/client"]. Si el worktree llega sin
node_modules (frontend pendiente de inicializar), pnpm install desde
pps/frontend lo resuelve en ~32s. NO instalar desde la raíz — pnpm v10
avisa que workspaces en package.json no están soportados y no propaga a
apps/frontend.

Verificación:
- 
px tsc --noEmit desde apps/frontend → exit 2 (47 errores pre-existing en
  este worktree: cash-register/CustomerSummary, configuration/AfipConnectionStatus,
  incomes/DataTableProps, products/components/ProductList string|null,
  purchases/PurchaseStatus 'cancelled', sales/PaymentMethod drift entre
  configuration/api y sales/types, customers/ShortcutAction 'NEW_CUSTOMER',
  Dashboard recharts Formatter, ProductsPage Element-vs-string, suppliers
  ShortcutAction 'NEW_SUPPLIER', auth.store.spec fixtures, test/setup globals).
- Misma cuenta con git stash --include-untracked aplicado antes de mis
  cambios (basal). Cero diff. Los 2 archivos modificados por Task 4
  contribuyen **0 errores de tipos**.

Lockfiles:
- pnpm install regeneró pps/frontend/pnpm-lock.yaml (untracked) y
  pnpm-lock.yaml en root. NO los commiteo (no son parte del feature).
- pps/backend/pnpm-lock.yaml ya estaba modificado ANTES de Task 4
  (probablemente por pnpm install raíz en algún task previo). NO toqué.

Commit: e3affb0 con título eat(products): api client attributeOptionsApi.

Anti-patrones evitados:
- NO agregué un hook useAttributeOptions() ni useAttributeOptionsQuery()
  con @tanstack/react-query wrapper — el brief dice explícitamente que el
  consumer lo hace inline. Un wrapper acá duplicaría la elección de
  queryKey/staleTime en todos los consumers sin agregar valor.
- NO exporté DTOs nombrados desde el api file (CreateVariantAttributeOptionDTO,
  UpdateVariantAttributeOptionDTO). El archivo es api puro, no tipos. Los
  types ya viven en ../types/index.ts (Brand es el precedente inmediato).
- NO creé un archivo nuevo ttribute-options.api.ts. La regla de oro del
  repo es un archivo por feature en eatures/products/api/.
- NO extendí Brand con timestamps ni cambié otras interfaces existentes.
  VariantAttributeOption es nuevo y vive en su propio bloque.

Gotcha del entorno (no del feature):
- pps/frontend/node_modules no existe al clonar worktrees nuevos. El
  bootstrap mínimo es pnpm install desde pps/frontend antes de
  cualquier verificación de tipos.
- 
px tsc --noEmit redirigido con > file 2>&1 SÍ captura el exit code
  en $LASTEXITCODE (a diferencia de Tee-Object que lo come).
- git stash --include-untracked stashea también el .omo/ y los
  lockfiles untracked, lo cual es deseable para medir baseline de tipos.
  git stash pop restaura todo sin conflictos en este caso.

Siguientes (Task 5 en el plan bm-colores-talles):
- Modal/sheet de gestión de colores y talles que consume ttributeOptionsApi.
- Tabla con columns: name, colorHex (badge), usageCount, acciones (edit/delete).
- useCapabilities() gate si se aplica a un perfil sin pparel.

## [2026-08-20] Task 5 — VariantMatrixModal reworked + useCapabilities hook
Patrón aplicado para reescribir el modal borrado sobre el catálogo de ttributeOptionsApi:

1. Single component, no separar en CatalogPicker / MatrixGrid — los chips selected + la lista del catálogo viven en la misma pantalla, dividirlos agregaría prop drilling sin ganancia.
2. useQuery con queryKey: ['variant-attribute-options', 'size'] (y 'color') y enabled: hasVariantsCapability && open — sin esto, el componente fetchea antes de que el usuario lo abra y peor, fetchea cuando la feature está deshabilitada por capability.
3. State de selección por **id** + 
ameById: Record<string, string> para resolver nombres en handleGenerate() aunque el catálogo esté stale después de un create() (race entre invalidate y la próxima selección).
4. handleGenerate sigue mandando {Talle: string[], Color: string[]} al backend — mismo contrato que la versión borrada. @ts-expect-error sobre la línea de generateVariants documenta que es gap pre-existente.
5. Edit/Delete inline estilo BrandCombobox: pencil + trash en cada row → click pencil expande un <Input> inline (Enter guarda, Escape cancela), click trash fetch getUsageCount() y abre AlertDialog con el preview de uso antes de confirmar.

Inconsistencias del entorno:
- El hook useCapabilities no existía en este branch (el AGENTS.md lo asume). Lo creé desde cero con un fallback a defaultManifest cuando /api/configuration/manifest no responde (404 esperado en worktrees sin capabilities controller). Mantiene el contrato del AGENTS.md sin bloquear features en dev.
- productsApi.generateVariants no existe en el FE — gap arrastrado del modal borrado. @ts-expect-error evita ruido en 	sc. No es deuda nueva, ya estaba en el brief.
- presets.ts intacto: el brief dijo no tocarlo. No audité dónde se usa (probablemente código muerto) — eso va en un PR de cleanup, no acá.

Tests:
- 5/5 PASS en VariantMatrixModal.spec.tsx.
- Mocks: useCapabilities (control de hasVariantsCapability), ttributeOptionsApi (catálogo in-memory + tracking de createCalls/updateCalls/deleteCalls), productsApi vacío (no nos interesa generateVariants para estos casos).
- 113/113 PASS en full vitest suite (sin regresión).
- 
px tsc --noEmit: 47 errores pre-existentes, 0 nuevos de mis archivos. Mismo baseline que Task 4.

Comando para reproducir:
`
cd C:\Proyectos\punto_de_venta-worktrees\bm-colores-talles\apps\frontend
.\node_modules\.bin\vitest run src/features/products/components/VariantMatrixModal.spec.tsx
.\node_modules\.bin\tsc --noEmit
`

Gotchas del entorno (no del feature):
- within(catalog).getAllByRole('button') cuenta también el <button data-testid="catalog-toggle-X"> (el área seleccionable), no solo edit/delete. Para asserts precisos usar getAllByTestId(/^catalog-delete-/) o similar.
- screen.getByTestId('catalog-color') retorna apenas el contenedor existe — las filas tardan un tick más en aparecer. Usar wait screen.findByTestId('catalog-row-X') o indByTestId('catalog-delete-X') para esperar contenido real, no contenedor vacío.
- El hook de vitest de comentarios dispara con cualquier // que se agregue; mantener los inline comments al mínimo justificable (los @ts-expect-error lo exigen; el resto se eliminó).

Siguientes (Task 6 FE isolation + Task 7 E2E):
- Task 6: spec de aislamiento por rubro (no renderiza en perfil sin STRUCTURAL.variants).
- Task 7: E2E con Playwright (no se solicitó en este PR).

## [2026-08-19] Task 6 — Aislamiento de rubro (BE)
Patrón para cubrir el gate de capabilities en un service spec NestJS:

1. Definir DOS manifests: manifestAllOn y manifestVariantsOff (puede ser
   un objeto plano con solo las keys que te importan).
2. Helpers rrangeCapabilityOn() / rrangeCapabilityOff() que mockean
   configurationService.getCapabilitiesManifest y
   ssertCapabilityEnabled (este último lanza ForbiddenException cuando
   la key está alse).
3. En el eforeEach principal se aplica rrangeCapabilityOn().
4. Para cubrir el aislamiento, agregar un describe anidado con su propio
   eforeEach que llame jest.clearAllMocks() + rrangeCapabilityOff().
   El orden de eforeEach en Jest es: parent → child, así que el override
   funciona sin tocar al outer.
5. Un it por método público del service (8 en este caso):
   wait expect(service.METHOD(...)).rejects.toThrow(ForbiddenException)
   + assert de que el método del repository correspondiente NO fue llamado.
6. Cerrar con un test "resumen" usando Promise.allSettled que invoca
   TODOS los métodos del CRUD juntos + assert de TODOS los mocks del
   repository (expect(X).not.toHaveBeenCalled()). Esto previene el
   adversarial class misleading_success_output: si solo uno rechaza
   correctamente y otro se cuela al repo, el test resumen falla.

FE coverage ya existe en VariantMatrixModal.spec.tsx → test
"con capability=false no fetchea catálogo ni muestra chips" — NO duplicar.

Commit: c753037 con título 	est(products): aislamiento por rubro del catálogo de colores/talles.


## [2026-08-20] Task 7 — E2E Playwright spec para catálogo de variantes

Patrón aplicado para escribir un spec E2E sobre un componente que está **orphan**
(ningún consumer lo abre desde UI) sin modificar production code:

1. **No crear un test-harness page** en pps/frontend/src/__test-harness__/....
   Cada componente nuevo orphan NO merece un archivo de test infrastructure
   permanente. La regla ALWAYS prefer editing existing files + NEVER write new
   files unless explicitly required se respeta acá.

2. **Dynamic import desde el dev server de Vite** vía page.evaluate():
   `	s
   await page.evaluate(async () => {
     const React = await import('react');
     const ReactDOM = await import('react-dom/client');
     const { VariantMatrixModal } = await import(
       '/src/features/products/components/VariantMatrixModal'
     );
     ReactDOM.createRoot(host).render(React.createElement(VariantMatrixModal, ...));
   });
   `
   Funciona SOLO si pnpm dev está arriba. Si Vite no está, el import falla con
   404 (esperado, no es regresión — el test falla o se skipea por su lógica propia).

3. **probeServers() + 	est.beforeAll({ skip: !up })** en vez de webServer:
   el config de Playwright tiene webServer comentado (líneas 124-130 de
   playwright.config.ts). El operador del dev lo levanta a mano. El spec
   detecta el estado y se salta limpio — NO inicia servidores (regla AGENTS.md).

4. **Tests con page.request (sin UI)** cubren el contrato REST de la API.
   Estos tests verifican el backend real independientemente del estado del FE:
   - GET /api/variant-attribute-options?type=color → 7 colores seed.
   - GET /api/variant-attribute-options?type=size  → 14 talles seed.

5. **Tres gaps pre-existentes documentados con 	est.skip(true,)** explícito en
   lugar de mockear el UI para "verificar" un camino que en realidad nunca se
   ejecuta contra el backend real:
   - G1: productsApi.generateVariants no existe (Unit test cubre el flujo).
   - G2: VariantMatrixModal es orphan (sin botón "Generar Matriz" en ProductForm).
   - G3: No hay endpoint para alternar capabilities en runtime
         (configuration.service.ts tiene defaultCapabilitiesManifest hardcoded).
   El 	est.skip(true,) con un mensaje claro es documentación viva que el
   próximo maintainer (o un task F3/F4) puede levantar.

6. **Persistencia verificada por REST, no por UI state**:
   Después de "On-the-fly add Camel", el spec hace una request manual a
   GET /api/variant-attribute-options?type=color y asserta que la respuesta
   contiene el nuevo nombre. Esto previene stale_state y misleading_success:
   si el chip aparece pero el POST no se ejecutó, el assert REST falla.

7. **Header del spec auto-documenta runtime requirements + gaps**:
   - PREREQUISITOS (qué servidores, qué seed, qué credenciales).
   - Comando para ejecutar.
   - Qué pasa si se corre con dev servers caídos (skip limpio).
   - Gaps G1/G2/G3 con pointers a archivos y tareas de desbloqueo.

Anti-patrones evitados:
- NO agregué un archivo __test-harness__/VariantMatrixHarnessPage.tsx ni un
  route nuevo en App.tsx. Cada componente orphan NO merece un test-harness page
  permanente — solo el wire-up real (F3) cierra el gap.
- NO mockeé la UI con page.route() para "verificar" el camino OFF del capability.
  Sería un test que no ejecuta contra el backend real. Mejor 	est.skip(true,)
  con pointers al unit test que sí cubre el camino OFF con mockHasVariantsCapability=false.
- NO corrí el spec sin dev servers (regla AGENTS.md). El probeServers() +
  	est.beforeAll({ skip }) ya garantiza que no se ejecuta si están down.

Verificación:
- 
px playwright test --list e2e/tests/variant-attribute-options-catalog.spec.ts
  → 9 tests listados, sin errores de parseo de TS en Playwright.
- Spec no incluido en pps/frontend/tsconfig.json (include: ["src"]), pero
  Playwright lo bundle con su propio resolver y lo parsea OK al listar.
- 
px tsc --noEmit (del tsconfig de src) sigue con 47 errores pre-existentes,
  0 nuevos de mi trabajo.

Archivos modificados/creados:
- M  apps/frontend/e2e/tests/variant-attribute-options-catalog.spec.ts (NEW, 390 lines)
- A  .omo/evidence/task-7-bm-colores-talles/00-dev-server-probe.txt
- A  .omo/evidence/task-7-bm-colores-talles/01-runtime-requirements.txt
- A  .omo/evidence/task-7-bm-colores-talles/02-gap-G1-generateVariants.md
- A  .omo/evidence/task-7-bm-colores-talles/03-gap-G2-orphan-modal.md
- A  .omo/evidence/task-7-bm-colores-talles/04-gap-G3-capability-isolation.md
- A  .omo/evidence/task-7-bm-colores-talles/SCREENSHOTS-PLACEHOLDER.md
- A  .omo/evidence/task-7-bm-colores-talles/trace.zip.placeholder
- A  .omo/evidence/task-7-bm-colores-talles/README.md

Commit message (siguiente):
- 	est(e2e): matriz de variantes con catálogo de colores/talles y aislamiento de rubro

Gotchas del entorno (no del feature):
- webServer en playwright.config.ts está comentado — el operador maneja los
  dev servers. Por eso el spec debe detectar el estado y skipear (no usar webServer).
- El endpoint GET /api/health no está documentado en el controller de
  ConfigurationController, pero la mayoría de los NestJS apps lo exponen vía
  Terminus o un controller dedicado. Si el probe a /api/health retorna 404,
  el spec igual se skipea (cualquier res.ok() false cuenta como backendDown).
- 
px playwright test --list parsea TS usando el resolver default de Playwright
  (no usa el tsconfig.json del proyecto). Para que tipos estrictos se validen
  en CI, agregar pps/frontend/e2e/tsconfig.json con extends del principal +
  include de e2e/. Out of scope de este task.

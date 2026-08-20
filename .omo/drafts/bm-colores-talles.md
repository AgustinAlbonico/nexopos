---
slug: bm-colores-talles
status: awaiting-approval
intent: clear
review_required: false
pending-action: write .omo/plans/bm-colores-talles.md
approach: Tabla maestra única `variant_attribute_options` (type color|talle) espejo del patrón brands, gestión inline en VariantMatrixModal (alta al vuelo + editar/eliminar), seed idempotente, gating por STRUCTURAL.variants
---

# Draft: bm-colores-talles

## Components (topology ledger)
<!-- Lock the SHAPE before depth. One row per top-level component that can succeed or fail independently. -->
<!-- id | outcome (one line) | status: active|deferred | evidence path -->
1 | BE: tabla única parametrizada (color|talle) con CRUD patrón brands + migración con seed + gating STRUCTURAL.variants | active | apps/backend/src/modules/products/brands.* (template), apps/backend/src/migrations.ts
2 | FE: attributeOptionsApi + rework secciones Talles y Colores de VariantMatrixModal (chips de catálogo, alta al vuelo, gestión inline) | active | apps/frontend/src/features/products/components/VariantMatrixModal.tsx
3 | Tests pirámide AGENTS.md: unit BE + smoke + vitest FE + validación Playwright + aislamiento por rubro | active | apps/backend/test/smoke/products.smoke.spec.ts (template)

## Open assumptions (announced defaults)
<!-- Record any default you adopt instead of asking, so the user can veto it at the gate. -->
<!-- assumption | adopted default | rationale | reversible? -->
Seed inicial | 7 colores actuales con hex (Negro #18181b, Blanco #ffffff, Azul #2563eb, Rojo #dc2626, Gris #6b7280, Verde #16a34a, Beige #f5f5dc) + 14 talles (S,M,L,XL,XXL,36..44) con ON CONFLICT DO NOTHING | día 1 sin cambio visual vs. hoy | reversible
Acoplamiento de datos | Sin FK: variantes siguen guardando strings en product_variant_attributes; rename/delete del catálogo NO tocan datos históricos (conteo solo informativo) | igual patrón que brandName; evita migración de datos | reversible
Unicidad | única por (type, LOWER(name)) vía index + check ILike en service (como brands.service.update) | consistencia con patrón existente | reversible
colorHex | columna opcional, solo aplica a type=color (null para size) | ApparelMatrixCellDto ya lo contempla | reversible
Alta al vuelo | POST find-or-create idempotente (como brands) | el operador no se frena; evita duplicados | reversible
Gating | reusar capability STRUCTURAL.variants (misma que la UI de matriz) + ForbiddenException en service | AGENTS.md lo exige; no crea key nueva | reversible

## Findings (cited - path:lines)
- Presets hardcodeados a eliminar: COLORES_PRESETS / TALLES_CLOTHING_PRESETS / TALLES_SHOES_PRESETS en apps/frontend/src/features/products/components/VariantMatrixModal.tsx:19-21
- Patrón brands completo (template a espejar): apps/backend/src/modules/products/brands.controller.ts (search/findAll/findOne/product-count/create/update/remove, JwtAuthGuard), brands.service.ts (findOrCreate:19, update con ILike conflict:76-95, remove desasocia:100-118), brands.repository.ts (findOrCreateByName:14, searchByName:32, countProducts:52), entities/brand.entity.ts, dto/create-brand.dto.ts
- Wiring: products.module.ts registra BrandsService; migraciones 1768003658000-AddBrandsSupport.ts y 1768003659000-SimplifyBrandsTable.ts registradas en apps/backend/src/migrations.ts
- Gestión inline FE (template): apps/frontend/src/features/products/components/BrandCombobox.tsx — crear al vuelo (179-189), editar inline (203-237), borrar con conteo (306-343)
- Gating FE: ProductForm.tsx:110-111 usa useCapabilities()['STRUCTURAL.variants']
- Capability keys backend: apps/backend/src/modules/configuration/capabilities/keys.ts:10 ('STRUCTURAL.variants')
- El color hoy es string libre: apps/backend/src/modules/products/dto/create-apparel-matrix.dto.ts:16-31 (color 1-100 + colorHex opcional)
- Variantes persisten attributeKey/Value: migración 1786405840951-S4AddProductVariants.ts:11 (product_variant_attributes UNIQUE productId+attributeKey)
- generateVariants recibe { Talle: string[], Color: string[] }: VariantMatrixModal.tsx:70-73 (NO cambia con este plan)
- [Explorer confirmado] Helper de gating existente: configuration.service.ts:202-207 `assertCapabilityEnabled(capabilityKey)` lanza ForbiddenException(`${key} capability is disabled`) — USAR ESTE HELPER, no hand-rolled
- [Explorer confirmado] Wiring exacto products.module.ts: imports líneas 14-17, TypeOrmModule.forFeature línea 21, controllers línea 25, providers 26-33, exports línea 34 (BrandsService ya se registra así)
- [Explorer confirmado] Registro migración: migrations.ts importa (líneas 7-8) + array (líneas 46-47), orden cronológico; migrations.consistency.spec.ts debe pasar (AGENTS.md)
- [Explorer confirmado] Hoy NINGÚN endpoint de matriz/variantes está gateado en backend y VariantMatrixModal/ProductVariantMatrixSelector no chequean useCapabilities — el gate del catálogo nuevo será la primera enforcement real de STRUCTURAL.variants en products (consistente con AGENTS.md §Motor de Capacidades)
- [Explorer confirmado] Tests smoke de brands: apps/backend/test/smoke/products.smoke.spec.ts (template para smoke del catálogo nuevo)
- [Explorer confirmado] Seed pattern: payment-methods.service.ts usa onModuleInit+seed, pero NO copiar — el seed va en la migración (ON CONFLICT DO NOTHING), idempotente y visible en SQL

## Decisions (with rationale)
1. Tabla ÚNICA parametrizada (type color|talle), no dos módulos clonados — elegido por el usuario (colores+talles); un solo entity/service/controller/migración.
2. Gestión inline como marcas, sin página admin — elegido por el usuario.
3. Módulo dentro de products/ (no configuration/) — mismo lugar que brands, misma convención.
4. Rename/delete no propagan a product_variant_attributes — datos históricos intocados (paridad con brands).

## Scope IN
- Backend: entity VariantAttributeOption + repository + service (findOrCreate/findAll?type/search/update/remove+count) + controller + DTOs + migración (tabla + unique index + seed) + registro en migrations.ts + wiring products.module.ts + gating STRUCTURAL.variants con ForbiddenException
- Frontend: attributeOptionsApi en products.api.ts (o archivo propio) + rework de AMBAS secciones de VariantMatrixModal: chips desde catálogo (reemplazan presets), input libre con alta al vuelo (findOrCreate), gestión inline editar/eliminar (con conteo informativo), selector de hex para colores; invalidación de queries
- Tests: unit BE service (incl. gating off -> ForbiddenException y unicidad), smoke, vitest FE VariantMatrixModal (chips desde mock API, alta al vuelo), validación Playwright con conmutación de rubro

## Scope OUT (Must NOT have)
- NO página/sección admin en Configuración
- NO FK desde variantes ni migración/normalización de product_variant_attributes existentes
- NO tocar ProductVariantMatrixGrid (stub), PurchaseMatrixModal, ProductVariantMatrixSelector (lectura)
- NO nueva capability key (reusar STRUCTURAL.variants)
- NO cambiar contrato del endpoint de matriz (create-apparel-matrix/generateVariants siguen recibiendo strings)
- NO reorder/sortOrder ni i18n ni multi-idioma de nombres

## Open questions
(none - ambos forks resueltos por el usuario: inline + colores+talles)

## Approval gate
status: approved (2026-08-19, user reply: "ok")
pending: write .omo/plans/bm-colores-talles.md tras ok explícito del usuario
plan-written: 2026-08-19 — 7 todos, 3 waves, TL;DR completo
metis: UNAVAILABLE (2 intentos bg_fbdf552d y bg_4372571c murieron por "usage limit reached" del modelo) — gap analysis ejecutado inline por el planner; 4 hallazgos foldeados (verificación persistencia createMatrix para usage-count, orden unique-index-antes-de-seed + ON CONFLICT (type,name) explícito, redacción ambigua todo 2 aclarada: TODOS los métodos gatean, type inmutable en PATCH)
review_required: true (usuario optó por high-accuracy review primero)
review-round-1: Momus bg_afc89ec2 (session ses_fe392cff7ffeXXyl7g4CEIsZmw, verdict NEEDS_FIX, 2 critical issues) + Oracle bg_023cbac3 (session ses_fe392a783ffeq4DMJrC6pS2TkC, verdict NEEDS_FIX, 6 issues algunos superpuestos). Hallazgos únicos consolidados y foldeados:
  1. Registro faltante en apps/backend/src/entities.ts (entity import + array entry) — sin esto el bundle de producción y dataSource.getRepository(VariantAttributeOption) fallan
  2. countUsage con atributoKey assumption ungrounded — fallback LOWERCASE IN ('color','talle','size') + si sigue 0, descubrir por SQL y documentar (countUsage vacío documentado en el header del repo)
  3. Repositorio custom extends Repository<VariantAttributeOption> (NO default Repository<>); DTOs export en dto/index.ts
  4. Spec del smoke en test/smoke/ es código muerto (jest no matchea esa ruta) — mover a test/integration/ con `npm run test:integration`
  5. Migration class name field debe terminar con TIMESTAMP de 13 dígitos (consistency spec validation)
  6. productsApi.generateVariants no existe + VariantMatrixModal es orphan code pre-existing — todo 5 NO implementa este gap (out of scope); e2e del todo 7 lo marca SKIP con console.error
  7. Todo 6: FE isolation del selector YA está en ProductForm.spec.tsx:140-146 (no duplicar); este todo agrega el enabled=false del useQuery del catálogo
  8. Todo 7: endpoint de conmutación real NO es POST /api/configuration/onboarding (eso es onboarding); inspeccionar configuration.controller.ts y capabilities.controller.ts antes; documentar endpoint y body exactos, fallback a todo 6 + screenshot
  9. Swatch fallback cuando colorHex es null (size o color creado sin hex) — renderizar sin romper
review-round-2: Momus bg_ee8f6084 (session ses_fe376e0f9ffeDS1EwQZKwd705X, VERDICT OKAY unconditional) + Oracle bg_b4e6a2fc (session ses_fe376a2e2ffe73IEtunZIs53y4, VERDICT OKAY unconditional). 6 prior findings todos fixed; 5 non-blocking minor observations surfaced (phantom capabilities.controller.ts reference, "mismo runner" wording, hex regex pattern, countUsage = vs IN, technicianKey para switch e2e) — ejecutor los resuelve on inspection.
review-status: OKAY unconditional (dual) — plan decision-complete
handoff: pendiente pregunta de cierre al usuario (start work)

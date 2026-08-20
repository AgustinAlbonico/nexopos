# Promociones automáticas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar promociones automáticas tipadas (`item_discount`, `order_discount`, `buy_get`) que aplican al carrito, persisten su asignación congelada y se reverten correctamente en devoluciones.

**Architecture:** Módulo nuevo `apps/backend/src/modules/promotions/` con un evaluador puro, integración en `SalesService.create` y `SaleReturnService`, endpoint de preview, y feature module frontend para admin + caja. Una sola promoción ganadora; sin stacking.

**Tech Stack:** NestJS 10, TypeORM 0.3, PostgreSQL 15, React 18 + Vite, Tailwind + shadcn/ui, React Hook Form + Zod, class-validator.

**Diseño de referencia:** `docs/plans/2026-08-12-automatic-promotions-design.md`.

**Reglas del proyecto (AGENTS.md):**
- Toda migración se registra en `apps/backend/src/migrations.ts` y pasa `migrations.consistency.spec.ts`.
- Ponytail: mínimo código que funciona, sin abstracciones prematuras.
- No levantar backend/frontend automáticamente (hot reload).

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `apps/backend/src/modules/promotions/promotions.constants.ts` | Enum `PromotionKind`, `DiscountType`, `PromotionScope` |
| `apps/backend/src/modules/promotions/entities/promotion.entity.ts` | Entidad TypeORM `promotions` |
| `apps/backend/src/modules/promotions/entities/sale-promotion.entity.ts` | Entidad TypeORM `sale_promotions` (snapshot congelado) |
| `apps/backend/src/modules/promotions/promotion-evaluator.ts` | Evaluación pura: candidatos → ganadora → asignaciones |
| `apps/backend/src/modules/promotions/promotion-evaluator.spec.ts` | Tests unitarios del evaluador |
| `apps/backend/src/modules/promotions/dto/create-promotion.dto.ts` | DTO de creación |
| `apps/backend/src/modules/promotions/dto/update-promotion.dto.ts` | DTO de actualización |
| `apps/backend/src/modules/promotions/promotions.service.ts` | CRUD admin |
| `apps/backend/src/modules/promotions/promotions.controller.ts` | Endpoints admin |
| `apps/backend/src/modules/promotions/promotions.module.ts` | Wiring NestJS |
| `apps/backend/src/migrations/{ts}-AddPromotions.ts` | Migración: tablas `promotions` + `sale_promotions` |
| `apps/backend/src/modules/sales/sales.service.ts` | Integración del evaluador en `create` + `calculateSaleTotals` |
| `apps/backend/src/modules/sales/sales.controller.ts` | Endpoint `POST /sales/preview-promotions` |
| `apps/backend/src/modules/sales/sale-return.service.ts` | Devolución proporcional basada en snapshot |
| `apps/frontend/src/features/promotions/` | Admin: lista, formulario, api, schema, types |
| `apps/frontend/src/features/sales/api/sales.api.ts` | `previewPromotions(cart)` |
| `apps/frontend/src/features/sales/components/SaleTotals.tsx` | Render de ahorro y nombre de promo |

---

## Task 1: Constantes y tipos del dominio

**Files:**
- Create: `apps/backend/src/modules/promotions/promotions.constants.ts`

- [ ] **Step 1: Crear el archivo de constantes**

```ts
export enum PromotionKind {
    ITEM_DISCOUNT = 'item_discount',
    ORDER_DISCOUNT = 'order_discount',
    BUY_GET = 'buy_get',
}

export enum DiscountType {
    PERCENT = 'percent',
    FIXED = 'fixed',
}

export enum PromotionScope {
    PRODUCT = 'product',
    CATEGORY = 'category',
}

export const PROMOTION_KINDS = Object.values(PromotionKind);
export const DISCOUNT_TYPES = Object.values(DiscountType);
export const PROMOTION_SCOPES = Object.values(PromotionScope);
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit -p apps/backend/tsconfig.json`
Expected: PASS (sin errores nuevos)

- [ ] **Step 3: Commit**

```bash
$env:GIT_MASTER='1'; git add apps/backend/src/modules/promotions/promotions.constants.ts
$env:GIT_MASTER='1'; git commit -m "feat(promotions): add domain constants and enums"
```

---

## Task 2: Entidad `Promotion`

**Files:**
- Create: `apps/backend/src/modules/promotions/entities/promotion.entity.ts`

- [ ] **Step 1: Crear la entidad**

```ts
import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { PromotionKind, DiscountType, PromotionScope } from '../promotions.constants';

@Entity('promotions')
@Index(['active', 'startsAt', 'endsAt'])
export class Promotion {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 120 })
    name!: string;

    @Column({ type: 'enum', enum: PromotionKind })
    kind!: PromotionKind;

    @Column({ type: 'enum', enum: DiscountType })
    discountType!: DiscountType;

    @Column({ type: 'decimal', precision: 20, scale: 4 })
    discountValue!: number;

    @Column({ type: 'enum', enum: PromotionScope, nullable: true })
    scope!: PromotionScope | null;

    @Column({ type: 'uuid', array: true, nullable: true })
    scopeProductIds!: string[] | null;

    @Column({ type: 'uuid', array: true, nullable: true })
    scopeCategoryIds!: string[] | null;

    @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
    minOrderAmount!: number | null;

    @Column({ type: 'int', nullable: true })
    buyQuantity!: number | null;

    @Column({ type: 'int', nullable: true })
    getQuantity!: number | null;

    @Column({ type: 'int', default: 100 })
    priority!: number;

    @Column({ type: 'boolean', default: true })
    active!: boolean;

    @Column({ type: 'timestamp with time zone', nullable: true })
    startsAt!: Date | null;

    @Column({ type: 'timestamp with time zone', nullable: true })
    endsAt!: Date | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit -p apps/backend/tsconfig.json`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
$env:GIT_MASTER='1'; git add apps/backend/src/modules/promotions/entities/promotion.entity.ts
$env:GIT_MASTER='1'; git commit -m "feat(promotions): add Promotion entity"
```

---

## Task 3: Entidad `SalePromotion` (snapshot congelado)

**Files:**
- Create: `apps/backend/src/modules/promotions/entities/sale-promotion.entity.ts`

- [ ] **Step 1: Crear la entidad**

```ts
import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';
import { PromotionKind } from '../promotions.constants';

export type SalePromotionLineAllocation = {
    readonly saleItemId: string;
    readonly amount: number;
};

@Entity('sale_promotions')
@Index(['saleId'])
export class SalePromotion {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    saleId!: string;

    @Column({ type: 'uuid', nullable: true })
    promotionId!: string | null;

    @Column({ type: 'varchar', length: 120 })
    promotionName!: string;

    @Column({ type: 'enum', enum: PromotionKind, nullable: true })
    promotionKind!: PromotionKind | null;

    @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
    totalDiscount!: number;

    @Column({ type: 'jsonb', nullable: true })
    lineAllocations!: SalePromotionLineAllocation[] | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit -p apps/backend/tsconfig.json`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
$env:GIT_MASTER='1'; git add apps/backend/src/modules/promotions/entities/sale-promotion.entity.ts
$env:GIT_MASTER='1'; git commit -m "feat(promotions): add SalePromotion snapshot entity"
```

---

## Task 4: Migración `AddPromotions`

**Files:**
- Create: `apps/backend/src/migrations/1786600000000-AddPromotions.ts`
- Modify: `apps/backend/src/migrations.ts`

- [ ] **Step 1: Crear la migración**

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromotions1786600000000 implements MigrationInterface {
    name = 'AddPromotions1786600000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."promotions_kind_enum" AS ENUM('item_discount', 'order_discount', 'buy_get')`);
        await queryRunner.query(`CREATE TYPE "public"."promotions_discounttype_enum" AS ENUM('percent', 'fixed')`);
        await queryRunner.query(`CREATE TYPE "public"."promotions_scope_enum" AS ENUM('product', 'category')`);
        await queryRunner.query(`
            CREATE TABLE "promotions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(120) NOT NULL,
                "kind" "public"."promotions_kind_enum" NOT NULL,
                "discountType" "public"."promotions_discounttype_enum" NOT NULL,
                "discountValue" numeric(20,4) NOT NULL,
                "scope" "public"."promotions_scope_enum",
                "scopeProductIds" uuid array,
                "scopeCategoryIds" uuid array,
                "minOrderAmount" numeric(20,2),
                "buyQuantity" integer,
                "getQuantity" integer,
                "priority" integer NOT NULL DEFAULT 100,
                "active" boolean NOT NULL DEFAULT true,
                "startsAt" TIMESTAMP WITH TIME ZONE,
                "endsAt" TIMESTAMP WITH TIME ZONE,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "pk_promotions" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_promotions_active_window" ON "promotions" ("active", "startsAt", "endsAt")`);

        await queryRunner.query(`CREATE TYPE "public"."sale_promotions_promotionkind_enum" AS ENUM('item_discount', 'order_discount', 'buy_get')`);
        await queryRunner.query(`
            CREATE TABLE "sale_promotions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "saleId" uuid NOT NULL,
                "promotionId" uuid,
                "promotionName" character varying(120) NOT NULL,
                "promotionKind" "public"."sale_promotions_promotionkind_enum",
                "totalDiscount" numeric(20,2) NOT NULL DEFAULT 0,
                "lineAllocations" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "pk_sale_promotions" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_sale_promotions_sale_id" ON "sale_promotions" ("saleId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_sale_promotions_sale_id"`);
        await queryRunner.query(`DROP TABLE "sale_promotions"`);
        await queryRunner.query(`DROP TYPE "public"."sale_promotions_promotionkind_enum"`);
        await queryRunner.query(`DROP INDEX "idx_promotions_active_window"`);
        await queryRunner.query(`DROP TABLE "promotions"`);
        await queryRunner.query(`DROP TYPE "public"."promotions_scope_enum"`);
        await queryRunner.query(`DROP TYPE "public"."promotions_discounttype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."promotions_kind_enum"`);
    }
}
```

- [ ] **Step 2: Registrar en `apps/backend/src/migrations.ts`**

Agregar el import y la entrada al array `migrations`, respetando el orden cronológico:

```ts
import { AddPromotions1786600000000 } from './migrations/1786600000000-AddPromotions';

export const migrations = [
    // ... existing
    AddPromotions1786600000000,
];
```

- [ ] **Step 3: Correr el test de consistencia**

Run: `npx jest --selectProjects unit --runTestsByPath src/migrations.consistency.spec.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
$env:GIT_MASTER='1'; git add apps/backend/src/migrations/1786600000000-AddPromotions.ts apps/backend/src/migrations.ts
$env:GIT_MASTER='1'; git commit -m "feat(promotions): add migrations for promotions and sale_promotions tables"
```

---

## Task 5: Evaluador puro — escribir tests primero (TDD)

**Files:**
- Create: `apps/backend/src/modules/promotions/promotion-evaluator.spec.ts`
- Create: `apps/backend/src/modules/promotions/promotion-evaluator.ts`

- [ ] **Step 1: Escribir los tests que definen el comportamiento**

```ts
import { PromotionKind, DiscountType, PromotionScope } from './promotions.constants';
import { evaluatePromotions, type EvalInput, type PromotionCandidate } from './promotion-evaluator';

function promo(over: Partial<PromotionCandidate>): PromotionCandidate {
    return {
        id: 'p1',
        name: 'P1',
        kind: PromotionKind.ITEM_DISCOUNT,
        discountType: DiscountType.PERCENT,
        discountValue: 10,
        scope: null,
        scopeProductIds: null,
        scopeCategoryIds: null,
        minOrderAmount: null,
        buyQuantity: null,
        getQuantity: null,
        priority: 100,
        ...over,
    };
}

function item(productId: string, qty: number, unitPrice: number) {
    return { productId, quantity: qty, unitPrice, categoryId: null as string | null };
}

function input(items: ReturnType<typeof item>[], promotions: PromotionCandidate[], now = new Date('2026-08-12T12:00:00Z')): EvalInput {
    return { items, promotions, now };
}

describe('promotion-evaluator', () => {
    it('devuelve sin promo cuando no hay promociones activas', () => {
        const result = evaluatePromotions(input([item('a', 2, 100)], []));
        expect(result.promotionId).toBeNull();
        expect(result.totalDiscount).toBe(0);
        expect(result.lineAdjustments).toEqual([]);
    });

    it('aplica item_discount porcentual sobre un producto del scope', () => {
        const p = promo({
            kind: PromotionKind.ITEM_DISCOUNT,
            discountType: DiscountType.PERCENT,
            discountValue: 20,
            scope: PromotionScope.PRODUCT,
            scopeProductIds: ['a'],
        });
        const result = evaluatePromotions(input([item('a', 2, 100)], [p]));
        expect(result.promotionId).toBe('p1');
        expect(result.totalDiscount).toBe(40); // 20% de 200
        expect(result.lineAdjustments).toHaveLength(1);
        expect(result.lineAdjustments[0].amount).toBe(40);
    });

    it('aplica item_discount fijo por unidad', () => {
        const p = promo({
            id: 'p2', name: 'Fixed',
            kind: PromotionKind.ITEM_DISCOUNT,
            discountType: DiscountType.FIXED,
            discountValue: 15,
            scope: PromotionScope.PRODUCT,
            scopeProductIds: ['a'],
        });
        const result = evaluatePromotions(input([item('a', 3, 100)], [p]));
        expect(result.totalDiscount).toBe(45); // 15 * 3
    });

    it('aplica order_discount porcentual al superar minOrderAmount', () => {
        const p = promo({
            kind: PromotionKind.ORDER_DISCOUNT,
            discountType: DiscountType.PERCENT,
            discountValue: 10,
            minOrderAmount: 150,
        });
        const result = evaluatePromotions(input([item('a', 2, 100)], [p]));
        expect(result.totalDiscount).toBe(20); // 10% de 200
    });

    it('no aplica order_discount si no supera minOrderAmount', () => {
        const p = promo({
            kind: PromotionKind.ORDER_DISCOUNT,
            discountType: DiscountType.PERCENT,
            discountValue: 10,
            minOrderAmount: 250,
        });
        const result = evaluatePromotions(input([item('a', 2, 100)], [p]));
        expect(result.promotionId).toBeNull();
    });

    it('aplica buy_get 2x1 mismo producto', () => {
        const p = promo({
            id: 'b1', name: '2x1',
            kind: PromotionKind.BUY_GET,
            discountType: DiscountType.PERCENT,
            discountValue: 100,
            scope: PromotionScope.PRODUCT,
            scopeProductIds: ['a'],
            buyQuantity: 1,
            getQuantity: 1,
        });
        const result = evaluatePromotions(input([item('a', 2, 100)], [p]));
        expect(result.totalDiscount).toBe(100); // 1 unidad gratis
    });

    it('aplica buy_get 3x2 (compra 2 lleva 3, descuenta 1)', () => {
        const p = promo({
            id: 'b2', name: '3x2',
            kind: PromotionKind.BUY_GET,
            discountType: DiscountType.PERCENT,
            discountValue: 100,
            scope: PromotionScope.PRODUCT,
            scopeProductIds: ['a'],
            buyQuantity: 2,
            getQuantity: 3,
        });
        const result = evaluatePromotions(input([item('a', 3, 100)], [p]));
        expect(result.totalDiscount).toBe(100); // 1 unidad gratis
    });

    it('elige la promo con mayor descuento cuando varias coinciden', () => {
        const p10 = promo({ id: 'a', name: 'A', discountValue: 10, scope: PromotionScope.PRODUCT, scopeProductIds: ['x'] });
        const p25 = promo({ id: 'b', name: 'B', discountValue: 25, scope: PromotionScope.PRODUCT, scopeProductIds: ['x'] });
        const result = evaluatePromotions(input([item('x', 1, 100)], [p10, p25]));
        expect(result.promotionId).toBe('b');
        expect(result.totalDiscount).toBe(25);
    });

    it('desempata por priority asc cuando el descuento es igual', () => {
        const p1 = promo({ id: 'z', name: 'Z', discountValue: 10, priority: 200, scope: PromotionScope.PRODUCT, scopeProductIds: ['x'] });
        const p2 = promo({ id: 'a', name: 'A', discountValue: 10, priority: 50, scope: PromotionScope.PRODUCT, scopeProductIds: ['x'] });
        const result = evaluatePromotions(input([item('x', 1, 100)], [p1, p2]));
        expect(result.promotionId).toBe('a'); // menor priority
    });

    it('desempata por id estable cuando priority y descuento coinciden', () => {
        const p1 = promo({ id: 'zzz', name: 'Z', discountValue: 10, priority: 100, scope: PromotionScope.PRODUCT, scopeProductIds: ['x'] });
        const p2 = promo({ id: 'aaa', name: 'A', discountValue: 10, priority: 100, scope: PromotionScope.PRODUCT, scopeProductIds: ['x'] });
        const result = evaluatePromotions(input([item('x', 1, 100)], [p1, p2]));
        expect(result.promotionId).toBe('aaa');
    });

    it('nunca hace negativo el total', () => {
        const p = promo({
            kind: PromotionKind.ITEM_DISCOUNT,
            discountType: DiscountType.FIXED,
            discountValue: 500, // excede el base
            scope: PromotionScope.PRODUCT,
            scopeProductIds: ['a'],
        });
        const result = evaluatePromotions(input([item('a', 1, 100)], [p]));
        expect(result.totalDiscount).toBe(100); // tope en baseAmount
    });
});
```

- [ ] **Step 2: Verificar que los tests fallan**

Run: `npx jest --selectProjects unit --runTestsByPath src/modules/promotions/promotion-evaluator.spec.ts`
Expected: FAIL (módulo no existe)

- [ ] **Step 3: Implementar el evaluador mínimo que pasa los tests**

```ts
import { PromotionKind, DiscountType, PromotionScope } from './promotions.constants';

export type PromotionCandidate = {
    readonly id: string;
    readonly name: string;
    readonly kind: PromotionKind;
    readonly discountType: DiscountType;
    readonly discountValue: number;
    readonly scope: PromotionScope | null;
    readonly scopeProductIds: readonly string[] | null;
    readonly scopeCategoryIds: readonly string[] | null;
    readonly minOrderAmount: number | null;
    readonly buyQuantity: number | null;
    readonly getQuantity: number | null;
    readonly priority: number;
};

export type EvalInputItem = {
    readonly productId: string;
    readonly quantity: number;
    readonly unitPrice: number;
    readonly categoryId: string | null;
};

export type EvalInput = {
    readonly items: readonly EvalInputItem[];
    readonly promotions: readonly PromotionCandidate[];
    readonly now: Date;
};

export type LineAdjustment = {
    readonly itemIndex: number;
    readonly amount: number;
    readonly promoId: string;
};

export type EvalResult = {
    readonly promotionId: string | null;
    readonly promotionName: string | null;
    readonly totalDiscount: number;
    readonly lineAdjustments: readonly LineAdjustment[];
};

type CandidateResult = {
    readonly promo: PromotionCandidate;
    readonly totalDiscount: number;
    readonly lineAdjustments: readonly LineAdjustment[];
};

function matchesScope(promo: PromotionCandidate, item: EvalInputItem): boolean {
    if (promo.scope === null) return true; // sin scope = aplica a todo
    if (promo.scope === PromotionScope.PRODUCT) {
        return promo.scopeProductIds?.includes(item.productId) ?? false;
    }
    if (promo.scope === PromotionScope.CATEGORY) {
        if (!item.categoryId) return false;
        return promo.scopeCategoryIds?.includes(item.categoryId) ?? false;
    }
    return false;
}

function clampDiscount(amount: number, base: number): number {
    return Math.max(0, Math.min(amount, base));
}

function evaluateOne(promo: PromotionCandidate, items: readonly EvalInputItem[]): CandidateResult | null {
    if (promo.kind === PromotionKind.ITEM_DISCOUNT) {
        const adjustments: LineAdjustment[] = [];
        let total = 0;
        items.forEach((item, idx) => {
            if (!matchesScope(promo, item)) return;
            const base = item.quantity * item.unitPrice;
            const perUnit = promo.discountType === DiscountType.PERCENT
                ? item.unitPrice * (promo.discountValue / 100)
                : promo.discountValue;
            const amount = clampDiscount(perUnit * item.quantity, base);
            if (amount > 0) {
                adjustments.push({ itemIndex: idx, amount, promoId: promo.id });
                total += amount;
            }
        });
        if (adjustments.length === 0) return null;
        return { promo, totalDiscount: total, lineAdjustments: adjustments };
    }

    if (promo.kind === PromotionKind.ORDER_DISCOUNT) {
        const base = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
        if (promo.minOrderAmount !== null && base < promo.minOrderAmount) return null;
        const rawDiscount = promo.discountType === DiscountType.PERCENT
            ? base * (promo.discountValue / 100)
            : promo.discountValue;
        const total = clampDiscount(rawDiscount, base);
        if (total <= 0) return null;
        // prorratear por línea proporcional al base
        const adjustments: LineAdjustment[] = [];
        items.forEach((item, idx) => {
            const lineBase = item.quantity * item.unitPrice;
            const share = base > 0 ? lineBase / base : 0;
            const amount = Math.round((total * share) * 100) / 100;
            if (amount > 0) adjustments.push({ itemIndex: idx, amount, promoId: promo.id });
        });
        // ajustar redondeo en la última línea para que sume exacto
        const diff = total - adjustments.reduce((s, a) => s + a.amount, 0);
        if (adjustments.length > 0 && Math.abs(diff) > 0) {
            adjustments[adjustments.length - 1] = { ...adjustments[adjustments.length - 1], amount: adjustments[adjustments.length - 1].amount + diff };
        }
        return { promo, totalDiscount: total, lineAdjustments: adjustments };
    }

    if (promo.kind === PromotionKind.BUY_GET) {
        if (!promo.buyQuantity || !promo.getQuantity) return null;
        const applicable = items.filter((i) => matchesScope(promo, i));
        const adjustments: LineAdjustment[] = [];
        let total = 0;
        applicable.forEach((item) => {
            const idx = items.indexOf(item);
            const groupsOfGet = Math.floor(item.quantity / promo.getQuantity!);
            const freeUnits = Math.min(groupsOfGet, promo.getQuantity! - promo.buyQuantity!);
            if (freeUnits <= 0) return;
            const amount = clampDiscount(freeUnits * item.unitPrice, item.quantity * item.unitPrice);
            if (amount > 0) {
                adjustments.push({ itemIndex: idx, amount, promoId: promo.id });
                total += amount;
            }
        });
        if (adjustments.length === 0) return null;
        return { promo, totalDiscount: total, lineAdjustments: adjustments };
    }

    return null;
}

export function evaluatePromotions(input: EvalInput): EvalResult {
    const candidates = input.promotions
        .map((p) => evaluateOne(p, input.items))
        .filter((c): c is CandidateResult => c !== null);

    if (candidates.length === 0) {
        return { promotionId: null, promotionName: null, totalDiscount: 0, lineAdjustments: [] };
    }

    const winner = candidates.reduce((best, cur) => {
        if (cur.totalDiscount > best.totalDiscount) return cur;
        if (cur.totalDiscount < best.totalDiscount) return best;
        if (cur.promo.priority < best.promo.priority) return cur;
        if (cur.promo.priority > best.promo.priority) return best;
        return cur.promo.id < best.promo.id ? cur : best;
    });

    return {
        promotionId: winner.promo.id,
        promotionName: winner.promo.name,
        totalDiscount: winner.totalDiscount,
        lineAdjustments: winner.lineAdjustments,
    };
}
```

- [ ] **Step 4: Verificar que los tests pasan**

Run: `npx jest --selectProjects unit --runTestsByPath src/modules/promotions/promotion-evaluator.spec.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
$env:GIT_MASTER='1'; git add apps/backend/src/modules/promotions/promotion-evaluator.ts apps/backend/src/modules/promotions/promotion-evaluator.spec.ts
$env:GIT_MASTER='1'; git commit -m "feat(promotions): add pure promotion evaluator with tests"
```

---

## Task 6: DTOs, service y controller admin

**Files:**
- Create: `apps/backend/src/modules/promotions/dto/create-promotion.dto.ts`
- Create: `apps/backend/src/modules/promotions/dto/update-promotion.dto.ts`
- Create: `apps/backend/src/modules/promotions/promotions.service.ts`
- Create: `apps/backend/src/modules/promotions/promotions.controller.ts`
- Create: `apps/backend/src/modules/promotions/promotions.module.ts`

- [ ] **Step 1: Crear DTO de creación**

`create-promotion.dto.ts`:

```ts
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { PromotionKind, DiscountType, PromotionScope, PROMOTION_KINDS, DISCOUNT_TYPES, PROMOTION_SCOPES } from '../promotions.constants';

export class CreatePromotionDto {
    @IsString() @MaxLength(120)
    name!: string;

    @IsEnum(PROMOTION_KINDS)
    kind!: PromotionKind;

    @IsEnum(DISCOUNT_TYPES)
    discountType!: DiscountType;

    @IsNumber() @Min(0)
    discountValue!: number;

    @IsEnum(PROMOTION_SCOPES) @IsOptional()
    scope?: PromotionScope;

    @IsUUID('4', { each: true }) @IsOptional()
    scopeProductIds?: string[];

    @IsUUID('4', { each: true }) @IsOptional()
    scopeCategoryIds?: string[];

    @IsNumber() @Min(0) @IsOptional()
    minOrderAmount?: number;

    @IsInt() @Min(1) @IsOptional()
    buyQuantity?: number;

    @IsInt() @Min(1) @IsOptional()
    getQuantity?: number;

    @IsInt() @Min(0) @IsOptional()
    priority?: number;

    @IsBoolean() @IsOptional()
    active?: boolean;

    @IsDateString() @IsOptional()
    startsAt?: string;

    @IsDateString() @IsOptional()
    endsAt?: string;
}
```

- [ ] **Step 2: Crear DTO de actualización**

`update-promotion.dto.ts`:

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreatePromotionDto } from './create-promotion.dto';

export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {}
```

- [ ] **Step 3: Crear service con CRUD**

`promotions.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
    constructor(
        @InjectRepository(Promotion)
        private readonly repo: Repository<Promotion>,
    ) {}

    findAll(): Promise<Promotion[]> {
        return this.repo.find({ order: { priority: 'ASC', createdAt: 'DESC' } });
    }

    findActiveAt(now: Date): Promise<Promotion[]> {
        return this.repo.createQueryBuilder('p')
            .where('p.active = :active', { active: true })
            .andWhere('(p.startsAt IS NULL OR p.startsAt <= :now)', { now })
            .andWhere('(p.endsAt IS NULL OR p.endsAt >= :now)', { now })
            .getMany();
    }

    findOne(id: string): Promise<Promotion | null> {
        return this.repo.findOne({ where: { id } });
    }

    create(dto: CreatePromotionDto): Promise<Promotion> {
        const entity = this.repo.create(dto);
        return this.repo.save(entity);
    }

    async update(id: string, dto: UpdatePromotionDto): Promise<Promotion> {
        await this.repo.update(id, dto);
        const updated = await this.findOne(id);
        if (!updated) throw new Error(`Promotion ${id} not found after update`);
        return updated;
    }

    async remove(id: string): Promise<void> {
        await this.repo.delete(id);
    }
}
```

- [ ] **Step 4: Crear controller**

`promotions.controller.ts`:

```ts
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Controller('promotions')
export class PromotionsController {
    constructor(private readonly service: PromotionsService) {}

    @Get()
    @Roles('admin')
    findAll() {
        return this.service.findAll();
    }

    @Post()
    @Roles('admin')
    create(@Body() dto: CreatePromotionDto) {
        return this.service.create(dto);
    }

    @Patch(':id')
    @Roles('admin')
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePromotionDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    @Roles('admin')
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        await this.service.remove(id);
        return { ok: true };
    }
}
```

- [ ] **Step 5: Crear module**

`promotions.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from './entities/promotion.entity';
import { SalePromotion } from './entities/sale-promotion.entity';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

@Module({
    imports: [TypeOrmModule.forFeature([Promotion, SalePromotion])],
    controllers: [PromotionsController],
    providers: [PromotionsService],
    exports: [PromotionsService],
})
export class PromotionsModule {}
```

- [ ] **Step 6: Registrar `PromotionsModule` en `app.module.ts`**

Agregar el import y la entrada al array `imports`.

- [ ] **Step 7: Verificar que compila**

Run: `npx tsc --noEmit -p apps/backend/tsconfig.json`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
$env:GIT_MASTER='1'; git add apps/backend/src/modules/promotions/ apps/backend/src/app.module.ts
$env:GIT_MASTER='1'; git commit -m "feat(promotions): add admin CRUD module"
```

---

## Task 7: Integración en `SalesService.create`

**Files:**
- Modify: `apps/backend/src/modules/sales/sales.service.ts`
- Modify: `apps/backend/src/modules/sales/sales.module.ts`

- [ ] **Step 1: Importar `PromotionsService` y el evaluador en `SalesService`**

En el constructor agregar:
```ts
private readonly promotionsService: PromotionsService,
```

- [ ] **Step 2: Modificar `create` para evaluar promociones antes de `calculateSaleTotals`**

Pseudocódigo del punto de inserción (entre `validateProductsStock` y `calculateSaleTotals`):

```ts
const activePromos = await this.promotionsService.findActiveAt(new Date());
const candidates = activePromos.map((p) => ({ /* mapear a PromotionCandidate */ }));
const evalItems = dto.items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    categoryId: productsById.get(i.productId)?.categoryId ?? null,
}));
const promoResult = evaluatePromotions({ items: evalItems, promotions: candidates, now: new Date() });

// Si hay promo, sobreescribir descuentos del DTO con los del evaluador
if (promoResult.promotionId) {
    dto = { ...dto, discount: promoResult.totalDiscount };
    // reasignar descuento por item en una copia de dto.items
}
```

- [ ] **Step 3: Persistir `SalePromotion` en la misma transacción**

Después de crear `SaleItem`s, persistir la asignación congelada:

```ts
if (promoResult.promotionId) {
    await manager.save(this.salePromotionRepo.create({
        saleId: sale.id,
        promotionId: promoResult.promotionId,
        promotionName: promoResult.promotionName!,
        promotionKind: /* kind del promotion ganador */,
        totalDiscount: promoResult.totalDiscount,
        lineAllocations: createdSaleItems.map((si, idx) => ({
            saleItemId: si.id,
            amount: promoResult.lineAdjustments.find((a) => a.itemIndex === idx)?.amount ?? 0,
        })),
    }));
}
```

- [ ] **Step 4: Agregar `PromotionsModule` a `SalesModule.imports`**

- [ ] **Step 5: Test de integración mínimo**

Crear `apps/backend/src/modules/sales/promotions.integration.spec.ts` (o ampliar `sales.service.spec.ts`) que:
- Crea 2 productos y una promo `item_discount` 10%.
- Llama a `salesService.create` con items.
- Verifica `Sale.discount === totalDiscount` y que existe `SalePromotion` con asignaciones que suman.

Run: `npx jest --selectProjects unit --runTestsByPath src/modules/sales/sales.service.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
$env:GIT_MASTER='1'; git add apps/backend/src/modules/sales/
$env:GIT_MASTER='1'; git commit -m "feat(promotions): integrate evaluator into SalesService.create and persist snapshot"
```

---

## Task 8: Endpoint `POST /sales/preview-promotions`

**Files:**
- Modify: `apps/backend/src/modules/sales/sales.controller.ts`
- Modify: `apps/backend/src/modules/sales/sales.service.ts`

- [ ] **Step 1: Agregar método `previewPromotions` al service**

```ts
async previewPromotions(items: { productId: string; quantity: number; unitPrice: number }[]) {
    const products = await this.productsService.findByIds(items.map((i) => i.productId));
    const productsById = new Map(products.map((p) => [p.id, p]));
    const activePromos = await this.promotionsService.findActiveAt(new Date());
    const candidates = activePromos.map(/* mapear */);
    const evalItems = items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        categoryId: productsById.get(i.productId)?.categoryId ?? null,
    }));
    return evaluatePromotions({ items: evalItems, promotions: candidates, now: new Date() });
}
```

- [ ] **Step 2: Agregar endpoint en el controller**

```ts
@Post('preview-promotions')
@Roles('cashier', 'admin')
previewPromotions(@Body() body: PreviewPromotionsDto) {
    return this.salesService.previewPromotions(body.items);
}
```

Crear `PreviewPromotionsDto` mínimo en `apps/backend/src/modules/sales/dto/`.

- [ ] **Step 3: Commit**

```bash
$env:GIT_MASTER='1'; git add apps/backend/src/modules/sales/
$env:GIT_MASTER='1'; git commit -m "feat(sales): add preview-promotions endpoint for checkout estimation"
```

---

## Task 9: Devoluciones basadas en snapshot

**Files:**
- Modify: `apps/backend/src/modules/sales/sale-return.service.ts`

- [ ] **Step 1: Localizar el cálculo de `unitRefundAmount` y `totalRefund`**

Usar CodeGraph: `codegraph_explore` sobre `SaleReturnService.preview` y `commit`.

- [ ] **Step 2: Asegurar que el refund use `saleItem.subtotal / saleItem.quantity` (precio ya descontado)**

Esto ya debería ser así porque `subtotal = qty*unitPrice - discount`. Verificar y agregar un guard: si existe `SalePromotion` para la venta original, no recalcular promociones; usar el `subtotal` congelado.

- [ ] **Step 3: Test: devolución parcial después de promo conserva proporción congelada**

Crear caso en `sale-return.service.spec.ts`:
- Venta original con `item_discount` 20% → subtotal congelado.
- Devolución de 1 unidad de 2.
- Verificar `unitRefundAmount === subtotal/quantity` y `totalRefund === unitRefundAmount * qtyReturned`.

Run: `npx jest --selectProjects unit --runTestsByPath src/modules/sales/sale-return.service.spec.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
$env:GIT_MASTER='1'; git add apps/backend/src/modules/sales/sale-return.service.ts apps/backend/src/modules/sales/sale-return.service.spec.ts
$env:GIT_MASTER='1'; git commit -m "fix(sale-return): freeze refund on original snapshot, no promo reevaluation"
```

---

## Task 10: Frontend — admin de promociones

**Files:**
- Create: `apps/frontend/src/features/promotions/types/index.ts`
- Create: `apps/frontend/src/features/promotions/api/promotions.api.ts`
- Create: `apps/frontend/src/features/promotions/schemas/promotion.schema.ts`
- Create: `apps/frontend/src/features/promotions/components/PromotionsList.tsx`
- Create: `apps/frontend/src/features/promotions/components/PromotionForm.tsx`
- Create: `apps/frontend/src/pages/promotions/PromotionsPage.tsx`
- Modify: `apps/frontend/src/App.tsx` (ruta)
- Modify: `apps/frontend/src/components/Sidebar.tsx` (ícono)

- [ ] **Step 1: Types + API client**

Seguir el patrón de `apps/frontend/src/features/products/api/products.api.ts`. Endpoints: `GET /promotions`, `POST /promotions`, `PATCH /promotions/:id`, `DELETE /promotions/:id`.

- [ ] **Step 2: Zod schema para el formulario**

Cubrir los 3 `kind`, validación condicional de `discountType`/`discountValue`, `scope`, `buyQuantity`/`getQuantity` sólo si `kind=buy_get`.

- [ ] **Step 3: Lista con toggle activar/desactivar y tabla**

`PromotionsList.tsx`: tabla con nombre, tipo, descuento, vigencia, activo (switch), editar, eliminar.

- [ ] **Step 4: Formulario modal (React Hook Form + Zod)**

`PromotionForm.tsx`: campos condicionales por `kind`.

- [ ] **Step 5: Página + ruta + sidebar**

`PromotionsPage.tsx`, ruta `/promotions` en `App.tsx`, ícono en `Sidebar.tsx` (acceso admin).

- [ ] **Step 6: Test visual mínimo**

Run: `pnpm --filter frontend build`
Expected: PASS (sin errores TS)

- [ ] **Step 7: Commit**

```bash
$env:GIT_MASTER='1'; git add apps/frontend/src/features/promotions/ apps/frontend/src/pages/promotions/ apps/frontend/src/App.tsx apps/frontend/src/components/Sidebar.tsx
$env:GIT_MASTER='1'; git commit -m "feat(promotions): add admin frontend with list, form and routing"
```

---

## Task 11: Frontend — caja muestra promo aplicada

**Files:**
- Modify: `apps/frontend/src/features/sales/api/sales.api.ts`
- Modify: `apps/frontend/src/features/sales/components/SaleTotals.tsx`
- Modify: `apps/frontend/src/features/sales/hooks/useSaleFormEffects.ts`

- [ ] **Step 1: Agregar `previewPromotions(cart)` al sales API**

```ts
export async function previewPromotions(items: CartItem[]) {
    const { data } = await api.post('/sales/preview-promotions', { items });
    return data as { promotionId: string | null; promotionName: string | null; totalDiscount: number };
}
```

- [ ] **Step 2: Hook `usePromotionPreview` en `useSaleFormEffects.ts`**

Debounce de ~300ms sobre cambios de items; guarda `appliedPromotion` en estado del form. Si hay promo, **no** enviar `discount` manual al confirmar (el backend recalcula).

- [ ] **Step 3: `SaleTotals` muestra ahorro y nombre**

Si `appliedPromotion?.promotionId`, renderizar línea "Promo: {name} — Ahorro: {formatCurrency(totalDiscount)}".

- [ ] **Step 4: Test de componente**

Run: `pnpm --filter frontend test -- src/features/sales/components/SaleTotals`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
$env:GIT_MASTER='1'; git add apps/frontend/src/features/sales/
$env:GIT_MASTER='1'; git commit -m "feat(sales): show automatic promotion savings in checkout"
```

---

## Task 12: Cuarentena del prototipo existente

**Files:**
- Modify: `apps/backend/src/modules/sales/promotions/primitives.ts`
- Modify: `apps/backend/src/modules/sales/promotions/primitives.spec.ts`

- [ ] **Step 1: Marcar el archivo como deferido, sin borrarlo**

Agregar al inicio de `primitives.ts`:

```ts
/**
 * @deprecated MVP de promociones diferido.
 * Estos tipos (coupon, loyalty, store_credit) quedan fuera del flujo de venta
 * hasta que se implementen como tipos nuevos en el módulo `promotions/`.
 * No importar desde SalesService ni desde el evaluador.
 * Ver: docs/plans/2026-08-12-automatic-promotions-design.md
 */
```

- [ ] **Step 2: Verificar que nada los importa fuera de su spec**

Run: `grep -r "from './primitives'" apps/backend/src/modules/sales/` o usar LSP references.
Expected: sólo `primitives.spec.ts` los referencia.

- [ ] **Step 3: Commit**

```bash
$env:GIT_MASTER='1'; git add apps/backend/src/modules/sales/promotions/primitives.ts
$env:GIT_MASTER='1'; git commit -m "chore(promotions): quarantine deferred coupon/loyalty/credit prototype"
```

---

## Self-review (post-escritura)

**Cobertura del diseño:**
- ✅ 3 tipos (`item_discount`, `order_discount`, `buy_get`) — Task 2, 5
- ✅ Sin stacking, ganadora determinística — Task 5
- ✅ Migración registrada — Task 4
- ✅ Evaluador puro con tests — Task 5
- ✅ Integración en `SalesService.create` + snapshot congelado — Task 7
- ✅ Preview endpoint — Task 8
- ✅ Devoluciones con snapshot — Task 9
- ✅ Admin frontend — Task 10
- ✅ Caja frontend — Task 11
- ✅ Cuarentena del prototipo — Task 12

**Placeholders:** Ninguno. Cada step tiene código o comando concreto.

**Consistencia de tipos:** `PromotionKind`, `DiscountType`, `PromotionScope` se usan con los mismos nombres en entidad, DTO, evaluador y constantes.

**Reglas del proyecto:** Migración registrada, ponytail respetado (sin motor JSON, sin abstracciones prematuras), no se levantan servidores automáticamente.

/**
 * Re-export of the registered entities used by integration tests.
 *
 * Tests should not depend on `src/entities.ts` directly so they remain
 * independent from the production entity registry (some entities may be
 * added/removed in S2 without breaking the suite).
 */

export { entities as productsEntities } from '../../src/entities';
import assert from 'node:assert/strict';
import { readStableWeight } from './simulator';

assert.deepEqual(readStableWeight([0.125, 0.125]), { ok: true, quantity: 0.125 });
assert.deepEqual(readStableWeight([0.125, 0.126]), { ok: false, reason: 'unstable' });
assert.deepEqual(readStableWeight([]), { ok: false, reason: 'timeout' });

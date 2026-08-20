import type { ScaleReadResult } from '../types';

export function readStableWeight(frames: readonly number[]): ScaleReadResult {
    if (frames.length < 2) return { ok: false, reason: 'timeout' };

    const [previous, current] = frames.slice(-2);
    if (!Number.isFinite(previous) || !Number.isFinite(current)) {
        return { ok: false, reason: 'corrupt' };
    }
    if (previous !== current) return { ok: false, reason: 'unstable' };

    return { ok: true, quantity: current };
}

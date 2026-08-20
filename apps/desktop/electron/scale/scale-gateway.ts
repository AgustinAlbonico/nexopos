import { readStableWeight } from './protocols/simulator';
import type { ScaleReadResult } from './types';

export class ScaleGateway {
    read(): ScaleReadResult {
        return readStableWeight([0.125, 0.125]);
    }
}

import { Injectable } from '@nestjs/common';

export interface ScaleStatus {
    readonly supported: boolean;
    readonly model: 'simulator' | null;
    readonly lastError: string | null;
}

@Injectable()
export class DiagnosticsService {
    getScaleStatus(): ScaleStatus {
        return { supported: true, model: 'simulator', lastError: null };
    }
}

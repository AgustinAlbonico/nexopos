import { DiagnosticsService } from './diagnostics.service';

describe('DiagnosticsService', () => {
    it('reports only the bounded simulator as the supported scale', () => {
        expect(new DiagnosticsService().getScaleStatus()).toEqual({
            supported: true,
            model: 'simulator',
            lastError: null,
        });
    });
});

import { describe, it, expect, beforeEach } from '@jest/globals';
import { LabelsService } from './labels.service';

describe('LabelsService', () => {
    let service: LabelsService;

    beforeEach(() => {
        // Usar real timers porque pdfkit y Node streams requieren timers reales para emitir 'data' y 'end'
        jest.useRealTimers();
        service = new LabelsService();
    });

    it('incluye las nuevas plantillas hangtag_50x90 y thermal_50x30 en la lista de templates soportados', () => {
        const templates = service.listTemplates();
        expect(templates).toContain('hangtag_50x90');
        expect(templates).toContain('thermal_50x30');
        expect(templates).toContain('qr_text_price');
    });

    it('genera un buffer PDF válido para Hangtag 50x90mm con talle gigante', async () => {
        const items = [
            {
                name: 'Remera Lisa Algodón',
                brandName: 'Levis',
                size: 'XL',
                color: 'Negro',
                sku: 'REM-101-NEG-XL',
                price: 8900,
                copies: 2,
            },
        ];

        const pdfBuffer = await service.buildApparelLabelsPdf('hangtag_50x90', items);
        expect(pdfBuffer).toBeDefined();
        expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
        expect(pdfBuffer.length).toBeGreaterThan(100);
        // Validar cabecera mágica de PDF
        expect(pdfBuffer.toString('utf8', 0, 4)).toBe('%PDF');
    });

    it('genera un buffer PDF válido para etiqueta térmica 50x30mm', async () => {
        const items = [
            {
                name: 'Jean Slim Fit',
                brandName: 'Taverniti',
                size: '42',
                color: 'Azul',
                sku: 'PAN-42-AZU',
                price: 18500,
                copies: 1,
            },
        ];

        const pdfBuffer = await service.buildApparelLabelsPdf('thermal_50x30', items);
        expect(pdfBuffer).toBeDefined();
        expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
        expect(pdfBuffer.length).toBeGreaterThan(100);
        expect(pdfBuffer.toString('utf8', 0, 4)).toBe('%PDF');
    });
});

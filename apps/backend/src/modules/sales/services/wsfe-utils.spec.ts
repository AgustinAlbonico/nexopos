import { createFECAESolicitarRequest } from './wsfe-utils';

describe('createFECAESolicitarRequest', () => {
    it('places the associated original invoice inside FECAEDetRequest', () => {
        const xml = createFECAESolicitarRequest('token', 'sign', '20123456789', {
            invoiceType: 8,
            pointOfSale: 1,
            concept: 1,
            docType: 80,
            docNumber: '20-12345678-9',
            receiverIvaCondition: 5,
            invoiceNumber: 77,
            invoiceDate: '20250203',
            totalAmount: 100,
            netAmount: 100,
            exemptAmount: 0,
            ivaAmount: 0,
            ivaItems: [],
            associatedDocument: {
                Tipo: 6,
                PtoVta: 1,
                Nro: 123,
            },
        });

        const detail = xml.slice(xml.indexOf('<ar:FECAEDetRequest>'), xml.indexOf('</ar:FECAEDetRequest>'));
        const header = xml.slice(xml.indexOf('<ar:FeCabReq>'), xml.indexOf('</ar:FeCabReq>'));

        expect(detail).toContain('<ar:CbtesAsoc>');
        expect(detail).toContain('<ar:CbteAsoc>');
        expect(detail).toContain('<ar:Tipo>6</ar:Tipo>');
        expect(detail).toContain('<ar:PtoVta>1</ar:PtoVta>');
        expect(detail).toContain('<ar:Nro>123</ar:Nro>');
        expect(header).not.toContain('CbtesAsoc');
    });

    it('formats ImpTrib with otherTaxes value', () => {
        const xml = createFECAESolicitarRequest('token', 'sign', '20123456789', {
            invoiceType: 1,
            pointOfSale: 1,
            concept: 1,
            docType: 80,
            docNumber: '20-12345678-9',
            receiverIvaCondition: 1,
            invoiceNumber: 10,
            invoiceDate: '20260811',
            totalAmount: 121,
            netAmount: 100,
            exemptAmount: 0,
            ivaAmount: 21,
            otherTaxes: 15.5,
            ivaItems: [{ Id: 5, BaseImp: 100, Importe: 21 }],
        });

        expect(xml).toContain('<ar:ImpTrib>15.50</ar:ImpTrib>');
    });
});

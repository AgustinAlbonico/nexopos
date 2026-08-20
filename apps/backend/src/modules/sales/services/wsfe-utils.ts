/**
 * Utilidades SOAP para WSFE (Web Service de Facturación Electrónica)
 * Funciones para crear requests y parsear responses de AFIP WSFE
 */
import { parseStringPromise } from 'xml2js';

/**
 * Crea request SOAP para FECompUltimoAutorizado
 * Obtiene el último número de comprobante autorizado
 */
export function createFECompUltimoAutorizadoRequest(
    token: string,
    sign: string,
    cuit: string,
    pointOfSale: number,
    invoiceType: number
): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
   <soapenv:Header/>
   <soapenv:Body>
      <ar:FECompUltimoAutorizado>
         <ar:Auth>
            <ar:Token>${token}</ar:Token>
            <ar:Sign>${sign}</ar:Sign>
            <ar:Cuit>${cuit}</ar:Cuit>
         </ar:Auth>
         <ar:PtoVta>${pointOfSale}</ar:PtoVta>
         <ar:CbteTipo>${invoiceType}</ar:CbteTipo>
      </ar:FECompUltimoAutorizado>
   </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Parsea respuesta de FECompUltimoAutorizado
 */
export async function parseFECompUltimoResponse(xml: string): Promise<number> {
    try {
        const result = await parseStringPromise(xml, { explicitArray: false });
        const body = result['soap:Envelope']['soap:Body'];
        const response = body.FECompUltimoAutorizadoResponse?.FECompUltimoAutorizadoResult;

        if (!response) {
            throw new Error('Respuesta WSFE inválida: no se encontró FECompUltimoAutorizadoResult');
        }

        // Si hay error
        if (response.Errors) {
            const error = Array.isArray(response.Errors.Err)
                ? response.Errors.Err[0]
                : response.Errors.Err;
            throw new Error(`Error WSFE: ${error.Msg || 'Error desconocido'}`);
        }

        return Number.parseInt(response.CbteNro || '0', 10);
    } catch (error) {
        throw new Error(`Error al parsear respuesta WSFE: ${(error as Error).message}`);
    }
}

/**
 * Interface para item de IVA
 */
export interface WSFEIvaItem {
    Id: number;      // 3=0%, 4=10.5%, 5=21%, 6=27%
    BaseImp: number;
    Importe: number;
}

export interface WSFECbteAsoc {
    Tipo: number;
    PtoVta: number;
    Nro: number;
}

/**
 * Interface para request de autorización
 */
export interface WSFEAuthRequest {
    invoiceType: number;
    pointOfSale: number;
    concept: number;
    docType: number;
    docNumber: string;
    receiverIvaCondition: number; // Condición de IVA del receptor (no se usa en el XML, solo para referencia)
    invoiceNumber: number;
    invoiceDate: string;  // YYYYMMDD
    totalAmount: number;
    netAmount: number;
    exemptAmount: number;
    ivaAmount: number;
    otherTaxes?: number;
    ivaItems: WSFEIvaItem[];
    associatedDocument?: WSFECbteAsoc;
}

/**
 * Crea request SOAP para FECAESolicitar
 * Solicita CAE para un comprobante
 */
export function createFECAESolicitarRequest(
    token: string,
    sign: string,
    cuit: string,
    request: WSFEAuthRequest
): string {
    // Limpiar número de documento: solo dígitos (sin guiones ni espacios)
    const cleanDocNumber = request.docNumber.replaceAll(/\D/g, '');

    // Construir items de IVA
    const ivaItemsXml = request.ivaItems.map(item => `
               <ar:AlicIva>
                  <ar:Id>${item.Id}</ar:Id>
                  <ar:BaseImp>${item.BaseImp.toFixed(2)}</ar:BaseImp>
                  <ar:Importe>${item.Importe.toFixed(2)}</ar:Importe>
               </ar:AlicIva>`).join('');

    const associatedDocumentXml = request.associatedDocument ? `
                  <ar:CbtesAsoc>
                     <ar:CbteAsoc>
                        <ar:Tipo>${request.associatedDocument.Tipo}</ar:Tipo>
                        <ar:PtoVta>${request.associatedDocument.PtoVta}</ar:PtoVta>
                        <ar:Nro>${request.associatedDocument.Nro}</ar:Nro>
                     </ar:CbteAsoc>
                  </ar:CbtesAsoc>` : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
   <soapenv:Header/>
   <soapenv:Body>
      <ar:FECAESolicitar>
         <ar:Auth>
            <ar:Token>${token}</ar:Token>
            <ar:Sign>${sign}</ar:Sign>
            <ar:Cuit>${cuit}</ar:Cuit>
         </ar:Auth>
         <ar:FeCAEReq>
            <ar:FeCabReq>
               <ar:CantReg>1</ar:CantReg>
               <ar:PtoVta>${request.pointOfSale}</ar:PtoVta>
               <ar:CbteTipo>${request.invoiceType}</ar:CbteTipo>
            </ar:FeCabReq>
            <ar:FeDetReq>
               <ar:FECAEDetRequest>
                  <ar:Concepto>${request.concept}</ar:Concepto>
                  <ar:DocTipo>${request.docType}</ar:DocTipo>
                  <ar:DocNro>${cleanDocNumber}</ar:DocNro>
                  <ar:CbteDesde>${request.invoiceNumber}</ar:CbteDesde>
                  <ar:CbteHasta>${request.invoiceNumber}</ar:CbteHasta>
                  <ar:CbteFch>${request.invoiceDate}</ar:CbteFch>
                  <ar:ImpTotal>${request.totalAmount.toFixed(2)}</ar:ImpTotal>
                  <ar:ImpTotConc>0.00</ar:ImpTotConc>
                  <ar:ImpNeto>${request.netAmount.toFixed(2)}</ar:ImpNeto>
                  <ar:ImpOpEx>${request.exemptAmount.toFixed(2)}</ar:ImpOpEx>
                  <ar:ImpTrib>${(request.otherTaxes || 0).toFixed(2)}</ar:ImpTrib>
                  <ar:ImpIVA>${request.ivaAmount.toFixed(2)}</ar:ImpIVA>
                  <ar:MonId>PES</ar:MonId>
                  <ar:MonCotiz>1</ar:MonCotiz>
                  <ar:CondicionIVAReceptorId>${request.receiverIvaCondition}</ar:CondicionIVAReceptorId>${associatedDocumentXml}${ivaItemsXml ? `
                  <ar:Iva>${ivaItemsXml}
                  </ar:Iva>` : ''}
               </ar:FECAEDetRequest>
            </ar:FeDetReq>
         </ar:FeCAEReq>
      </ar:FECAESolicitar>
   </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Interface para respuesta de autorización
 */
export interface WSFEAuthResponse {
    success: boolean;
    cae?: string;
    caeExpirationDate?: string;
    invoiceNumber?: number;
    errors?: string[];
    observations?: string[];
}

// ============================================
// Helpers para parseo de respuesta WSFE
// ============================================

/** Convierte valor a array (útil para respuestas XML que pueden ser objeto o array) */
function toArray<T>(value: T | T[] | undefined | null): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

/** Extrae mensajes de error de la respuesta */
function extractErrors(response: Record<string, unknown>): string[] {
    const errors: string[] = [];
    const errorsObj = response.Errors as { Err?: { Msg?: string }[] | { Msg?: string } } | undefined;
    const errList = toArray<{ Msg?: string }>(errorsObj?.Err);
    for (const err of errList) {
        if (err?.Msg) errors.push(err.Msg);
    }
    return errors;
}

/** Extrae observaciones del detalle del comprobante */
function extractObservations(detResponse: Record<string, unknown>): string[] {
    const observations: string[] = [];
    const obsObj = detResponse.Observaciones as { Obs?: { Code?: string; Msg?: string }[] } | undefined;
    const obsList = toArray<{ Code?: string; Msg?: string }>(obsObj?.Obs);
    for (const obs of obsList) {
        if (!obs?.Msg) continue;
        const codePrefix = obs.Code ? `[${obs.Code}] ` : '';
        observations.push(`${codePrefix}${obs.Msg}`);
    }
    return observations;
}

/** Extrae errores del detalle del comprobante */
function extractDetailErrors(detResponse: Record<string, unknown>): string[] {
    const errors: string[] = [];
    const errorsObj = detResponse.Errores as { Err?: { Code?: string; Msg?: string }[] } | undefined;
    const errList = toArray<{ Code?: string; Msg?: string }>(errorsObj?.Err);
    for (const err of errList) {
        if (!err?.Msg) continue;
        const codePrefix = err.Code ? `[${err.Code}] ` : '';
        errors.push(`${codePrefix}${err.Msg}`);
    }
    return errors;
}

/** Construye respuesta de éxito */
function buildSuccessResponse(
    detResponse: Record<string, unknown>,
    observations: string[]
): WSFEAuthResponse {
    return {
        success: true,
        cae: detResponse.CAE as string,
        caeExpirationDate: detResponse.CAEFchVto as string,
        invoiceNumber: Number.parseInt(detResponse.CbteDesde as string, 10),
        observations: observations.length > 0 ? observations : undefined,
    };
}

/** Construye respuesta de error */
function buildErrorResponse(
    resultado: string,
    errors: string[],
    observations: string[]
): WSFEAuthResponse {
    const finalErrors = [...errors];

    // Si no hay errores específicos, usar observaciones o dar contexto
    if (finalErrors.length === 0 && observations.length > 0) {
        finalErrors.push(`Rechazado (${resultado}): ${observations.join('; ')}`);
    }
    if (finalErrors.length === 0) {
        finalErrors.push(`Comprobante rechazado por AFIP (Resultado: ${resultado})`);
    }

    return {
        success: false,
        errors: finalErrors,
        observations: observations.length > 0 ? observations : undefined,
    };
}

/**
 * Parsea respuesta de FECAESolicitar
 */
export async function parseFECAEResponse(xml: string): Promise<WSFEAuthResponse> {
    try {
        const result = await parseStringPromise(xml, { explicitArray: false });
        const body = result['soap:Envelope']['soap:Body'];
        const response = body.FECAESolicitarResponse?.FECAESolicitarResult;

        if (!response) {
            throw new Error('Respuesta WSFE inválida: no se encontró FECAESolicitarResult');
        }

        // Extraer errores generales
        const errors = extractErrors(response);

        // Obtener detalle del comprobante
        const detResponse = response.FeDetResp?.FECAEDetResponse;
        if (!detResponse) {
            return {
                success: false,
                errors: errors.length > 0 ? errors : ['No se recibió detalle de respuesta'],
            };
        }

        // Extraer observaciones y errores del detalle
        const observations = extractObservations(detResponse);
        const detailErrors = extractDetailErrors(detResponse);
        errors.push(...detailErrors);

        // Resultado: A=Aprobado, R=Rechazado, P=Parcial
        const resultado = detResponse.Resultado;

        if (resultado === 'A') {
            return buildSuccessResponse(detResponse, observations);
        }

        return buildErrorResponse(resultado, errors, observations);
    } catch (error) {
        throw new Error(`Error al parsear respuesta WSFE: ${(error as Error).message}`);
    }
}

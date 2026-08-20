/**
 * Servicio de integración con AFIP
 * Maneja la autenticación y autorización de comprobantes electrónicos
 * 
 * NOTA: Esta es una implementación preparada para producción.
 * Requiere configurar certificados válidos de AFIP para funcionar.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InvoiceType } from '../entities/invoice.entity';
import { FiscalConfigurationService } from '../../configuration/fiscal-configuration.service';
import { AfipEnvironment } from '../../configuration/entities/fiscal-configuration.entity';
import axios from 'axios';
import * as https from 'node:https';
import * as crypto from 'node:crypto';
import * as forge from 'node-forge';
import { createTRA, createLoginCmsRequest, parseLoginCmsResponse, parseSoapFault } from './soap-utils';
import {
    createFECompUltimoAutorizadoRequest,
    parseFECompUltimoResponse,
    createFECAESolicitarRequest,
    parseFECAEResponse,
    WSFEAuthRequest,
    WSFEIvaItem
} from './wsfe-utils';

/**
 * Token de autenticación de AFIP
 */
interface AfipAuthToken {
    token: string;
    sign: string;
    expirationTime: Date;
}

/**
 * Request para autorizar un comprobante
 */
export interface InvoiceRequest {
    invoiceType: number;
    pointOfSale: number;
    concept: number;             // 1=Productos, 2=Servicios, 3=Productos y Servicios
    docType: number;             // Tipo documento receptor
    docNumber: string;           // Número documento receptor
    receiverIvaCondition: number; // Condición de IVA del receptor (AFIP)
    issueDate: string;           // Fecha emisión (YYYYMMDD)
    total: number;
    netAmount: number;           // Importe neto gravado
    netAmountExempt: number;     // Importe exento
    iva: IvaItem[];              // Array de IVA (solo RI)
    otherTaxes: number;          // Otros tributos
    associatedDocument?: {
        type: number;
        pointOfSale: number;
        number: number;
    };
}

/**
 * Item de IVA
 */
interface IvaItem {
    id: number;        // 5=21%, 4=10.5%, 6=27%
    baseAmount: number;
    amount: number;
}

/**
 * Respuesta de AFIP
 */
export interface AfipResponse {
    success: boolean;
    cae?: string;
    caeExpirationDate?: string;
    invoiceNumber?: number;
    errors?: string[];
    observations?: string[];
}

/**
 * Configuración AFIP
 */
export interface AfipConfiguration {
    cuit: string;
    businessName: string;
    businessAddress: string;
    ivaCondition: string;
    grossIncome?: string;
    activityStartDate?: Date;
    pointOfSale: number;
    environment: 'homologacion' | 'produccion';
}

@Injectable()
export class AfipService {
    private readonly logger = new Logger(AfipService.name);
    // Token en memoria (caché) separado por ambiente - se sincroniza con la base de datos
    private authTokenCacheHomologacion: AfipAuthToken | null = null;
    private authTokenCacheProduccion: AfipAuthToken | null = null;

    // Mutex para serializar peticiones de facturación (evita condición de carrera en numeración)
    private invoiceMutex: Promise<void> = Promise.resolve();

    // Timestamp de error de "token fantasma" para calcular tiempo de espera
    private tokenPhantomErrorTimestamp: Map<string, Date> = new Map();

    // Tiempo mínimo de vida del token antes de renovar proactivamente (30 minutos)
    private static readonly TOKEN_RENEWAL_THRESHOLD_MS = 30 * 60 * 1000;

    constructor(
        private readonly fiscalConfigService: FiscalConfigurationService,
    ) { }

    /**
     * Verifica si el servicio está configurado para facturar
     */
    async isConfigured(): Promise<boolean> {
        const { ready } = await this.fiscalConfigService.isReadyForInvoicing();
        return ready;
    }

    /**
     * Obtiene la configuración de AFIP desde la base de datos
     */
    async getConfiguration(): Promise<AfipConfiguration | null> {
        try {
            const config = await this.fiscalConfigService.getPublicConfiguration();

            if (!config.isConfigured || !config.cuit) {
                return null;
            }

            return {
                cuit: config.cuit,
                businessName: config.businessName || 'Sin configurar',
                businessAddress: config.businessAddress || 'Sin configurar',
                ivaCondition: config.ivaCondition,
                grossIncome: config.grossIncome || undefined,
                activityStartDate: config.activityStartDate || undefined,
                pointOfSale: config.pointOfSale,
                environment: config.afipEnvironment as 'homologacion' | 'produccion',
            };
        } catch {
            return null;
        }
    }

    /**
     * Determina el tipo de comprobante según condiciones IVA
     */
    determineInvoiceType(
        emitterCondition: string,
        receiverCondition: string
    ): InvoiceType {
        if (emitterCondition === 'monotributo') {
            return InvoiceType.FACTURA_C;
        }

        if (emitterCondition === 'responsable_inscripto') {
            if (receiverCondition === 'responsable_inscripto') {
                return InvoiceType.FACTURA_A;
            }
            return InvoiceType.FACTURA_B;
        }

        // Default: Factura C
        return InvoiceType.FACTURA_C;
    }

    /**
     * Obtiene el caché de token según el ambiente activo
     */
    private getTokenCache(environmentName: 'homologacion' | 'produccion'): AfipAuthToken | null {
        return environmentName === 'homologacion' ? this.authTokenCacheHomologacion : this.authTokenCacheProduccion;
    }

    /**
     * Establece el caché de token según el ambiente activo
     */
    private setTokenCache(environmentName: 'homologacion' | 'produccion', token: AfipAuthToken | null): void {
        if (environmentName === 'homologacion') {
            this.authTokenCacheHomologacion = token;
        } else {
            this.authTokenCacheProduccion = token;
        }
    }

    /**
     * Verifica si hay un error de "token fantasma" reciente que impida obtener nuevo token
     * Retorna el tiempo estimado de espera en minutos si está bloqueado, o null si no
     */
    getPhantomTokenWaitTime(): { blocked: boolean; waitMinutes: number | null; environment: string | null } {
        let result: { blocked: boolean; waitMinutes: number | null; environment: string | null } = {
            blocked: false,
            waitMinutes: null,
            environment: null
        };

        const now = new Date();
        const keysToDelete: string[] = [];

        this.tokenPhantomErrorTimestamp.forEach((timestamp, env) => {
            // El token fantasma de AFIP dura ~12 horas, pero puede ser menos
            const expiresAt = new Date(timestamp.getTime() + 12 * 60 * 60 * 1000);
            if (expiresAt > now) {
                const waitMs = expiresAt.getTime() - now.getTime();
                const waitMinutes = Math.ceil(waitMs / (60 * 1000));
                result = { blocked: true, waitMinutes, environment: env };
            } else {
                // Marcar para eliminar después del forEach
                keysToDelete.push(env);
            }
        });

        // Limpiar timestamps expirados
        keysToDelete.forEach(key => this.tokenPhantomErrorTimestamp.delete(key));

        return result;
    }

    /**
     * Obtiene el token de autenticación de AFIP (WSAA)
     * El token tiene una duración de 12 horas
     * Se persiste en la base de datos para no perderlo si se reinicia el servidor
     * Usa tokens separados para homologación y producción
     * MEJORA: Renueva proactivamente si el token expira en menos de 30 minutos
     */
    async getAuthToken(): Promise<AfipAuthToken> {
        // Determinar el ambiente activo
        const config = await this.fiscalConfigService.getConfiguration();
        const isHomologacion = config.afipEnvironment === AfipEnvironment.HOMOLOGACION;
        const environmentName = isHomologacion ? 'homologacion' : 'produccion';

        // Función auxiliar para verificar si el token necesita renovación proactiva
        const needsProactiveRenewal = (token: AfipAuthToken): boolean => {
            const timeUntilExpiry = token.expirationTime.getTime() - Date.now();
            return timeUntilExpiry < AfipService.TOKEN_RENEWAL_THRESHOLD_MS;
        };

        // 1. Primero intentar usar el token en caché (memoria) del ambiente activo
        const cachedToken = this.getTokenCache(environmentName);
        if (cachedToken && cachedToken.expirationTime > new Date()) {
            // MEJORA: Si el token expira pronto, renovarlo proactivamente
            if (needsProactiveRenewal(cachedToken)) {
                this.logger.log(`Token WSAA de ${environmentName} expira pronto, renovando proactivamente...`);
                // Intentar renovar, pero si falla usar el token actual (aún válido)
                try {
                    return await this.requestNewToken(isHomologacion, environmentName);
                } catch {
                    this.logger.warn(`No se pudo renovar token proactivamente, usando el actual (aún válido)`);
                    return cachedToken;
                }
            }
            this.logger.debug(`Usando token WSAA de ${environmentName} desde caché en memoria`);
            return cachedToken;
        }

        // 2. Si no hay en caché, intentar cargar desde la base de datos
        const storedToken = await this.fiscalConfigService.getStoredWsaaToken();
        if (storedToken && storedToken.expirationTime > new Date()) {
            // MEJORA: Verificar si necesita renovación proactiva
            if (needsProactiveRenewal(storedToken)) {
                this.logger.log(`Token WSAA de ${environmentName} en BD expira pronto, renovando...`);
                try {
                    return await this.requestNewToken(isHomologacion, environmentName);
                } catch {
                    this.logger.warn(`No se pudo renovar token, usando el de BD (aún válido)`);
                    this.setTokenCache(environmentName, storedToken);
                    return storedToken;
                }
            }
            this.logger.log(`Token WSAA de ${environmentName} recuperado desde base de datos`);
            this.setTokenCache(environmentName, storedToken);
            return storedToken;
        }

        // 3. Si no hay token válido, solicitar uno nuevo a AFIP
        return this.requestNewToken(isHomologacion, environmentName);
    }

    /**
     * Solicita un nuevo token a AFIP (extraído para reutilización)
     */
    private async requestNewToken(
        isHomologacion: boolean,
        environmentName: 'homologacion' | 'produccion'
    ): Promise<AfipAuthToken> {
        const correlationId = `wsaa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();

        const isReady = await this.isConfigured();
        if (!isReady) {
            throw new Error('AFIP no está configurado. Complete la configuración fiscal en el sistema.');
        }

        // Obtener certificados descifrados (con validación de vencimiento)
        const certs = await this.fiscalConfigService.getDecryptedCertificates();
        if (!certs) {
            throw new Error('No se pudieron obtener los certificados de AFIP.');
        }

        try {
            // 1. Crear TRA (Ticket de Requerimiento de Acceso)
            const tra = createTRA('wsfe');
            this.logStructured('debug', 'TRA creado', { correlationId });

            // 2. Firmar TRA con certificado (CMS/PKCS#7)
            const cms = this.signTRA(tra, certs.certificate, certs.privateKey);
            this.logStructured('debug', 'TRA firmado con CMS', { correlationId });

            // 3. Llamar al webservice WSAA
            const wsaaUrl = isHomologacion
                ? 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms'
                : 'https://wsaa.afip.gov.ar/ws/services/LoginCms';

            const soapRequest = createLoginCmsRequest(cms);

            this.logStructured('debug', `Llamando a WSAA ${environmentName}`, {
                correlationId,
                url: wsaaUrl
            });

            const response = await axios.post(wsaaUrl, soapRequest, {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': '',
                },
                httpsAgent: new https.Agent({
                    rejectUnauthorized: true,
                    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
                    ciphers: 'HIGH:MEDIUM:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
                }),
            });

            const responseTime = Date.now() - startTime;
            this.logStructured('debug', `Respuesta WSAA recibida`, {
                correlationId,
                status: response.status,
                responseTimeMs: responseTime
            });

            // 4. Parsear respuesta XML
            const parsed = await parseLoginCmsResponse(response.data);

            const newToken: AfipAuthToken = {
                token: parsed.token,
                sign: parsed.sign,
                expirationTime: parsed.expirationTime,
            };

            // 5. Guardar en caché del ambiente correcto y en base de datos
            this.setTokenCache(environmentName, newToken);
            await this.fiscalConfigService.saveWsaaToken(newToken.token, newToken.sign, newToken.expirationTime);

            // Limpiar cualquier timestamp de error fantasma anterior
            this.tokenPhantomErrorTimestamp.delete(environmentName);

            this.logStructured('log', `Autenticación WSAA exitosa`, {
                correlationId,
                environment: environmentName,
                expiresAt: newToken.expirationTime.toISOString(),
                responseTimeMs: Date.now() - startTime
            });
            return newToken;

        } catch (error) {
            await this.handleWsaaError(error, environmentName);
            throw error;
        }
    }

    /**
     * Log estructurado para mejor debugging y métricas
     */
    private logStructured(
        level: 'debug' | 'log' | 'warn' | 'error',
        message: string,
        context: Record<string, unknown>
    ): void {
        const logData = JSON.stringify(context);
        switch (level) {
            case 'debug':
                this.logger.debug(`${message} ${logData}`);
                break;
            case 'log':
                this.logger.log(`${message} ${logData}`);
                break;
            case 'warn':
                this.logger.warn(`${message} ${logData}`);
                break;
            case 'error':
                this.logger.error(`${message} ${logData}`);
                break;
        }
    }

    /**
     * Maneja los errores de autenticación WSAA
     * Extrae la lógica de manejo de errores para reducir la complejidad cognitiva
     */
    private async handleWsaaError(
        error: unknown,
        environmentName: 'homologacion' | 'produccion',
    ): Promise<never> {
        this.logger.error('Error en autenticación WSAA:', error);

        // Intentar parsear error SOAP
        if (axios.isAxiosError(error) && error.response?.data) {
            // Loggear el cuerpo completo de la respuesta de error para diagnóstico
            this.logger.error(`Respuesta de error WSAA (${error.response.status}):`,
                typeof error.response.data === 'string'
                    ? error.response.data.substring(0, 2000)
                    : JSON.stringify(error.response.data).substring(0, 2000)
            );

            const faultMsg = await parseSoapFault(error.response.data).catch(() => null);
            if (faultMsg) {
                this.logger.error(`WSAA Fault Message: ${faultMsg}`);

                // Si el error es que ya existe un TA válido, pero no lo tenemos en BD
                // significa que se perdió. Limpiar, guardar timestamp y esperar a que expire.
                if (faultMsg.includes('ya posee un TA valido') || faultMsg.includes('ya posee un TA válido')) {
                    this.logger.warn(`AFIP indica que ya existe un token válido para ${environmentName} pero no lo tenemos almacenado.`);
                    this.setTokenCache(environmentName, null);
                    await this.fiscalConfigService.clearWsaaToken();

                    // Guardar timestamp para calcular tiempo de espera
                    this.tokenPhantomErrorTimestamp.set(environmentName, new Date());

                    // Calcular tiempo estimado de espera (max 12 horas)
                    const waitMinutes = 12 * 60; // Máximo 12 horas
                    const waitHours = Math.ceil(waitMinutes / 60);

                    throw new Error(
                        `AFIP tiene un token activo para ${environmentName} que no está almacenado en el sistema. ` +
                        'Esto puede ocurrir si se cambió de servidor o se restauró la base de datos. ' +
                        `El token expirará automáticamente en aproximadamente ${waitHours} horas. ` +
                        'Use el método getPhantomTokenWaitTime() para consultar el tiempo restante.'
                    );
                }
                throw new Error(`Error WSAA: ${faultMsg}`);
            }
        }

        throw new Error(`Error de autenticación AFIP: ${(error as Error).message}`);
    }

    /**
     * Invalida el token de autenticación en memoria y en base de datos
     * Útil para forzar una re-autenticación cuando hay problemas
     * Solo invalida el token del ambiente activo
     */
    async invalidateAuthToken(): Promise<void> {
        const config = await this.fiscalConfigService.getConfiguration();
        const isHomologacion = config.afipEnvironment === AfipEnvironment.HOMOLOGACION;
        const environmentName = isHomologacion ? 'homologacion' : 'produccion';

        this.setTokenCache(environmentName, null);
        await this.fiscalConfigService.clearWsaaToken();
        this.logger.log(`Token WSAA de ${environmentName} invalidado (memoria y base de datos)`);
    }

    /**
     * Firma el TRA con el certificado usando CMS (PKCS#7)
     */
    private signTRA(tra: string, certificate: string, privateKey: string): string {
        try {
            const cert = forge.pki.certificateFromPem(certificate);
            const key = forge.pki.privateKeyFromPem(privateKey);
            const p7 = forge.pkcs7.createSignedData();

            p7.content = forge.util.createBuffer(tra, 'utf8');
            p7.addCertificate(cert);
            p7.addSigner({
                key: key,
                certificate: cert,
                digestAlgorithm: forge.pki.oids.sha256,
                authenticatedAttributes: [
                    { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
                    { type: forge.pki.oids.messageDigest },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    { type: forge.pki.oids.signingTime, value: new Date() as any },
                ],
            });

            p7.sign();
            const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
            return forge.util.encode64(der);

        } catch (error) {
            this.logger.error('Error al firmar TRA:', error);
            throw new Error(`Error al firmar TRA: ${(error as Error).message}`);
        }
    }

    /**
     * Autoriza un comprobante en AFIP (WSFE)
     * Usa un mutex para serializar peticiones y evitar condiciones de carrera en numeración
     */
    async authorizeInvoice(request: InvoiceRequest): Promise<AfipResponse> {
        const isReady = await this.isConfigured();

        if (!isReady) {
            return this.simulateInvoiceAuthorization(request);
        }

        // Usar mutex para serializar peticiones de facturación
        // Esto evita condiciones de carrera cuando dos facturas se procesan simultáneamente
        return this.withInvoiceMutex(async () => {
            return this.doAuthorizeInvoice(request);
        });
    }

    /**
     * Ejecuta una operación con el mutex de facturación
     */
    private async withInvoiceMutex<T>(operation: () => Promise<T>): Promise<T> {
        // Esperar a que termine cualquier operación anterior
        await this.invoiceMutex;

        // Crear nueva promesa para esta operación
        let resolve: () => void;
        this.invoiceMutex = new Promise(r => { resolve = r; });

        try {
            return await operation();
        } finally {
            resolve!();
        }
    }

    /**
     * Implementación interna de autorización (ejecutada dentro del mutex)
     */
    private async doAuthorizeInvoice(request: InvoiceRequest): Promise<AfipResponse> {
        const correlationId = `wsfe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();

        try {
            const authToken = await this.getAuthToken();
            const config = await this.fiscalConfigService.getConfiguration();

            if (!config.cuit) throw new Error('CUIT no configurado');

            const lastNumber = await this.getLastInvoiceNumber(request.pointOfSale, request.invoiceType);
            const nextNumber = lastNumber + 1;

            const ivaItems: WSFEIvaItem[] = request.iva.map(item => ({
                Id: item.id,
                BaseImp: item.baseAmount,
                Importe: item.amount
            }));

            const wsfeRequest: WSFEAuthRequest = {
                invoiceType: request.invoiceType,
                pointOfSale: request.pointOfSale,
                concept: request.concept,
                docType: request.docType,
                docNumber: request.docNumber,
                receiverIvaCondition: request.receiverIvaCondition,
                invoiceNumber: nextNumber,
                invoiceDate: request.issueDate,
                totalAmount: request.total,
                netAmount: request.netAmount,
                exemptAmount: request.netAmountExempt,
                ivaAmount: request.iva.reduce((sum, item) => sum + item.amount, 0),
                otherTaxes: request.otherTaxes,
                ivaItems: ivaItems,
                associatedDocument: request.associatedDocument ? {
                    Tipo: request.associatedDocument.type,
                    PtoVta: request.associatedDocument.pointOfSale,
                    Nro: request.associatedDocument.number,
                } : undefined,
            };

            const wsfeUrl = config.afipEnvironment === AfipEnvironment.HOMOLOGACION
                ? 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx'
                : 'https://servicios1.afip.gov.ar/wsfev1/service.asmx';

            const soapRequest = createFECAESolicitarRequest(
                authToken.token,
                authToken.sign,
                config.cuit,
                wsfeRequest
            );

            this.logStructured('debug', `Solicitando CAE`, {
                correlationId,
                invoiceNumber: nextNumber,
                invoiceType: request.invoiceType,
                pointOfSale: request.pointOfSale,
                total: request.total,
                netAmount: request.netAmount,
                ivaItems: ivaItems.length
            });

            const response = await axios.post(wsfeUrl, soapRequest, {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FECAESolicitar',
                },
                httpsAgent: new https.Agent({
                    rejectUnauthorized: true,
                    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
                    ciphers: 'HIGH:MEDIUM:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
                }),
            });

            const responseTime = Date.now() - startTime;
            const result = await parseFECAEResponse(response.data);

            if (result.success) {
                this.logStructured('log', `CAE obtenido exitosamente`, {
                    correlationId,
                    cae: result.cae,
                    invoiceNumber: result.invoiceNumber,
                    responseTimeMs: responseTime
                });
                return {
                    success: true,
                    cae: result.cae,
                    caeExpirationDate: result.caeExpirationDate,
                    invoiceNumber: result.invoiceNumber,
                    observations: result.observations
                };
            } else {
                this.logStructured('error', 'AFIP rechazó el comprobante', {
                    correlationId,
                    errors: result.errors,
                    observations: result.observations,
                    responseTimeMs: responseTime
                });
                return {
                    success: false,
                    errors: result.errors,
                    observations: result.observations
                };
            }

        } catch (error) {
            this.logStructured('error', 'Error al autorizar comprobante', {
                correlationId,
                error: (error as Error).message,
                responseTimeMs: Date.now() - startTime
            });
            return {
                success: false,
                errors: [`Error de comunicación con AFIP: ${(error as Error).message}`],
            };
        }
    }

    private simulateInvoiceAuthorization(request: InvoiceRequest): AfipResponse {
        const invoiceNumber = Date.now() % 100000000;
        const cae = String(Date.now()).slice(-14).padStart(14, '0');
        const caeExpDate = new Date();
        caeExpDate.setDate(caeExpDate.getDate() + 10);
        const caeExpirationDate = caeExpDate.toISOString().slice(0, 10).replaceAll('-', '');

        this.logger.log(`[SIMULACIÓN] Factura autorizada: Tipo ${request.invoiceType}, Nº ${invoiceNumber}, CAE ${cae}`);

        return {
            success: true,
            cae,
            caeExpirationDate,
            invoiceNumber,
            observations: ['[SIMULACIÓN] Este CAE no es válido fiscalmente'],
        };
    }

    async getLastInvoiceNumber(pointOfSale: number, invoiceType: number): Promise<number> {
        const isReady = await this.isConfigured();

        if (!isReady) {
            return Date.now() % 100000;
        }

        try {
            const authToken = await this.getAuthToken();
            const config = await this.fiscalConfigService.getConfiguration();

            if (!config.cuit) throw new Error('CUIT no configurado');

            const wsfeUrl = config.afipEnvironment === AfipEnvironment.HOMOLOGACION
                ? 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx'
                : 'https://servicios1.afip.gov.ar/wsfev1/service.asmx';

            const soapRequest = createFECompUltimoAutorizadoRequest(
                authToken.token,
                authToken.sign,
                config.cuit,
                pointOfSale,
                invoiceType
            );

            const response = await axios.post(wsfeUrl, soapRequest, {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado',
                },
                httpsAgent: new https.Agent({
                    rejectUnauthorized: true,
                    // AFIP usa parámetros DH pequeños que OpenSSL moderno rechaza por defecto
                    // NOTA: No usar @SECLEVEL=1 porque BoringSSL (Electron) no lo soporta
                    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
                    ciphers: 'HIGH:MEDIUM:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
                }),
            });

            const lastNumber = await parseFECompUltimoResponse(response.data);

            this.logger.log(`Último comprobante autorizado: PV ${pointOfSale}, Tipo ${invoiceType}, Nº ${lastNumber}`);

            return lastNumber;

        } catch (error) {
            this.logger.error('Error al consultar último comprobante:', error);
            throw new Error(`Error al consultar AFIP: ${(error as Error).message}`);
        }
    }

    async testConnection(): Promise<{ success: boolean; message: string }> {
        const isReady = await this.isConfigured();

        if (!isReady) {
            const { missingFields } = await this.fiscalConfigService.isReadyForInvoicing();
            return {
                success: false,
                message: `AFIP no está configurado. Faltan: ${missingFields.join(', ')}`,
            };
        }

        try {
            await this.getAuthToken();
            return {
                success: true,
                message: 'Conexión exitosa con AFIP. Certificados válidos y autenticación funcionando correctamente.',
            };
        } catch (error) {
            return {
                success: false,
                message: `Error de conexión: ${(error as Error).message}`,
            };
        }
    }

    formatDateForAfip(date: Date): string {
        return date.toISOString().slice(0, 10).replaceAll('-', '');
    }

    parseAfipDate(dateStr: string): Date {
        const year = Number.parseInt(dateStr.slice(0, 4));
        const month = Number.parseInt(dateStr.slice(4, 6)) - 1;
        const day = Number.parseInt(dateStr.slice(6, 8));
        return new Date(year, month, day);
    }
}

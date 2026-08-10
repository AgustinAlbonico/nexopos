/**
 * Tipos del módulo de ventas
 */

/**
 * Estados de una venta
 */
export enum SaleStatus {
    COMPLETED = 'completed',
    PENDING = 'pending',
    PARTIAL = 'partial',
    CANCELLED = 'cancelled',
}

/**
 * Labels para estados de venta
 */
export const SaleStatusLabels: Record<SaleStatus, string> = {
    [SaleStatus.COMPLETED]: 'Completada',
    [SaleStatus.PENDING]: 'Pendiente',
    [SaleStatus.PARTIAL]: 'Parcial',
    [SaleStatus.CANCELLED]: 'Cancelada',
};

/**
 * Colores para estados de venta
 */
export const SaleStatusColors: Record<SaleStatus, string> = {
    [SaleStatus.COMPLETED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    [SaleStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    [SaleStatus.PARTIAL]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    [SaleStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

/**
 * Métodos de pago
 */
export enum PaymentMethod {
    CASH = 'cash',
    DEBIT_CARD = 'debit_card',
    CREDIT_CARD = 'credit_card',
    TRANSFER = 'transfer',
    QR = 'qr',
    CHECK = 'check',
    OTHER = 'other',
}

/**
 * Labels para métodos de pago
 */
export const PaymentMethodLabels: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'Efectivo',
    [PaymentMethod.DEBIT_CARD]: 'Tarjeta Débito',
    [PaymentMethod.CREDIT_CARD]: 'Tarjeta Crédito',
    [PaymentMethod.TRANSFER]: 'Transferencia',
    [PaymentMethod.QR]: 'QR / Billetera Virtual',
    [PaymentMethod.CHECK]: 'Cheque',
    [PaymentMethod.OTHER]: 'Otro',
};

/**
 * Item de venta
 */
export interface SaleItem {
    id: string;
    saleId: string;
    productId: string;
    product: {
        id: string;
        name: string;
        sku?: string;
        price: number;
    };
    productCode?: string;
    productDescription: string;
    quantity: number;
    unitOfMeasure: string;
    unitPrice: number;
    discount: number;
    discountPercent: number;
    subtotal: number;
}

/**
 * Pago de venta
 */
export interface SalePayment {
    id: string;
    saleId: string;
    paymentMethod: PaymentMethod;
    amount: number;
    installments?: number;
    cardLastFourDigits?: string;
    authorizationCode?: string;
    referenceNumber?: string;
    notes?: string;
}

/**
 * Cliente resumido
 */
export interface CustomerSummary {
    id: string;
    firstName: string;
    lastName: string;
    documentNumber?: string;
    phone?: string;
}

/**
 * Usuario resumido
 */
export interface UserSummary {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
}

/**
 * Venta
 */
export interface Sale {
    id: string;
    saleNumber: string;
    customerId?: string;
    customer?: CustomerSummary;
    customerName?: string;
    saleDate: string;
    subtotal: number;
    discount: number;
    surcharge: number;
    tax: number;
    total: number;
    status: SaleStatus;
    isOnAccount: boolean;
    isFiscal: boolean; // Si la venta tiene factura fiscal autorizada
    fiscalPending: boolean; // Si se solicitó factura pero falló (pendiente de reintento)
    fiscalError?: string; // Mensaje de error de la última falla de facturación
    notes?: string;
    inventoryUpdated: boolean;
    items: SaleItem[];
    payments: SalePayment[];
    invoice?: Invoice; // Factura asociada (si existe)
    createdBy?: UserSummary;
    createdById?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * DTO para crear item de venta
 */
export interface CreateSaleItemDTO {
    productId: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountPercent?: number;
    notes?: string;
}

/**
 * DTO para crear pago de venta
 */
export interface CreateSalePaymentDTO {
    paymentMethodId: string;
    amount: number;
    installments?: number;
    cardLastFourDigits?: string;
    authorizationCode?: string;
    referenceNumber?: string;
    notes?: string;
}

/**
 * DTO para crear venta
 */
export interface CreateSaleDTO {
    customerId?: string;
    customerName?: string;
    saleDate?: string;
    discount?: number;
    surcharge?: number;
    tax?: number;
    status?: SaleStatus;
    isOnAccount?: boolean;
    notes?: string;
    items: CreateSaleItemDTO[];
    payments?: CreateSalePaymentDTO[];
    generateInvoice?: boolean; // Si true, genera factura fiscal
    ivaPercentage?: number; // Porcentaje de IVA para Factura A (21, 10.5, 27)
}

/**
 * DTO para actualizar venta
 */
export interface UpdateSaleDTO {
    customerId?: string;
    customerName?: string;
    discount?: number;
    surcharge?: number;
    tax?: number;
    status?: SaleStatus;
    isOnAccount?: boolean;
    notes?: string;
}

/**
 * Item para `POST /sales/check-replenishment` (PR4 / PR8).
 */
export interface CheckReplenishmentItemDTO {
    productId: string;
    quantity: number;
}

/**
 * Opción de reposición desde otra ubicación activa (PR4 / PR8).
 */
export interface ReplenishmentOptionDTO {
    locationId: string;
    locationName: string;
    available: number;
}

/**
 * Respuesta de `POST /sales/check-replenishment` por ítem (PR4 / PR8).
 */
export interface CheckReplenishmentResultDTO {
    productId: string;
    quantity: number;
    primarySaleAvailable: number;
    needsReplenishment: boolean;
    options: ReplenishmentOptionDTO[];
}

/**
 * Ítem del body 409 `SaleBlockedByStockError` (PR4 / PR8).
 * Misma forma que `CheckReplenishmentResultDTO` pero sin `needsReplenishment`
 * (siempre true en este contexto) y agrupado dentro de `items[]`.
 */
export interface BlockedStockItemDTO {
    productId: string;
    productName: string;
    requested: number;
    primarySaleAvailable: number;
    options: ReplenishmentOptionDTO[];
}

/**
 * Body del `ConflictException` 409 cuando el modo sectorizado detecta
 * faltante en la ubicación principal de venta.
 */
export interface SaleBlockedByStockErrorBody {
    statusCode: number;
    error: string;
    message: string;
    items: BlockedStockItemDTO[];
}

/**
 * Traslado previo a la venta (PR4 / PR8). El backend lo ejecuta dentro
 * de la misma transacción que la venta.
 */
export interface ReplenishmentTransferDTO {
    productId: string;
    fromLocationId: string;
    quantity: number;
    reason?: string;
}

/**
 * Estados de facturación para filtrar
 */
export enum InvoiceFilterStatus {
    FISCAL = 'fiscal',           // Factura fiscal autorizada
    NO_FISCAL = 'no_fiscal',     // Sin factura fiscal
    ERROR = 'error',             // Error al generar factura
    PENDING = 'pending',         // Pendiente de facturación
}

/**
 * Labels para estados de facturación
 */
export const InvoiceFilterStatusLabels: Record<InvoiceFilterStatus, string> = {
    [InvoiceFilterStatus.FISCAL]: 'Fiscal',
    [InvoiceFilterStatus.NO_FISCAL]: 'No Fiscal',
    [InvoiceFilterStatus.ERROR]: 'Con Error',
    [InvoiceFilterStatus.PENDING]: 'Pendiente',
};

/**
 * Filtros de ventas
 */
export interface SaleFilters {
    page?: number;
    limit?: number;
    search?: string;
    status?: SaleStatus;
    startDate?: string;
    endDate?: string;
    customerId?: string;
    productId?: string;
    fiscalPending?: boolean; // Filtrar ventas con factura fiscal pendiente (deprecated)
    invoiceStatus?: InvoiceFilterStatus; // Filtrar por estado de facturación
    sortBy?: string;
    order?: 'ASC' | 'DESC';
}

/**
 * Respuesta paginada de ventas
 */
export interface PaginatedSales {
    data: Sale[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/**
 * Estadísticas de ventas
 */
export interface SaleStats {
    totalSales: number;
    totalAmount: number;
    totalCompleted: number;
    totalPending: number;
    salesByStatus: Record<SaleStatus, number>;
    salesByPaymentMethod: Record<string, number>;
}

// ===============================
// TIPOS DE FACTURACIÓN FISCAL
// ===============================

/**
 * Tipos de comprobante fiscal
 */
export enum InvoiceType {
    FACTURA_A = 1,
    FACTURA_B = 6,
    FACTURA_C = 11,
}

/**
 * Labels para tipos de factura
 */
export const InvoiceTypeLabels: Record<InvoiceType, string> = {
    [InvoiceType.FACTURA_A]: 'Factura A',
    [InvoiceType.FACTURA_B]: 'Factura B',
    [InvoiceType.FACTURA_C]: 'Factura C',
};

/**
 * Estados de la factura
 */
export enum InvoiceStatus {
    PENDING = 'pending',
    AUTHORIZED = 'authorized',
    REJECTED = 'rejected',
    ERROR = 'error',
}

/**
 * Labels para estados de factura
 */
export const InvoiceStatusLabels: Record<InvoiceStatus, string> = {
    [InvoiceStatus.PENDING]: 'Pendiente',
    [InvoiceStatus.AUTHORIZED]: 'Autorizada',
    [InvoiceStatus.REJECTED]: 'Rechazada',
    [InvoiceStatus.ERROR]: 'Error',
};

/**
 * Colores para estados de factura
 */
export const InvoiceStatusColors: Record<InvoiceStatus, string> = {
    [InvoiceStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    [InvoiceStatus.AUTHORIZED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    [InvoiceStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    [InvoiceStatus.ERROR]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

/**
 * Factura fiscal
 */
export interface Invoice {
    id: string;
    saleId: string;
    invoiceType: InvoiceType;
    pointOfSale: number;
    invoiceNumber: number | null;
    issueDate: string;

    // Datos del emisor
    emitterCuit: string;
    emitterBusinessName: string;
    emitterAddress: string;
    emitterIvaCondition: string;

    // Datos del receptor
    receiverDocumentType: number;
    receiverDocumentNumber?: string;
    receiverName?: string;
    receiverIvaCondition?: string;

    // Importes
    subtotal: number;
    discount: number;
    otherTaxes: number;
    total: number;

    // Autorización AFIP
    status: InvoiceStatus;
    cae?: string;
    caeExpirationDate?: string;
    qrData?: string;

    // Error info
    afipErrorMessage?: string;

    createdAt: string;
    updatedAt: string;
}

/**
 * Estado de conexión AFIP
 */
export interface AfipStatus {
    configured: boolean;
    environment: 'homologacion' | 'produccion';
    connection: {
        success: boolean;
        message: string;
    };
}


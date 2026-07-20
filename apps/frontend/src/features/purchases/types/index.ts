/**
 * Tipos del módulo de compras
 */

export enum PurchaseStatus {
    PENDING = 'pending',
    PAID = 'paid',
}

export const PurchaseStatusLabels: Record<PurchaseStatus, string> = {
    [PurchaseStatus.PENDING]: 'Pendiente',
    [PurchaseStatus.PAID]: 'Pagada',
};

export const PurchaseStatusColors: Record<PurchaseStatus, string> = {
    [PurchaseStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    [PurchaseStatus.PAID]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

export enum PaymentMethod {
    CASH = 'cash',
    TRANSFER = 'transfer',
    DEBIT_CARD = 'debit_card',
    CREDIT_CARD = 'credit_card',
    CHECK = 'check',
    OTHER = 'other',
}

export const PaymentMethodLabels: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'Efectivo',
    [PaymentMethod.TRANSFER]: 'Transferencia',
    [PaymentMethod.DEBIT_CARD]: 'Débito',
    [PaymentMethod.CREDIT_CARD]: 'Crédito',
    [PaymentMethod.CHECK]: 'Cheque',
    [PaymentMethod.OTHER]: 'Otro',
};

export interface PurchaseItem {
    id: string;
    productId: string;
    product: {
        id: string;
        name: string;
        sku?: string;
        barcode?: string;
    };
    quantity: number;
    unitPrice: number;
    subtotal: number;
    notes?: string | null;
}

export interface Purchase {
    id: string;
    purchaseNumber: string;
    supplierId?: string | null;
    supplier?: {
        id: string;
        name: string;
        tradeName?: string | null;
        documentNumber?: string | null;
        phone?: string | null;
    } | null;
    providerName: string;
    providerDocument?: string | null;
    providerPhone?: string | null;
    purchaseDate: string;
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    status: PurchaseStatus;
    paidAt?: string | null;
    invoiceNumber?: string | null;
    notes?: string | null;
    inventoryUpdated: boolean;
    paymentMethod?: { id: string; name: string; code: string } | null;
    items: PurchaseItem[];
    createdBy?: {
        id: string;
        firstName: string;
        lastName: string;
    } | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePurchaseItemDTO {
    productId: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
}

export interface CreatePurchaseDTO {
    supplierId?: string;
    providerName: string;
    providerDocument?: string;
    providerPhone?: string;
    purchaseDate: string;
    tax?: number;
    discount?: number;
    status?: PurchaseStatus;
    paymentMethod?: PaymentMethod;
    paidAt?: string;
    invoiceNumber?: string;
    notes?: string;
    items: CreatePurchaseItemDTO[];
    createExpense?: boolean;
    expenseCategoryId?: string;
}

export interface UpdatePurchaseDTO {
    providerName?: string;
    providerDocument?: string;
    providerPhone?: string;
    tax?: number;
    discount?: number;
    status?: PurchaseStatus;
    paymentMethod?: PaymentMethod;
    paidAt?: string;
    invoiceNumber?: string;
    notes?: string;
}

export interface PurchaseFilters {
    providerName?: string;
    status?: PurchaseStatus;
    startDate?: string;
    endDate?: string;
    invoiceNumber?: string;
    productId?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'purchaseDate' | 'total' | 'createdAt' | 'purchaseNumber';
    order?: 'ASC' | 'DESC';
}

export interface PurchaseStats {
    totalPurchases: number;
    totalAmount: number;
    totalPaid: number;
    totalPending: number;
    purchasesByStatus: Record<PurchaseStatus, number>;
}

export interface PaginatedPurchases {
    data: Purchase[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}


import { PaymentMethod as PaymentMethodEntity } from '@/features/configuration/api/payment-methods.api';

export enum CashRegisterStatus {
    OPEN = 'open',
    CLOSED = 'closed',
}

export enum MovementType {
    INCOME = 'income',
    EXPENSE = 'expense',
}

export interface User {
    id: string;
    name: string | null;
    firstName?: string;
    lastName?: string;
    email?: string;
}

export interface CashMovement {
    id: string;
    movementType: MovementType;
    paymentMethod: PaymentMethodEntity;
    amount: number;
    description: string;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    createdBy: User;
    createdAt: string;
}

export interface CashRegisterTotals {
    id: string;
    paymentMethod: PaymentMethodEntity;
    initialAmount: number;
    totalIncome: number;
    totalExpense: number;
    expectedAmount: number;
    actualAmount?: number;
    difference?: number;
}

export interface CashRegister {
    id: string;
    date: string;
    openedAt: string;
    closedAt?: string;
    initialAmount: number;
    totalIncome: number;
    totalExpense: number;
    expectedAmount?: number;
    actualAmount?: number;
    difference?: number;
    status: CashRegisterStatus;
    openingNotes?: string;
    closingNotes?: string;
    movements: CashMovement[];
    totals?: CashRegisterTotals[];
    openedBy: User;
    closedBy?: User;
    createdAt: string;
    updatedAt: string;
}

export interface OpenCashRegisterDto {
    initialAmount: number;
    manuallyAdjusted?: boolean;
    adjustmentReason?: string;
    openingNotes?: string;
}

export interface ActualAmountsDto extends Record<string, number | undefined> { }

export interface CloseCashRegisterDto {
    actualCashAmount: number;
    actualAmounts?: ActualAmountsDto;
    closingNotes?: string;
}

export interface CreateCashMovementDto {
    movementType: 'income' | 'expense';
    paymentMethodId: string;
    amount: number;
    description: string;
    notes?: string;
}

export interface CashStats {
    totalRegisters: number;
    closedRegisters: number;
    openRegisters: number;
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    totalDifferences: number;
    averageDifference: number;
}

export interface SuggestedInitialAmount {
    suggested: number;
    previousDate: string | null;
    previousActual: number;
}

export interface CashFlowReportFilters {
    startDate: string;
    endDate: string;
    paymentMethod?: string;
    includeComparison?: boolean;
}

export interface CashFlowReportSummary {
    totalDays: number;
    closedDays: number;
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    totalDifferences: number;
    averageDailyIncome: number;
}

export interface PaymentMethodTotals {
    totalIncome: number;
    totalExpense: number;
    netAmount: number;
    totalDifferences: number;
    averageDailyIncome?: number;
}

export interface DailyBreakdown {
    date: string;
    status: CashRegisterStatus;
    income: number;
    expense: number;
    net: number;
    difference: number;
    movementsCount: number;
}

export interface CashFlowReportComparison {
    period: {
        start: string;
        end: string;
    };
    summary: CashFlowReportSummary;
}

export interface CashFlowReport {
    period: {
        start: string;
        end: string;
    };
    summary: CashFlowReportSummary;
    byPaymentMethod: Record<string, PaymentMethodTotals>;
    dailyBreakdown: DailyBreakdown[];
    comparison?: CashFlowReportComparison;
}

/**
 * Estado de la caja - para detección de caja sin cerrar del día anterior
 */
export interface CashStatus {
    hasOpenRegister: boolean;
    isFromPreviousDay: boolean;
    openRegister: CashRegister | null;
}

/**
 * Metadata de paginación
 */
export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/**
 * Respuesta paginada genérica
 */
export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
}

/**
 * Filtros para historial de cajas
 */
export interface CashHistoryFilters {
    page?: number;
    limit?: number;
    date?: string; // Fecha específica YYYY-MM-DD
    startDate?: string; // Fecha inicio de rango
    endDate?: string; // Fecha fin de rango
}


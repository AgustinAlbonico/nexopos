/**
 * Tipos del módulo de gastos
 */

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

export interface ExpenseCategory {
    id: string;
    name: string;
    description?: string | null;
    isRecurring: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

import { PaymentMethod as PaymentMethodEntity } from '@/features/configuration/api/payment-methods.api';

// ... (keep enums for now if needed, or remove if unused)

export interface Expense {
    id: string;
    description: string;
    amount: number;
    expenseDate: string;
    category: ExpenseCategory;
    categoryId: string;
    paymentMethod?: PaymentMethodEntity | null;
    paymentMethodId?: string | null;
    receiptNumber?: string | null;
    isPaid: boolean;
    paidAt?: string | null;
    notes?: string | null;
    createdBy?: {
        id: string;
        firstName: string;
        lastName: string;
    } | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateExpenseDTO {
    description: string;
    amount: number;
    expenseDate: string;
    categoryId?: string;
    paymentMethodId?: string;
    receiptNumber?: string;
    isPaid?: boolean;
    paidAt?: string;
    notes?: string;
}

export interface UpdateExpenseDTO extends Partial<CreateExpenseDTO> { }

export interface ExpenseFilters {
    categoryId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    isPaid?: boolean;
    page?: number;
    limit?: number;
    sortBy?: 'expenseDate' | 'amount' | 'createdAt';
    order?: 'ASC' | 'DESC';
}

export interface CreateExpenseCategoryDTO {
    name: string;
    description?: string;
    isRecurring?: boolean;
}

export interface UpdateExpenseCategoryDTO extends Partial<CreateExpenseCategoryDTO> { }

export interface ExpenseStats {
    totalExpenses: number;
    totalAmount: number;
    totalPending: number;
    byCategory: Array<{
        categoryId: string;
        categoryName: string;
        count: number;
        total: number;
    }>;
}

export interface RecurringSuggestion {
    categoryId: string;
    categoryName: string;
    lastExpense: {
        description: string;
        amount: number;
        paymentMethodId: string | null;
        receiptNumber: string | null;
        notes: string | null;
        lastDate: string;
    };
}

export interface PaginatedExpenses {
    data: Expense[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}


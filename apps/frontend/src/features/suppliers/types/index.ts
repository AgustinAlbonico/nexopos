/**
 * Tipos para el módulo de proveedores
 */

export type DocumentType = 'DNI' | 'CUIT' | 'CUIL' | 'OTRO';

export type IvaCondition = 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTISTA' | 'CONSUMIDOR_FINAL' | 'EXENTO' | 'NO_RESPONSABLE';

export const DocumentTypeLabels: Record<DocumentType, string> = {
    DNI: 'DNI',
    CUIT: 'CUIT',
    CUIL: 'CUIL',
    OTRO: 'Otro',
};

export const IvaConditionLabels: Record<IvaCondition, string> = {
    RESPONSABLE_INSCRIPTO: 'Responsable Inscripto',
    MONOTRIBUTISTA: 'Monotributista',
    CONSUMIDOR_FINAL: 'Consumidor Final',
    EXENTO: 'Exento',
    NO_RESPONSABLE: 'No Responsable',
};

export interface Supplier {
    id: string;
    name: string;
    tradeName?: string | null;
    documentType?: DocumentType | null;
    documentNumber?: string | null;
    ivaCondition?: IvaCondition | null;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    website?: string | null;
    contactName?: string | null;
    bankAccount?: string | null;
    notes?: string | null;
    classification?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSupplierDTO {
    name: string;
    tradeName?: string | null;
    documentType?: DocumentType | null;
    documentNumber?: string | null;
    ivaCondition?: IvaCondition | null;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    website?: string | null;
    contactName?: string | null;
    bankAccount?: string | null;
    notes?: string | null;
    classification?: string | null;
    isActive?: boolean;
}

export interface UpdateSupplierDTO extends Partial<CreateSupplierDTO> {}

export interface SupplierFilters {
    page?: number;
    limit?: number;
    search?: string;
    city?: string;
    state?: string;
    classification?: string;
    isActive?: boolean;
    sortBy?: 'name' | 'tradeName' | 'email' | 'createdAt' | 'classification';
    order?: 'ASC' | 'DESC';
}

export interface SupplierStats {
    total: number;
    active: number;
    inactive: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

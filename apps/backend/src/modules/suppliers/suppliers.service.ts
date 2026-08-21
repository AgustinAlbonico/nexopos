/**
 * Servicio de Proveedores
 * Gestiona el CRUD de proveedores
 */
import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto, UpdateSupplierDto, SupplierFiltersDto } from './dto';

export interface PaginatedSuppliers {
    data: Supplier[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface SupplierStats {
    total: number;
    active: number;
    inactive: number;
}

@Injectable()
export class SuppliersService {
    constructor(
        @InjectRepository(Supplier)
        private readonly supplierRepo: Repository<Supplier>,
    ) { }

    /**
     * Crea un nuevo proveedor
     */
    async create(dto: CreateSupplierDto): Promise<Supplier> {
        // Verificar documento único si se proporciona
        if (dto.documentNumber) {
            const existing = await this.supplierRepo.findOne({
                where: { documentNumber: dto.documentNumber },
            });
            if (existing) {
                throw new ConflictException(
                    `Ya existe un proveedor con el documento ${dto.documentNumber}`,
                );
            }
        }

        const supplier = this.supplierRepo.create({
            ...dto,
            tradeName: dto.tradeName ?? null,
            documentType: dto.documentType ?? null,
            documentNumber: dto.documentNumber ?? null,
            ivaCondition: dto.ivaCondition ?? null,
            email: dto.email ?? null,
            phone: dto.phone ?? null,
            mobile: dto.mobile ?? null,
            address: dto.address ?? null,
            city: dto.city ?? null,
            state: dto.state ?? null,
            postalCode: dto.postalCode ?? null,
            website: dto.website ?? null,
            contactName: dto.contactName ?? null,
            bankAccount: dto.bankAccount ?? null,
            notes: dto.notes ?? null,
            classification: dto.classification ?? null,
            isActive: dto.isActive ?? true,
        });

        return this.supplierRepo.save(supplier);
    }

    /**
     * Obtiene todos los proveedores con filtros y paginación
     */
    async findAll(filters?: SupplierFiltersDto): Promise<PaginatedSuppliers> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;
        const skip = (page - 1) * limit;

        const where: FindOptionsWhere<Supplier>[] = [];
        const baseWhere: FindOptionsWhere<Supplier> = {};

        // Filtro de estado activo
        if (filters?.isActive !== undefined) {
            baseWhere.isActive = filters.isActive;
        }

        // Filtro de ciudad
        if (filters?.city) {
            baseWhere.city = filters.city;
        }

        // Filtro de provincia
        if (filters?.state) {
            baseWhere.state = filters.state;
        }

        // Filtro de clasificación
        if (filters?.classification) {
            baseWhere.classification = filters.classification;
        }

        // Búsqueda en múltiples campos
        if (filters?.search) {
            where.push(
                { ...baseWhere, name: Like(`%${filters.search}%`) },
                { ...baseWhere, tradeName: Like(`%${filters.search}%`) },
                { ...baseWhere, documentNumber: Like(`%${filters.search}%`) },
                { ...baseWhere, email: Like(`%${filters.search}%`) },
                { ...baseWhere, phone: Like(`%${filters.search}%`) },
                { ...baseWhere, contactName: Like(`%${filters.search}%`) },
            );
        } else {
            where.push(baseWhere);
        }

        const [data, total] = await this.supplierRepo.findAndCount({
            where: where.length > 0 ? where : undefined,
            order: {
                [filters?.sortBy || 'name']: filters?.order || 'ASC',
            },
            skip,
            take: limit,
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Obtiene proveedores activos (para selectores)
     */
    async findActive(): Promise<Supplier[]> {
        return this.supplierRepo.find({
            where: { isActive: true },
            order: { name: 'ASC' },
        });
    }

    /**
     * Obtiene estadísticas de proveedores
     */
    async getStats(): Promise<SupplierStats> {
        const [total, active] = await Promise.all([
            this.supplierRepo.count(),
            this.supplierRepo.count({ where: { isActive: true } }),
        ]);

        return {
            total,
            active,
            inactive: total - active,
        };
    }

    /**
     * Obtiene un proveedor por ID
     */
    async findOne(id: string): Promise<Supplier> {
        const supplier = await this.supplierRepo.findOne({ where: { id } });
        if (!supplier) {
            throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
        }
        return supplier;
    }

    /**
     * Actualiza un proveedor
     */
    async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
        const supplier = await this.findOne(id);

        // Verificar documento único si se cambia
        if (dto.documentNumber && dto.documentNumber !== supplier.documentNumber) {
            const existing = await this.supplierRepo.findOne({
                where: { documentNumber: dto.documentNumber },
            });
            if (existing && existing.id !== id) {
                throw new ConflictException(
                    `Ya existe un proveedor con el documento ${dto.documentNumber}`,
                );
            }
        }

        if (dto.classification !== undefined) {
            supplier.classification = dto.classification?.trim() || null;
        }

        Object.assign(supplier, {
            ...dto,
            classification: dto.classification !== undefined ? (dto.classification?.trim() || null) : supplier.classification,
        });
        return this.supplierRepo.save(supplier);
    }

    /**
     * Elimina (desactiva) un proveedor
     */
    async remove(id: string): Promise<{ message: string }> {
        const supplier = await this.findOne(id);
        supplier.isActive = false;
        await this.supplierRepo.save(supplier);
        return { message: 'Proveedor desactivado correctamente' };
    }

    /**
     * Busca proveedores por nombre (para autocompletado)
     */
    async searchByName(term: string): Promise<Supplier[]> {
        return this.supplierRepo.find({
            where: [
                { name: Like(`%${term}%`), isActive: true },
                { tradeName: Like(`%${term}%`), isActive: true },
            ],
            take: 10,
            order: { name: 'ASC' },
        });
    }

    /**
     * Obtiene las clasificaciones únicas existentes (para autocompletado)
     */
    async getClassifications(): Promise<string[]> {
        const results = await this.supplierRepo
            .createQueryBuilder('supplier')
            .select('DISTINCT supplier.classification', 'classification')
            .where('supplier.classification IS NOT NULL')
            .andWhere("TRIM(supplier.classification) != ''")
            .orderBy('supplier.classification', 'ASC')
            .getRawMany();
        return results
            .map((r: any) => r.classification || r.supplier_classification || Object.values(r)[0])
            .filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
    }
}

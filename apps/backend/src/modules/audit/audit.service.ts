/**
 * Servicio de Auditoría
 * Gestiona el registro y consulta de logs de auditoría
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditEntityType, AuditAction } from './enums';
import { AuditFiltersDto } from './dto';

export interface PaginatedAuditLogs {
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface AuditLogParams {
    entityType: AuditEntityType;
    entityId: string;
    action: AuditAction;
    userId: string;
    previousValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
    description?: string | null;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        @InjectRepository(AuditLog)
        private readonly auditLogRepo: Repository<AuditLog>,
    ) { }

    /**
     * Registra una acción de auditoría
     * @param params Parámetros del log
     * @returns El log creado
     */
    async log(params: AuditLogParams): Promise<AuditLog> {
        try {
            const auditLog = this.auditLogRepo.create({
                entityType: params.entityType,
                entityId: params.entityId,
                action: params.action,
                userId: params.userId,
                previousValues: params.previousValues ?? null,
                newValues: params.newValues ?? null,
                metadata: params.metadata ?? null,
                description: params.description ?? null,
            });

            const saved = await this.auditLogRepo.save(auditLog);
            this.logger.debug(
                `Audit log created: ${params.action} on ${params.entityType}:${params.entityId} by user ${params.userId}`
            );
            return saved;
        } catch (error) {
            // Si falla el log de auditoría, no debe interrumpir la operación principal
            this.logger.error(`Error creating audit log: ${(error as Error).message}`, (error as Error).stack);
            throw error;
        }
    }

    /**
     * Registra una acción de forma silenciosa (sin lanzar excepciones)
     * Útil para no interrumpir operaciones principales si falla el log
     */
    async logSilent(params: AuditLogParams): Promise<void> {
        try {
            await this.log(params);
        } catch (error) {
            // Log solo para debugging - el error ya fue logueado en log()
            console.error('[AuditService.logSilent] Error:', (error as Error).message);
        }
    }

    /**
     * Obtiene el historial de auditoría de una entidad específica
     */
    async getByEntity(entityType: AuditEntityType, entityId: string): Promise<AuditLog[]> {
        return this.auditLogRepo.find({
            where: { entityType, entityId },
            relations: ['user'],
            order: { timestamp: 'DESC' },
        });
    }

    /**
     * Obtiene la actividad de un usuario específico
     */
    async getByUser(userId: string, filters?: AuditFiltersDto): Promise<PaginatedAuditLogs> {
        const page = filters?.page ?? 1;
        const limit = filters?.limit ?? 20;
        const skip = (page - 1) * limit;

        const query = this.auditLogRepo
            .createQueryBuilder('audit')
            .leftJoinAndSelect('audit.user', 'user')
            .where('audit.userId = :userId', { userId });

        if (filters?.entityType) {
            query.andWhere('audit.entityType = :entityType', { entityType: filters.entityType });
        }

        if (filters?.action) {
            query.andWhere('audit.action = :action', { action: filters.action });
        }

        this.applyDateFilters(query, filters?.startDate, filters?.endDate);

        query.orderBy('audit.timestamp', 'DESC');

        const [data, total] = await query.skip(skip).take(limit).getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Obtiene todos los logs con filtros y paginación
     */
    async findAll(filters: AuditFiltersDto): Promise<PaginatedAuditLogs> {
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;
        const skip = (page - 1) * limit;

        const query = this.auditLogRepo
            .createQueryBuilder('audit')
            .leftJoinAndSelect('audit.user', 'user');

        // Aplicar filtros
        if (filters.entityType) {
            query.andWhere('audit.entityType = :entityType', { entityType: filters.entityType });
        }

        if (filters.entityId) {
            query.andWhere('audit.entityId = :entityId', { entityId: filters.entityId });
        }

        if (filters.action) {
            query.andWhere('audit.action = :action', { action: filters.action });
        }

        if (filters.userId) {
            query.andWhere('audit.userId = :userId', { userId: filters.userId });
        }

        if (filters.search) {
            query.andWhere('audit.description ILIKE :search', { search: `%${filters.search}%` });
        }

        this.applyDateFilters(query, filters.startDate, filters.endDate);

        query.orderBy('audit.timestamp', 'DESC');

        const [data, total] = await query.skip(skip).take(limit).getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Aplica filtros de fecha al query
     */
    private applyDateFilters(query: any, startDate?: string, endDate?: string): void {
        if (startDate && endDate) {
            query.andWhere('audit.timestamp BETWEEN :start AND :end', {
                start: `${startDate}T00:00:00`,
                end: `${endDate}T23:59:59`,
            });
        } else if (startDate) {
            query.andWhere('audit.timestamp >= :start', { start: `${startDate}T00:00:00` });
        } else if (endDate) {
            query.andWhere('audit.timestamp <= :end', { end: `${endDate}T23:59:59` });
        }
    }

    /**
     * Genera descripción automática para una acción
     */
    static generateDescription(
        action: AuditAction,
        entityType: AuditEntityType,
        entityNumber?: string
    ): string {
        const entityNames: Record<AuditEntityType, string> = {
            [AuditEntityType.SALE]: 'venta',
            [AuditEntityType.EXPENSE]: 'gasto',
            [AuditEntityType.INCOME]: 'ingreso',
            [AuditEntityType.PURCHASE]: 'compra',
            [AuditEntityType.CASH_REGISTER]: 'caja',
            [AuditEntityType.CASH_MOVEMENT]: 'movimiento de caja',
            [AuditEntityType.STOCKTAKE_SESSION]: 'conteo de inventario',
            [AuditEntityType.CREDIT_NOTE]: 'nota de crédito',
        };

        const actionNames: Record<AuditAction, string> = {
            [AuditAction.CREATE]: 'Creación de',
            [AuditAction.UPDATE]: 'Modificación de',
            [AuditAction.DELETE]: 'Eliminación de',
            [AuditAction.CANCEL]: 'Cancelación de',
            [AuditAction.PAY]: 'Pago de',
            [AuditAction.OPEN]: 'Apertura de',
            [AuditAction.CLOSE]: 'Cierre de',
            [AuditAction.STOCKTAKE_START]: 'Inicio de',
            [AuditAction.STOCKTAKE_COUNT]: 'Conteo de',
            [AuditAction.STOCKTAKE_APPROVE]: 'Aprobación de',
            [AuditAction.STOCKTAKE_CANCEL]: 'Cancelación de',
            [AuditAction.ATTEMPT]: 'Intento de',
        };

        const entityName = entityNames[entityType] || entityType;
        const actionName = actionNames[action] || action;
        const numberPart = entityNumber ? ` ${entityNumber}` : '';

        return `${actionName} ${entityName}${numberPart}`;
    }
}

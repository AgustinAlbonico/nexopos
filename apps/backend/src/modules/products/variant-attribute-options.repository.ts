import { Injectable } from '@nestjs/common';
import { DataSource, Repository, ILike } from 'typeorm';
import { VariantAttributeOption, VariantAttributeType } from './entities/variant-attribute-option.entity';

/**
 * Mapa type → attributeKey usado en product_variant_attributes.
 *
 * Pre-existing gap (2026-08-19): la columna attributeKey de la tabla
 * product_variant_attributes todavía no tiene writers en el código
 * (se completa en PRs posteriores con generateVariants/createApparelMatrix).
 * Mientras tanto `countUsage` devuelve 0 — ver TODO documentado abajo.
 */
const TYPE_TO_ATTRIBUTE_KEY: Record<VariantAttributeType, string> = {
    color: 'Color',
    size: 'Talle',
};

@Injectable()
export class VariantAttributeOptionsRepository extends Repository<VariantAttributeOption> {
    constructor(private readonly dataSource: DataSource) {
        super(VariantAttributeOption, dataSource.createEntityManager());
    }

    /**
     * Busca una opción por (type, name) case-insensitive o la crea si no existe.
     */
    async findOrCreateByName(
        type: VariantAttributeType,
        name: string,
        colorHex?: string | null,
    ): Promise<VariantAttributeOption> {
        const trimmedName = name.trim();

        let option = await this.findOne({
            where: { type, name: ILike(trimmedName) },
        });

        if (!option) {
            option = this.create({
                type,
                name: trimmedName,
                colorHex: colorHex ?? null,
            });
            await this.save(option);
        } else if (colorHex && !option.colorHex) {
            option.colorHex = colorHex;
            await this.save(option);
        }

        return option;
    }

    /**
     * Lista todas las opciones de un tipo (o todas si no se indica), alfabético.
     */
    async findAllByType(type?: VariantAttributeType): Promise<VariantAttributeOption[]> {
        return this.find({
            where: type ? { type } : {},
            order: { name: 'ASC' },
        });
    }

    /**
     * Búsqueda parcial case-insensitive para autocomplete. Limita a 10.
     */
    async searchByName(type: VariantAttributeType, query: string, limit = 10): Promise<VariantAttributeOption[]> {
        if (!query || query.trim().length === 0) {
            return this.find({
                where: { type },
                order: { name: 'ASC' },
                take: limit,
            });
        }

        return this.createQueryBuilder('option')
            .where('option.type = :type', { type })
            .andWhere('LOWER(option.name) LIKE :query', {
                query: `%${query.toLowerCase()}%`,
            })
            .orderBy('option.name', 'ASC')
            .take(limit)
            .getMany();
    }

    /**
     * Cuenta cuántos productos están usando esta opción en la matriz
     * product_variant_attributes. Informativo — el caller no debe confiar
     * en este número para bloquear operaciones.
     *
     * TODO: cuando product_variant_attributes se cree y se persistan filas
     * con attributeKey ∈ ('Color','Talle') + attributeValue = name, este
     * método deberá ejecutar el SELECT correspondiente.
     */
    async countUsage(type: VariantAttributeType, name: string): Promise<number> {
        const attributeKey = TYPE_TO_ATTRIBUTE_KEY[type];
        if (!attributeKey) return 0;

        const tableExists = await this.dataSource.query(
            `SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'product_variant_attributes'
            ) AS exists`,
        );
        const exists = tableExists[0]?.exists === true || tableExists[0]?.exists === 't';
        if (!exists) return 0;

        const result = await this.dataSource.query(
            `SELECT COUNT(*)::int AS count
            FROM product_variant_attributes
            WHERE "attributeKey" = $1 AND "attributeValue" = $2`,
            [attributeKey, name],
        );
        return Number(result[0]?.count ?? 0);
    }
}
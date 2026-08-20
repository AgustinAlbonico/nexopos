import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CAPABILITY_PRESETS, type CapabilityProfileKey } from './capabilities/presets';

export interface AuditResult {
    canSwitch: boolean;
    blockingReasons: string[];
}

@Injectable()
export class ConfigurationAuditService {
    constructor(private readonly dataSource: DataSource) {}

    async auditProfileSwitch(targetProfileKey: CapabilityProfileKey): Promise<AuditResult> {
        const targetPreset = CAPABILITY_PRESETS[targetProfileKey];
        const blockingReasons: string[] = [];

        // Auditoría de variantes: si el perfil destino no soporta variantes, verificar registros
        if (!targetPreset['STRUCTURAL.variants']) {
            try {
                const result = await this.dataSource.query(`SELECT COUNT(*)::int as count FROM product_variant_attributes`);
                const count = Number(result[0]?.count ?? 0);
                if (count > 0) {
                    blockingReasons.push(`Existen ${count} registros de variantes cargados en productos. Debe resolverlos antes de cambiar a un perfil sin variantes.`);
                }
            } catch {
                // Si la tabla no existe en la BD actual, ignorar
            }
        }

        return {
            canSwitch: blockingReasons.length === 0,
            blockingReasons,
        };
    }
}

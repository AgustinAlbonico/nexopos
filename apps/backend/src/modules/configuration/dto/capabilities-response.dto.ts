import { ApiProperty } from '@nestjs/swagger';

import { type CapabilityMap } from '../capabilities/keys';
import { CAPABILITY_PROFILE_KEYS, type CapabilityProfileKey } from '../capabilities/presets';

export class CapabilitiesResponseDto {
    @ApiProperty({ enum: CAPABILITY_PROFILE_KEYS })
    readonly profileKey!: CapabilityProfileKey;

    @ApiProperty({ example: 1 })
    readonly profileVersion!: number;

    @ApiProperty({ example: 1 })
    readonly capabilitiesSchemaVersion!: number;

    @ApiProperty({ type: 'object', additionalProperties: { type: 'boolean' } })
    readonly capabilities!: CapabilityMap;
}

export class AppRoutesManifestDto {
    @ApiProperty({ type: [String], example: ['dashboard', 'products'] })
    readonly enabled!: readonly string[];

    @ApiProperty({ type: [String], example: ['inventory/replenishment'] })
    readonly disabled!: readonly string[];
}

export class CapabilitiesManifestResponseDto extends CapabilitiesResponseDto {
    @ApiProperty({ type: AppRoutesManifestDto })
    readonly appRoutes!: AppRoutesManifestDto;
}

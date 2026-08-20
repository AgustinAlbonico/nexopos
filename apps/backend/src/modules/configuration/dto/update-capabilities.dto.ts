import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

import { ALL_CAPABILITY_KEYS, type CapabilityKey } from '../capabilities/keys';
import { CAPABILITY_PROFILE_KEYS, type CapabilityProfileKey } from '../capabilities/presets';

export class UpdateCapabilitiesDto {
    @ApiPropertyOptional({ enum: CAPABILITY_PROFILE_KEYS })
    @IsOptional()
    @IsString()
    @IsIn(CAPABILITY_PROFILE_KEYS)
    readonly profileKey?: CapabilityProfileKey;

    @ApiPropertyOptional({ enum: ALL_CAPABILITY_KEYS, type: 'object', additionalProperties: { type: 'boolean' } })
    @IsOptional()
    @IsObject()
    readonly capabilities?: Readonly<Partial<Record<CapabilityKey, boolean>>>;

    @ApiPropertyOptional({ example: 1, minimum: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    readonly capabilitiesSchemaVersion?: number;
}

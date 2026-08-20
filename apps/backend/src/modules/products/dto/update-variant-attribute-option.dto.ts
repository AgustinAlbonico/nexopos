import { ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export const UpdateVariantAttributeOptionSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido').max(100).optional(),
    colorHex: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido (formato: #RRGGBB)')
        .optional()
        .nullable(),
});

export type UpdateVariantAttributeOptionDTO = z.infer<typeof UpdateVariantAttributeOptionSchema>;

export class UpdateVariantAttributeOptionDto implements UpdateVariantAttributeOptionDTO {
    @ApiPropertyOptional({ example: 'Negro azabache' })
    @IsOptional()
    @IsString()
    @Length(1, 100)
    name?: string;

    @ApiPropertyOptional({ example: '#000000' })
    @IsOptional()
    @IsString()
    @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color inválido (formato: #RRGGBB)' })
    colorHex?: string | null;
}
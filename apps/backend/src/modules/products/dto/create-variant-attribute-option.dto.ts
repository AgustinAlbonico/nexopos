import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import { IsString, IsOptional, Length, Matches, IsIn } from 'class-validator';

export const VARIANT_ATTRIBUTE_TYPES = ['color', 'size'] as const;

export const CreateVariantAttributeOptionSchema = z.object({
    type: z.enum(['color', 'size']),
    name: z.string().min(1, 'El nombre es requerido').max(100),
    colorHex: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido (formato: #RRGGBB)')
        .optional()
        .nullable(),
});

export type CreateVariantAttributeOptionDTO = z.infer<typeof CreateVariantAttributeOptionSchema>;

export class CreateVariantAttributeOptionDto implements CreateVariantAttributeOptionDTO {
    @ApiProperty({ example: 'color', enum: VARIANT_ATTRIBUTE_TYPES })
    @IsIn(VARIANT_ATTRIBUTE_TYPES as unknown as string[])
    type!: 'color' | 'size';

    @ApiProperty({ example: 'Negro', description: 'Nombre de la opción (case-insensitive)' })
    @IsString()
    @Length(1, 100)
    name!: string;

    @ApiPropertyOptional({
        example: '#18181b',
        description: 'Color hex (#RRGGBB). Solo aplica a type=color.',
    })
    @IsOptional()
    @IsString()
    @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color inválido (formato: #RRGGBB)' })
    colorHex?: string | null;
}
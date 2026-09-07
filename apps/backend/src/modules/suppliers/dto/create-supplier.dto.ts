/**
 * DTO para creación de proveedores
 */
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEnum,
    IsBoolean,
    IsEmail,
    MaxLength,
} from 'class-validator';
import { DocumentType } from '../entities/supplier.entity';
import { IvaCondition } from '../../../common/enums/iva-condition.enum';

export class CreateSupplierDto {
    @IsString()
    @IsNotEmpty({ message: 'El nombre del proveedor es requerido' })
    @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
    name!: string;

    @IsString()
    @IsOptional()
    @MaxLength(200, { message: 'El nombre de fantasía no puede exceder 200 caracteres' })
    tradeName?: string;

    @IsEnum(DocumentType, { message: 'Tipo de documento inválido' })
    @IsOptional()
    documentType?: DocumentType;

    @IsString()
    @IsOptional()
    @MaxLength(50, { message: 'El número de documento no puede exceder 50 caracteres' })
    documentNumber?: string;

    @IsEnum(IvaCondition, { message: 'Condición de IVA inválida' })
    @IsOptional()
    ivaCondition?: IvaCondition;

    @IsEmail({}, { message: 'El email no es válido' })
    @IsOptional()
    @MaxLength(255, { message: 'El email no puede exceder 255 caracteres' })
    email?: string;

    @IsString()
    @IsOptional()
    @MaxLength(50, { message: 'El teléfono no puede exceder 50 caracteres' })
    phone?: string;

    @IsString()
    @IsOptional()
    @MaxLength(50, { message: 'El móvil no puede exceder 50 caracteres' })
    mobile?: string;

    @IsString()
    @IsOptional()
    @MaxLength(255, { message: 'La dirección no puede exceder 255 caracteres' })
    address?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100, { message: 'La ciudad no puede exceder 100 caracteres' })
    city?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100, { message: 'La provincia no puede exceder 100 caracteres' })
    state?: string;

    @IsString()
    @IsOptional()
    @MaxLength(20, { message: 'El código postal no puede exceder 20 caracteres' })
    postalCode?: string;

    @IsString()
    @IsOptional()
    @MaxLength(255, { message: 'El sitio web no puede exceder 255 caracteres' })
    website?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100, { message: 'El nombre de contacto no puede exceder 100 caracteres' })
    contactName?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100, { message: 'La cuenta bancaria no puede exceder 100 caracteres' })
    bankAccount?: string;

    @IsString()
    @IsOptional()
    @MaxLength(1000, { message: 'Las notas no pueden exceder 1000 caracteres' })
    notes?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100, { message: 'La clasificación no puede exceder 100 caracteres' })
    classification?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

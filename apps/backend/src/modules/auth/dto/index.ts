import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    MinLength,
    MaxLength,
    IsEmail,
    IsOptional,
    IsBoolean,
    ValidateIf,
    IsEnum,
    IsIn,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

// ==================== LOGIN ====================
export const LoginSchema = z.object({
    username: z.string().min(1, 'El nombre de usuario es requerido'),
    password: z.string().min(1, 'La contraseña es requerida'),
});

export type LoginDTO = z.infer<typeof LoginSchema>;

export class LoginDto implements LoginDTO {
    @ApiProperty({ example: 'admin' })
    @IsString()
    @IsNotEmpty({ message: 'El nombre de usuario es requerido' })
    username!: string;

    @ApiProperty({ example: 'password123' })
    @IsString()
    @IsNotEmpty({ message: 'La contraseña es requerida' })
    password!: string;
}

export class LoginResponseDto {
    @ApiProperty()
    accessToken!: string;

    @ApiProperty()
    refreshToken!: string;

    @ApiProperty()
    user!: {
        id: string;
        username: string;
        email?: string | null;
        firstName: string;
        lastName: string;
    };
}

// ==================== REGISTER ====================
export const RegisterSchema = z.object({
    username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres').max(50),
    email: z.string().email('Email inválido').optional().nullable(),
    password: z
        .string()
        .min(6, 'La contraseña debe tener al menos 6 caracteres'),
    firstName: z.string().min(1, 'El nombre es requerido').max(100),
    lastName: z.string().min(1, 'El apellido es requerido').max(100),
});

export type RegisterDTO = z.infer<typeof RegisterSchema>;

export class RegisterDto implements RegisterDTO {
    @ApiProperty({ example: 'usuario123' })
    @IsString()
    @MinLength(3, { message: 'El nombre de usuario debe tener al menos 3 caracteres' })
    @MaxLength(50)
    username!: string;

    @ApiProperty({ example: 'user@example.com', required: false })
    @IsOptional()
    @ValidateIf((o) => o.email !== '' && o.email !== null && o.email !== undefined)
    @IsEmail({}, { message: 'Email inválido' })
    email?: string | null;

    @ApiProperty({ example: 'Password123' })
    @IsString()
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    password!: string;

    @ApiProperty({ example: 'Juan' })
    @IsString()
    @IsNotEmpty({ message: 'El nombre es requerido' })
    @MaxLength(100)
    firstName!: string;

    @ApiProperty({ example: 'Pérez' })
    @IsString()
    @IsNotEmpty({ message: 'El apellido es requerido' })
    @MaxLength(100)
    lastName!: string;
}

// ==================== REFRESH TOKEN ====================
export const RefreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'El refresh token es requerido'),
});

export type RefreshTokenDTO = z.infer<typeof RefreshTokenSchema>;

export class RefreshTokenDto implements RefreshTokenDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: 'El refresh token es requerido' })
    refreshToken!: string;
}

// ==================== CHANGE PASSWORD ====================
export const ChangePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
    newPassword: z
        .string()
        .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type ChangePasswordDTO = z.infer<typeof ChangePasswordSchema>;

export class ChangePasswordDto implements ChangePasswordDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: 'La contraseña actual es requerida' })
    currentPassword!: string;

    @ApiProperty()
    @IsString()
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    newPassword!: string;
}

// ==================== CREATE USER ====================
export const CreateUserSchema = z.object({
    username: z
        .string()
        .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
        .max(50, 'El nombre de usuario no puede exceder 50 caracteres')
        .regex(/^[a-z0-9]+$/, 'El nombre de usuario debe estar en minúsculas, sin espacios ni caracteres especiales')
        .refine((val) => !val.includes(' '), 'El nombre de usuario no puede contener espacios'),
    email: z.string().email().optional().nullable(),
    password: z
        .string()
        .min(6, 'La contraseña debe tener al menos 6 caracteres'),
    firstName: z.string().min(1, 'El nombre es requerido').max(100),
    lastName: z.string().min(1, 'El apellido es requerido').max(100),
    role: z.enum(['admin', 'manager', 'cashier']).optional().default('admin'),
    isActive: z.boolean().default(true),
});

export type CreateUserDTO = z.input<typeof CreateUserSchema>;

export class CreateUserDto implements CreateUserDTO {
    @ApiProperty({ example: 'usuario123' })
    @IsString()
    @MinLength(3)
    @MaxLength(50)
    username!: string;

    @ApiProperty({ example: 'user@example.com', required: false })
    @IsOptional()
    @ValidateIf((o) => o.email !== '' && o.email !== null && o.email !== undefined)
    @IsEmail()
    email?: string | null;

    @ApiProperty({ example: 'Password123' })
    @IsString()
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    password!: string;

    @ApiProperty({ example: 'Juan' })
    @IsString()
    @IsNotEmpty({ message: 'El nombre es requerido' })
    @MaxLength(100)
    firstName!: string;

    @ApiProperty({ example: 'Pérez' })
    @IsString()
    @IsNotEmpty({ message: 'El apellido es requerido' })
    @MaxLength(100)
    lastName!: string;

    @ApiProperty({ enum: UserRole, default: UserRole.ADMIN, required: false })
    @IsOptional()
    @IsIn(['admin', 'manager', 'cashier'])
    role!: UserRole;

    @ApiProperty({ default: true })
    @IsBoolean()
    @IsOptional()
    isActive!: boolean;
}

// ==================== UPDATE USER ====================
export const UpdateUserSchema = CreateUserSchema.partial().extend({
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
});

export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>;

export class UpdateUserDto {
    @ApiProperty({ example: 'usuario123', required: false })
    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(50)
    username?: string;

    @ApiProperty({ example: 'user@example.com', required: false })
    @IsOptional()
    @ValidateIf((o) => o.email !== '' && o.email !== null && o.email !== undefined)
    @IsEmail()
    email?: string | null;

    @ApiProperty({ example: 'NewPassword123', required: false })
    @IsOptional()
    @ValidateIf((o) => o.password !== '' && o.password !== null && o.password !== undefined)
    @IsString()
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    password?: string;

    @ApiProperty({ example: 'Juan', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    firstName?: string;

    @ApiProperty({ example: 'Pérez', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    lastName?: string;

    @ApiProperty({ enum: UserRole, required: false })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @ApiProperty({ default: true, required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

// ==================== UPDATE PROFILE ====================
export const UpdateProfileSchema = z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    email: z.string().email().optional().nullable(),
});

export type UpdateProfileDTO = z.infer<typeof UpdateProfileSchema>;

export class UpdateProfileDto implements UpdateProfileDTO {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    firstName?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    lastName?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @ValidateIf((o) => o.email !== '' && o.email !== null && o.email !== undefined)
    @IsEmail()
    email?: string | null;
}

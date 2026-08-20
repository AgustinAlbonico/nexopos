import {
    Injectable,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { TokensService } from './tokens.service';
import { LoginDTO, RegisterDTO, ChangePasswordDTO } from './dto';
import { User } from './entities/user.entity';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginAudit } from './entities/login-audit.entity';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly tokensService: TokensService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        @InjectRepository(LoginAudit)
        private readonly loginAuditRepository: Repository<LoginAudit>,
    ) { }

    async validateUser(username: string, password: string) {
        const user = await this.usersService.findByUsername(username, true);

        if (!user) {
            return null;
        }

        const isPasswordValid = await user.validatePassword(password);

        if (!isPasswordValid) {
            return null;
        }

        return user;
    }

    async login(dto: LoginDTO, userAgent: string) {
        const user = await this.validateUser(dto.username, dto.password);

        if (!user) {
            // Log failed attempt (if user exists but password failed, or if we want to log unknown users too - but here we only have username)
            // For security, maybe we only log if we found the user but password failed.
            // But validateUser returns null for both cases.
            // To properly log "Invalid password" vs "User not found", we'd need to change validateUser logic.
            // For now, let's just log successful logins as requested "saber cuando se inicio sesion".
            throw new UnauthorizedException('Credenciales inválidas');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Usuario inactivo');
        }

        // Audit login
        await this.loginAuditRepository.save({
            userId: user.id,
            userAgent: userAgent,
            success: true,
        });

        // Update last login
        await this.usersService.updateLastLogin(user.id);

        // Generate tokens
        const tokens = await this.generateTokens(user);

        return {
            ...tokens,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            },
        };
    }

    async register(dto: RegisterDTO) {
        const existingUser = await this.usersService.findByUsername(dto.username);

        if (existingUser) {
            throw new ConflictException('El nombre de usuario ya está registrado');
        }

        if (dto.email) {
            const existingEmail = await this.usersService.findByEmail(dto.email);
            if (existingEmail) {
                throw new ConflictException('El email ya está registrado');
            }
        }

        const user = await this.usersService.create({ ...dto, isActive: true });

        return {
            id: user.id,
            username: user.username,
            role: user.role,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
        };
    }

    async refreshToken(refreshToken: string) {
        const storedToken = await this.tokensService.findToken(refreshToken);

        if (!storedToken || storedToken.isExpired()) {
            throw new UnauthorizedException('Refresh token inválido o expirado');
        }

        const user = await this.usersService.findOne(storedToken.userId);

        if (!user?.isActive) {
            throw new UnauthorizedException('Usuario no válido');
        }

        // Revocar el token anterior
        await this.tokensService.revokeToken(refreshToken);

        // Generar nuevos tokens
        const tokens = await this.generateTokens(user);

        return tokens;
    }

    async logout(userId: string, refreshToken?: string) {
        if (refreshToken) {
            await this.tokensService.revokeToken(refreshToken);
        } else {
            await this.tokensService.revokeAllUserTokens(userId);
        }

        return { message: 'Logout exitoso' };
    }

    async changePassword(userId: string, dto: ChangePasswordDTO) {
        const user = await this.usersService.findOne(userId, true);

        const isCurrentPasswordValid = await user.validatePassword(
            dto.currentPassword,
        );

        if (!isCurrentPasswordValid) {
            throw new UnauthorizedException('Contraseña actual incorrecta');
        }

        user.passwordHash = dto.newPassword; // Will be hashed by BeforeUpdate hook
        await this.usersService.update(userId, user);

        // Revocar todos los refresh tokens
        await this.tokensService.revokeAllUserTokens(userId);

        return { message: 'Contraseña cambiada exitosamente' };
    }

    async getProfile(userId: string) {
        const user = await this.usersService.findOne(userId);
        return {
            id: user.id,
            username: user.username,
            role: user.role,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
        };
    }

    private async generateTokens(user: User) {
        const payload = {
            sub: user.id,
            username: user.username,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: this.configService.get('JWT_EXPIRES_IN', '30d'),
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('REFRESH_TOKEN_SECRET'),
            expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRES_IN', '90d'),
        });

        // Guardar refresh token
        await this.tokensService.saveToken(user.id, refreshToken);

        return {
            accessToken,
            refreshToken,
        };
    }
}

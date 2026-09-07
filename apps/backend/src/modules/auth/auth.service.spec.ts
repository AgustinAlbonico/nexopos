/**
 * Tests unitarios para AuthService
 * Cubre: login, register, refreshToken, logout, changePassword, getProfile
 */
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { TokensService } from './tokens.service';
import { LoginAudit } from './entities/login-audit.entity';
import { UserRole } from './entities/user.entity';
import { RegisterSchema } from './dto';

// Mocks
const mockUsersService = {
    findByUsername: jest.fn(),
    findByEmail: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateLastLogin: jest.fn(),
};

const mockTokensService = {
    findToken: jest.fn(),
    saveToken: jest.fn(),
    revokeToken: jest.fn(),
    revokeAllUserTokens: jest.fn(),
};

const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
};

const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
            JWT_SECRET: 'test-secret',
            JWT_EXPIRES_IN: '1d',
            REFRESH_TOKEN_SECRET: 'refresh-secret',
            REFRESH_TOKEN_EXPIRES_IN: '7d',
        };
        return config[key] || defaultValue;
    }),
};

const mockLoginAuditRepository = {
    save: jest.fn(),
};

// Mock user factory
const createMockUser = (overrides = {}) => ({
    id: 'user-uuid-123',
    username: 'testuser',
    email: 'test@test.com',
    firstName: 'Test',
    lastName: 'User',
    fullName: 'Test User',
    isActive: true,
    passwordHash: 'hashedpassword',
    lastLogin: new Date(),
    createdAt: new Date(),
    validatePassword: jest.fn().mockResolvedValue(true),
    ...overrides,
});

describe('AuthService', () => {
    let service: AuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UsersService, useValue: mockUsersService },
                { provide: TokensService, useValue: mockTokensService },
                { provide: JwtService, useValue: mockJwtService },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: getRepositoryToken(LoginAudit), useValue: mockLoginAuditRepository },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validateUser', () => {
        it('retorna usuario cuando credenciales son válidas', async () => {
            const mockUser = createMockUser();
            mockUsersService.findByUsername.mockResolvedValue(mockUser);

            const result = await service.validateUser('testuser', 'password123');

            expect(result).toEqual(mockUser);
            expect(mockUser.validatePassword).toHaveBeenCalledWith('password123');
        });

        it('retorna null cuando usuario no existe', async () => {
            mockUsersService.findByUsername.mockResolvedValue(null);

            const result = await service.validateUser('unknown', 'password123');

            expect(result).toBeNull();
        });

        it('retorna null cuando contraseña es incorrecta', async () => {
            const mockUser = createMockUser({
                validatePassword: jest.fn().mockResolvedValue(false),
            });
            mockUsersService.findByUsername.mockResolvedValue(mockUser);

            const result = await service.validateUser('testuser', 'wrongpassword');

            expect(result).toBeNull();
        });
    });

    describe('login', () => {
        const loginDto = { username: 'testuser', password: 'password123' };
        const userAgent = 'Mozilla/5.0';

        beforeEach(() => {
            mockJwtService.sign.mockReturnValue('mock-token');
            mockTokensService.saveToken.mockResolvedValue(undefined);
            mockLoginAuditRepository.save.mockResolvedValue({});
            mockUsersService.updateLastLogin.mockResolvedValue(undefined);
        });

        it('retorna tokens y usuario cuando login es exitoso', async () => {
            const mockUser = createMockUser();
            mockUsersService.findByUsername.mockResolvedValue(mockUser);

            const result = await service.login(loginDto, userAgent);

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result.user).toEqual({
                id: mockUser.id,
                username: mockUser.username,
                email: mockUser.email,
                firstName: mockUser.firstName,
                lastName: mockUser.lastName,
            });
        });

        it('registra auditoría de login exitoso', async () => {
            const mockUser = createMockUser();
            mockUsersService.findByUsername.mockResolvedValue(mockUser);

            await service.login(loginDto, userAgent);

            expect(mockLoginAuditRepository.save).toHaveBeenCalledWith({
                userId: mockUser.id,
                userAgent: userAgent,
                success: true,
            });
        });

        it('actualiza último login del usuario', async () => {
            const mockUser = createMockUser();
            mockUsersService.findByUsername.mockResolvedValue(mockUser);

            await service.login(loginDto, userAgent);

            expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
        });

        it('lanza UnauthorizedException con credenciales inválidas', async () => {
            mockUsersService.findByUsername.mockResolvedValue(null);

            await expect(
                service.login(loginDto, userAgent)
            ).rejects.toThrow(UnauthorizedException);

            await expect(
                service.login(loginDto, userAgent)
            ).rejects.toThrow('Credenciales inválidas');
        });

        it('lanza UnauthorizedException cuando usuario está inactivo', async () => {
            const inactiveUser = createMockUser({ isActive: false });
            mockUsersService.findByUsername.mockResolvedValue(inactiveUser);

            await expect(
                service.login(loginDto, userAgent)
            ).rejects.toThrow(UnauthorizedException);

            await expect(
                service.login(loginDto, userAgent)
            ).rejects.toThrow('Usuario inactivo');
        });
    });

    describe('register', () => {
        const registerDto = {
            username: 'newuser',
            password: 'password123',
            email: 'new@test.com',
            firstName: 'New',
            lastName: 'User',
        };

        it('crea usuario exitosamente', async () => {
            mockUsersService.findByUsername.mockResolvedValue(null);
            mockUsersService.findByEmail.mockResolvedValue(null);
            const createdUser = createMockUser({
                id: 'new-user-id',
                username: 'newuser',
                email: 'new@test.com',
                role: UserRole.CASHIER,
            });
            mockUsersService.create.mockResolvedValue(createdUser);

            const result = await service.register(registerDto);

            expect(result).toEqual({
                id: createdUser.id,
                username: createdUser.username,
                role: UserRole.CASHIER,
                email: createdUser.email,
                firstName: createdUser.firstName,
                lastName: createdUser.lastName,
            });
            expect(mockUsersService.create).toHaveBeenCalledWith(
                expect.objectContaining({ role: UserRole.CASHIER, isActive: true }),
            );
        });

        it('lanza ConflictException si username ya existe', async () => {
            mockUsersService.findByUsername.mockResolvedValue(createMockUser());

            await expect(
                service.register(registerDto)
            ).rejects.toThrow(ConflictException);

            await expect(
                service.register(registerDto)
            ).rejects.toThrow('El nombre de usuario ya está registrado');
        });

        it('lanza ConflictException si email ya existe', async () => {
            mockUsersService.findByUsername.mockResolvedValue(null);
            mockUsersService.findByEmail.mockResolvedValue(createMockUser());

            await expect(
                service.register(registerDto)
            ).rejects.toThrow(ConflictException);

            await expect(
                service.register(registerDto)
            ).rejects.toThrow('El email ya está registrado');
        });

        it('permite registro sin email', async () => {
            const dtoWithoutEmail = { ...registerDto, email: undefined };
            mockUsersService.findByUsername.mockResolvedValue(null);
            mockUsersService.create.mockResolvedValue(createMockUser());

            await service.register(dtoWithoutEmail);

            expect(mockUsersService.findByEmail).not.toHaveBeenCalled();
        });

        it('fuerza CASHIER aunque el DTO traiga role admin', async () => {
            mockUsersService.findByUsername.mockResolvedValue(null);
            mockUsersService.findByEmail.mockResolvedValue(null);
            mockUsersService.create.mockResolvedValue(
                createMockUser({ role: UserRole.CASHIER }),
            );

            await service.register({
                ...registerDto,
                role: UserRole.ADMIN,
            } as typeof registerDto & { role: UserRole });

            expect(mockUsersService.create).toHaveBeenCalledWith(
                expect.objectContaining({ role: UserRole.CASHIER }),
            );
            expect(mockUsersService.create).not.toHaveBeenCalledWith(
                expect.objectContaining({ role: UserRole.ADMIN }),
            );
        });

        it('RegisterSchema.parse con role admin no emite admin', () => {
            const parsed = RegisterSchema.parse({
                ...registerDto,
                role: 'admin',
            });
            expect(parsed).not.toHaveProperty('role');
        });
    });

    describe('refreshToken', () => {
        beforeEach(() => {
            mockJwtService.sign.mockReturnValue('new-mock-token');
            mockTokensService.saveToken.mockResolvedValue(undefined);
        });

        it('genera nuevos tokens cuando refresh token es válido', async () => {
            const mockToken = {
                userId: 'user-123',
                isExpired: jest.fn().mockReturnValue(false),
            };
            mockTokensService.findToken.mockResolvedValue(mockToken);
            mockUsersService.findOne.mockResolvedValue(createMockUser());

            const result = await service.refreshToken('valid-refresh-token');

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(mockTokensService.revokeToken).toHaveBeenCalledWith('valid-refresh-token');
        });

        it('lanza UnauthorizedException si token no existe', async () => {
            mockTokensService.findToken.mockResolvedValue(null);

            await expect(
                service.refreshToken('invalid-token')
            ).rejects.toThrow(UnauthorizedException);

            await expect(
                service.refreshToken('invalid-token')
            ).rejects.toThrow('Refresh token inválido o expirado');
        });

        it('lanza UnauthorizedException si token está expirado', async () => {
            const expiredToken = {
                userId: 'user-123',
                isExpired: jest.fn().mockReturnValue(true),
            };
            mockTokensService.findToken.mockResolvedValue(expiredToken);

            await expect(
                service.refreshToken('expired-token')
            ).rejects.toThrow(UnauthorizedException);
        });

        it('lanza UnauthorizedException si usuario está inactivo', async () => {
            const mockToken = {
                userId: 'user-123',
                isExpired: jest.fn().mockReturnValue(false),
            };
            mockTokensService.findToken.mockResolvedValue(mockToken);
            mockUsersService.findOne.mockResolvedValue(createMockUser({ isActive: false }));

            await expect(
                service.refreshToken('valid-token')
            ).rejects.toThrow(UnauthorizedException);

            await expect(
                service.refreshToken('valid-token')
            ).rejects.toThrow('Usuario no válido');
        });
    });

    describe('logout', () => {
        it('revoca token específico cuando se proporciona refreshToken', async () => {
            mockTokensService.revokeToken.mockResolvedValue(undefined);

            const result = await service.logout('user-123', 'refresh-token');

            expect(mockTokensService.revokeToken).toHaveBeenCalledWith('refresh-token');
            expect(mockTokensService.revokeAllUserTokens).not.toHaveBeenCalled();
            expect(result).toEqual({ message: 'Logout exitoso' });
        });

        it('revoca todos los tokens cuando no se proporciona refreshToken', async () => {
            mockTokensService.revokeAllUserTokens.mockResolvedValue(undefined);

            const result = await service.logout('user-123');

            expect(mockTokensService.revokeAllUserTokens).toHaveBeenCalledWith('user-123');
            expect(mockTokensService.revokeToken).not.toHaveBeenCalled();
            expect(result).toEqual({ message: 'Logout exitoso' });
        });
    });

    describe('changePassword', () => {
        const changePasswordDto = {
            currentPassword: 'oldpassword',
            newPassword: 'newpassword123',
        };

        it('cambia contraseña cuando contraseña actual es correcta', async () => {
            const mockUser = createMockUser();
            mockUsersService.findOne.mockResolvedValue(mockUser);
            mockUsersService.update.mockResolvedValue(undefined);
            mockTokensService.revokeAllUserTokens.mockResolvedValue(undefined);

            const result = await service.changePassword('user-123', changePasswordDto);

            expect(mockUsersService.update).toHaveBeenCalled();
            expect(mockTokensService.revokeAllUserTokens).toHaveBeenCalledWith('user-123');
            expect(result).toEqual({ message: 'Contraseña cambiada exitosamente' });
        });

        it('lanza UnauthorizedException cuando contraseña actual es incorrecta', async () => {
            const mockUser = createMockUser({
                validatePassword: jest.fn().mockResolvedValue(false),
            });
            mockUsersService.findOne.mockResolvedValue(mockUser);

            await expect(
                service.changePassword('user-123', changePasswordDto)
            ).rejects.toThrow(UnauthorizedException);

            await expect(
                service.changePassword('user-123', changePasswordDto)
            ).rejects.toThrow('Contraseña actual incorrecta');
        });
    });

    describe('getProfile', () => {
        it('retorna perfil del usuario', async () => {
            const mockUser = createMockUser();
            mockUsersService.findOne.mockResolvedValue(mockUser);

            const result = await service.getProfile('user-123');

            expect(result).toEqual({
                id: mockUser.id,
                username: mockUser.username,
                email: mockUser.email,
                firstName: mockUser.firstName,
                lastName: mockUser.lastName,
                fullName: mockUser.fullName,
                isActive: mockUser.isActive,
                lastLogin: mockUser.lastLogin,
                createdAt: mockUser.createdAt,
            });
        });
    });

    describe('generateTokens', () => {
        it('genera access y refresh tokens con configuración correcta', async () => {
            const mockUser = createMockUser();
            mockJwtService.sign.mockReturnValue('generated-token');
            mockTokensService.saveToken.mockResolvedValue(undefined);

            // Accedemos al método privado
            const generateTokens = (service as any).generateTokens.bind(service);
            const result = await generateTokens(mockUser);

            expect(result).toHaveProperty('accessToken', 'generated-token');
            expect(result).toHaveProperty('refreshToken', 'generated-token');

            // Verificar que se llamó con los parámetros correctos
            expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
            expect(mockTokensService.saveToken).toHaveBeenCalledWith(mockUser.id, 'generated-token');
        });
    });
});

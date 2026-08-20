/**
 * Tests de JwtStrategy
 * Prueba la estrategia de autenticación JWT de Passport
 */

import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users.service';
import { UnauthorizedException } from '@nestjs/common';
import type { JwtPayload } from './jwt.strategy';

describe('JwtStrategy', () => {
    let strategy: JwtStrategy;
    let configService: ConfigService;
    let usersService: UsersService;

    // Mock user
    const mockActiveUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
    };

    const mockInactiveUser = {
        ...mockActiveUser,
        id: 'user-456',
        isActive: false,
    };

    beforeEach(() => {
        // Mock ConfigService
        configService = {
            get: jest.fn().mockReturnValue('test-secret'),
        } as unknown as ConfigService;

        // Mock UsersService
        usersService = {
            findOne: jest.fn(),
        } as unknown as UsersService;

        strategy = new JwtStrategy(configService, usersService);
    });

    describe('constructor', () => {
        it('debería crear una instancia de JwtStrategy', () => {
            expect(strategy).toBeInstanceOf(JwtStrategy);
        });

        it('debería obtener el JWT_SECRET del ConfigService', () => {
            const getSpy = jest.spyOn(configService, 'get');

            // Recrear la estrategia para que se llame el constructor
            new JwtStrategy(configService, usersService);

            expect(getSpy).toHaveBeenCalledWith('JWT_SECRET');
        });
    });

    describe('validate - usuario activo', () => {
        it('debería retornar el objeto de usuario cuando el usuario existe y está activo', async () => {
            const payload: JwtPayload = {
                sub: 'user-123',
                username: 'testuser',
                iat: Date.now() / 1000,
                exp: Date.now() / 1000 + 3600,
            };

            jest.spyOn(usersService, 'findOne').mockResolvedValue(mockActiveUser as never);

            const result = await strategy.validate(payload);

            expect(result).toEqual({
                userId: 'user-123',
                username: 'testuser',
            });
        });

        it('debería llamar a usersService.findOne con el ID del payload', async () => {
            const payload: JwtPayload = {
                sub: 'user-123',
                username: 'testuser',
                iat: Date.now() / 1000,
                exp: Date.now() / 1000 + 3600,
            };

            const findOneSpy = jest.spyOn(usersService, 'findOne').mockResolvedValue(mockActiveUser as never);

            await strategy.validate(payload);

            expect(findOneSpy).toHaveBeenCalledWith('user-123');
        });
    });

    describe('validate - usuario no encontrado', () => {
        it('debería lanzar UnauthorizedException cuando el usuario no existe', async () => {
            const payload: JwtPayload = {
                sub: 'non-existent-user',
                username: 'ghost',
                iat: Date.now() / 1000,
                exp: Date.now() / 1000 + 3600,
            };

            jest.spyOn(usersService, 'findOne').mockResolvedValue(null as never);

            await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
        });

        it('debería lanzar UnauthorizedException con mensaje "Usuario no encontrado"', async () => {
            const payload: JwtPayload = {
                sub: 'non-existent-user',
                username: 'ghost',
                iat: Date.now() / 1000,
                exp: Date.now() / 1000 + 3600,
            };

            jest.spyOn(usersService, 'findOne').mockResolvedValue(null as never);

            try {
                await strategy.validate(payload);
                fail('Debería haber lanzado UnauthorizedException');
            } catch (error) {
                expect(error).toBeInstanceOf(UnauthorizedException);
                expect((error as UnauthorizedException).message).toBe('Usuario no encontrado');
            }
        });
    });

    describe('validate - usuario inactivo', () => {
        it('debería lanzar UnauthorizedException cuando el usuario está inactivo', async () => {
            const payload: JwtPayload = {
                sub: 'user-456',
                username: 'inactiveuser',
                iat: Date.now() / 1000,
                exp: Date.now() / 1000 + 3600,
            };

            jest.spyOn(usersService, 'findOne').mockResolvedValue(mockInactiveUser as never);

            await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
        });

        it('debería lanzar UnauthorizedException con mensaje "Usuario inactivo"', async () => {
            const payload: JwtPayload = {
                sub: 'user-456',
                username: 'inactiveuser',
                iat: Date.now() / 1000,
                exp: Date.now() / 1000 + 3600,
            };

            jest.spyOn(usersService, 'findOne').mockResolvedValue(mockInactiveUser as never);

            try {
                await strategy.validate(payload);
                fail('Debería haber lanzado UnauthorizedException');
            } catch (error) {
                expect(error).toBeInstanceOf(UnauthorizedException);
                expect((error as UnauthorizedException).message).toBe('Usuario inactivo');
            }
        });

        it('debería verificar el campo isActive del usuario', async () => {
            const payload: JwtPayload = {
                sub: 'user-456',
                username: 'inactiveuser',
                iat: Date.now() / 1000,
                exp: Date.now() / 1000 + 3600,
            };

            const findOneSpy = jest.spyOn(usersService, 'findOne').mockResolvedValue(mockInactiveUser as never);

            try {
                await strategy.validate(payload);
            } catch {
                // Error esperado
            }

            expect(findOneSpy).toHaveBeenCalledWith('user-456');
        });
    });

    describe('validate - payload structure', () => {
        it('debería retornar userId, username y role provenientes de la base de datos', async () => {
            const payload: JwtPayload = {
                sub: 'user-123',
                username: 'testuser',
                role: 'cashier',
                iat: Date.now() / 1000,
                exp: Date.now() / 1000 + 3600,
            };

            const mockUser = {
                ...mockActiveUser,
                id: 'user-123',
                username: 'testuser',
                role: 'cashier',
            };

            jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser as never);

            const result = await strategy.validate(payload);

            expect(result.userId).toBe('user-123');
            expect(result.username).toBe('testuser');
            expect(result.role).toBe('cashier');
        });

        it('debería retornar solo userId, username y role, no todo el objeto usuario', async () => {
            const payload: JwtPayload = {
                sub: 'user-123',
                username: 'testuser',
                iat: Date.now() / 1000,
                exp: Date.now() / 1000 + 3600,
            };

            jest.spyOn(usersService, 'findOne').mockResolvedValue(mockActiveUser as never);

            const result = await strategy.validate(payload);

            expect(result).toHaveProperty('userId');
            expect(result).toHaveProperty('username');
            expect(result).toHaveProperty('role');
            expect(result).not.toHaveProperty('email');
            expect(result).not.toHaveProperty('firstName');
            expect(result).not.toHaveProperty('lastName');
        });
    });
});

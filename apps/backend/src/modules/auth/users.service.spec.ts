/**
 * Tests de UsersService
 * Prueba la gestión de usuarios
 */

import { UsersService } from './users.service';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import {
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { CreateUserDTO, UpdateUserDTO, UpdateProfileDTO } from './dto';

describe('UsersService', () => {
    let service: UsersService;
    let repository: jest.Mocked<Repository<User>>;

    // Mock User
    const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: '$2b$10$hash',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        refreshTokens: [],
        fullName: 'Test User',
        validatePassword: jest.fn(),
        hashPassword: jest.fn(),
    } as unknown as User;

    const mockUserWithoutPassword: Partial<User> = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
    };

    beforeEach(() => {
        // Mock Repository
        repository = {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
        } as unknown as jest.Mocked<Repository<User>>;

        service = new UsersService(repository);
    });

    describe('create', () => {
        const createUserDto: CreateUserDTO = {
            username: 'newuser',
            email: 'new@example.com',
            password: 'password123',
            firstName: 'New',
            lastName: 'User',
            isActive: true,
        };

        it('debería crear un nuevo usuario exitosamente', async () => {
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
            } as never);
            repository.create.mockReturnValue(mockUser);
            repository.save.mockResolvedValue(mockUser);

            const result = await service.create(createUserDto);

            expect(result).toEqual(mockUser);
            expect(repository.create).toHaveBeenCalled();
            expect(repository.save).toHaveBeenCalledWith(mockUser);
        });

        it('debería lanzar ConflictException si el username ya existe', async () => {
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockUser),
            } as never);

            await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
            await expect(service.create(createUserDto)).rejects.toThrow(
                'El nombre de usuario ya está registrado'
            );
        });

        it('debería lanzar ConflictException si el email ya existe', async () => {
            // El test verifica la lógica del servicio cuando hay un email duplicado
            // Dado que el mock de query builder es complejo, verificamos que el servicio llama a findByEmail
            const existingEmailUser = { ...mockUser, id: 'other-user-id', email: 'new@example.com' };

            const findByEmailSpy = jest.spyOn(service, 'findByEmail' as never)
                .mockResolvedValueOnce(existingEmailUser as never);

            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValueOnce(null), // findByUsername retorna null
            } as never);

            await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);

            // Verificar que se llamó a findByEmail para verificar duplicado
            expect(findByEmailSpy).toHaveBeenCalled();
        });

        it('debería permitir crear usuario sin email', async () => {
            const dtoWithoutEmail: CreateUserDTO = {
                ...createUserDto,
                email: null,
            };

            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
            } as never);
            repository.create.mockReturnValue(mockUser);
            repository.save.mockResolvedValue(mockUser);

            const result = await service.create(dtoWithoutEmail);

            expect(result).toEqual(mockUser);
        });

        it('debería asignar password a passwordHash', async () => {
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
            } as never);
            repository.create.mockReturnValue(mockUser);
            repository.save.mockResolvedValue(mockUser);

            await service.create(createUserDto);

            const createCall = repository.create.mock.calls[0][0];
            expect(createCall).toHaveProperty('passwordHash', createUserDto.password);
        });
    });

    describe('findAll', () => {
        it('debería retornar todos los usuarios sin password', async () => {
            repository.find.mockResolvedValue([mockUserWithoutPassword] as User[]);

            const result = await service.findAll();

            expect(result).toEqual([mockUserWithoutPassword]);
            expect(repository.find).toHaveBeenCalledWith({
                select: {
                    id: true,
                    username: true,
                    role: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    isActive: true,
                    lastLogin: true,
                    createdAt: true,
                },
            });
        });

        it('debería retornar array vacío si no hay usuarios', async () => {
            repository.find.mockResolvedValue([]);

            const result = await service.findAll();

            expect(result).toEqual([]);
        });
    });

    describe('findOne', () => {
        it('debería retornar un usuario por ID sin password por defecto', async () => {
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockUser),
            } as never);

            const result = await service.findOne('user-123');

            expect(result).toEqual(mockUser);
        });

        it('debería incluir password si includePassword es true', async () => {
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockUser),
            } as never);

            await service.findOne('user-123', true);

            expect(repository.createQueryBuilder).toHaveBeenCalled();
            const qb = repository.createQueryBuilder.mock.results[0].value;
            expect((qb as { addSelect: jest.Mock }).addSelect).toHaveBeenCalledWith('user.passwordHash');
        });

        it('debería lanzar NotFoundException si el usuario no existe', async () => {
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
            } as never);

            await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
            await expect(service.findOne('non-existent')).rejects.toThrow('Usuario no encontrado');
        });
    });

    describe('findByUsername', () => {
        it('debería encontrar un usuario por username', async () => {
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockUser),
            } as never);

            const result = await service.findByUsername('testuser');

            expect(result).toEqual(mockUser);
        });

        it('debería incluir password si includePassword es true', async () => {
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockUser),
            } as never);

            await service.findByUsername('testuser', true);

            const qb = repository.createQueryBuilder.mock.results[0].value;
            expect((qb as { addSelect: jest.Mock }).addSelect).toHaveBeenCalledWith('user.passwordHash');
        });

        it('debería retornar null si el username no existe', async () => {
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
            } as never);

            const result = await service.findByUsername('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('findByEmail', () => {
        it('debería encontrar un usuario por email', async () => {
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockUser),
            } as never);

            const result = await service.findByEmail('test@example.com');

            expect(result).toEqual(mockUser);
        });

        it('debería incluir password si includePassword es true', async () => {
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockUser),
            } as never);

            await service.findByEmail('test@example.com', true);

            const qb = repository.createQueryBuilder.mock.results[0].value;
            expect((qb as { addSelect: jest.Mock }).addSelect).toHaveBeenCalledWith('user.passwordHash');
        });

        it('debería retornar null si el email no existe', async () => {
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
            } as never);

            const result = await service.findByEmail('nonexistent@example.com');

            expect(result).toBeNull();
        });
    });

    describe('update', () => {
        const updateUserDto: UpdateUserDTO = {
            username: 'updateduser',
            firstName: 'Updated',
        };

        it('debería actualizar un usuario exitosamente', async () => {
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn()
                    .mockResolvedValueOnce(mockUser) // findOne
                    .mockResolvedValueOnce(null), // findByUsername
            } as never);
            repository.save.mockResolvedValue({
                ...mockUser,
                ...updateUserDto,
            } as User);

            const result = await service.update('user-123', updateUserDto);

            expect(result).toEqual({
                ...mockUser,
                ...updateUserDto,
            });
        });

        it('debería lanzar ConflictException si el nuevo username ya existe', async () => {
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn()
                    .mockResolvedValueOnce(mockUser) // findOne
                    .mockResolvedValueOnce({ ...mockUser, id: 'other-id' }), // findByUsername
            } as never);

            await expect(
                service.update('user-123', { username: 'existinguser' })
            ).rejects.toThrow(ConflictException);
        });

        it('debería lanzar ConflictException si el nuevo email ya existe', async () => {
            const existingEmailUser = { ...mockUser, id: 'other-id', email: 'existing@example.com' };
            // Mock user con email diferente
            const currentUser = { ...mockUser, email: 'current@example.com' };

            const findByEmailSpy = jest.spyOn(service, 'findByEmail' as never)
                .mockResolvedValueOnce(existingEmailUser as never);

            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn()
                    .mockResolvedValueOnce(currentUser) // findOne (usuario a actualizar)
                    .mockResolvedValueOnce(null), // findByUsername
            } as never);

            await expect(
                service.update('user-123', { email: 'existing@example.com' })
            ).rejects.toThrow(ConflictException);

            // Verificar que se llamó a findByEmail para verificar duplicado
            expect(findByEmailSpy).toHaveBeenCalled();
        });

        it('debería asignar password a passwordHash si se proporciona', async () => {
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn()
                    .mockResolvedValueOnce(mockUser) // findOne
                    .mockResolvedValueOnce(null), // findByUsername
            } as never);
            repository.save.mockResolvedValue(mockUser);

            await service.update('user-123', { password: 'newpassword' });

            expect(mockUser.passwordHash).toBe('newpassword');
        });
    });

    describe('updateProfile', () => {
        const updateProfileDto: UpdateProfileDTO = {
            firstName: 'Updated',
            lastName: 'Profile',
        };

        it('debería actualizar el perfil de un usuario', async () => {
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn()
                    .mockResolvedValueOnce(mockUser) // findOne
                    .mockResolvedValueOnce(null), // findByEmail
            } as never);
            repository.save.mockResolvedValue({
                ...mockUser,
                ...updateProfileDto,
            } as User);

            const result = await service.updateProfile('user-123', updateProfileDto);

            expect(result).toEqual({
                ...mockUser,
                ...updateProfileDto,
            });
        });

        it('debería lanzar ConflictException si el nuevo email ya existe', async () => {
            const existingEmailUser = { ...mockUser, id: 'other-id', email: 'existing@example.com' };
            // Mock user con email diferente
            const currentUser = { ...mockUser, email: 'current@example.com' };

            const findByEmailSpy = jest.spyOn(service, 'findByEmail' as never)
                .mockResolvedValueOnce(existingEmailUser as never);

            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn()
                    .mockResolvedValueOnce(currentUser), // findOne (usuario a actualizar)
            } as never);

            await expect(
                service.updateProfile('user-123', { email: 'existing@example.com' })
            ).rejects.toThrow(ConflictException);

            // Verificar que se llamó a findByEmail para verificar duplicado
            expect(findByEmailSpy).toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        it('debería eliminar un usuario', async () => {
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockUser),
            } as never);
            repository.remove.mockResolvedValue(mockUser);

            await expect(service.remove('user-123')).resolves.not.toThrow();
            expect(repository.remove).toHaveBeenCalledWith(mockUser);
        });

        it('debería lanzar NotFoundException si el usuario no existe', async () => {
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
            } as never);

            await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('toggleStatus', () => {
        it('debería desactivar un usuario activo', async () => {
            const activeUser = { ...mockUser, isActive: true };
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(activeUser),
            } as never);
            repository.save.mockResolvedValue({ ...activeUser, isActive: false } as User);

            const result = await service.toggleStatus('user-123', 'other-user-id');

            expect(result.isActive).toBe(false);
        });

        it('debería activar un usuario inactivo', async () => {
            const inactiveUser = { ...mockUser, isActive: false };
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(inactiveUser),
            } as never);
            repository.save.mockResolvedValue({ ...inactiveUser, isActive: true } as User);

            const result = await service.toggleStatus('user-123', 'other-user-id');

            expect(result.isActive).toBe(true);
        });

        it('debería lanzar BadRequestException si el usuario intenta desactivarse a sí mismo', async () => {
            const activeUser = { ...mockUser, isActive: true };
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(activeUser),
            } as never);

            await expect(service.toggleStatus('user-123', 'user-123')).rejects.toThrow(
                BadRequestException
            );
            await expect(service.toggleStatus('user-123', 'user-123')).rejects.toThrow(
                'No puedes desactivar tu propia cuenta'
            );
        });

        it('debería permitir que un usuario se reactive a sí mismo', async () => {
            const inactiveUser = { ...mockUser, isActive: false };
            repository.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(inactiveUser),
            } as never);
            repository.save.mockResolvedValue({ ...inactiveUser, isActive: true } as User);

            const result = await service.toggleStatus('user-123', 'user-123');

            expect(result.isActive).toBe(true);
        });
    });

    describe('updateLastLogin', () => {
        it('debería actualizar la fecha de último login', async () => {
            repository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

            await expect(service.updateLastLogin('user-123')).resolves.not.toThrow();
            expect(repository.update).toHaveBeenCalledWith('user-123', {
                lastLogin: expect.any(Date),
            });
        });
    });
});

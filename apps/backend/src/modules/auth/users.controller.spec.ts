import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole } from './entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ROLES_KEY } from './decorators/roles.decorator';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

describe('UsersController', () => {
    let controller: UsersController;
    let service: jest.Mocked<UsersService>;

    beforeEach(async () => {
        const mockUsersService = {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            toggleStatus: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                {
                    provide: UsersService,
                    useValue: mockUsersService,
                },
            ],
        }).compile();

        controller = module.get<UsersController>(UsersController);
        service = module.get(UsersService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should pass role property when creating a user', async () => {
        const dto = {
            username: 'juanperez',
            password: 'Password123',
            firstName: 'Juan',
            lastName: 'Pérez',
            role: UserRole.CASHIER,
        };

        const createdUser = {
            id: 'uuid-1',
            ...dto,
            email: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        service.create.mockResolvedValue(createdUser as any);

        const result = await controller.create(dto as any);
        expect(service.create).toHaveBeenCalledWith(dto);
        expect(result).toEqual(createdUser);
    });

    describe('metadata de autorización', () => {
        const collectGuards = (...targets: object[]): Function[] =>
            targets.flatMap((target) => Reflect.getMetadata('__guards__', target) ?? []);

        const hasGuard = (guards: Function[], Guard: Function) =>
            guards.some((candidate) => candidate === Guard || candidate?.name === Guard.name);

        const writeHandlers = [
            ['create', UsersController.prototype.create],
            ['update', UsersController.prototype.update],
            ['toggleStatus', UsersController.prototype.toggleStatus],
        ] as const;

        const readHandlers = [
            ['findAll', UsersController.prototype.findAll],
            ['findOne', UsersController.prototype.findOne],
        ] as const;

        it.each(writeHandlers)(
            '%s declara JwtAuthGuard, RolesGuard, roles ADMIN y no es público',
            (_name, handler) => {
                const guards = collectGuards(UsersController, handler);
                expect(hasGuard(guards, JwtAuthGuard)).toBe(true);
                expect(hasGuard(guards, RolesGuard)).toBe(true);
                expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([UserRole.ADMIN]);
                expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
                expect(Reflect.getMetadata(IS_PUBLIC_KEY, UsersController)).toBeUndefined();
            },
        );

        it.each(readHandlers)(
            '%s declara JwtAuthGuard y no declara roles',
            (_name, handler) => {
                const guards = collectGuards(UsersController, handler);
                expect(hasGuard(guards, JwtAuthGuard)).toBe(true);
                const handlerRoles = Reflect.getMetadata(ROLES_KEY, handler);
                const classRoles = Reflect.getMetadata(ROLES_KEY, UsersController);
                expect(handlerRoles ?? []).toEqual([]);
                expect(classRoles ?? []).toEqual([]);
                expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
            },
        );
    });
});

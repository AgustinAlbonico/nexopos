import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole } from './entities/user.entity';

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
});

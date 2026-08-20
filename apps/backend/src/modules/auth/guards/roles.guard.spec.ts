import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../entities/user.entity';

describe('RolesGuard', () => {
    let guard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
        reflector = new Reflector();
        guard = new RolesGuard(reflector);
    });

    const createMockContext = (user?: any): ExecutionContext => {
        return {
            getHandler: jest.fn(),
            getClass: jest.fn(),
            switchToHttp: () => ({
                getRequest: () => ({ user }),
            }),
        } as unknown as ExecutionContext;
    };

    it('permite acceso si no hay roles requeridos', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
        const context = createMockContext({ role: UserRole.CASHIER });
        expect(guard.canActivate(context)).toBe(true);
    });

    it('permite acceso total al usuario admin', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.MANAGER]);
        const context = createMockContext({ role: UserRole.ADMIN });
        expect(guard.canActivate(context)).toBe(true);
    });

    it('permite acceso si el rol del usuario está entre los requeridos', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.MANAGER, UserRole.CASHIER]);
        const context = createMockContext({ role: UserRole.CASHIER });
        expect(guard.canActivate(context)).toBe(true);
    });

    it('lanza ForbiddenException si el rol del usuario no coincide', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN, UserRole.MANAGER]);
        const context = createMockContext({ role: UserRole.CASHIER });
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('lanza ForbiddenException si no hay usuario en request', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
        const context = createMockContext(undefined);
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
});

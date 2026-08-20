import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<(UserRole | string)[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('Usuario no autenticado');
        }

        const userRole = user.role;
        if (!userRole) {
            throw new ForbiddenException('Acceso denegado. Rol de usuario no asignado.');
        }

        if (userRole === UserRole.ADMIN) {
            return true;
        }

        const hasRole = requiredRoles.includes(userRole);
        if (!hasRole) {
            throw new ForbiddenException('Acceso denegado. Permisos insuficientes para este recurso.');
        }

        return true;
    }
}

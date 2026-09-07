import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { ImportController } from './import.controller';

describe('ImportController autorización', () => {
    const collectGuards = (...targets: object[]): Function[] =>
        targets.flatMap((target) => Reflect.getMetadata('__guards__', target) ?? []);

    const hasJwt = (guards: Function[]) =>
        guards.some((candidate) => candidate === JwtAuthGuard || candidate?.name === JwtAuthGuard.name);

    const handlers = [
        ['preview', ImportController.prototype.preview],
        ['commit', ImportController.prototype.commit],
    ] as const;

    it.each(handlers)(
        '%s declara JwtAuthGuard de clase, sin IS_PUBLIC_KEY y sin @Roles',
        (_name, handler) => {
            const guards = collectGuards(ImportController, handler);
            expect(hasJwt(guards)).toBe(true);
            expect(Reflect.getMetadata(IS_PUBLIC_KEY, ImportController)).toBeUndefined();
            expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
            expect(Reflect.getMetadata(ROLES_KEY, ImportController)).toBeUndefined();
            expect(Reflect.getMetadata(ROLES_KEY, handler)).toBeUndefined();
        },
    );
});

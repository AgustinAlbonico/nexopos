import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { LabelsController } from './labels.controller';

describe('LabelsController autorización', () => {
    const collectGuards = (...targets: object[]): Function[] =>
        targets.flatMap((target) => Reflect.getMetadata('__guards__', target) ?? []);

    const hasJwt = (guards: Function[]) =>
        guards.some((candidate) => candidate === JwtAuthGuard || candidate?.name === JwtAuthGuard.name);

    const handlers = [
        ['templates', LabelsController.prototype.templates],
        ['preview', LabelsController.prototype.preview],
        ['queue', LabelsController.prototype.queue],
        ['status', LabelsController.prototype.status],
    ] as const;

    it('declara JwtAuthGuard en la clase', () => {
        expect(hasJwt(collectGuards(LabelsController))).toBe(true);
        expect(Reflect.getMetadata(IS_PUBLIC_KEY, LabelsController)).toBeUndefined();
        expect(Reflect.getMetadata(ROLES_KEY, LabelsController)).toBeUndefined();
    });

    it.each(handlers)(
        '%s hereda JWT, sin IS_PUBLIC_KEY y sin @Roles',
        (_name, handler) => {
            const guards = collectGuards(LabelsController, handler);
            expect(hasJwt(guards)).toBe(true);
            expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
            expect(Reflect.getMetadata(ROLES_KEY, handler)).toBeUndefined();
        },
    );
});

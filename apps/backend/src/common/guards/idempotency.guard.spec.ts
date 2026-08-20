import { ExecutionContext, ConflictException } from '@nestjs/common';
import { IdempotencyGuard } from './idempotency.guard';
import { EventEmitter } from 'events';

describe('IdempotencyGuard', () => {
    let guard: IdempotencyGuard;

    beforeEach(() => {
        guard = new IdempotencyGuard();
        IdempotencyGuard.clearCache();
    });

    const createMockContext = (headerKey?: string, statusCode = 200) => {
        const responseEmitter = new EventEmitter() as any;
        responseEmitter.statusCode = statusCode;

        const request = {
            headers: { 'x-idempotency-key': headerKey },
            body: {},
            query: {},
        };

        const context = {
            switchToHttp: () => ({
                getRequest: () => request,
                getResponse: () => responseEmitter,
            }),
        } as unknown as ExecutionContext;

        return { context, responseEmitter };
    };

    it('permite peticiones sin x-idempotency-key', () => {
        const { context } = createMockContext();
        expect(guard.canActivate(context)).toBe(true);
    });

    it('permite la primera petición con una x-idempotency-key nueva', () => {
        const { context } = createMockContext('key-100');
        expect(guard.canActivate(context)).toBe(true);
    });

    it('bloquea peticiones simultáneas con la misma x-idempotency-key mientras se procesa', () => {
        const { context: context1 } = createMockContext('key-100');
        const { context: context2 } = createMockContext('key-100');

        expect(guard.canActivate(context1)).toBe(true);
        expect(() => guard.canActivate(context2)).toThrow(ConflictException);
    });

    it('bloquea peticiones reintentadas cuando la primera ya fue completada exitosamente', () => {
        const { context: context1, responseEmitter } = createMockContext('key-100', 201);
        const { context: context2 } = createMockContext('key-100');

        expect(guard.canActivate(context1)).toBe(true);
        responseEmitter.emit('finish');

        expect(() => guard.canActivate(context2)).toThrow(ConflictException);
    });

    it('libera la clave si la primera respuesta falla con error de servidor (status >= 400)', () => {
        const { context: context1, responseEmitter } = createMockContext('key-100', 500);
        const { context: context2 } = createMockContext('key-100');

        expect(guard.canActivate(context1)).toBe(true);
        responseEmitter.emit('finish');

        // Al haber fallado la primera, el reintento debe ser permitido
        expect(guard.canActivate(context2)).toBe(true);
    });
});

import { ArgumentsHost, BadRequestException, HttpException, HttpStatus, Logger, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function makeHost(): { host: ArgumentsHost; res: { status: jest.Mock; json: jest.Mock }; req: { method: string; url: string } } {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json };
    const req = { method: 'POST', url: '/api/purchases' };
    const host: ArgumentsHost = {
        switchToHttp: () => ({ getResponse: () => res, getRequest: () => req, getNext: () => undefined }),
    } as unknown as ArgumentsHost;
    return { host, res, req };
}

describe('AllExceptionsFilter', () => {
    let filter: AllExceptionsFilter;
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        filter = new AllExceptionsFilter();
        loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        loggerErrorSpy.mockRestore();
    });

    it('normaliza message a string[] para BadRequestException con string simple', () => {
        const { host, res } = makeHost();
        filter.catch(new BadRequestException('Seleccioná un proveedor o ingresá un nombre'), host);

        expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        const body = res.json.mock.calls[0][0];
        expect(body.message).toEqual(['Seleccioná un proveedor o ingresá un nombre']);
        expect(body.statusCode).toBe(400);
        expect(body.error).toBe('BadRequestException');
        expect(body.path).toBe('/api/purchases');
        expect(typeof body.timestamp).toBe('string');
    });

    it('preserva message string[] de ValidationPipe (class-validator)', () => {
        const { host, res } = makeHost();
        const validationException = new BadRequestException({
            message: ['name should not be empty', 'email must be valid'],
            error: 'Bad Request',
            statusCode: 400,
        });
        filter.catch(validationException, host);

        const body = res.json.mock.calls[0][0];
        expect(body.message).toEqual(['name should not be empty', 'email must be valid']);
    });

    it('maneja HttpException sin body estructurado', () => {
        const { host, res } = makeHost();
        filter.catch(new NotFoundException('Compra con ID X no encontrada'), host);

        const body = res.json.mock.calls[0][0];
        expect(body.statusCode).toBe(404);
        expect(body.message).toEqual(['Compra con ID X no encontrada']);
    });

    it('convierte errores no-HttpException a 500 con message genérico', () => {
        const { host, res } = makeHost();
        filter.catch(new Error('DB blew up'), host);

        expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        const body = res.json.mock.calls[0][0];
        expect(body.statusCode).toBe(500);
        expect(body.error).toBe('Error');
        expect(body.message.length).toBeGreaterThan(0);
        expect(loggerErrorSpy).toHaveBeenCalled();
    });
});

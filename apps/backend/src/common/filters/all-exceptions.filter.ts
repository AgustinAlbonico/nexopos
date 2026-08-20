import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorResponseBody {
    readonly statusCode: number;
    readonly message: string[];
    readonly error: string;
    readonly path: string;
    readonly timestamp: string;
}

function toStringArray(value: unknown): string[] {
    if (value == null) return [];
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) {
        return value
            .map(item => (typeof item === 'string' ? item : (item as { message?: string })?.message ?? String(item)))
            .filter((s): s is string => typeof s === 'string' && s.length > 0);
    }
    if (typeof value === 'object') {
        const obj = value as { message?: unknown };
        if (Array.isArray(obj.message)) return toStringArray(obj.message);
        if (typeof obj.message === 'string') return [obj.message];
    }
    return [String(value)];
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const responseBody = exception instanceof HttpException ? exception.getResponse() : null;
        const rawMessage =
            typeof responseBody === 'object' && responseBody !== null
                ? (responseBody as { message?: unknown }).message
                : responseBody;

        const message = toStringArray(rawMessage ?? exception);

        const errorName =
            exception instanceof HttpException
                ? exception.name
                : exception instanceof Error
                  ? exception.name
                  : 'InternalServerError';

        if (status >= 500) {
            this.logger.error(
                `${request.method} ${request.url} → ${status} ${errorName}: ${message.join(' | ')}`,
                exception instanceof Error ? exception.stack : undefined,
            );
        }

        const body: ErrorResponseBody = {
            statusCode: status,
            message,
            error: errorName,
            path: request.url,
            timestamp: new Date().toISOString(),
        };

        response.status(status).json(body);
    }
}

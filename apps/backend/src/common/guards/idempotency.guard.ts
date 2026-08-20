import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ConflictException,
} from '@nestjs/common';

interface IdempotencyRecord {
    status: 'processing' | 'completed';
    timestamp: number;
    responseBody?: unknown;
}

@Injectable()
export class IdempotencyGuard implements CanActivate {
    private static cache = new Map<string, IdempotencyRecord>();
    private static readonly TTL_MS = 10 * 60 * 1000; // 10 minutos

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        const idempotencyKey =
            (request.headers['x-idempotency-key'] as string) ||
            request.body?.idempotencyKey ||
            request.query?.idempotencyKey;

        if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim().length === 0) {
            return true;
        }

        const key = idempotencyKey.trim();
        this.cleanExpiredKeys();

        const existingRecord = IdempotencyGuard.cache.get(key);

        if (existingRecord) {
            if (existingRecord.status === 'processing') {
                throw new ConflictException('Operación en proceso. Evite enviar múltiples peticiones simultáneas.');
            }
            if (existingRecord.status === 'completed') {
                throw new ConflictException('Operación ya realizada. Esta transacción ya fue procesada.');
            }
        }

        // Marcar la clave como en proceso
        IdempotencyGuard.cache.set(key, {
            status: 'processing',
            timestamp: Date.now(),
        });

        // Al finalizar la respuesta de forma exitosa, marcar como completada
        response.on('finish', () => {
            if (response.statusCode >= 200 && response.statusCode < 300) {
                IdempotencyGuard.cache.set(key, {
                    status: 'completed',
                    timestamp: Date.now(),
                });
            } else {
                // Si la respuesta falló con error HTTP, liberar la clave para reintentos válidos
                IdempotencyGuard.cache.delete(key);
            }
        });

        return true;
    }

    private cleanExpiredKeys(): void {
        const now = Date.now();
        for (const [key, record] of IdempotencyGuard.cache.entries()) {
            if (now - record.timestamp > IdempotencyGuard.TTL_MS) {
                IdempotencyGuard.cache.delete(key);
            }
        }
    }

    // Método auxiliar para pruebas unitarias
    public static clearCache(): void {
        IdempotencyGuard.cache.clear();
    }
}

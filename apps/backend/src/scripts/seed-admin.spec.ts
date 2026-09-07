import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { UserRole } from '../modules/auth/entities/user.entity';

describe('seed-admin INSERT', () => {
    const source = readFileSync(join(__dirname, 'seed-admin.ts'), 'utf8');
    const insertMatch = source.match(/INSERT INTO users \(([^)]+)\)\s*VALUES \(([^)]+)\)/);

    it('incluye columna role en el INSERT del usuario admin', () => {
        expect(insertMatch).not.toBeNull();
        const columns = insertMatch![1]
            .split(',')
            .map((column) => column.trim().replaceAll('"', ''));
        expect(columns).toContain('role');
    });

    it('asigna valor admin o UserRole.ADMIN', () => {
        expect(insertMatch).not.toBeNull();
        const insertBlock = insertMatch![0];
        const argsMatch = source.slice(source.indexOf(insertMatch![0])).match(/\[[^\]]+\]/);
        const payload = `${insertBlock}\n${argsMatch?.[0] ?? ''}`;
        expect(payload).toMatch(/UserRole\.ADMIN|'admin'|"admin"/);
        expect(argsMatch?.[0]).toMatch(/UserRole\.ADMIN/);
    });
});

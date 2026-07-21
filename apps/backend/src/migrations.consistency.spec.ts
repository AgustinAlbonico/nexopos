import * as fs from 'fs';
import * as path from 'path';
import { migrations } from './migrations';

/**
 * Test de consistencia del registro de migraciones.
 *
 * Evita el bug "no existe la columna X" en instalaciones nuevas (DBs frescas).
 *
 * Contexto: el AppModule arranca con `migrationsRun: true`, pero solo corre las
 * migraciones listadas en `src/migrations.ts`. Si una migración existe como
 * archivo en `src/migrations/` pero no está registrada en el array, TypeORM
 * nunca la aplica y la DB queda sin los cambios → el ORM explota al mapear
 * entidades con columnas que no existen.
 *
 * Este test fuerza a que toda migración creada quede registrada. Si falla, la
 * IA o el developer debe agregar la migración al array en `src/migrations.ts`.
 */
describe('Migrations consistency', () => {
    const migrationsDir = path.join(__dirname, 'migrations');

    const migrationFiles = fs
        .readdirSync(migrationsDir)
        .filter(f => /^\d{13}-.*\.ts$/.test(f));

    if (migrationFiles.length === 0) {
        throw new Error('No se encontraron archivos de migración en src/migrations/');
    }

    const fileTimestamps = migrationFiles.map(f => f.split('-')[0]);

    const registeredTimestamps = migrations.map(MigrationClass => {
        const instance = new MigrationClass();
        const className = (instance.name || MigrationClass.name) as string;
        const match = className.match(/(\d{13})$/);
        if (!match) {
            throw new Error(
                `Migration class "${className}" no termina con un timestamp de 13 dígitos. ` +
                `El name debe seguir el patrón ClassName + timestamp.`
            );
        }
        return match[1];
    });

    it('toda migración creada en src/migrations/ debe estar registrada en src/migrations.ts', () => {
        const missing = fileTimestamps.filter(ts => !registeredTimestamps.includes(ts));

        if (missing.length > 0) {
            const missingFiles = missing.map(ts =>
                migrationFiles.find(f => f.startsWith(`${ts}-`))
            );
            throw new Error(
                `\nMigraciones NO registradas en src/migrations.ts:\n` +
                missingFiles.map(f => `  - ${f}`).join('\n') +
                `\n\nAcción requerida: agregar cada una al array \`migrations\` en ` +
                `apps/backend/src/migrations.ts. Sin esto, en una DB nueva el backend ` +
                `fallará al arrancar ("no existe la columna X" o similar).\n`
            );
        }

        expect(missing).toHaveLength(0);
    });

    it('no debe haber migraciones duplicadas (mismo timestamp) en src/migrations.ts', () => {
        const seen = new Set<string>();
        const duplicates: string[] = [];

        for (const ts of registeredTimestamps) {
            if (seen.has(ts)) duplicates.push(ts);
            seen.add(ts);
        }

        expect(duplicates).toHaveLength(0);
    });

    it('la cantidad de archivos de migración debe coincidir con la cantidad registrada', () => {
        expect(registeredTimestamps.length).toBe(fileTimestamps.length);
    });
});

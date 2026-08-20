import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BackupService } from '../../src/modules/backup/backup.service';
import { Backup, BackupStatus } from '../../src/modules/backup/entities/backup.entity';
import { entities } from '../../src/entities';
import * as fs from 'node:fs';
import * as path from 'node:path';

const TEST_HOST = 'localhost';
const TEST_PORT = '5433';
const TEST_USER = 'test';
const TEST_PASSWORD = 'test';
const TEST_DB = 'nexopos_test';

function makeConfigService(): ConfigService {
    const map: Record<string, string> = {
        DATABASE_HOST: TEST_HOST,
        DATABASE_PORT: TEST_PORT,
        DATABASE_USER: TEST_USER,
        DATABASE_PASSWORD: TEST_PASSWORD,
        DATABASE_NAME: TEST_DB,
    };
    return { get: <T>(key: string, defaultValue?: T): T => (map[key] ?? defaultValue ?? '') as T } as unknown as ConfigService;
}

function makeBackupRepoStub(savedBackup: Backup) {
    return {
        find: async () => [savedBackup],
        findOne: async () => savedBackup,
        create: (data: Partial<Backup>) => ({ ...savedBackup, ...data } as Backup),
        save: async (entity: Backup) => { Object.assign(savedBackup, entity); return savedBackup; },
        delete: async () => ({ affected: 1, raw: {} }),
    } as any;
}

describe('S2 H5 T11 restore safety', () => {
    let dataSource: DataSource;
    let service: BackupService;
    let backupRecord: Backup;
    let backupFilePath: string;

    beforeAll(async () => {
        dataSource = new DataSource({
            type: 'postgres',
            host: TEST_HOST,
            port: Number(TEST_PORT),
            username: TEST_USER,
            password: TEST_PASSWORD,
            database: TEST_DB,
            entities,
            synchronize: false,
            logging: false,
        });
        await dataSource.initialize();

        const config = makeConfigService();

        const tempDir = path.resolve(process.cwd(), '..', '..', '..', 'backups');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        backupFilePath = path.join(tempDir, `restore-safety-test-${Date.now()}.backup`);

        const { exec } = await import('node:child_process');
        const { promisify } = await import('node:util');
        const execAsync = promisify(exec);
        await execAsync(
            `docker exec nexopos-test-db pg_dump -Fc -U ${TEST_USER} -d ${TEST_DB} -f /tmp/restore-test.backup`,
        );
        await execAsync(`docker cp nexopos-test-db:/tmp/restore-test.backup "${backupFilePath}"`);

        const stats = fs.statSync(backupFilePath);
        backupRecord = {
            id: 'restore-safety-test',
            filename: path.basename(backupFilePath),
            filePath: backupFilePath,
            status: BackupStatus.COMPLETED,
            sizeBytes: stats.size,
            createdByUsername: undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
        } as unknown as Backup;

        const repoStub = makeBackupRepoStub(backupRecord);
        service = new BackupService(repoStub, config);
    }, 60_000);

    afterAll(async () => {
        try { fs.unlinkSync(backupFilePath); } catch { /* noop */ }
        if (dataSource?.isInitialized) await dataSource.destroy();
    });

    it('findPgRestoreExecutable returns a non-empty path', () => {
        const exe = service.findPgRestoreExecutable();
        expect(typeof exe).toBe('string');
        expect(exe.length).toBeGreaterThan(0);
    });

    it('createTempDatabaseName returns a string containing the prod db name', () => {
        const name = service.createTempDatabaseName();
        expect(name).toContain('nexopos');
        expect(name).toContain('_restore_');
    });

    it('listBackupContents returns TOC entries from pg_restore --list', async () => {
        const contents = await service.listBackupContents('restore-safety-test');
        expect(contents.length).toBeGreaterThan(0);
    });

    it('preflight returns ok=true when the backup is valid', async () => {
        const result = await service.preflight('restore-safety-test');
        expect(result.ok).toBe(true);
        expect(result.entries).toBeGreaterThan(0);
    });

    it('createTempDatabase + restoreIntoTemporaryDatabase + validateRestoredDatabase + dropTempDatabase round-trip', async () => {
        const { tempDbName } = await service.restoreIntoTemporaryDatabase('restore-safety-test');
        expect(tempDbName).toContain('_restore_');

        const validation = await service.validateRestoredDatabase(tempDbName);
        expect(validation.valid).toBe(true);

        await service.dropTempDatabase(tempDbName);
    }, 60_000);

    it('createSafetyBackup returns a Backup record', async () => {
        const result = await service.createSafetyBackup('test-user');
        expect(result).toBeDefined();
        expect(result.status).toBe(BackupStatus.COMPLETED);
    }, 60_000);
});
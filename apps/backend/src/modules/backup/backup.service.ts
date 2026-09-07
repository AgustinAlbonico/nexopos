/**
 * Servicio de Backup
 * Maneja la creación de backups de la base de datos PostgreSQL
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Backup, BackupStatus } from './entities/backup.entity';
import { CreateBackupDto } from './dto/create-backup.dto';

const execAsync = promisify(exec);

export interface DriveInfo {
    letter: string;
    label: string;
    type: string;
    freeSpace: number;
    totalSpace: number;
}

@Injectable()
export class BackupService {
    private readonly logger = new Logger(BackupService.name);
    private readonly defaultBackupPath: string;

    constructor(
        @InjectRepository(Backup)
        private readonly backupRepository: Repository<Backup>,
        private readonly configService: ConfigService,
    ) {
        // Carpeta por defecto para backups en la raíz del proyecto
        this.defaultBackupPath = path.resolve(process.cwd(), '..', '..', 'backups');
        this.ensureBackupDirectory(this.defaultBackupPath);
    }

    /**
     * Asegura que el directorio de backups exista
     */
    private ensureBackupDirectory(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            this.logger.log(`Directorio de backups creado: ${dirPath}`);
        }
    }

    /**
     * Obtiene todos los backups registrados
     */
    async findAll(): Promise<Backup[]> {
        return this.backupRepository.find({
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Obtiene un backup por ID
     */
    async findOne(id: string): Promise<Backup | null> {
        return this.backupRepository.findOne({ where: { id } });
    }

    /**
     * Obtiene el estado del backup para alertas del dashboard
     * Verifica si hay backup en el mes actual
     */
    async getBackupStatus(): Promise<{
        hasBackupThisMonth: boolean;
        lastBackupDate: string | null;
        lastBackupMonth: string | null;
        needsBackup: boolean;
    }> {
        // Obtener el último backup exitoso
        const lastBackup = await this.backupRepository.findOne({
            where: { status: BackupStatus.COMPLETED },
            order: { createdAt: 'DESC' },
        });

        if (!lastBackup) {
            return {
                hasBackupThisMonth: false,
                lastBackupDate: null,
                lastBackupMonth: null,
                needsBackup: true,
            };
        }

        // createdAt ya es un objeto Date de TypeORM
        const lastBackupDate = lastBackup.createdAt;
        const now = new Date();

        // Verificar si el backup es del mes actual
        const backupMonth = lastBackupDate.getMonth();
        const backupYear = lastBackupDate.getFullYear();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const hasBackupThisMonth = backupMonth === currentMonth && backupYear === currentYear;

        this.logger.debug(`Backup status: backupMonth=${backupMonth}, currentMonth=${currentMonth}, hasBackupThisMonth=${hasBackupThisMonth}`);

        // Formatear el mes del último backup
        const lastBackupMonth = lastBackupDate.toLocaleDateString('es-AR', {
            month: 'long',
            year: 'numeric',
        });

        // Necesita backup si no hay backup este mes
        const needsBackup = !hasBackupThisMonth;

        return {
            hasBackupThisMonth,
            lastBackupDate: lastBackupDate.toISOString(),
            lastBackupMonth,
            needsBackup,
        };
    }

    /**
     * Crea un nuevo backup de la base de datos
     */
    async create(dto: CreateBackupDto, username?: string): Promise<Backup> {
        const timestamp = dto.includeTimestamp === false
            ? ''
            : `_${new Date().toISOString().replaceAll(/[:.]/g, '-').slice(0, 19)}`;

        // Formato custom comprimido (.backup) - más eficiente que SQL plano
        const filename = `backup${timestamp}.backup`;

        // Si se especifica una ruta de destino, crear subcarpeta 'backups' para evitar
        // problemas de permisos al escribir directamente en la raíz de un disco (C:\, D:\, etc.)
        let destinationPath = dto.destinationPath || this.defaultBackupPath;

        // Detectar si es raíz de disco (ej: C:\, D:\) y agregar subcarpeta
        if (destinationPath && /^[A-Za-z]:\\?$/.test(destinationPath.trim())) {
            destinationPath = path.join(destinationPath, 'backups');
            this.logger.log(`Ruta raíz detectada, usando: ${destinationPath}`);
        }

        // Asegurar que el directorio destino existe
        this.ensureBackupDirectory(destinationPath);

        const filePath = path.join(destinationPath, filename);

        // Crear registro inicial (guardamos antes de ejecutar para tener el ID)
        const backup = this.backupRepository.create({
            filename,
            filePath,
            status: BackupStatus.COMPLETED,
            createdByUsername: username,
        });

        await this.backupRepository.save(backup);

        try {
            // Ejecutar pg_dump
            await this.executePgDump(filePath);

            // Obtener tamaño del archivo
            const stats = fs.statSync(filePath);

            // Actualizar registro con éxito
            backup.status = BackupStatus.COMPLETED;
            backup.sizeBytes = stats.size;
            await this.backupRepository.save(backup);

            this.logger.log(`Backup creado exitosamente: ${filePath}`);
            return backup;
        } catch (error) {
            // Actualizar registro con error
            backup.status = BackupStatus.FAILED;
            backup.errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            await this.backupRepository.save(backup);

            this.logger.error(`Error creando backup: ${backup.errorMessage}`);
            throw error;
        }
    }

    /**
     * Nombre del contenedor de PostgreSQL
     */
    private readonly dockerContainerName = 'sistema-gestion-db';

    /**
     * Ejecuta pg_dump para crear el backup
     * Soporta PostgreSQL local y en Docker
     */
    private async executePgDump(outputPath: string): Promise<void> {
        const user = this.configService.get<string>('DATABASE_USER', 'postgres');
        const password = this.configService.get<string>('DATABASE_PASSWORD', 'postgres');
        const database = this.configService.get<string>('DATABASE_NAME', 'sistema_gestion');

        this.logger.log(`Ejecutando: pg_dump para ${database}`);

        try {
            // Intentar usando Docker primero (para desarrollo)
            await this.executePgDumpDocker(outputPath, user, password, database);
        } catch (dockerError) {
            this.logger.warn('Docker no disponible, intentando pg_dump local...');
            try {
                // Fallback a pg_dump local
                await this.executePgDumpLocal(outputPath, user, password, database);
            } catch (localError) {
                this.logger.error('Error ejecutando pg_dump:', localError);
                throw new Error(`Error al ejecutar pg_dump. Verificá que Docker esté corriendo o PostgreSQL instalado localmente.`);
            }
        }
    }

    /**
     * Ejecuta pg_dump usando Docker
     */
    private async executePgDumpDocker(
        outputPath: string,
        user: string,
        password: string,
        database: string,
    ): Promise<void> {
        // Nombre del archivo temporal dentro del contenedor (formato custom)
        const containerTempFile = `/tmp/backup_${Date.now()}.backup`;

        // Ejecutar pg_dump dentro del contenedor con formato custom comprimido (-Fc)
        const pgDumpCommand = `docker exec -e PGPASSWORD=${password} ${this.dockerContainerName} pg_dump -Fc -U ${user} -d ${database} -f ${containerTempFile}`;

        this.logger.log('Ejecutando pg_dump en Docker...');
        await execAsync(pgDumpCommand);

        // Copiar el archivo del contenedor al host
        const copyCommand = `docker cp ${this.dockerContainerName}:${containerTempFile} "${outputPath}"`;
        await execAsync(copyCommand);

        // Limpiar archivo temporal del contenedor
        const cleanupCommand = `docker exec ${this.dockerContainerName} rm ${containerTempFile}`;
        await execAsync(cleanupCommand);

        this.logger.log(`Backup creado vía Docker: ${outputPath}`);
    }

    /**
     * Ejecuta pg_dump localmente (fallback si no hay Docker)
     */
    private async executePgDumpLocal(
        outputPath: string,
        user: string,
        password: string,
        database: string,
    ): Promise<void> {
        const host = this.configService.get<string>('DATABASE_HOST', 'localhost');
        const port = this.configService.get<string>('DATABASE_PORT', '5432');

        // Buscar pg_dump en ubicaciones comunes de Windows
        // Formato custom comprimido (-Fc)
        const pgDumpPath = this.findPgDumpLocal();
        const command = `${pgDumpPath} -Fc -h ${host} -p ${port} -U ${user} -d ${database} -f "${outputPath}"`;

        await execAsync(command, {
            env: { ...process.env, PGPASSWORD: password },
        });

        this.logger.log(`Backup creado localmente: ${outputPath}`);
    }

    /**
     * Busca pg_dump en las ubicaciones típicas de PostgreSQL en Windows
     */
    private findPgDumpLocal(): string {
        const pgDumpLocations = [
            String.raw`C:\Program Files\PostgreSQL\16\bin\pg_dump.exe`,
            String.raw`C:\Program Files\PostgreSQL\15\bin\pg_dump.exe`,
            String.raw`C:\Program Files\PostgreSQL\14\bin\pg_dump.exe`,
            String.raw`C:\Program Files\PostgreSQL\13\bin\pg_dump.exe`,
        ];

        for (const location of pgDumpLocations) {
            if (fs.existsSync(location)) {
                this.logger.log(`pg_dump encontrado en: ${location}`);
                return `"${location}"`;
            }
        }

        return 'pg_dump';
    }

    /**
     * Obtiene las unidades de disco disponibles (Windows)
     * Usa PowerShell en lugar de wmic (deprecado en Windows 11)
     */
    async getAvailableDrives(): Promise<DriveInfo[]> {
        const drives: DriveInfo[] = [];

        try {
            // Usar PowerShell para obtener información de las unidades
            const psCommand = `powershell -Command "Get-WmiObject Win32_LogicalDisk | Select-Object DeviceID, VolumeName, Description, FreeSpace, Size, DriveType | ConvertTo-Json"`;

            const { stdout } = await execAsync(psCommand, { encoding: 'utf-8' });

            // Parsear JSON de PowerShell
            const parsed = JSON.parse(stdout);
            const disks = Array.isArray(parsed) ? parsed : [parsed];

            for (const disk of disks) {
                if (disk.DeviceID && disk.Size > 0) {
                    // DriveType: 2 = Removable, 3 = Local, 4 = Network, 5 = CD
                    const getDriveType = (type: number): string => {
                        switch (type) {
                            case 2: return 'Removable Disk';
                            case 3: return 'Local Disk';
                            case 4: return 'Network Drive';
                            default: return 'Disk';
                        }
                    };

                    drives.push({
                        letter: disk.DeviceID,
                        label: disk.VolumeName || disk.DeviceID,
                        type: getDriveType(disk.DriveType),
                        freeSpace: disk.FreeSpace || 0,
                        totalSpace: disk.Size || 0,
                    });
                }
            }
        } catch (error) {
            this.logger.error('Error obteniendo unidades de disco:', error);
            // Fallback: detectar unidades básicas
            const letters = ['C:', 'D:', 'E:', 'F:', 'G:', 'H:'];
            for (const letter of letters) {
                try {
                    if (fs.existsSync(letter + '\\')) {
                        drives.push({
                            letter,
                            label: letter,
                            type: 'Local Disk',
                            freeSpace: 0,
                            totalSpace: 0,
                        });
                    }
                } catch {
                    // Ignorar errores de acceso
                }
            }
        }

        return drives;
    }

    /**
     * Obtiene la ruta por defecto de backups
     */
    getDefaultPath(): string {
        return this.defaultBackupPath;
    }

    /**
     * Elimina un backup (solo el registro, NO el archivo físico)
     * El archivo se mantiene para que el usuario pueda restaurarlo manualmente si lo necesita
     */
    async delete(id: string): Promise<void> {
        const backup = await this.findOne(id);

        if (!backup) {
            throw new Error('Backup no encontrado');
        }

        // Solo eliminar el registro de la base de datos
        // El archivo físico se mantiene para permitir restauración manual
        await this.backupRepository.delete(id);
        this.logger.log(`Registro de backup eliminado (archivo conservado): ${backup.filePath}`);
    }

    /**
     * Explora un directorio y devuelve sus subdirectorios
     */
    async browseDirectory(dirPath?: string): Promise<{
        currentPath: string;
        parentPath: string | null;
        directories: Array<{ name: string; path: string }>;
    }> {
        // Si no se especifica path, comenzar desde las unidades
        if (!dirPath) {
            const drives = await this.getAvailableDrives();
            return {
                currentPath: '',
                parentPath: null,
                directories: drives.map(d => ({
                    name: d.label || d.letter,
                    path: d.letter + '\\',
                })),
            };
        }

        const normalizedPath = path.normalize(dirPath);
        const directories: Array<{ name: string; path: string }> = [];

        try {
            const entries = fs.readdirSync(normalizedPath, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    if (!entry.name.startsWith('.') &&
                        !entry.name.startsWith('$') &&
                        entry.name !== 'System Volume Information' &&
                        entry.name !== 'Windows') {
                        directories.push({
                            name: entry.name,
                            path: path.join(normalizedPath, entry.name),
                        });
                    }
                }
            }

            directories.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            this.logger.error(`Error leyendo directorio ${normalizedPath}:`, error);
        }

        const parentPath = path.dirname(normalizedPath);
        const isRoot = parentPath === normalizedPath || /^[A-Za-z]:\\?$/.exec(normalizedPath);

        return {
            currentPath: normalizedPath,
            parentPath: isRoot ? null : parentPath,
            directories,
        };
    }

    // ── S2 H5 T11 — Restore Safety Helpers ──────────────────────────

    findPgRestoreExecutable(): string {
        const locations = [
            String.raw`C:\Program Files\PostgreSQL\16\bin\pg_restore.exe`,
            String.raw`C:\Program Files\PostgreSQL\15\bin\pg_restore.exe`,
            String.raw`C:\Program Files\PostgreSQL\14\bin\pg_restore.exe`,
            String.raw`C:\Program Files\PostgreSQL\13\bin\pg_restore.exe`,
        ];
        for (const location of locations) {
            if (fs.existsSync(location)) {
                this.logger.log(`pg_restore encontrado en: ${location}`);
                return location;
            }
        }
        return 'pg_restore';
    }

    createTempDatabaseName(): string {
        const prodDb = this.configService.get<string>('DATABASE_NAME', 'nexopos');
        const ts = new Date().toISOString().replaceAll(/[:.]/g, '-').slice(0, 19);
        return `${prodDb}_restore_${ts}`;
    }

    async listBackupContents(backupId: string): Promise<readonly string[]> {
        const backup = await this.findOne(backupId);
        if (!backup) throw new Error(`Backup ${backupId} no encontrado`);
        if (!fs.existsSync(backup.filePath)) throw new Error(`Archivo no encontrado: ${backup.filePath}`);

        const pgRestore = this.findPgRestoreExecutable();
        const { stdout } = await execAsync(`"${pgRestore}" --list "${backup.filePath}"`);
        return stdout.split('\n').filter((line) => line.trim().length > 0);
    }

    async preflight(backupId: string): Promise<{ ok: boolean; entries: number; error?: string }> {
        try {
            const contents = await this.listBackupContents(backupId);
            return { ok: true, entries: contents.length };
        } catch (error) {
            return { ok: false, entries: 0, error: error instanceof Error ? error.message : String(error) };
        }
    }

    async createSafetyBackup(username?: string): Promise<Backup> {
        return this.create({ includeTimestamp: true }, username);
    }

    private async getAdminConnection(): Promise<{ host: string; port: string; user: string; password: string }> {
        return {
            host: this.configService.get<string>('DATABASE_HOST', 'localhost'),
            port: this.configService.get<string>('DATABASE_PORT', '5432'),
            user: this.configService.get<string>('DATABASE_USER', 'postgres'),
            password: this.configService.get<string>('DATABASE_PASSWORD', 'postgres'),
        };
    }

    async createTempDatabase(tempName: string): Promise<void> {
        const admin = await this.getAdminConnection();
        const { Client } = await import('pg');
        const client = new Client({
            host: admin.host,
            port: Number(admin.port),
            user: admin.user,
            password: admin.password,
            database: 'postgres',
        });
        try {
            await client.connect();
            await client.query(`CREATE DATABASE "${tempName}"`);
            this.logger.log(`Base de datos temporal creada: ${tempName}`);
        } finally {
            await client.end();
        }
    }

    async dropTempDatabase(tempName: string): Promise<void> {
        const admin = await this.getAdminConnection();
        const { Client } = await import('pg');
        const client = new Client({
            host: admin.host,
            port: Number(admin.port),
            user: admin.user,
            password: admin.password,
            database: 'postgres',
        });
        try {
            await client.connect();
            await client.query(`DROP DATABASE IF EXISTS "${tempName}"`);
            this.logger.log(`Base de datos temporal eliminada: ${tempName}`);
        } finally {
            await client.end();
        }
    }

    async pgRestoreToDatabase(backupFile: string, targetDbName: string): Promise<void> {
        const admin = await this.getAdminConnection();
        const pgRestore = this.findPgRestoreExecutable();
        const command = `"${pgRestore}" --host=${admin.host} --port=${admin.port} --username=${admin.user} --dbname=${targetDbName} --no-owner --no-privileges --exit-on-error=false "${backupFile}"`;
        try {
            await execAsync(command, { env: { ...process.env, PGPASSWORD: admin.password } });
        } catch (error) {
            const errOutput = (error as { stderr?: string; message?: string });
            const combined = `${errOutput.stderr ?? ''} ${errOutput.message ?? ''}`;
            if (combined.includes('errors ignored on restore') || combined.includes('transaction_timeout')) {
                this.logger.warn(`pg_restore completed with version-mismatch warnings (non-fatal)`);
            } else {
                throw error;
            }
        }
        this.logger.log(`pg_restore completado hacia: ${targetDbName}`);
    }

    async restoreIntoTemporaryDatabase(backupId: string): Promise<{ tempDbName: string }> {
        const backup = await this.findOne(backupId);
        if (!backup) throw new Error(`Backup ${backupId} no encontrado`);
        const tempDbName = this.createTempDatabaseName();
        await this.createTempDatabase(tempDbName);
        try {
            await this.pgRestoreToDatabase(backup.filePath, tempDbName);
        } catch (error) {
            await this.dropTempDatabase(tempDbName);
            throw error;
        }
        return { tempDbName };
    }

    async validateRestoredDatabase(tempDbName: string): Promise<{ valid: boolean; tableCount: number; error?: string }> {
        const admin = await this.getAdminConnection();
        const { Client } = await import('pg');
        const client = new Client({
            host: admin.host,
            port: Number(admin.port),
            user: admin.user,
            password: admin.password,
            database: tempDbName,
        });
        try {
            await client.connect();
            const result = await client.query(`SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'`);
            return { valid: true, tableCount: result.rows[0].count };
        } catch (error) {
            return { valid: false, tableCount: 0, error: error instanceof Error ? error.message : String(error) };
        } finally {
            await client.end();
        }
    }

    async swapOrTransactionalApply(backupId: string): Promise<{ ok: boolean; error?: string }> {
        const backup = await this.findOne(backupId);
        if (!backup) throw new Error(`Backup ${backupId} no encontrado`);
        const admin = await this.getAdminConnection();
        const prodDb = this.configService.get<string>('DATABASE_NAME', 'nexopos');
        const pgRestore = this.findPgRestoreExecutable();
        const command = `"${pgRestore}" --host=${admin.host} --port=${admin.port} --username=${admin.user} --dbname=${prodDb} --clean --if-exists --single-transaction --no-owner --no-privileges "${backup.filePath}"`;
        try {
            await execAsync(command, { env: { ...process.env, PGPASSWORD: admin.password } });
            this.logger.log(`Swap/transactional apply completado en: ${prodDb}`);
            return { ok: true };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    }

    async rollbackToSafetyBackup(safetyBackupId: string): Promise<{ ok: boolean; error?: string }> {
        return this.swapOrTransactionalApply(safetyBackupId);
    }
}


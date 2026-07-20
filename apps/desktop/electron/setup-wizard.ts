import { BrowserWindow, ipcMain, app } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { Client } from 'pg';

/** Detectar si estamos en modo desarrollo (consistente con main.ts) */
const isDev = !app.isPackaged;

let setupWindow: BrowserWindow | null = null;

export function createSetupWizard(onSuccess: () => void) {
    if (setupWindow) {
        setupWindow.focus();
        return;
    }

    setupWindow = new BrowserWindow({
        width: 500,
        height: 700,
        resizable: false,
        title: 'Configuración inicial - NexoPOS',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'setup-preload.js'),
        },
        autoHideMenuBar: true,
    });

    // Cargar el HTML del wizard
    // En desarrollo: apuntar al archivo fuente (ya que no se copia a dist)
    // En producción: apuntar a resources/setup
    const setupPath = isDev
        ? path.join(__dirname, '../../electron/setup/index.html')
        : path.join(process.resourcesPath, 'setup/index.html');

    console.log(`[Setup] isDev: ${isDev}, setupPath: ${setupPath}`);

    setupWindow.loadFile(setupPath);

    setupWindow.on('closed', () => {
        setupWindow = null;
    });

    // Manejar intento de conexión y guardado
    // Ahora solo hay un modo: conectar a PostgreSQL (puede ser local o remoto)
    ipcMain.handle('setup-database', async (_, config) => {
        const client = new Client({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.username,
            password: config.password,
            connectionTimeoutMillis: 10000,
        });

        try {
            console.log(`[Setup] Probando conexión a PostgreSQL: ${config.host}:${config.port}`);
            await client.connect();
            await client.query('SELECT 1'); // Test query
            await client.end();
            console.log('[Setup] Conexión exitosa a PostgreSQL');

            // Guardar configuración en .env
            // La única diferencia entre PC principal y terminal adicional es el DATABASE_HOST
            const envContent = `
# Configuración GENERADA por Setup Wizard
# Host: ${config.host === 'localhost' ? 'BD Local (PC Principal)' : 'BD Remota (' + config.host + ')'}
DATABASE_HOST=${config.host}
DATABASE_PORT=${config.port}
DATABASE_NAME=${config.database}
DATABASE_USER=${config.username}
DATABASE_PASSWORD=${config.password}
BACKEND_PORT=3000
FRONTEND_PORT=5173
NODE_ENV=production

# Seguridad JWT
JWT_SECRET=${config.jwtSecret || randomBytes(32).toString('hex')}
JWT_EXPIRATION=36500d
      `.trim();

            // Ruta del archivo .env
            // En desarrollo: raíz del monorepo
            // En producción: %APPDATA%/NexoPOS/.env (persiste entre actualizaciones)
            let envPath: string;
            if (isDev) {
                envPath = path.join(__dirname, '../../.env');
            } else {
                // Usar userData que persiste entre actualizaciones
                const userDataDir = app.getPath('userData');
                envPath = path.join(userDataDir, '.env');
            }

            console.log(`[Setup] Guardando .env en: ${envPath}`);
            await fs.writeFile(envPath, envContent);

            return { success: true };
        } catch (error: any) {
            if (client) {
                try { await client.end(); } catch { }
            }
            console.error('[Setup] Error de conexión:', error);

            // Mensajes de error más descriptivos
            // Mensajes de error más descriptivos
            const errorMessage = getDatabaseErrorMessage(error, config);

            return { success: false, error: errorMessage };
        }
    });

    // Manejar finalización
    ipcMain.once('setup-complete', () => {
        if (setupWindow) {
            setupWindow.close();
        }
        // Eliminar handlers para no duplicar si se reabre
        ipcMain.removeHandler('setup-database');
        onSuccess();
    });
}

function getDatabaseErrorMessage(error: any, config: any): string {
    let errorMessage = error.message || 'Error de conexión a Base de Datos';

    if (error.code === 'ECONNREFUSED') {
        errorMessage = `Conexión rechazada. PostgreSQL no está corriendo en ${config.host}:${config.port}\n\nVerificá que:\n• PostgreSQL esté instalado y corriendo\n• El puerto ${config.port} esté abierto en el firewall`;
    } else if (error.code === 'ENOTFOUND') {
        errorMessage = `No se encontró el servidor: ${config.host}\nVerificá la IP o nombre de host`;
    } else if (error.code === 'ETIMEDOUT') {
        errorMessage = `Tiempo agotado al conectar a ${config.host}:${config.port}\n\nVerificá que:\n• La IP sea correcta\n• El puerto 5432 esté abierto en el firewall del servidor\n• PostgreSQL acepte conexiones remotas (pg_hba.conf)`;
    } else if (error.message?.includes('password authentication failed')) {
        errorMessage = 'Contraseña incorrecta para el usuario especificado';
    } else if (error.message?.includes('database') && error.message?.includes('does not exist')) {
        errorMessage = `La base de datos "${config.database}" no existe.\n\nCreala con: createdb -U postgres ${config.database}`;
    }
    return errorMessage;
}

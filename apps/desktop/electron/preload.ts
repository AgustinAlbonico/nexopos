import { contextBridge, ipcRenderer } from 'electron';

/**
 * El preload script expone APIs seguras al frontend.
 * Esto mantiene la seguridad de la aplicación usando contextBridge.
 */

// API expuesta al frontend
const electronAPI = {
    // Información de la aplicación
    getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),

    // Estado del backend
    isBackendReady: (): Promise<boolean> => ipcRenderer.invoke('is-backend-ready'),

    // Información del sistema
    getSystemInfo: (): Promise<{
        platform: string;
        arch: string;
        version: string;
        isDev: boolean;
    }> => ipcRenderer.invoke('get-system-info'),

    readScale: (): Promise<import('./scale/types').ScaleReadResult> => ipcRenderer.invoke('scale:read'),

    // Tiqueteras e impresión
    getPrinters: (): Promise<Array<{ name: string; isDefault: boolean; description?: string }>> =>
        ipcRenderer.invoke('printers:get'),
    printTicket: (options: { html: string; printerName?: string | null; paperWidth?: string }): Promise<{ success: boolean; error?: string }> =>
        ipcRenderer.invoke('printers:print-ticket', options),
    printTestTicket: (options: { printerName?: string | null; paperWidth?: string; headerTitle?: string; headerAddress?: string; headerPhone?: string; footerText?: string }): Promise<{ success: boolean; error?: string }> =>
        ipcRenderer.invoke('printers:print-test', options),

    // Control de ventana
    toggleFullscreen: (): void => ipcRenderer.send('toggle-fullscreen'),
    minimizeWindow: (): void => ipcRenderer.send('minimize-window'),
    closeWindow: (): void => ipcRenderer.send('close-window'),

    // Plataforma actual
    platform: process.platform,

    // Indicador de que estamos en Electron
    isElectron: true,

    // API URL configurada desde main process
    apiUrl: process.argv.find(arg => arg.startsWith('--api-url='))?.split('=')[1],
};

// Exponer la API al contexto del renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Tipos TypeScript para uso en el frontend
export type ElectronAPI = typeof electronAPI;

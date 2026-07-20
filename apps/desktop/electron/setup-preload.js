const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('setupAPI', {
    setupDatabase: (config) => ipcRenderer.invoke('setup-database', config),
    notifySetupComplete: () => ipcRenderer.send('setup-complete'),
});

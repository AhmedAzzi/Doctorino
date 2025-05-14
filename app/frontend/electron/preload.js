const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Get the API URL
  getApiUrl: () => ipcRenderer.invoke('get-api-url'),

  // File dialogs
  openFile: (options) => ipcRenderer.invoke('open-file-dialog', options),
  saveFile: (options) => ipcRenderer.invoke('save-file-dialog', options),

  // App version
  getAppVersion: () => process.env.npm_package_version || '1.0.0',

  // Electron version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

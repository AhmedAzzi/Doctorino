const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Hot reload for Electron during development
if (isDev) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit',
  });
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  // Load the app
  const loadApp = () => {
    const url = isDev
      ? 'http://localhost:5173'
      : `file://${path.join(__dirname, '../dist/index.html')}`;

    mainWindow.loadURL(url)
      .catch(err => console.error(`Failed to load app: ${err.message}`));
  };

  loadApp();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle potential port conflicts in development
  if (isDev) {
    mainWindow.webContents.on('did-fail-load', () => {
      setTimeout(loadApp, 1000);
    });
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Define API port
const API_PORT = process.env.API_PORT || 34664;

// IPC handlers for communication between renderer and main process
ipcMain.handle('get-api-url', () => {
  return `http://localhost:${API_PORT}`;
});

// Handle file dialogs
ipcMain.handle('open-file-dialog', async (event, options) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(options);
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

// Handle save dialogs
ipcMain.handle('save-file-dialog', async (event, options) => {
  const { canceled, filePath } = await dialog.showSaveDialog(options);
  if (canceled) {
    return null;
  } else {
    return filePath;
  }
});

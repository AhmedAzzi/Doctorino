const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const log = require('electron-log');

// Configure logging
log.initialize({ preload: true });
Object.assign(console, log.functions);

// Environment configuration
const isDev = process.env.NODE_ENV === 'development';
const API_PORT = process.env.API_PORT || 443;
const API_URL = process.env.API_URL || 'https://doctorino-api.onrender.com';

// Global references
let mainWindow = null;
let pythonProcess = null;

// Enhanced Python backend management
class PythonBackend {
  static async start() {
    const backendPath = this.getBackendPath();
    this.verifyBackendFiles(backendPath);

    console.log('Starting Python backend...');
    pythonProcess = spawn(
      this.getPythonExecutable(),
      [
        '-m', 'uvicorn',
        'main:app',
        '--host', '0.0.0.0',
        '--port', API_PORT.toString(),
        '--log-level', 'info'
      ],
      {
        cwd: path.dirname(backendPath),
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      }
    );

    this.setupProcessHandlers();
    await this.waitForBackendReady();
  }

  static getBackendPath() {
    if (isDev) {
      return path.join(__dirname, 'backend', 'main.py');
    }
    return path.join(process.resourcesPath, 'backend', 'main.py');
  }

  static verifyBackendFiles(backendPath) {
    if (!fs.existsSync(backendPath)) {
      const error = `Backend script not found at: ${backendPath}`;
      console.error(error);
      throw new Error(error);
    }
  }

  static getPythonExecutable() {
    const venvPath = path.join(__dirname, 'backend', 'venv');
    if (fs.existsSync(venvPath)) {
      return process.platform === 'win32'
        ? path.join(venvPath, 'Scripts', 'python.exe')
        : path.join(venvPath, 'bin', 'python');
    }
    return process.platform === 'win32' ? 'python' : 'python3';
  }

  static setupProcessHandlers() {
    pythonProcess.stdout.on('data', (data) => {
      console.log(`Python: ${data.toString().trim()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python Error: ${data.toString().trim()}`);
      if (mainWindow) {
        mainWindow.webContents.send('python-error', data.toString());
      }
    });

    pythonProcess.on('error', (err) => {
      console.error('Python process error:', err);
      if (mainWindow) {
        dialog.showErrorBox(
          'Backend Error',
          `Failed to start Python backend: ${err.message}`
        );
      }
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      if (code !== 0 && mainWindow) {
        dialog.showErrorBox(
          'Backend Error',
          `Python backend exited unexpectedly with code ${code}`
        );
      }
    });
  }

  static async waitForBackendReady() {
    const { default: fetch } = await import('node-fetch');
    const maxAttempts = 30;
    const delay = 1000;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) {
          console.log('Backend is ready');
          return true;
        }
      } catch (err) {
        console.log(`Attempt ${i + 1}: Backend not ready yet...`);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error('Backend did not start in time');
  }

  static stop() {
    if (!pythonProcess) return;

    console.log('Stopping Python backend...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', pythonProcess.pid, '/f', '/t']);
    } else {
      pythonProcess.kill();
    }
    pythonProcess = null;
  }
}

// Main window management
class MainWindow {
  static create() {
    console.log('Creating main window...');
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, 'frontend/electron/preload.js')
      },
      icon: path.join(__dirname, 'frontend/assets/icon.png'),
      show: false
    });

    this.configureWindowEvents();
    this.loadContent();

    return mainWindow;
  }

  static configureWindowEvents() {
    mainWindow.on('ready-to-show', () => {
      mainWindow.show();
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
      this.filterDevToolsErrors();
    }
  }

  static filterDevToolsErrors() {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.executeJavaScript(`
        const originalWarn = console.warn;
        const originalError = console.error;

        console.warn = function(...args) {
          if (args[0] && /Autofill\\.(enable|setAddresses)/.test(args[0])) return;
          originalWarn.apply(console, args);
        };

        console.error = function(...args) {
          if (args[0] && /Autofill\\.(enable|setAddresses)/.test(args[0])) return;
          originalError.apply(console, args);
        };
      `);
    });
  }

  static loadContent() {
    if (isDev) {
      console.log('Loading development server...');
      mainWindow.loadURL('http://localhost:5173').catch(err => {
        console.error('Failed to load dev server:', err);
      });
    } else {
      console.log('Loading production build...');
      mainWindow.loadFile(path.join(__dirname, 'frontend/dist/index.html'))
        .catch(err => {
          console.error('Failed to load production build:', err);
        });
    }
  }
}

// Application lifecycle management
class AppManager {
  static async initialize() {
    try {
      await PythonBackend.start();
      MainWindow.create();
      this.setupAppEvents();
    } catch (err) {
      console.error('Initialization failed:', err);
      dialog.showErrorBox('Startup Error', err.message);
      app.quit();
    }
  }

  static setupAppEvents() {
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        MainWindow.create();
      }
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('will-quit', () => {
      PythonBackend.stop();
    });
  }
}

// IPC Communication
function setupIPC() {
  ipcMain.handle('get-api-url', () => API_URL);

  ipcMain.handle('open-file-dialog', async (event, options) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(
      mainWindow,
      options
    );
    return canceled ? null : filePaths[0];
  });

  ipcMain.handle('save-file-dialog', async (event, options) => {
    const { canceled, filePath } = await dialog.showSaveDialog(
      mainWindow,
      options
    );
    return canceled ? null : filePath;
  });
}

// Start the application
app.whenReady().then(() => {
  setupIPC();
  AppManager.initialize();
}).catch(err => {
  console.error('App initialization failed:', err);
  app.quit();
});
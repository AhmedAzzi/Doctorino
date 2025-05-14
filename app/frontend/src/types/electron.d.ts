// Type definitions for Electron API
interface ElectronAPI {
  getApiUrl: () => Promise<string>;
  openFile: (options: OpenDialogOptions) => Promise<string | null>;
  saveFile: (options: SaveDialogOptions) => Promise<string | null>;
  getAppVersion: () => string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
}

interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: FileFilter[];
  properties?: Array<
    | 'openFile'
    | 'openDirectory'
    | 'multiSelections'
    | 'showHiddenFiles'
    | 'createDirectory'
    | 'promptToCreate'
    | 'noResolveAliases'
    | 'treatPackageAsDirectory'
    | 'dontAddToRecent'
  >;
  message?: string;
}

interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: FileFilter[];
  message?: string;
  nameFieldLabel?: string;
  showsTagField?: boolean;
}

interface FileFilter {
  name: string;
  extensions: string[];
}

// Extend the Window interface
declare interface Window {
  electronAPI?: ElectronAPI;
}

import { BrowserWindow, app, shell } from "electron";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));
const preloadPath = join(currentDir, "../preload/preload.js");
const devServerUrl = "http://127.0.0.1:5173";

export type ManagedWindow = "main" | "reminder" | "timer";

export interface WindowManager {
  createMainWindow: () => BrowserWindow;
  getMainWindow: () => BrowserWindow | null;
  showMainWindow: () => BrowserWindow;
  showReminderWindow: () => BrowserWindow;
  showTimerWindow: (options?: { alwaysOnTop?: boolean }) => BrowserWindow;
  setTimerAlwaysOnTop: (enabled: boolean) => void;
  closeAll: () => void;
}

export interface WindowManagerState {
  isQuitting: boolean;
}

function getRendererUrl(route = ""): string {
  const suffix = route ? `#${route}` : "";

  if (!app.isPackaged) {
    return `${devServerUrl}/${suffix}`;
  }

  const fileUrl = pathToFileURL(join(app.getAppPath(), "dist", "index.html")).toString();
  return `${fileUrl}${suffix}`;
}

function isAllowedAppUrl(targetUrl: string): boolean {
  if (!app.isPackaged) {
    return targetUrl.startsWith(devServerUrl);
  }

  return targetUrl.startsWith(pathToFileURL(join(app.getAppPath(), "dist", "index.html")).toString());
}

function lockNavigationToApp(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedAppUrl(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });
}

function createBaseWindow(options: Electron.BrowserWindowConstructorOptions): BrowserWindow {
  const window = new BrowserWindow({
    show: false,
    backgroundColor: "#f7f9fb",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    ...options
  });

  lockNavigationToApp(window);
  return window;
}

export function createWindowManager(state: WindowManagerState): WindowManager {
  let mainWindow: BrowserWindow | null = null;
  let reminderWindow: BrowserWindow | null = null;
  let timerWindow: BrowserWindow | null = null;

  const loadWindow = (window: BrowserWindow, route?: string) => {
    void window.loadURL(getRendererUrl(route));
    window.once("ready-to-show", () => {
      if (!window.isDestroyed()) {
        window.show();
      }
    });
  };

  const createMainWindow = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return mainWindow;
    }

    mainWindow = createBaseWindow({
      width: 1180,
      height: 760,
      minWidth: 920,
      minHeight: 620,
      title: "ACM Trainer"
    });

    mainWindow.on("close", (event) => {
      if (!state.isQuitting) {
        event.preventDefault();
        mainWindow?.hide();
      }
    });

    mainWindow.on("closed", () => {
      mainWindow = null;
    });

    loadWindow(mainWindow);
    return mainWindow;
  };

  const showMainWindow = () => {
    const window = createMainWindow();
    if (window.isMinimized()) {
      window.restore();
    }
    window.show();
    window.focus();
    return window;
  };

  const showReminderWindow = () => {
    if (reminderWindow && !reminderWindow.isDestroyed()) {
      reminderWindow.show();
      reminderWindow.focus();
      return reminderWindow;
    }

    reminderWindow = createBaseWindow({
      width: 560,
      height: 520,
      resizable: false,
      minimizable: false,
      parent: mainWindow ?? undefined,
      modal: Boolean(mainWindow),
      title: "Today Reminder"
    });

    reminderWindow.on("closed", () => {
      reminderWindow = null;
    });

    loadWindow(reminderWindow, "/reminder");
    return reminderWindow;
  };

  const showTimerWindow = (options: { alwaysOnTop?: boolean } = {}) => {
    if (timerWindow && !timerWindow.isDestroyed()) {
      timerWindow.setAlwaysOnTop(Boolean(options.alwaysOnTop));
      timerWindow.show();
      timerWindow.focus();
      return timerWindow;
    }

    timerWindow = createBaseWindow({
      width: 360,
      height: 260,
      minWidth: 320,
      minHeight: 220,
      alwaysOnTop: Boolean(options.alwaysOnTop),
      title: "ACM Trainer Timer"
    });

    timerWindow.on("closed", () => {
      timerWindow = null;
    });

    loadWindow(timerWindow, "/timer");
    return timerWindow;
  };

  return {
    createMainWindow,
    getMainWindow: () => mainWindow,
    showMainWindow,
    showReminderWindow,
    showTimerWindow,
    setTimerAlwaysOnTop: (enabled: boolean) => {
      timerWindow?.setAlwaysOnTop(enabled);
    },
    closeAll: () => {
      mainWindow?.close();
      reminderWindow?.close();
      timerWindow?.close();
    }
  };
}

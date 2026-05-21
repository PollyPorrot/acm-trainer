import { app, BrowserWindow, Tray } from "electron";
import { createWindowManager } from "./windows.js";
import { createAppTray } from "./tray.js";
import { registerIpcHandlers } from "./ipc.js";

const appState = {
  isQuitting: false
};

let tray: Tray | null = null;
const windows = createWindowManager(appState);

function logStartupError(error: unknown): void {
  console.error(error instanceof Error ? error.stack : error);
}

function quitApplication(): void {
  appState.isQuitting = true;
}

process.on("uncaughtException", logStartupError);
process.on("unhandledRejection", logStartupError);

app.on("before-quit", quitApplication);

app.whenReady().then(() => {
  registerIpcHandlers({ windows });
  windows.createMainWindow();
  tray = createAppTray({ windows, quit: quitApplication });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windows.createMainWindow();
    } else {
      windows.showMainWindow();
    }
  });
}).catch(logStartupError);

app.on("window-all-closed", () => {
  if (process.platform !== "win32" && process.platform !== "darwin") {
    app.quit();
  }
});

app.on("quit", () => {
  tray = null;
});

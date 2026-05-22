import { app, BrowserWindow, Tray } from "electron";
import { createDatabase } from "../data/db.js";
import { refreshContestCache } from "./contestRefresh.js";
import { createWindowManager } from "./windows.js";
import { createAppTray } from "./tray.js";
import { registerIpcHandlers } from "./ipc.js";
import { registerReminderScheduler, runDailyReminder } from "./reminderScheduler.js";

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
  const db = createDatabase();
  const reminderContext = {
    db,
    windows,
    refreshContests: () => refreshContestCache(db),
    onError: logStartupError
  };
  const showManualReminder = () => runDailyReminder(reminderContext, { manual: true });

  registerIpcHandlers({
    windows,
    db,
    showTodayReminder: showManualReminder
  });
  windows.createMainWindow();
  tray = createAppTray({
    windows,
    quit: quitApplication,
    refreshContests: () => {
      void refreshContestCache(db).catch(logStartupError);
    },
    showTodayReminder: () => {
      void showManualReminder().catch(logStartupError);
    }
  });
  const unregisterReminderScheduler = registerReminderScheduler(reminderContext);

  app.once("quit", unregisterReminderScheduler);

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

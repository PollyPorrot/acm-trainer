import { app, ipcMain } from "electron";
import { getAutostartEnabled, setAutostartEnabled } from "./autostart.js";
import { openTimerWindow, setTimerAlwaysOnTop } from "./timerWindow.js";
import type { WindowManager } from "./windows.js";

export interface IpcContext {
  windows: WindowManager;
}

const emptyList: unknown[] = [];

export function registerIpcHandlers({ windows }: IpcContext): void {
  ipcMain.handle("settings:get", () => ({
    autostartEnabled: getAutostartEnabled(),
    contestReminderEnabled: true,
    randomImageReminderEnabled: true,
    dataPath: app.getPath("userData")
  }));

  ipcMain.handle("settings:setAutostart", (_event, enabled: boolean) => {
    setAutostartEnabled(Boolean(enabled));
    return { autostartEnabled: getAutostartEnabled() };
  });

  ipcMain.handle("contests:refresh", () => ({
    contests: emptyList,
    failedProviders: emptyList,
    refreshedAt: new Date().toISOString()
  }));
  ipcMain.handle("contests:listToday", () => emptyList);

  ipcMain.handle("vp:list", () => emptyList);
  ipcMain.handle("vp:create", (_event, draft) => ({ ...draft, id: "placeholder" }));
  ipcMain.handle("vp:update", (_event, id: string, patch) => ({ id, ...patch }));
  ipcMain.handle("vp:delete", () => ({ ok: true }));

  ipcMain.handle("reviews:list", () => emptyList);
  ipcMain.handle("reviews:create", (_event, draft) => ({ ...draft, id: "placeholder" }));
  ipcMain.handle("reviews:update", (_event, id: string, patch) => ({ id, ...patch }));
  ipcMain.handle("reviews:delete", () => ({ ok: true }));

  ipcMain.handle("images:list", () => emptyList);
  ipcMain.handle("images:import", () => emptyList);
  ipcMain.handle("images:update", (_event, id: string, patch) => ({ id, ...patch }));
  ipcMain.handle("images:delete", () => ({ ok: true }));

  ipcMain.handle("timer:open", (_event, alwaysOnTop?: boolean) => {
    openTimerWindow(windows, alwaysOnTop ?? true);
    return { ok: true };
  });
  ipcMain.handle("timer:setAlwaysOnTop", (_event, enabled: boolean) => {
    setTimerAlwaysOnTop(windows, Boolean(enabled));
    return { ok: true };
  });

  ipcMain.handle("reminder:showToday", () => {
    windows.showReminderWindow();
    return { ok: true };
  });
}

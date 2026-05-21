import { app } from "electron";

export function getAutostartEnabled(): boolean {
  return app.getLoginItemSettings().openAtLogin;
}

export function setAutostartEnabled(enabled: boolean): void {
  app.setLoginItemSettings({ openAtLogin: enabled });
}

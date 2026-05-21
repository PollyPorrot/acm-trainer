import type { WindowManager } from "./windows.js";

export function openTimerWindow(windows: WindowManager, alwaysOnTop = true): void {
  windows.showTimerWindow({ alwaysOnTop });
}

export function setTimerAlwaysOnTop(windows: WindowManager, enabled: boolean): void {
  windows.setTimerAlwaysOnTop(enabled);
}

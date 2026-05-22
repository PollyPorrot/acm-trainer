import { Notification } from "electron";
import type { WindowManager } from "./windows.js";

export function openTimerWindow(windows: WindowManager, alwaysOnTop = true): void {
  windows.showTimerWindow({ alwaysOnTop });
}

export function setTimerAlwaysOnTop(windows: WindowManager, enabled: boolean): void {
  windows.setTimerAlwaysOnTop(enabled);
}

export function notifyTimerComplete(): void {
  const notificationApi = Notification as typeof Notification | undefined;

  if (!notificationApi?.isSupported()) {
    return;
  }

  new notificationApi({
    title: "ACM Trainer",
    body: "倒计时结束了"
  }).show();
}

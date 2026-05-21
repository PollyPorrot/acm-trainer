import { Menu, Tray, app, nativeImage } from "electron";
import type { WindowManager } from "./windows.js";

export interface TrayContext {
  windows: WindowManager;
  quit: () => void;
}

const iconDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAI0lEQVR4AWP4//8/AyWYYXAZAAkxKjDqgqMGjBqgAqMGAG92AxH7pKuzAAAAAElFTkSuQmCC";

export function createAppTray({ windows, quit }: TrayContext): Tray {
  const tray = new Tray(nativeImage.createFromDataURL(iconDataUrl));

  const menu = Menu.buildFromTemplate([
    {
      label: "Open ACM Trainer",
      click: () => windows.showMainWindow()
    },
    {
      label: "Open Timer",
      click: () => windows.showTimerWindow({ alwaysOnTop: true })
    },
    {
      label: "Refresh Contests",
      click: () => {
        windows.getMainWindow()?.webContents.send("contests:refreshRequested");
      }
    },
    {
      label: "Today Reminder",
      click: () => windows.showReminderWindow()
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        quit();
        app.quit();
      }
    }
  ]);

  tray.setToolTip("ACM Trainer");
  tray.setContextMenu(menu);
  tray.on("double-click", () => windows.showMainWindow());

  return tray;
}

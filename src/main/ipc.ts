import { app, ipcMain } from "electron";
import { createDatabase, type AppDatabase } from "../data/db.js";
import { listContestCache } from "../data/repositories/contestCacheRepo.js";
import {
  getAppSettings,
  updateAppSettings
} from "../data/repositories/settingsRepo.js";
import {
  createImageWallItem,
  deleteImageWallItem,
  getImageWallItem,
  listImageWallItems,
  updateImageWallItem,
  type CreateImageWallItemInput,
  type UpdateImageWallItemInput
} from "../data/repositories/imageWallRepo.js";
import {
  createVpContest,
  deleteVpContest,
  listVpContests,
  updateVpContest,
  type CreateVpContestInput,
  type UpdateVpContestInput
} from "../data/repositories/vpContestRepo.js";
import {
  createVpReview,
  deleteVpReview,
  listVpReviews,
  updateVpReview,
  type CreateVpReviewInput,
  type UpdateVpReviewInput
} from "../data/repositories/vpReviewRepo.js";
import { getAutostartEnabled, setAutostartEnabled } from "./autostart.js";
import { refreshContestCache } from "./contestRefresh.js";
import { deleteStoredImage, importImageFiles, readImageDataUrl } from "./mediaImport.js";
import { notifyTimerComplete, openTimerWindow, setTimerAlwaysOnTop } from "./timerWindow.js";
import { extractLinkMetadata } from "../shared/linkMetadata.js";
import { detectPlatformFromUrl } from "../shared/platforms.js";
import type { AppSettings } from "../shared/types.js";
import type { WindowManager } from "./windows.js";

export interface IpcContext {
  windows: WindowManager;
  db?: AppDatabase;
  showTodayReminder?: () => Promise<unknown> | unknown;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

function asId(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  throw new Error("Expected record id");
}

function localDayRange(now = new Date()): { fromIso: string; toIso: string } {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

  return {
    fromIso: from.toISOString(),
    toIso: to.toISOString()
  };
}

async function recognizeContestLink(rawUrl: unknown) {
  const url = typeof rawUrl === "string" ? rawUrl.trim() : "";
  const platform = detectPlatformFromUrl(url);
  let title = "";

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      const response = await fetch(parsedUrl, {
        headers: {
          "user-agent": "ACM-Trainer/0.1"
        }
      });

      if (response.ok) {
        title = extractLinkMetadata(await response.text()).title;
      }
    }
  } catch {
    title = "";
  }

  return { url, platform, title };
}

function readSettings(db: AppDatabase): AppSettings {
  return {
    ...getAppSettings(db),
    launchAtStartup: getAutostartEnabled(),
    dataDirectory: app.getPath("userData")
  };
}

export function registerIpcHandlers({ windows, db = createDatabase(), showTodayReminder }: IpcContext): void {
  app.once("quit", () => {
    db.close();
  });

  ipcMain.handle("settings:get", () => readSettings(db));

  ipcMain.handle("settings:update", (_event, patch: Partial<AppSettings>) => {
    const settingsPatch = asRecord(patch) as Partial<AppSettings>;

    if (typeof settingsPatch.launchAtStartup === "boolean") {
      setAutostartEnabled(settingsPatch.launchAtStartup);
    }

    updateAppSettings(db, {
      ...settingsPatch,
      launchAtStartup: getAutostartEnabled(),
      dataDirectory: app.getPath("userData")
    });

    return readSettings(db);
  });

  ipcMain.handle("settings:setAutostart", (_event, enabled: boolean) => {
    setAutostartEnabled(Boolean(enabled));
    updateAppSettings(db, { launchAtStartup: getAutostartEnabled() });
    return readSettings(db);
  });

  ipcMain.handle("contests:refresh", () => refreshContestCache(db));
  ipcMain.handle("contests:listCached", () => listContestCache(db));
  ipcMain.handle("contests:listToday", () => listContestCache(db, localDayRange()));

  ipcMain.handle("vp:list", (_event, filters) => listVpContests(db, asRecord(filters)));
  ipcMain.handle("vp:recognizeLink", (_event, url: unknown) => recognizeContestLink(url));
  ipcMain.handle("vp:create", (_event, draft) => createVpContest(db, asRecord(draft) as CreateVpContestInput));
  ipcMain.handle("vp:update", (_event, id: unknown, patch) =>
    updateVpContest(db, asId(id), asRecord(patch) as UpdateVpContestInput)
  );
  ipcMain.handle("vp:delete", (_event, id: unknown) => ({ ok: deleteVpContest(db, asId(id)) }));

  ipcMain.handle("reviews:list", (_event, filters) => listVpReviews(db, asRecord(filters)));
  ipcMain.handle("reviews:create", (_event, draft) => createVpReview(db, asRecord(draft) as CreateVpReviewInput));
  ipcMain.handle("reviews:update", (_event, id: unknown, patch) =>
    updateVpReview(db, asId(id), asRecord(patch) as UpdateVpReviewInput)
  );
  ipcMain.handle("reviews:delete", (_event, id: unknown) => ({ ok: deleteVpReview(db, asId(id)) }));

  ipcMain.handle("images:list", (_event, filters) => listImageWallItems(db, asRecord(filters)));
  ipcMain.handle("images:import", (_event, items) => {
    if (Array.isArray(items) && items.every((item) => typeof item === "string")) {
      return importImageFiles(db, items);
    }

    const drafts = Array.isArray(items) ? items : [];
    return drafts.map((draft) => createImageWallItem(db, asRecord(draft) as CreateImageWallItemInput));
  });
  ipcMain.handle("images:dataUrl", (_event, id: unknown) => {
    const item = getImageWallItem(db, asId(id));
    return item ? { dataUrl: readImageDataUrl(item.storedPath) } : { dataUrl: "" };
  });
  ipcMain.handle("images:update", (_event, id: unknown, patch) =>
    updateImageWallItem(db, asId(id), asRecord(patch) as UpdateImageWallItemInput)
  );
  ipcMain.handle("images:delete", (_event, id: unknown) => {
    const image = getImageWallItem(db, asId(id));
    const ok = deleteImageWallItem(db, asId(id));

    if (ok && image) {
      deleteStoredImage(image.storedPath);
    }

    return { ok };
  });

  ipcMain.handle("timer:open", (_event, alwaysOnTop?: boolean) => {
    openTimerWindow(windows, alwaysOnTop ?? true);
    return { ok: true };
  });
  ipcMain.handle("timer:setAlwaysOnTop", (_event, enabled: boolean) => {
    setTimerAlwaysOnTop(windows, Boolean(enabled));
    return { ok: true };
  });
  ipcMain.handle("timer:notifyComplete", () => {
    notifyTimerComplete();
    return { ok: true };
  });

  ipcMain.handle("reminder:showToday", async () => {
    if (showTodayReminder) {
      await showTodayReminder();
    } else {
      windows.showReminderWindow();
    }

    return { ok: true };
  });

  ipcMain.handle("app:quit", () => {
    app.quit();
    return { ok: true };
  });
}

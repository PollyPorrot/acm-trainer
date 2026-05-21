import type { AppSettings } from "../../shared/types.js";
import { nowIso } from "../db.js";
import type { AppDatabase } from "../db.js";

const defaultSettings: AppSettings = {
  launchAtStartup: false,
  contestRemindersEnabled: true,
  imageRandomReminderEnabled: true,
  minimizeToTray: true,
  dataDirectory: ""
};

type SettingRow = {
  key: string;
  value_json: string;
};

export function getSetting<T>(db: AppDatabase, key: string, fallback: T): T {
  const row = db.prepare("select value_json from settings where key = ?").get(key) as SettingRow | undefined;

  if (!row) {
    return fallback;
  }

  return JSON.parse(row.value_json) as T;
}

export function setSetting<T>(db: AppDatabase, key: string, value: T): T {
  db.prepare(
    `
    insert into settings (key, value_json, updated_at_iso)
    values (?, ?, ?)
    on conflict(key) do update set
      value_json = excluded.value_json,
      updated_at_iso = excluded.updated_at_iso
  `
  ).run(key, JSON.stringify(value), nowIso());

  return value;
}

export function getAppSettings(db: AppDatabase): AppSettings {
  return getSetting(db, "app", defaultSettings);
}

export function updateAppSettings(db: AppDatabase, patch: Partial<AppSettings>): AppSettings {
  return setSetting(db, "app", { ...getAppSettings(db), ...patch });
}

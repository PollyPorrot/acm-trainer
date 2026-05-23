import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { initializeSchema } from "./schema.js";
import { resolveAppDataDirectory } from "./appDataPath.js";

const require = createRequire(import.meta.url);
const BetterSqlite3 = require("better-sqlite3");

export type AppDatabase = {
  close(): void;
  exec(sql: string): unknown;
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  };
  pragma<T = unknown>(source: string, options?: { simple?: boolean }): T;
  transaction<T extends (...args: never[]) => unknown>(fn: T): T;
};

export type CreateDatabaseOptions = {
  appDataPath?: string;
  initialize?: boolean;
  memory?: boolean;
  path?: string;
};

function ensureDirectoryForDatabase(databasePath: string): void {
  if (databasePath === ":memory:") {
    return;
  }

  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

export function resolveDatabasePath(options: CreateDatabaseOptions = {}): string {
  if (options.memory) {
    return ":memory:";
  }

  if (options.path) {
    return options.path;
  }

  if (options.appDataPath) {
    return path.join(
      resolveAppDataDirectory({ appDataPath: options.appDataPath }),
      "acm-trainer.sqlite"
    );
  }

  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return path.join(
      os.tmpdir(),
      "acm-trainer-tests",
      `acm-trainer-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`
    );
  }

  const appDataPath = resolveAppDataDirectory();

  return path.join(appDataPath, "acm-trainer.sqlite");
}

export function createDatabase(options: CreateDatabaseOptions = {}): AppDatabase {
  const databasePath = resolveDatabasePath(options);
  ensureDirectoryForDatabase(databasePath);

  const db = new BetterSqlite3(databasePath) as AppDatabase;
  db.pragma("foreign_keys = ON");

  if (options.initialize !== false) {
    initializeSchema(db);
  }

  return db;
}

export function parseIntegerId(id: string | number): number {
  const value = typeof id === "number" ? id : Number(id);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Invalid integer id: ${id}`);
  }

  return value;
}

export function normalizeTags(tags: readonly string[] = []): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags) {
    const trimmed = tag.trim();
    const key = trimmed.toLocaleLowerCase();

    if (trimmed && !seen.has(key)) {
      seen.add(key);
      normalized.push(trimmed);
    }
  }

  return normalized;
}

export function localMonthRangeFromKey(monthKey: string): { startIso: string; endIso: string } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isSafeInteger(year) || month < 1 || month > 12) {
    return null;
  }

  return {
    startIso: new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString(),
    endIso: new Date(year, month, 1, 0, 0, 0, 0).toISOString()
  };
}

export function nowIso(): string {
  return new Date().toISOString();
}

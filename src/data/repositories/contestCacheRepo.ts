import type { Platform } from "../../shared/types.js";
import type { AppDatabase } from "../db.js";

export type ContestCacheItem = {
  id: string;
  platform: Platform;
  providerContestId: string;
  title: string;
  url: string;
  startTimeIso: string;
  endTimeIso?: string;
  durationSeconds?: number;
  fetchedAtIso: string;
};

export type ContestCacheInput = Omit<ContestCacheItem, "id">;

type ContestCacheRow = {
  id: number;
  platform: Platform;
  provider_contest_id: string;
  title: string;
  url: string;
  start_time_iso: string;
  end_time_iso: string | null;
  duration_seconds: number | null;
  fetched_at_iso: string;
};

function mapContestCacheRow(row: ContestCacheRow): ContestCacheItem {
  return {
    id: String(row.id),
    platform: row.platform,
    providerContestId: row.provider_contest_id,
    title: row.title,
    url: row.url,
    startTimeIso: row.start_time_iso,
    endTimeIso: row.end_time_iso ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    fetchedAtIso: row.fetched_at_iso
  };
}

function saveContestCacheItems(db: AppDatabase, items: readonly ContestCacheInput[]): ContestCacheItem[] {
  const upsert = db.prepare(`
    insert into contest_cache (
      platform,
      provider_contest_id,
      title,
      url,
      start_time_iso,
      end_time_iso,
      duration_seconds,
      fetched_at_iso
    ) values (?, ?, ?, ?, ?, ?, ?, ?)
    on conflict(platform, provider_contest_id) do update set
      title = excluded.title,
      url = excluded.url,
      start_time_iso = excluded.start_time_iso,
      end_time_iso = excluded.end_time_iso,
      duration_seconds = excluded.duration_seconds,
      fetched_at_iso = excluded.fetched_at_iso
  `);

  const get = db.prepare(`
    select * from contest_cache where platform = ? and provider_contest_id = ?
  `);

  const saved: ContestCacheItem[] = [];

  for (const item of items) {
    upsert.run(
      item.platform,
      item.providerContestId,
      item.title,
      item.url,
      item.startTimeIso,
      item.endTimeIso ?? null,
      item.durationSeconds ?? null,
      item.fetchedAtIso
    );
    saved.push(mapContestCacheRow(get.get(item.platform, item.providerContestId) as ContestCacheRow));
  }

  return saved;
}

export function upsertContestCache(db: AppDatabase, items: readonly ContestCacheInput[]): ContestCacheItem[] {
  const transaction = db.transaction((entries: readonly ContestCacheInput[]) => saveContestCacheItems(db, entries));

  return transaction(items);
}

export function replaceContestCacheForPlatform(
  db: AppDatabase,
  platform: Platform,
  items: readonly ContestCacheInput[]
): ContestCacheItem[] {
  if (items.some((item) => item.platform !== platform)) {
    throw new Error(`Contest cache replacement received mixed platforms for ${platform}`);
  }

  const transaction = db.transaction((entries: readonly ContestCacheInput[]) => {
    db.prepare("delete from contest_cache where platform = ?").run(platform);
    return saveContestCacheItems(db, entries);
  });

  return transaction(items);
}

export function listContestCache(
  db: AppDatabase,
  filters: { platform?: Platform; fromIso?: string; toIso?: string } = {}
): ContestCacheItem[] {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.platform) {
    where.push("platform = ?");
    params.push(filters.platform);
  }

  if (filters.fromIso) {
    where.push("start_time_iso >= ?");
    params.push(filters.fromIso);
  }

  if (filters.toIso) {
    where.push("start_time_iso <= ?");
    params.push(filters.toIso);
  }

  const sql = `
    select * from contest_cache
    ${where.length ? `where ${where.join(" and ")}` : ""}
    order by start_time_iso asc, id asc
  `;

  return db.prepare(sql).all(...params).map((row) => mapContestCacheRow(row as ContestCacheRow));
}

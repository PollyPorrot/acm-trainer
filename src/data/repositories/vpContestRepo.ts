import type { Platform, VpContest, VpContestStatus } from "../../shared/types.js";
import { nowIso, parseIntegerId } from "../db.js";
import type { AppDatabase } from "../db.js";

export type CreateVpContestInput = {
  platform: Platform;
  title: string;
  url: string;
  scheduledAtIso: string;
  notes?: string;
  status: VpContestStatus;
  createdAtIso?: string;
  updatedAtIso?: string;
};

export type UpdateVpContestInput = Partial<
  Pick<VpContest, "platform" | "title" | "url" | "scheduledAtIso" | "notes" | "status">
> & {
  updatedAtIso?: string;
};

type VpContestRow = {
  id: number;
  platform: Platform;
  title: string;
  url: string;
  scheduled_at_iso: string;
  notes: string;
  status: VpContestStatus;
  created_at_iso: string;
  updated_at_iso: string;
};

function mapVpContestRow(row: VpContestRow): VpContest {
  return {
    id: String(row.id),
    platform: row.platform,
    title: row.title,
    url: row.url,
    scheduledAtIso: row.scheduled_at_iso,
    notes: row.notes,
    status: row.status,
    createdAtIso: row.created_at_iso,
    updatedAtIso: row.updated_at_iso
  };
}

export function createVpContest(db: AppDatabase, input: CreateVpContestInput): VpContest {
  const createdAtIso = input.createdAtIso ?? nowIso();
  const updatedAtIso = input.updatedAtIso ?? createdAtIso;
  const result = db
    .prepare(
      `
      insert into vp_contests (
        platform,
        title,
        url,
        scheduled_at_iso,
        notes,
        status,
        created_at_iso,
        updated_at_iso
      ) values (?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      input.platform,
      input.title,
      input.url,
      input.scheduledAtIso,
      input.notes ?? "",
      input.status,
      createdAtIso,
      updatedAtIso
    );

  const contest = getVpContest(db, String(result.lastInsertRowid));

  if (!contest) {
    throw new Error("Failed to create VP contest");
  }

  return contest;
}

export function getVpContest(db: AppDatabase, id: string | number): VpContest | null {
  const row = db
    .prepare("select * from vp_contests where id = ?")
    .get(parseIntegerId(id)) as VpContestRow | undefined;

  return row ? mapVpContestRow(row) : null;
}

export function listVpContests(
  db: AppDatabase,
  filters: { platform?: Platform; status?: VpContestStatus; monthKey?: string; keyword?: string } = {}
): VpContest[] {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.platform) {
    where.push("platform = ?");
    params.push(filters.platform);
  }

  if (filters.status) {
    where.push("status = ?");
    params.push(filters.status);
  }

  if (filters.monthKey) {
    where.push("scheduled_at_iso like ?");
    params.push(`${filters.monthKey}%`);
  }

  if (filters.keyword) {
    where.push("(title like ? or notes like ? or url like ?)");
    const keyword = `%${filters.keyword}%`;
    params.push(keyword, keyword, keyword);
  }

  const sql = `
    select * from vp_contests
    ${where.length ? `where ${where.join(" and ")}` : ""}
    order by scheduled_at_iso desc, id desc
  `;

  return db.prepare(sql).all(...params).map((row) => mapVpContestRow(row as VpContestRow));
}

export function updateVpContest(db: AppDatabase, id: string | number, input: UpdateVpContestInput): VpContest {
  const contestId = parseIntegerId(id);
  const current = getVpContest(db, contestId);

  if (!current) {
    throw new Error(`VP contest not found: ${id}`);
  }

  const updatedAtIso = input.updatedAtIso ?? nowIso();
  db.prepare(
    `
    update vp_contests set
      platform = ?,
      title = ?,
      url = ?,
      scheduled_at_iso = ?,
      notes = ?,
      status = ?,
      updated_at_iso = ?
    where id = ?
  `
  ).run(
    input.platform ?? current.platform,
    input.title ?? current.title,
    input.url ?? current.url,
    input.scheduledAtIso ?? current.scheduledAtIso,
    input.notes ?? current.notes,
    input.status ?? current.status,
    updatedAtIso,
    contestId
  );

  const updated = getVpContest(db, contestId);

  if (!updated) {
    throw new Error(`VP contest not found after update: ${id}`);
  }

  return updated;
}

export function deleteVpContest(db: AppDatabase, id: string | number): boolean {
  return db.prepare("delete from vp_contests where id = ?").run(parseIntegerId(id)).changes > 0;
}

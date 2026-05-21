import type { Platform, VpReview } from "../../shared/types.js";
import { localMonthRangeFromKey, normalizeTags, nowIso, parseIntegerId } from "../db.js";
import type { AppDatabase } from "../db.js";

export type CreateVpReviewInput = {
  vpContestId: string;
  title: string;
  body: string;
  resultTags?: string[];
  tags?: string[];
  createdAtIso?: string;
  updatedAtIso?: string;
};

export type UpdateVpReviewInput = Partial<Pick<VpReview, "vpContestId" | "title" | "body" | "resultTags" | "tags">> & {
  updatedAtIso?: string;
};

type VpReviewRow = {
  id: number;
  vp_contest_id: number;
  title: string;
  body: string;
  created_at_iso: string;
  updated_at_iso: string;
};

type TagRow = {
  tag_kind: "result" | "free";
  tag: string;
};

function insertTags(db: AppDatabase, reviewId: number, kind: "result" | "free", tags: readonly string[]): void {
  const statement = db.prepare(`
    insert into vp_review_tags (vp_review_id, tag_kind, tag, sort_order)
    values (?, ?, ?, ?)
  `);

  normalizeTags(tags).forEach((tag, index) => {
    statement.run(reviewId, kind, tag, index);
  });
}

function readReviewTags(db: AppDatabase, reviewId: number): Pick<VpReview, "resultTags" | "tags"> {
  const rows = db
    .prepare(
      `
      select tag_kind, tag
      from vp_review_tags
      where vp_review_id = ?
      order by tag_kind, sort_order, id
    `
    )
    .all(reviewId) as TagRow[];

  return {
    resultTags: rows.filter((row) => row.tag_kind === "result").map((row) => row.tag),
    tags: rows.filter((row) => row.tag_kind === "free").map((row) => row.tag)
  };
}

function mapVpReviewRow(db: AppDatabase, row: VpReviewRow): VpReview {
  return {
    id: String(row.id),
    vpContestId: String(row.vp_contest_id),
    title: row.title,
    body: row.body,
    ...readReviewTags(db, row.id),
    createdAtIso: row.created_at_iso,
    updatedAtIso: row.updated_at_iso
  };
}

export function createVpReview(db: AppDatabase, input: CreateVpReviewInput): VpReview {
  const createdAtIso = input.createdAtIso ?? nowIso();
  const updatedAtIso = input.updatedAtIso ?? createdAtIso;
  const create = db.transaction((review: CreateVpReviewInput) => {
    const result = db
      .prepare(
        `
        insert into vp_reviews (
          vp_contest_id,
          title,
          body,
          created_at_iso,
          updated_at_iso
        ) values (?, ?, ?, ?, ?)
      `
      )
      .run(parseIntegerId(review.vpContestId), review.title, review.body, createdAtIso, updatedAtIso);

    const reviewId = Number(result.lastInsertRowid);
    insertTags(db, reviewId, "result", review.resultTags ?? []);
    insertTags(db, reviewId, "free", review.tags ?? []);

    return getVpReview(db, reviewId);
  });

  const saved = create(input);

  if (!saved) {
    throw new Error("Failed to create VP review");
  }

  return saved;
}

export function getVpReview(db: AppDatabase, id: string | number): VpReview | null {
  const row = db
    .prepare("select * from vp_reviews where id = ?")
    .get(parseIntegerId(id)) as VpReviewRow | undefined;

  return row ? mapVpReviewRow(db, row) : null;
}

export function listVpReviews(
  db: AppDatabase,
  filters: { vpContestId?: string; platform?: Platform; monthKey?: string; keyword?: string } = {}
): VpReview[] {
  const joins: string[] = [];
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.platform || filters.monthKey) {
    joins.push("join vp_contests c on c.id = r.vp_contest_id");
  }

  if (filters.vpContestId) {
    where.push("r.vp_contest_id = ?");
    params.push(parseIntegerId(filters.vpContestId));
  }

  if (filters.platform) {
    where.push("c.platform = ?");
    params.push(filters.platform);
  }

  if (filters.monthKey) {
    const range = localMonthRangeFromKey(filters.monthKey);

    if (range) {
      where.push("c.scheduled_at_iso >= ? and c.scheduled_at_iso < ?");
      params.push(range.startIso, range.endIso);
    } else {
      where.push("1 = 0");
    }
  }

  if (filters.keyword) {
    where.push("(r.title like ? or r.body like ?)");
    const keyword = `%${filters.keyword}%`;
    params.push(keyword, keyword);
  }

  const sql = `
    select r.*
    from vp_reviews r
    ${joins.join(" ")}
    ${where.length ? `where ${where.join(" and ")}` : ""}
    order by r.updated_at_iso desc, r.id desc
  `;

  return db.prepare(sql).all(...params).map((row) => mapVpReviewRow(db, row as VpReviewRow));
}

export function searchVpReviewsByTag(db: AppDatabase, tag: string): VpReview[] {
  const rows = db
    .prepare(
      `
      select distinct r.*
      from vp_reviews r
      join vp_review_tags t on t.vp_review_id = r.id
      where t.tag = ? collate nocase
      order by r.updated_at_iso desc, r.id desc
    `
    )
    .all(tag.trim()) as VpReviewRow[];

  return rows.map((row) => mapVpReviewRow(db, row));
}

export function updateVpReview(db: AppDatabase, id: string | number, input: UpdateVpReviewInput): VpReview {
  const reviewId = parseIntegerId(id);
  const current = getVpReview(db, reviewId);

  if (!current) {
    throw new Error(`VP review not found: ${id}`);
  }

  const update = db.transaction(() => {
    db.prepare(
      `
      update vp_reviews set
        vp_contest_id = ?,
        title = ?,
        body = ?,
        updated_at_iso = ?
      where id = ?
    `
    ).run(
      input.vpContestId ? parseIntegerId(input.vpContestId) : parseIntegerId(current.vpContestId),
      input.title ?? current.title,
      input.body ?? current.body,
      input.updatedAtIso ?? nowIso(),
      reviewId
    );

    if (input.resultTags || input.tags) {
      db.prepare("delete from vp_review_tags where vp_review_id = ?").run(reviewId);
      insertTags(db, reviewId, "result", input.resultTags ?? current.resultTags);
      insertTags(db, reviewId, "free", input.tags ?? current.tags);
    }

    return getVpReview(db, reviewId);
  });

  const updated = update();

  if (!updated) {
    throw new Error(`VP review not found after update: ${id}`);
  }

  return updated;
}

export function deleteVpReview(db: AppDatabase, id: string | number): boolean {
  return db.prepare("delete from vp_reviews where id = ?").run(parseIntegerId(id)).changes > 0;
}

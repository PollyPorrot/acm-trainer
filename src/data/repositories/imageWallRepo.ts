import type { ImageWallItem } from "../../shared/types.js";
import { normalizeTags, nowIso, parseIntegerId } from "../db.js";
import type { AppDatabase } from "../db.js";

export type CreateImageWallItemInput = {
  title: string;
  originalFileName: string;
  storedPath: string;
  tags?: string[];
  allowRandomReminder?: boolean;
  importedAtIso?: string;
  updatedAtIso?: string;
};

export type UpdateImageWallItemInput = Partial<
  Pick<ImageWallItem, "title" | "originalFileName" | "storedPath" | "tags" | "allowRandomReminder">
> & {
  updatedAtIso?: string;
};

type ImageWallItemRow = {
  id: number;
  title: string;
  original_file_name: string;
  stored_path: string;
  allow_random_reminder: 0 | 1;
  imported_at_iso: string;
  updated_at_iso: string;
};

type ImageTagRow = {
  tag: string;
};

function insertTags(db: AppDatabase, itemId: number, tags: readonly string[]): void {
  const statement = db.prepare(`
    insert into image_wall_tags (image_wall_item_id, tag, sort_order)
    values (?, ?, ?)
  `);

  normalizeTags(tags).forEach((tag, index) => {
    statement.run(itemId, tag, index);
  });
}

function readTags(db: AppDatabase, itemId: number): string[] {
  return (
    db
      .prepare(
        `
        select tag
        from image_wall_tags
        where image_wall_item_id = ?
        order by sort_order, id
      `
      )
      .all(itemId) as ImageTagRow[]
  ).map((row) => row.tag);
}

function mapImageWallItemRow(db: AppDatabase, row: ImageWallItemRow): ImageWallItem {
  return {
    id: String(row.id),
    title: row.title,
    originalFileName: row.original_file_name,
    storedPath: row.stored_path,
    tags: readTags(db, row.id),
    allowRandomReminder: row.allow_random_reminder === 1,
    importedAtIso: row.imported_at_iso,
    updatedAtIso: row.updated_at_iso
  };
}

export function createImageWallItem(db: AppDatabase, input: CreateImageWallItemInput): ImageWallItem {
  const importedAtIso = input.importedAtIso ?? nowIso();
  const updatedAtIso = input.updatedAtIso ?? importedAtIso;
  const create = db.transaction((item: CreateImageWallItemInput) => {
    const result = db
      .prepare(
        `
        insert into image_wall_items (
          title,
          original_file_name,
          stored_path,
          allow_random_reminder,
          imported_at_iso,
          updated_at_iso
        ) values (?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        item.title,
        item.originalFileName,
        item.storedPath,
        item.allowRandomReminder === false ? 0 : 1,
        importedAtIso,
        updatedAtIso
      );

    const itemId = Number(result.lastInsertRowid);
    insertTags(db, itemId, item.tags ?? []);

    return getImageWallItem(db, itemId);
  });

  const saved = create(input);

  if (!saved) {
    throw new Error("Failed to create image wall item");
  }

  return saved;
}

export function getImageWallItem(db: AppDatabase, id: string | number): ImageWallItem | null {
  const row = db
    .prepare("select * from image_wall_items where id = ?")
    .get(parseIntegerId(id)) as ImageWallItemRow | undefined;

  return row ? mapImageWallItemRow(db, row) : null;
}

export function listImageWallItems(
  db: AppDatabase,
  filters: { tag?: string; allowRandomReminder?: boolean } = {}
): ImageWallItem[] {
  const joins: string[] = [];
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.tag) {
    joins.push("join image_wall_tags t on t.image_wall_item_id = i.id");
    where.push("t.tag = ? collate nocase");
    params.push(filters.tag.trim());
  }

  if (filters.allowRandomReminder !== undefined) {
    where.push("i.allow_random_reminder = ?");
    params.push(filters.allowRandomReminder ? 1 : 0);
  }

  const sql = `
    select distinct i.*
    from image_wall_items i
    ${joins.join(" ")}
    ${where.length ? `where ${where.join(" and ")}` : ""}
    order by i.imported_at_iso desc, i.id desc
  `;

  return db.prepare(sql).all(...params).map((row) => mapImageWallItemRow(db, row as ImageWallItemRow));
}

export function updateImageWallItem(
  db: AppDatabase,
  id: string | number,
  input: UpdateImageWallItemInput
): ImageWallItem {
  const itemId = parseIntegerId(id);
  const current = getImageWallItem(db, itemId);

  if (!current) {
    throw new Error(`Image wall item not found: ${id}`);
  }

  const update = db.transaction(() => {
    db.prepare(
      `
      update image_wall_items set
        title = ?,
        original_file_name = ?,
        stored_path = ?,
        allow_random_reminder = ?,
        updated_at_iso = ?
      where id = ?
    `
    ).run(
      input.title ?? current.title,
      input.originalFileName ?? current.originalFileName,
      input.storedPath ?? current.storedPath,
      (input.allowRandomReminder ?? current.allowRandomReminder) ? 1 : 0,
      input.updatedAtIso ?? nowIso(),
      itemId
    );

    if (input.tags) {
      db.prepare("delete from image_wall_tags where image_wall_item_id = ?").run(itemId);
      insertTags(db, itemId, input.tags);
    }

    return getImageWallItem(db, itemId);
  });

  const updated = update();

  if (!updated) {
    throw new Error(`Image wall item not found after update: ${id}`);
  }

  return updated;
}

export function deleteImageWallItem(db: AppDatabase, id: string | number): boolean {
  return db.prepare("delete from image_wall_items where id = ?").run(parseIntegerId(id)).changes > 0;
}

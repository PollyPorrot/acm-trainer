import type { DailyReminderState } from "../../shared/types.js";
import { parseIntegerId } from "../db.js";
import type { AppDatabase } from "../db.js";

type DailyReminderStateRow = {
  local_date_key: string;
  contest_reminder_shown_at_iso: string | null;
  image_reminder_shown_at_iso: string | null;
  selected_image_wall_item_id: number | null;
};

function mapDailyReminderStateRow(row: DailyReminderStateRow): DailyReminderState {
  return {
    localDateKey: row.local_date_key,
    contestReminderShownAtIso: row.contest_reminder_shown_at_iso ?? undefined,
    imageReminderShownAtIso: row.image_reminder_shown_at_iso ?? undefined,
    selectedImageWallItemId:
      row.selected_image_wall_item_id === null ? undefined : String(row.selected_image_wall_item_id)
  };
}

export function getDailyReminderState(db: AppDatabase, localDateKey: string): DailyReminderState | null {
  const row = db
    .prepare("select * from daily_reminder_state where local_date_key = ?")
    .get(localDateKey) as DailyReminderStateRow | undefined;

  return row ? mapDailyReminderStateRow(row) : null;
}

export function createDailyReminderState(db: AppDatabase, state: DailyReminderState): DailyReminderState {
  db.prepare(
    `
    insert into daily_reminder_state (
      local_date_key,
      contest_reminder_shown_at_iso,
      image_reminder_shown_at_iso,
      selected_image_wall_item_id
    ) values (?, ?, ?, ?)
    on conflict(local_date_key) do update set
      contest_reminder_shown_at_iso = excluded.contest_reminder_shown_at_iso,
      image_reminder_shown_at_iso = excluded.image_reminder_shown_at_iso,
      selected_image_wall_item_id = excluded.selected_image_wall_item_id
  `
  ).run(
    state.localDateKey,
    state.contestReminderShownAtIso ?? null,
    state.imageReminderShownAtIso ?? null,
    state.selectedImageWallItemId ? parseIntegerId(state.selectedImageWallItemId) : null
  );

  const saved = getDailyReminderState(db, state.localDateKey);

  if (!saved) {
    throw new Error(`Failed to save daily reminder state: ${state.localDateKey}`);
  }

  return saved;
}

export function shouldShowAutoReminder(db: AppDatabase, localDateKey: string): boolean {
  const state = getDailyReminderState(db, localDateKey);
  return !state?.contestReminderShownAtIso && !state?.imageReminderShownAtIso;
}

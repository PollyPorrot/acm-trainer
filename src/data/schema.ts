import type { AppDatabase } from "./db.js";

export function initializeSchema(db: AppDatabase): void {
  db.exec(`
    create table if not exists contest_cache (
      id integer primary key autoincrement,
      platform text not null,
      provider_contest_id text not null,
      title text not null,
      url text not null,
      start_time_iso text not null,
      end_time_iso text,
      duration_seconds integer,
      fetched_at_iso text not null,
      unique(platform, provider_contest_id)
    );

    create index if not exists idx_contest_cache_platform
      on contest_cache(platform);
    create index if not exists idx_contest_cache_start_time
      on contest_cache(start_time_iso);

    create table if not exists vp_contests (
      id integer primary key autoincrement,
      platform text not null,
      title text not null,
      url text not null,
      scheduled_at_iso text not null,
      notes text not null default '',
      status text not null,
      created_at_iso text not null,
      updated_at_iso text not null
    );

    create index if not exists idx_vp_contests_platform
      on vp_contests(platform);
    create index if not exists idx_vp_contests_scheduled_at
      on vp_contests(scheduled_at_iso);
    create index if not exists idx_vp_contests_status
      on vp_contests(status);

    create table if not exists vp_reviews (
      id integer primary key autoincrement,
      vp_contest_id integer not null references vp_contests(id) on delete cascade,
      title text not null,
      body text not null,
      created_at_iso text not null,
      updated_at_iso text not null
    );

    create index if not exists idx_vp_reviews_contest
      on vp_reviews(vp_contest_id);
    create index if not exists idx_vp_reviews_updated_at
      on vp_reviews(updated_at_iso);

    create table if not exists vp_review_tags (
      id integer primary key autoincrement,
      vp_review_id integer not null references vp_reviews(id) on delete cascade,
      tag_kind text not null,
      tag text not null collate nocase,
      sort_order integer not null default 0,
      unique(vp_review_id, tag_kind, tag)
    );

    create index if not exists idx_vp_review_tags_tag
      on vp_review_tags(tag);
    create index if not exists idx_vp_review_tags_review
      on vp_review_tags(vp_review_id);

    create table if not exists image_wall_items (
      id integer primary key autoincrement,
      title text not null,
      original_file_name text not null,
      stored_path text not null,
      allow_random_reminder integer not null default 1,
      imported_at_iso text not null,
      updated_at_iso text not null
    );

    create index if not exists idx_image_wall_items_imported_at
      on image_wall_items(imported_at_iso);
    create index if not exists idx_image_wall_items_random
      on image_wall_items(allow_random_reminder);

    create table if not exists image_wall_tags (
      id integer primary key autoincrement,
      image_wall_item_id integer not null references image_wall_items(id) on delete cascade,
      tag text not null collate nocase,
      sort_order integer not null default 0,
      unique(image_wall_item_id, tag)
    );

    create index if not exists idx_image_wall_tags_tag
      on image_wall_tags(tag);
    create index if not exists idx_image_wall_tags_item
      on image_wall_tags(image_wall_item_id);

    create table if not exists settings (
      key text primary key,
      value_json text not null,
      updated_at_iso text not null
    );

    create table if not exists daily_reminder_state (
      local_date_key text primary key,
      contest_reminder_shown_at_iso text,
      image_reminder_shown_at_iso text,
      selected_image_wall_item_id integer references image_wall_items(id) on delete set null
    );

    create index if not exists idx_daily_reminder_state_contest_shown
      on daily_reminder_state(contest_reminder_shown_at_iso);
  `);

  db.pragma("user_version = 1");
}

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createDatabase, type AppDatabase } from "../../src/data/db";
import { initializeSchema } from "../../src/data/schema";
import { monthKeyFromIso } from "../../src/shared/date";
import {
  listContestCache,
  replaceContestCacheForPlatform,
  upsertContestCache
} from "../../src/data/repositories/contestCacheRepo";
import {
  createDailyReminderState,
  getDailyReminderState,
  shouldShowAutoReminder
} from "../../src/data/repositories/dailyReminderRepo";
import {
  createImageWallItem,
  deleteImageWallItem,
  getImageWallItem,
  updateImageWallItem
} from "../../src/data/repositories/imageWallRepo";
import {
  createVpContest,
  deleteVpContest,
  getVpContest,
  listVpContests,
  updateVpContest
} from "../../src/data/repositories/vpContestRepo";
import {
  createVpReview,
  listVpReviews,
  searchVpReviewsByTag
} from "../../src/data/repositories/vpReviewRepo";

describe("sqlite repositories", () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = createDatabase({ memory: true });
  });

  afterEach(() => {
    db.close();
  });

  test("database initializes schema", () => {
    const tables = (db
      .prepare(
        "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name"
      )
      .all() as Array<{ name: string }>)
      .map((row) => row.name);

    expect(tables).toEqual([
      "contest_cache",
      "daily_reminder_state",
      "image_wall_items",
      "image_wall_tags",
      "settings",
      "vp_contests",
      "vp_review_tags",
      "vp_reviews"
    ]);

    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
  });

  test("schema initialization is idempotent", () => {
    expect(() => initializeSchema(db)).not.toThrow();
  });

  test("required tables use integer id primary keys", () => {
    const requiredTables = [
      "contest_cache",
      "vp_contests",
      "vp_reviews",
      "vp_review_tags",
      "image_wall_items",
      "image_wall_tags",
      "settings",
      "daily_reminder_state"
    ];

    for (const table of requiredTables) {
      const columns = db.prepare(`pragma table_info(${table})`).all() as Array<{
        name: string;
        type: string;
        pk: number;
      }>;
      const idColumn = columns.find((column) => column.name === "id");

      expect(idColumn, `${table} has an id column`).toBeDefined();
      expect(idColumn?.type.toLowerCase(), `${table}.id is integer`).toBe("integer");
      expect(idColumn?.pk, `${table}.id is primary key`).toBe(1);
    }
  });

  test("VP contest CRUD", () => {
    const created = createVpContest(db, {
      platform: "codeforces",
      title: "Codeforces Round 999",
      url: "https://codeforces.com/contest/999",
      scheduledAtIso: "2026-05-22T12:00:00.000Z",
      notes: "Practice implementation",
      status: "planned"
    });

    expect(created.id).toMatch(/^\d+$/);
    expect(getVpContest(db, created.id)).toMatchObject({
      ...created,
      title: "Codeforces Round 999"
    });

    const updated = updateVpContest(db, created.id, {
      notes: "Upsolve carefully",
      status: "completed"
    });

    expect(updated).toMatchObject({
      id: created.id,
      notes: "Upsolve carefully",
      status: "completed"
    });

    deleteVpContest(db, created.id);

    expect(getVpContest(db, created.id)).toBeNull();
  });

  test("one VP contest can have multiple reviews", () => {
    const contest = createVpContest(db, {
      platform: "atcoder",
      title: "ABC 400",
      url: "https://atcoder.jp/contests/abc400",
      scheduledAtIso: "2026-06-01T10:00:00.000Z",
      notes: "",
      status: "completed"
    });

    const first = createVpReview(db, {
      vpContestId: contest.id,
      title: "First pass",
      body: "Solved A-D.",
      resultTags: ["accepted"],
      tags: ["dp", "implementation"]
    });
    const second = createVpReview(db, {
      vpContestId: contest.id,
      title: "Second pass",
      body: "Revisited E.",
      resultTags: ["upsolved"],
      tags: ["graphs"]
    });

    expect(listVpReviews(db, { vpContestId: contest.id }).map((review) => review.id)).toEqual([
      second.id,
      first.id
    ]);
  });

  test("review tags can be searched", () => {
    const contest = createVpContest(db, {
      platform: "nowcoder",
      title: "Nowcoder Weekly",
      url: "https://ac.nowcoder.com/acm/contest/123",
      scheduledAtIso: "2026-06-02T10:00:00.000Z",
      notes: "",
      status: "completed"
    });

    const matching = createVpReview(db, {
      vpContestId: contest.id,
      title: "DP review",
      body: "State compression notes.",
      resultTags: ["upsolved"],
      tags: ["dp", "bitmask"]
    });
    createVpReview(db, {
      vpContestId: contest.id,
      title: "Math review",
      body: "Number theory notes.",
      resultTags: ["accepted"],
      tags: ["math"]
    });

    expect(searchVpReviewsByTag(db, "dp").map((review) => review.id)).toEqual([matching.id]);
    expect(searchVpReviewsByTag(db, "DP").map((review) => review.id)).toEqual([matching.id]);
    expect(listVpReviews(db, { tag: "bitmask" }).map((review) => review.id)).toEqual([matching.id]);
  });

  test("VP contest and review month filters use the local calendar month", () => {
    const localFirstDay = new Date(2026, 4, 1, 0, 30);
    const contest = createVpContest(db, {
      platform: "qoj",
      title: "Local month boundary VP",
      url: "https://qoj.ac/contest/1",
      scheduledAtIso: localFirstDay.toISOString(),
      notes: "",
      status: "completed"
    });
    const review = createVpReview(db, {
      vpContestId: contest.id,
      title: "Boundary review",
      body: "This VP belongs to the local May calendar.",
      resultTags: ["silver"],
      tags: ["boundary"]
    });
    const localMonthKey = monthKeyFromIso(contest.scheduledAtIso);

    expect(listVpContests(db, { monthKey: localMonthKey }).map((item) => item.id)).toContain(contest.id);
    expect(listVpReviews(db, { monthKey: localMonthKey }).map((item) => item.id)).toContain(review.id);
  });

  test("image wall item CRUD", () => {
    const created = createImageWallItem(db, {
      title: "Whiteboard snapshot",
      originalFileName: "board.png",
      storedPath: "media/images/board.png",
      tags: ["idea", "dp"],
      allowRandomReminder: true
    });

    expect(getImageWallItem(db, created.id)).toMatchObject({
      title: "Whiteboard snapshot",
      tags: ["idea", "dp"],
      allowRandomReminder: true
    });

    const updated = updateImageWallItem(db, created.id, {
      title: "Updated snapshot",
      tags: ["graphs"],
      allowRandomReminder: false
    });

    expect(updated).toMatchObject({
      id: created.id,
      title: "Updated snapshot",
      tags: ["graphs"],
      allowRandomReminder: false
    });

    deleteImageWallItem(db, created.id);

    expect(getImageWallItem(db, created.id)).toBeNull();
  });

  test("daily reminder state prevents repeat auto reminders", () => {
    expect(shouldShowAutoReminder(db, "2026-05-22")).toBe(true);

    createDailyReminderState(db, {
      localDateKey: "2026-05-22",
      contestReminderShownAtIso: "2026-05-22T00:30:00.000Z",
      imageReminderShownAtIso: "2026-05-22T00:30:00.000Z",
      selectedImageWallItemId: undefined
    });

    expect(shouldShowAutoReminder(db, "2026-05-22")).toBe(false);
    expect(shouldShowAutoReminder(db, "2026-05-23")).toBe(true);
    expect(getDailyReminderState(db, "2026-05-22")).toMatchObject({
      localDateKey: "2026-05-22",
      contestReminderShownAtIso: "2026-05-22T00:30:00.000Z"
    });
  });

  test("contest cache upsert replaces provider data", () => {
    upsertContestCache(db, [
      {
        platform: "codeforces",
        providerContestId: "1000",
        title: "Old round",
        url: "https://codeforces.com/contest/1000",
        startTimeIso: "2026-05-22T12:00:00.000Z",
        endTimeIso: undefined,
        durationSeconds: 7200,
        fetchedAtIso: "2026-05-21T00:00:00.000Z"
      }
    ]);

    upsertContestCache(db, [
      {
        platform: "codeforces",
        providerContestId: "1000",
        title: "Renamed round",
        url: "https://codeforces.com/contest/1000",
        startTimeIso: "2026-05-22T13:00:00.000Z",
        endTimeIso: "2026-05-22T15:00:00.000Z",
        durationSeconds: 7200,
        fetchedAtIso: "2026-05-22T00:00:00.000Z"
      }
    ]);

    expect(listContestCache(db, { platform: "codeforces" })).toMatchObject([
      {
        platform: "codeforces",
        providerContestId: "1000",
        title: "Renamed round",
        startTimeIso: "2026-05-22T13:00:00.000Z",
        fetchedAtIso: "2026-05-22T00:00:00.000Z"
      }
    ]);
  });

  test("contest cache platform replacement removes stale provider rows only for that platform", () => {
    upsertContestCache(db, [
      {
        platform: "codeforces",
        providerContestId: "1000",
        title: "Stale Codeforces round",
        url: "https://codeforces.com/contest/1000",
        startTimeIso: "2026-05-22T12:00:00.000Z",
        endTimeIso: undefined,
        durationSeconds: 7200,
        fetchedAtIso: "2026-05-21T00:00:00.000Z"
      },
      {
        platform: "atcoder",
        providerContestId: "abc400",
        title: "AtCoder remains cached",
        url: "https://atcoder.jp/contests/abc400",
        startTimeIso: "2026-05-23T12:00:00.000Z",
        endTimeIso: undefined,
        durationSeconds: 6000,
        fetchedAtIso: "2026-05-21T00:00:00.000Z"
      }
    ]);

    replaceContestCacheForPlatform(db, "codeforces", [
      {
        platform: "codeforces",
        providerContestId: "1001",
        title: "Fresh Codeforces round",
        url: "https://codeforces.com/contest/1001",
        startTimeIso: "2026-05-24T12:00:00.000Z",
        endTimeIso: undefined,
        durationSeconds: 7200,
        fetchedAtIso: "2026-05-22T00:00:00.000Z"
      }
    ]);

    expect(listContestCache(db, { platform: "codeforces" }).map((item) => item.providerContestId)).toEqual([
      "1001"
    ]);
    expect(listContestCache(db, { platform: "atcoder" }).map((item) => item.providerContestId)).toEqual([
      "abc400"
    ]);
  });
});

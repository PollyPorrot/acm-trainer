import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createDatabase, type AppDatabase } from "../../src/data/db";
import { upsertContestCache } from "../../src/data/repositories/contestCacheRepo";
import { getDailyReminderState } from "../../src/data/repositories/dailyReminderRepo";
import { createImageWallItem } from "../../src/data/repositories/imageWallRepo";
import { updateAppSettings } from "../../src/data/repositories/settingsRepo";
import { runDailyReminder } from "../../src/main/reminderScheduler";

describe("daily reminder scheduler", () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = createDatabase({ memory: true });
  });

  afterEach(() => {
    db.close();
  });

  test("auto reminder refreshes, opens once, notifies, and records today's local state", async () => {
    const openedReminder = vi.fn();
    const notify = vi.fn();
    const refreshContests = vi.fn(async () => undefined);
    const now = new Date(2026, 4, 22, 8, 15);

    upsertContestCache(db, [
      {
        platform: "codeforces",
        providerContestId: "1000",
        title: "Codeforces Round 1000",
        url: "https://codeforces.com/contest/1000",
        startTimeIso: new Date(2026, 4, 22, 19, 30).toISOString(),
        durationSeconds: 7200,
        fetchedAtIso: now.toISOString()
      },
      {
        platform: "atcoder",
        providerContestId: "abc999",
        title: "Tomorrow ABC",
        url: "https://atcoder.jp/contests/abc999",
        startTimeIso: new Date(2026, 4, 23, 20, 0).toISOString(),
        durationSeconds: 6000,
        fetchedAtIso: now.toISOString()
      }
    ]);
    const image = createImageWallItem(db, {
      title: "Penalty board",
      originalFileName: "penalty.png",
      storedPath: "media/images/penalty.png",
      tags: ["motivation"],
      allowRandomReminder: true
    });

    const result = await runDailyReminder(
      {
        db,
        refreshContests,
        notify,
        windows: { showReminderWindow: openedReminder }
      },
      { now }
    );

    expect(refreshContests).toHaveBeenCalledTimes(1);
    expect(openedReminder).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(result.contests.map((contest) => contest.title)).toEqual(["Codeforces Round 1000"]);
    expect(result.image?.id).toBe(image.id);
    expect(result.localDateKey).toBe("2026-05-22");
    expect(getDailyReminderState(db, "2026-05-22")).toMatchObject({
      localDateKey: "2026-05-22",
      selectedImageWallItemId: image.id
    });

    openedReminder.mockClear();
    notify.mockClear();

    const secondResult = await runDailyReminder(
      {
        db,
        refreshContests,
        notify,
        windows: { showReminderWindow: openedReminder }
      },
      { now: new Date(2026, 4, 22, 12, 0) }
    );

    expect(secondResult.skippedReason).toBe("already-shown");
    expect(openedReminder).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  test("manual reminder ignores the once-per-day auto gate without updating state", async () => {
    const openedReminder = vi.fn();
    const notify = vi.fn();
    const now = new Date(2026, 4, 22, 8, 15);

    updateAppSettings(db, { imageRandomReminderEnabled: false });
    await runDailyReminder(
      {
        db,
        notify,
        windows: { showReminderWindow: vi.fn() }
      },
      { now }
    );

    const beforeManual = getDailyReminderState(db, "2026-05-22");

    const manualResult = await runDailyReminder(
      {
        db,
        notify,
        windows: { showReminderWindow: openedReminder }
      },
      { manual: true, now: new Date(2026, 4, 22, 22, 30) }
    );

    expect(manualResult.skippedReason).toBeUndefined();
    expect(openedReminder).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled();
    expect(getDailyReminderState(db, "2026-05-22")).toEqual(beforeManual);
  });

  test("auto reminder keeps the day eligible when contest refresh fails", async () => {
    const openedReminder = vi.fn();
    const notify = vi.fn();
    const now = new Date(2026, 4, 22, 8, 15);

    updateAppSettings(db, { imageRandomReminderEnabled: false });

    await runDailyReminder(
      {
        db,
        notify,
        refreshContests: vi.fn(async () => ({
          contests: [],
          failedProviders: ["codeforces"],
          refreshedAtIso: now.toISOString()
        })),
        windows: { showReminderWindow: openedReminder }
      },
      { now }
    );

    expect(openedReminder).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    expect(getDailyReminderState(db, "2026-05-22")).toBeNull();
  });
});

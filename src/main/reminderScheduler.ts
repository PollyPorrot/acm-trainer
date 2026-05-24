import { Notification, powerMonitor } from "electron";
import type { AppDatabase } from "../data/db.js";
import { listContestCache, type ContestCacheItem } from "../data/repositories/contestCacheRepo.js";
import {
  createDailyReminderState,
  shouldShowAutoReminder
} from "../data/repositories/dailyReminderRepo.js";
import { listImageWallItems } from "../data/repositories/imageWallRepo.js";
import { getAppSettings } from "../data/repositories/settingsRepo.js";
import type { ContestReminder, ImageWallItem } from "../shared/types.js";

export type ReminderWindowBridge = {
  showReminderWindow: () => unknown;
};

export type DailyReminderPayload = {
  localDateKey: string;
  contests: ContestReminder[];
  image?: ImageWallItem;
  openedWindow: boolean;
  notificationSent: boolean;
  skippedReason?: "already-shown";
};

export type DailyReminderContext = {
  db: AppDatabase;
  windows: ReminderWindowBridge;
  refreshContests?: () => Promise<unknown>;
  notify?: (payload: DailyReminderPayload) => void;
  onError?: (error: unknown) => void;
};

export type RunDailyReminderOptions = {
  manual?: boolean;
  now?: Date;
};

export type SchedulerOptions = {
  startupDelayMs?: number;
  unlockDelayMs?: number;
};

function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function localUpcomingDayRange(date: Date): { fromIso: string; toIso: string } {
  const to = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);

  return {
    fromIso: date.toISOString(),
    toIso: to.toISOString()
  };
}

function dateSeed(value: string): number {
  return [...value].reduce((total, char) => total + char.charCodeAt(0), 0);
}

function pickDailyImage(images: ImageWallItem[], localDateKey: string): ImageWallItem | undefined {
  if (!images.length) {
    return undefined;
  }

  return images[dateSeed(localDateKey) % images.length];
}

function toContestReminder(item: ContestCacheItem): ContestReminder {
  return {
    id: item.id,
    platform: item.platform,
    title: item.title,
    url: item.url,
    startTimeIso: item.startTimeIso,
    endTimeIso: item.endTimeIso,
    durationSeconds: item.durationSeconds,
    source: "auto",
    fetchedAtIso: item.fetchedAtIso
  };
}

function refreshResultHasFailures(value: unknown): boolean {
  if (!value || typeof value !== "object" || !("failedProviders" in value)) {
    return false;
  }

  const failedProviders = (value as { failedProviders?: unknown }).failedProviders;
  return Array.isArray(failedProviders) && failedProviders.length > 0;
}

function sendDesktopNotification(payload: DailyReminderPayload): void {
  const notificationApi = Notification as typeof Notification | undefined;

  if (!notificationApi?.isSupported()) {
    return;
  }

  const contestText = payload.contests.length
    ? `今日有 ${payload.contests.length} 场比赛`
    : "今日暂无自动比赛提醒";
  const imageText = payload.image ? `提醒图片：${payload.image.title}` : "";
  const body = [contestText, imageText].filter(Boolean).join("\n");

  new notificationApi({
    title: "ACM Trainer 今日提醒",
    body
  }).show();
}

export async function runDailyReminder(
  context: DailyReminderContext,
  options: RunDailyReminderOptions = {}
): Promise<DailyReminderPayload> {
  const now = options.now ?? new Date();
  const localDateKey = formatLocalDateKey(now);
  const manual = options.manual === true;

  if (!manual && !shouldShowAutoReminder(context.db, localDateKey)) {
    return {
      localDateKey,
      contests: [],
      openedWindow: false,
      notificationSent: false,
      skippedReason: "already-shown"
    };
  }

  const settings = getAppSettings(context.db);
  let refreshHadFailures = false;

  if (settings.contestRemindersEnabled && context.refreshContests) {
    try {
      refreshHadFailures = refreshResultHasFailures(await context.refreshContests());
    } catch (error) {
      refreshHadFailures = true;
      context.onError?.(error);
    }
  }

  const contests = settings.contestRemindersEnabled
    ? listContestCache(context.db, localUpcomingDayRange(now)).map(toContestReminder)
    : [];
  const image = settings.imageRandomReminderEnabled
    ? pickDailyImage(listImageWallItems(context.db, { allowRandomReminder: true }), localDateKey)
    : undefined;
  const hasReminderContent = contests.length > 0 || Boolean(image);

  const payload: DailyReminderPayload = {
    localDateKey,
    contests,
    image,
    openedWindow: false,
    notificationSent: false
  };

  if (manual || hasReminderContent) {
    context.windows.showReminderWindow();
    payload.openedWindow = true;
  }

  if (!manual && hasReminderContent) {
    const notify = context.notify ?? sendDesktopNotification;
    notify(payload);
    payload.notificationSent = true;
  }

  if (!manual && !(settings.contestRemindersEnabled && refreshHadFailures)) {
    const shownAtIso = now.toISOString();

    createDailyReminderState(context.db, {
      localDateKey,
      contestReminderShownAtIso:
        settings.contestRemindersEnabled || !settings.imageRandomReminderEnabled ? shownAtIso : undefined,
      imageReminderShownAtIso: settings.imageRandomReminderEnabled ? shownAtIso : undefined,
      selectedImageWallItemId: image?.id
    });
  }

  return payload;
}

export function registerReminderScheduler(
  context: DailyReminderContext,
  options: SchedulerOptions = {}
): () => void {
  if (process.env.ACM_TRAINER_DISABLE_AUTO_REMINDERS === "1") {
    return () => undefined;
  }

  const startupDelayMs = options.startupDelayMs ?? 3000;
  const unlockDelayMs = options.unlockDelayMs ?? 5000;
  const monitor = powerMonitor as typeof powerMonitor | undefined;
  let unlockTimer: NodeJS.Timeout | null = null;

  const runSafely = () => {
    void runDailyReminder(context).catch((error) => {
      context.onError?.(error);
    });
  };

  const startupTimer = setTimeout(runSafely, startupDelayMs);
  const handleUnlock = () => {
    if (unlockTimer) {
      clearTimeout(unlockTimer);
    }

    unlockTimer = setTimeout(runSafely, unlockDelayMs);
  };

  monitor?.on("unlock-screen", handleUnlock);

  return () => {
    clearTimeout(startupTimer);

    if (unlockTimer) {
      clearTimeout(unlockTimer);
    }

    monitor?.off("unlock-screen", handleUnlock);
  };
}

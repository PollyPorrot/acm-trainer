export type Platform =
  | "codeforces"
  | "atcoder"
  | "nowcoder"
  | "qoj"
  | "luogu"
  | "jisuanke"
  | "vjudge"
  | "hdu"
  | "unknown";

export type ContestReminder = {
  id: string;
  platform: Platform;
  title: string;
  url: string;
  startTimeIso: string;
  endTimeIso?: string;
  durationSeconds?: number;
  source: "auto" | "manual";
  fetchedAtIso: string;
};

export type VpContestStatus = "planned" | "completed" | "skipped";

export type VpContest = {
  id: string;
  platform: Platform;
  title: string;
  url: string;
  scheduledAtIso: string;
  notes: string;
  status: VpContestStatus;
  createdAtIso: string;
  updatedAtIso: string;
};

export type VpReview = {
  id: string;
  vpContestId: string;
  title: string;
  body: string;
  resultTags: string[];
  tags: string[];
  createdAtIso: string;
  updatedAtIso: string;
};

export type ImageWallItem = {
  id: string;
  title: string;
  originalFileName: string;
  storedPath: string;
  tags: string[];
  allowRandomReminder: boolean;
  importedAtIso: string;
  updatedAtIso: string;
};

export type AppSettings = {
  launchAtStartup: boolean;
  contestRemindersEnabled: boolean;
  imageRandomReminderEnabled: boolean;
  minimizeToTray: boolean;
  dataDirectory: string;
};

export type DailyReminderState = {
  localDateKey: string;
  contestReminderShownAtIso?: string;
  imageReminderShownAtIso?: string;
  selectedImageWallItemId?: string;
};

export type TimerMode = "stopwatch" | "countdown";

export type TimerSnapshot = {
  mode: TimerMode;
  isRunning: boolean;
  isAlwaysOnTop: boolean;
  startedAtIso?: string;
  pausedAtIso?: string;
  elapsedSeconds: number;
  countdownTotalSeconds?: number;
  completedAtIso?: string;
};

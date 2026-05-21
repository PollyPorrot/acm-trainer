import { z } from "zod";
import type {
  AppSettings,
  ContestReminder,
  ImageWallItem,
  Platform,
  VpContest,
  VpContestStatus,
  VpReview
} from "../shared/types";

type UnknownRecord = Record<string, unknown>;
type DeleteResult = { ok: boolean };
type RefreshResult = {
  contests: ContestReminder[];
  failedProviders: Platform[];
  refreshedAtIso: string;
};

type AcmTrainerBridge = {
  getSettings: () => Promise<unknown>;
  updateSettings: (patch: UnknownRecord) => Promise<unknown>;
  setAutostartEnabled: (enabled: boolean) => Promise<unknown>;
  refreshContests: () => Promise<unknown>;
  listTodayContests: () => Promise<unknown>;
  listVpContests: (filters?: UnknownRecord) => Promise<unknown>;
  recognizeVpContestLink: (url: string) => Promise<unknown>;
  createVpContest: (draft: UnknownRecord) => Promise<unknown>;
  updateVpContest: (id: string, patch: UnknownRecord) => Promise<unknown>;
  deleteVpContest: (id: string) => Promise<unknown>;
  listReviews: (filters?: UnknownRecord) => Promise<unknown>;
  createReview: (draft: UnknownRecord) => Promise<unknown>;
  updateReview: (id: string, patch: UnknownRecord) => Promise<unknown>;
  deleteReview: (id: string) => Promise<unknown>;
  listImages: (filters?: UnknownRecord) => Promise<unknown>;
  importImages: (drafts?: UnknownRecord[]) => Promise<unknown>;
  updateImage: (id: string, patch: UnknownRecord) => Promise<unknown>;
  deleteImage: (id: string) => Promise<unknown>;
  openTimer: (alwaysOnTop?: boolean) => Promise<unknown>;
  setTimerAlwaysOnTop: (enabled: boolean) => Promise<unknown>;
  showTodayReminder: () => Promise<unknown>;
};

const platformSchema = z.enum([
  "codeforces",
  "atcoder",
  "nowcoder",
  "qoj",
  "luogu",
  "jisuanke",
  "vjudge",
  "hdu",
  "unknown"
]);
const vpStatusSchema = z.enum(["planned", "completed", "skipped"]);
const idSchema = z.string().min(1);
const unknownRecordSchema = z.record(z.string(), z.unknown());

const settingsPatchSchema = z.object({
  launchAtStartup: z.boolean().optional(),
  contestRemindersEnabled: z.boolean().optional(),
  imageRandomReminderEnabled: z.boolean().optional(),
  minimizeToTray: z.boolean().optional(),
  dataDirectory: z.string().optional()
});

const vpFiltersSchema = z.object({
  platform: platformSchema.optional(),
  status: vpStatusSchema.optional(),
  monthKey: z.string().optional(),
  keyword: z.string().optional()
});

const vpContestDraftSchema = z.object({
  platform: platformSchema,
  title: z.string().min(1),
  url: z.string().min(1),
  scheduledAtIso: z.string().min(1),
  notes: z.string().optional(),
  status: vpStatusSchema
});

const vpContestPatchSchema = vpContestDraftSchema.partial();

const reviewFiltersSchema = z.object({
  vpContestId: z.string().optional(),
  platform: platformSchema.optional(),
  monthKey: z.string().optional(),
  keyword: z.string().optional()
});

const reviewDraftSchema = z.object({
  vpContestId: z.string().min(1),
  title: z.string().min(1),
  body: z.string(),
  resultTags: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional()
});

const reviewPatchSchema = reviewDraftSchema.partial();

const imageFiltersSchema = z.object({
  tag: z.string().optional(),
  allowRandomReminder: z.boolean().optional()
});

const imageDraftSchema = z.object({
  title: z.string().min(1),
  originalFileName: z.string().min(1),
  storedPath: z.string().min(1),
  tags: z.array(z.string()).optional(),
  allowRandomReminder: z.boolean().optional()
});

const imagePatchSchema = imageDraftSchema.partial();

function bridge(): AcmTrainerBridge {
  if (!window.acmTrainer) {
    throw new Error("ACM Trainer bridge is unavailable");
  }

  return window.acmTrainer;
}

function record<T extends UnknownRecord>(value: T): UnknownRecord {
  return unknownRecordSchema.parse(value);
}

export const api = {
  getSettings: () => bridge().getSettings() as Promise<AppSettings>,
  updateSettings: (patch: Partial<AppSettings>) =>
    bridge().updateSettings(record(settingsPatchSchema.parse(patch))) as Promise<AppSettings>,
  setAutostartEnabled: (enabled: boolean) => bridge().setAutostartEnabled(enabled) as Promise<AppSettings>,
  refreshContests: () => bridge().refreshContests() as Promise<RefreshResult>,
  listTodayContests: () => bridge().listTodayContests() as Promise<ContestReminder[]>,
  recognizeVpContestLink: (url: string) =>
    bridge().recognizeVpContestLink(z.string().trim().min(1).parse(url)) as Promise<{
      url: string;
      platform: Platform;
      title: string;
    }>,
  listVpContests: (filters: { platform?: Platform; status?: VpContestStatus; monthKey?: string; keyword?: string } = {}) =>
    bridge().listVpContests(record(vpFiltersSchema.parse(filters))) as Promise<VpContest[]>,
  createVpContest: (draft: {
    platform: Platform;
    title: string;
    url: string;
    scheduledAtIso: string;
    notes?: string;
    status: VpContestStatus;
  }) => bridge().createVpContest(record(vpContestDraftSchema.parse(draft))) as Promise<VpContest>,
  updateVpContest: (id: string, patch: Partial<Omit<VpContest, "id" | "createdAtIso" | "updatedAtIso">>) =>
    bridge().updateVpContest(idSchema.parse(id), record(vpContestPatchSchema.parse(patch))) as Promise<VpContest>,
  deleteVpContest: (id: string) => bridge().deleteVpContest(idSchema.parse(id)) as Promise<DeleteResult>,
  listReviews: (filters: { vpContestId?: string; platform?: Platform; monthKey?: string; keyword?: string } = {}) =>
    bridge().listReviews(record(reviewFiltersSchema.parse(filters))) as Promise<VpReview[]>,
  createReview: (draft: {
    vpContestId: string;
    title: string;
    body: string;
    resultTags?: string[];
    tags?: string[];
  }) => bridge().createReview(record(reviewDraftSchema.parse(draft))) as Promise<VpReview>,
  updateReview: (id: string, patch: Partial<Omit<VpReview, "id" | "createdAtIso" | "updatedAtIso">>) =>
    bridge().updateReview(idSchema.parse(id), record(reviewPatchSchema.parse(patch))) as Promise<VpReview>,
  deleteReview: (id: string) => bridge().deleteReview(idSchema.parse(id)) as Promise<DeleteResult>,
  listImages: (filters: { tag?: string; allowRandomReminder?: boolean } = {}) =>
    bridge().listImages(record(imageFiltersSchema.parse(filters))) as Promise<ImageWallItem[]>,
  importImages: (drafts: Array<{
    title: string;
    originalFileName: string;
    storedPath: string;
    tags?: string[];
    allowRandomReminder?: boolean;
  }> = []) => bridge().importImages(drafts.map((draft) => record(imageDraftSchema.parse(draft)))) as Promise<ImageWallItem[]>,
  updateImage: (id: string, patch: Partial<Omit<ImageWallItem, "id" | "importedAtIso" | "updatedAtIso">>) =>
    bridge().updateImage(idSchema.parse(id), record(imagePatchSchema.parse(patch))) as Promise<ImageWallItem>,
  deleteImage: (id: string) => bridge().deleteImage(idSchema.parse(id)) as Promise<DeleteResult>,
  openTimer: (alwaysOnTop = true) => bridge().openTimer(alwaysOnTop) as Promise<DeleteResult>,
  setTimerAlwaysOnTop: (enabled: boolean) => bridge().setTimerAlwaysOnTop(enabled) as Promise<DeleteResult>,
  showTodayReminder: () => bridge().showTodayReminder() as Promise<DeleteResult>
};

declare global {
  interface Window {
    acmTrainer?: AcmTrainerBridge;
  }
}

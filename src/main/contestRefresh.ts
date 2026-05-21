import type { AppDatabase } from "../data/db.js";
import {
  replaceContestCacheForPlatform,
  type ContestCacheInput
} from "../data/repositories/contestCacheRepo.js";
import { fetchAtCoderContests } from "../providers/atcoder.js";
import { fetchCodeforcesContests } from "../providers/codeforces.js";
import { fetchNowcoderContests } from "../providers/nowcoder.js";
import type { ContestReminder, Platform } from "../shared/types.js";

export type ContestProvider = {
  platform: Platform;
  fetchContests: () => Promise<ContestReminder[]>;
};

export type ContestRefreshResult = {
  contests: ContestReminder[];
  failedProviders: Platform[];
  refreshedAtIso: string;
};

export type RefreshContestCacheOptions = {
  providers?: readonly ContestProvider[];
};

const defaultProviders: readonly ContestProvider[] = [
  {
    platform: "codeforces",
    fetchContests: () => fetchCodeforcesContests()
  },
  {
    platform: "atcoder",
    fetchContests: () => fetchAtCoderContests()
  },
  {
    platform: "nowcoder",
    fetchContests: () => fetchNowcoderContests()
  }
];

function toCacheInput(contest: ContestReminder, refreshedAtIso: string): ContestCacheInput {
  return {
    platform: contest.platform,
    providerContestId: contest.id,
    title: contest.title,
    url: contest.url,
    startTimeIso: contest.startTimeIso,
    endTimeIso: contest.endTimeIso,
    durationSeconds: contest.durationSeconds,
    fetchedAtIso: contest.fetchedAtIso || refreshedAtIso
  };
}

export async function refreshContestCache(
  db: AppDatabase,
  options: RefreshContestCacheOptions = {}
): Promise<ContestRefreshResult> {
  const providers = options.providers ?? defaultProviders;
  const refreshedAtIso = new Date().toISOString();
  const contests: ContestReminder[] = [];
  const failedProviders: Platform[] = [];

  for (const provider of providers) {
    try {
      const providerContests = await provider.fetchContests();
      const normalizedContests = providerContests.filter((contest) => contest.platform === provider.platform);

      replaceContestCacheForPlatform(
        db,
        provider.platform,
        normalizedContests.map((contest) => toCacheInput(contest, refreshedAtIso))
      );
      contests.push(...normalizedContests);
    } catch {
      failedProviders.push(provider.platform);
    }
  }

  return {
    contests: contests.sort((left, right) => left.startTimeIso.localeCompare(right.startTimeIso)),
    failedProviders,
    refreshedAtIso
  };
}

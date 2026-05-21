import type { ContestReminder } from "../shared/types.js";

const CODEFORCES_CONTEST_LIST_URL = "https://codeforces.com/api/contest.list";

type FetchLike = (input: string) => Promise<Pick<Response, "ok" | "status" | "json">>;

type CodeforcesContest = {
  id: number;
  name: string;
  phase: string;
  durationSeconds?: number;
  startTimeSeconds?: number;
};

type CodeforcesContestListResponse = {
  status: string;
  result?: CodeforcesContest[];
  comment?: string;
};

export async function fetchCodeforcesContests(fetcher: FetchLike = fetch): Promise<ContestReminder[]> {
  const response = await fetcher(CODEFORCES_CONTEST_LIST_URL);

  if (!response.ok) {
    throw new Error(`Codeforces contest.list failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as CodeforcesContestListResponse;

  if (payload.status !== "OK" || !Array.isArray(payload.result)) {
    throw new Error(payload.comment || "Codeforces contest.list returned an invalid payload");
  }

  const fetchedAtIso = new Date().toISOString();

  return payload.result
    .filter((contest) => contest.phase === "BEFORE" && typeof contest.startTimeSeconds === "number")
    .map((contest) => {
      const startTimeIso = new Date(contest.startTimeSeconds! * 1000).toISOString();
      const endTimeIso =
        typeof contest.durationSeconds === "number"
          ? new Date((contest.startTimeSeconds! + contest.durationSeconds) * 1000).toISOString()
          : undefined;

      return {
        id: `codeforces:${contest.id}`,
        platform: "codeforces",
        title: contest.name,
        url: `https://codeforces.com/contest/${contest.id}`,
        startTimeIso,
        endTimeIso,
        durationSeconds: contest.durationSeconds,
        source: "auto",
        fetchedAtIso
      } satisfies ContestReminder;
    })
    .sort((left, right) => left.startTimeIso.localeCompare(right.startTimeIso));
}

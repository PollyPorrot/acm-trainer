import * as cheerio from "cheerio";
import type { ContestReminder } from "../shared/types.js";

export const NOWCODER_CONTEST_URLS = [
  "https://ac.nowcoder.com/acm/contest/vip-index",
  "https://ac.nowcoder.com/acm/contest"
];

type FetchLike = (input: string) => Promise<Pick<Response, "ok" | "status" | "text">>;

const AUTO_SERIES_PATTERN = /\u5468\u8d5b|\u6708\u8d5b|\u6311\u6218\u8d5b/;
const NOWCODER_UTC_OFFSET_HOURS = 8;
const DATE_SOURCE = "(\\d{4})[-/](\\d{1,2})[-/](\\d{1,2})\\s+(\\d{1,2}):(\\d{2})";
const NOWCODER_DATE_PATTERN = new RegExp(DATE_SOURCE);
const NOWCODER_CONTEST_TIME_PATTERN = new RegExp(
  `\\u6bd4\\u8d5b\\u65f6\\u95f4[:\\uFF1A]\\s*${DATE_SOURCE}(?:\\s*\\u81f3\\s*${DATE_SOURCE})?`
);

type NowcoderContestData = {
  contestDuration?: unknown;
  contestEndTime?: unknown;
  contestId?: unknown;
  contestName?: unknown;
  contestStartTime?: unknown;
};

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseContestId(href: string): string | null {
  return /\/acm\/contest\/(\d+)/.exec(href)?.[1] ?? null;
}

function parseDateGroups(match: RegExpExecArray, startIndex: number): string | null {
  if (!match) {
    return null;
  }

  const [year, month, day, hours, minutes] = match.slice(startIndex, startIndex + 5);
  const date = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours) - NOWCODER_UTC_OFFSET_HOURS,
    Number(minutes),
    0,
    0
  ));

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseNowcoderDate(value: string): string | null {
  const match = NOWCODER_DATE_PATTERN.exec(value);

  return match ? parseDateGroups(match, 1) : null;
}

function parseNowcoderContestTime(value: string): { startTimeIso: string | null; endTimeIso?: string } {
  const match = NOWCODER_CONTEST_TIME_PATTERN.exec(value);

  if (!match) {
    return { startTimeIso: null };
  }

  return {
    startTimeIso: parseDateGroups(match, 1),
    endTimeIso: match[6] ? parseDateGroups(match, 6) ?? undefined : undefined
  };
}

function parseTimestampIso(value: unknown): string | null {
  const timestamp = Number(value);

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return null;
  }

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseDurationSeconds(value: unknown): number | undefined {
  const duration = Number(value);

  if (!Number.isFinite(duration) || duration <= 0) {
    return undefined;
  }

  return Math.round(duration / 1000);
}

function durationFromRange(startTimeIso: string, endTimeIso?: string): number | undefined {
  if (!endTimeIso) {
    return undefined;
  }

  const durationSeconds = Math.round((new Date(endTimeIso).getTime() - new Date(startTimeIso).getTime()) / 1000);
  return durationSeconds > 0 ? durationSeconds : undefined;
}

function parseContestDataJson(value?: string): NowcoderContestData | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value.replace(/&quot;/g, '"')) as NowcoderContestData;
  } catch {
    return null;
  }
}

function parseNowcoderHtml(html: string, fetchedAtIso: string, now: Date): ContestReminder[] {
  const $ = cheerio.load(html);
  const contests: ContestReminder[] = [];
  const seen = new Set<string>();

  $('a[href*="/acm/contest/"]').each((_index, anchor) => {
    const link = $(anchor);
    const href = link.attr("href");
    const title = cleanText(link.text());

    if (!href || !AUTO_SERIES_PATTERN.test(title)) {
      return;
    }

    const contestId = parseContestId(href);
    const url = new URL(href, "https://ac.nowcoder.com").toString();

    if (!contestId || seen.has(contestId)) {
      return;
    }

    const structuredContainer = link.closest(".platform-item, .contest-item, article, li, tr");
    const container = structuredContainer.length ? structuredContainer : link.closest("div");
    const contestData = parseContestDataJson(
      structuredContainer.attr("data-json") ?? link.closest(".platform-item").attr("data-json")
    );
    const containerText = cleanText(container.text());
    const labeledTime = parseNowcoderContestTime(containerText);
    const startTimeIso =
      parseTimestampIso(contestData?.contestStartTime) ?? labeledTime.startTimeIso ?? parseNowcoderDate(containerText);
    const endTimeIso = parseTimestampIso(contestData?.contestEndTime) ?? labeledTime.endTimeIso;

    if (!startTimeIso) {
      return;
    }

    if (new Date(startTimeIso).getTime() <= now.getTime()) {
      return;
    }

    seen.add(contestId);
    contests.push({
      id: `nowcoder:${contestId}`,
      platform: "nowcoder",
      title,
      url,
      startTimeIso,
      endTimeIso,
      durationSeconds: parseDurationSeconds(contestData?.contestDuration) ?? durationFromRange(startTimeIso, endTimeIso),
      source: "auto",
      fetchedAtIso
    });
  });

  return contests;
}

export async function fetchNowcoderContests(
  fetcher: FetchLike = fetch,
  urls: readonly string[] = NOWCODER_CONTEST_URLS,
  now = new Date()
): Promise<ContestReminder[]> {
  const fetchedAtIso = now.toISOString();
  const contestsById = new Map<string, ContestReminder>();
  let successfulFetches = 0;

  for (const url of urls) {
    let response: Pick<Response, "ok" | "status" | "text">;

    try {
      response = await fetcher(url);
    } catch {
      continue;
    }

    if (!response.ok) {
      continue;
    }

    successfulFetches += 1;

    for (const contest of parseNowcoderHtml(await response.text(), fetchedAtIso, now)) {
      contestsById.set(contest.id, contest);
    }
  }

  if (successfulFetches === 0) {
    throw new Error("Nowcoder contest pages failed to load");
  }

  return [...contestsById.values()].sort((left, right) => left.startTimeIso.localeCompare(right.startTimeIso));
}

import * as cheerio from "cheerio";
import type { ContestReminder } from "../shared/types.js";

export const NOWCODER_CONTEST_URLS = [
  "https://ac.nowcoder.com/acm/contest/vip-index",
  "https://ac.nowcoder.com/acm/contest"
];

type FetchLike = (input: string) => Promise<Pick<Response, "ok" | "status" | "text">>;

const AUTO_SERIES_PATTERN = /\u5468\u8d5b|\u6708\u8d5b|\u6311\u6218\u8d5b/;

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseContestId(href: string): string | null {
  return /\/acm\/contest\/(\d+)/.exec(href)?.[1] ?? null;
}

function parseNowcoderDate(value: string): string | null {
  const match = /(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{2})/.exec(value);

  if (!match) {
    return null;
  }

  const [, year, month, day, hours, minutes] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), 0, 0);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseNowcoderHtml(html: string, fetchedAtIso: string): ContestReminder[] {
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

    const containerText = cleanText(link.closest("article, li, tr, .platform-item, .contest-item, div").text());
    const startTimeIso = parseNowcoderDate(containerText);

    if (!startTimeIso) {
      return;
    }

    seen.add(contestId);
    contests.push({
      id: `nowcoder:${contestId}`,
      platform: "nowcoder",
      title,
      url,
      startTimeIso,
      source: "auto",
      fetchedAtIso
    });
  });

  return contests;
}

export async function fetchNowcoderContests(
  fetcher: FetchLike = fetch,
  urls: readonly string[] = NOWCODER_CONTEST_URLS
): Promise<ContestReminder[]> {
  const fetchedAtIso = new Date().toISOString();
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

    for (const contest of parseNowcoderHtml(await response.text(), fetchedAtIso)) {
      contestsById.set(contest.id, contest);
    }
  }

  if (successfulFetches === 0) {
    throw new Error("Nowcoder contest pages failed to load");
  }

  return [...contestsById.values()].sort((left, right) => left.startTimeIso.localeCompare(right.startTimeIso));
}

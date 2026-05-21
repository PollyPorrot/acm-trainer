import * as cheerio from "cheerio";
import type { ContestReminder } from "../shared/types.js";

const ATCODER_CONTESTS_URL = "https://atcoder.jp/contests/";

type FetchLike = (input: string) => Promise<Pick<Response, "ok" | "status" | "text">>;

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function contestIdFromUrl(url: URL): string | null {
  const match = /^\/contests\/([^/]+)/.exec(url.pathname);
  return match?.[1] ?? null;
}

function parseAtCoderDate(value: string): string | null {
  const trimmed = cleanText(value);
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)([+-]\d{2})(\d{2})$/.exec(trimmed);
  const normalized = match ? `${match[1]}T${match[2]}${match[3]}:${match[4]}` : trimmed;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseDurationSeconds(value: string): number | undefined {
  const match = /(?:^|\s)(\d{1,3}):(\d{2})(?::(\d{2}))?(?:\s|$)/.exec(cleanText(value));

  if (!match) {
    return undefined;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;

  return hours * 3600 + minutes * 60 + seconds;
}

export async function fetchAtCoderContests(fetcher: FetchLike = fetch): Promise<ContestReminder[]> {
  const response = await fetcher(ATCODER_CONTESTS_URL);

  if (!response.ok) {
    throw new Error(`AtCoder contests page failed with HTTP ${response.status}`);
  }

  const $ = cheerio.load(await response.text());
  const fetchedAtIso = new Date().toISOString();
  const contests: ContestReminder[] = [];

  $("#contest-table-upcoming tbody tr, #contest-table-upcoming tr").each((_index, row) => {
    const rowElement = $(row);
    const link = rowElement.find('a[href*="/contests/"]').first();
    const href = link.attr("href");

    if (!href) {
      return;
    }

    const url = new URL(href, ATCODER_CONTESTS_URL);
    const contestId = contestIdFromUrl(url);
    const title = cleanText(link.text());
    const startTimeIso = parseAtCoderDate(rowElement.find("time").first().text());

    if (!contestId || !title || !startTimeIso) {
      return;
    }

    const durationSeconds = rowElement
      .find("td")
      .toArray()
      .slice(2)
      .map((cell) => parseDurationSeconds($(cell).text()))
      .find((duration): duration is number => duration !== undefined);

    contests.push({
      id: `atcoder:${contestId}`,
      platform: "atcoder",
      title,
      url: url.toString(),
      startTimeIso,
      endTimeIso:
        durationSeconds === undefined ? undefined : new Date(new Date(startTimeIso).getTime() + durationSeconds * 1000).toISOString(),
      durationSeconds,
      source: "auto",
      fetchedAtIso
    });
  });

  return contests.sort((left, right) => left.startTimeIso.localeCompare(right.startTimeIso));
}

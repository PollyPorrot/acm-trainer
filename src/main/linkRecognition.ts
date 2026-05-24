import * as cheerio from "cheerio";
import { extractLinkMetadata } from "../shared/linkMetadata.js";
import { detectPlatformFromUrl } from "../shared/platforms.js";
import type { Platform } from "../shared/types.js";

export type RecognizedContestLink = {
  url: string;
  platform: Platform;
  title: string;
};

type FetchLike = typeof fetch;
type PageInfo = {
  competitionName_var?: unknown;
  name?: unknown;
  title?: unknown;
};

function cleanText(value: string | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function parseUrl(rawUrl: unknown): URL | null {
  const url = typeof rawUrl === "string" ? rawUrl.trim() : "";

  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isUsefulTitle(title: string): boolean {
  const normalized = cleanText(title).toLowerCase();

  return Boolean(
    normalized &&
      normalized !== "just a moment..." &&
      normalized !== "login" &&
      normalized !== "login - qoj.ac" &&
      !normalized.startsWith("403 - ") &&
      !normalized.startsWith("404 - ")
  );
}

function findCodeforcesContestId(url: URL): number | null {
  const match = /^\/(?:contest|gym)\/(\d+)/.exec(url.pathname);
  const id = match ? Number(match[1]) : NaN;

  return Number.isSafeInteger(id) ? id : null;
}

async function fetchCodeforcesContestTitle(url: URL, fetcher: FetchLike): Promise<string> {
  const contestId = findCodeforcesContestId(url);

  if (!contestId) {
    return "";
  }

  try {
    const response = await fetcher("https://codeforces.com/api/contest.list?gym=true");

    if (!response.ok) {
      return "";
    }

    const payload = (await response.json()) as {
      status?: string;
      result?: Array<{ id?: number; name?: string }>;
    };
    const contest = payload.result?.find((item) => item.id === contestId);

    return cleanText(contest?.name);
  } catch {
    return "";
  }
}

function findJsonObjectEnd(source: string, startIndex: number): number {
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }
    }
  }

  return -1;
}

function parseNowcoderPageInfo(html: string): PageInfo | null {
  const assignmentIndex = html.indexOf("window.pageInfo");

  if (assignmentIndex < 0) {
    return null;
  }

  const objectStart = html.indexOf("{", assignmentIndex);
  if (objectStart < 0) {
    return null;
  }

  const objectEnd = findJsonObjectEnd(html, objectStart);
  if (objectEnd < 0) {
    return null;
  }

  try {
    return JSON.parse(html.slice(objectStart, objectEnd)) as PageInfo;
  } catch {
    return null;
  }
}

function extractNowcoderTitle(html: string): string {
  const pageInfo = parseNowcoderPageInfo(html);

  for (const candidate of [pageInfo?.competitionName_var, pageInfo?.name, pageInfo?.title]) {
    if (typeof candidate === "string" && cleanText(candidate)) {
      return cleanText(candidate);
    }
  }

  const $ = cheerio.load(html);
  return cleanText($("h1").first().text() || $("h2").first().text());
}

function extractQojTitle(html: string): string {
  const $ = cheerio.load(html);
  const candidates = [$("h1").first().text(), $(".page-header h1").first().text(), $("title").first().text()];

  for (const candidate of candidates) {
    const title = cleanText(candidate).replace(/\s+-\s+QOJ\.ac$/i, "");
    if (isUsefulTitle(title) && title.toLowerCase() !== "qoj.ac") {
      return title;
    }
  }

  return "";
}

function parseQojContestId(url: URL): string {
  return /^\/contest\/(\d+)/.exec(url.pathname)?.[1] ?? "";
}

async function fetchUniversalCupQojTitle(url: URL, fetcher: FetchLike): Promise<string> {
  const contestId = parseQojContestId(url);

  if (!contestId) {
    return "";
  }

  try {
    const response = await fetcher(`https://contest.ucup.ac/contest/${contestId}`);

    if (!response.ok) {
      return "";
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const title = cleanText($("title").first().text() || $("h1").first().text())
      .replace(/\s+-\s+Dashboard\s+-\s+Contest\s+-\s+Universal Cup Judging System$/i, "")
      .replace(/\s+-\s+Universal Cup$/i, "")
      .replace(/\s+\|\s+Universal Cup$/i, "");

    return isUsefulTitle(title) ? title : "";
  } catch {
    return "";
  }
}

function extractVjudgeTitle(html: string): string {
  const title = extractLinkMetadata(html).title.replace(/\s+-\s+Virtual Judge$/i, "");

  return cleanText(title);
}

function extractPlatformTitle(platform: Platform, url: URL, html: string): string {
  if (platform === "nowcoder") {
    return extractNowcoderTitle(html);
  }

  if (platform === "qoj") {
    return extractQojTitle(html);
  }

  if (platform === "vjudge") {
    return extractVjudgeTitle(html);
  }

  return extractLinkMetadata(html).title;
}

export async function recognizeContestLink(
  rawUrl: unknown,
  fetcher: FetchLike = fetch
): Promise<RecognizedContestLink> {
  const parsedUrl = parseUrl(rawUrl);
  const url = parsedUrl?.toString() ?? (typeof rawUrl === "string" ? rawUrl.trim() : "");
  const platform = detectPlatformFromUrl(url);
  let title = "";

  if (!parsedUrl) {
    return { url, platform, title };
  }

  if (platform === "codeforces") {
    title = await fetchCodeforcesContestTitle(parsedUrl, fetcher);
  }

  try {
    const response = await fetcher(parsedUrl.toString(), {
      headers: {
        "user-agent": "ACM-Trainer/0.1"
      }
    });

    if (response.ok) {
      const html = await response.text();
      const pageTitle = extractPlatformTitle(platform, parsedUrl, html);

      if (isUsefulTitle(pageTitle)) {
        title = pageTitle;
      }
    }
  } catch {
    title = title || "";
  }

  if (platform === "qoj" && !isUsefulTitle(title)) {
    title = await fetchUniversalCupQojTitle(parsedUrl, fetcher);
  }

  return {
    url,
    platform,
    title: isUsefulTitle(title) ? title : ""
  };
}

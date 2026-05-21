import * as cheerio from "cheerio";

export type LinkMetadata = {
  title: string;
};

function cleanTitle(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export function extractLinkMetadata(html: string): LinkMetadata {
  const $ = cheerio.load(html);
  const openGraphTitle = cleanTitle($('meta[property="og:title"]').attr("content"));
  const staticTitle = cleanTitle($("title").first().text());

  return {
    title: openGraphTitle || staticTitle
  };
}

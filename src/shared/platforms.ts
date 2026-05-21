import type { Platform } from "./types.js";

export const platformOptions: Platform[] = [
  "codeforces",
  "atcoder",
  "nowcoder",
  "qoj",
  "luogu",
  "jisuanke",
  "vjudge",
  "hdu",
  "unknown"
];

export const platformLabels: Record<Platform, string> = {
  codeforces: "Codeforces",
  atcoder: "AtCoder",
  nowcoder: "牛客",
  qoj: "QOJ",
  luogu: "洛谷",
  jisuanke: "计蒜客",
  vjudge: "VJudge",
  hdu: "HDU",
  unknown: "未知"
};

function parseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
}

function hasHost(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function detectPlatformFromUrl(value: string): Platform {
  const url = parseUrl(value.trim());

  if (!url) {
    return "unknown";
  }

  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname.toLowerCase();

  if (hasHost(hostname, "codeforces.com") && pathname.startsWith("/contest/")) {
    return "codeforces";
  }

  if (hasHost(hostname, "atcoder.jp") && pathname.startsWith("/contests/")) {
    return "atcoder";
  }

  if (hasHost(hostname, "nowcoder.com") && pathname.startsWith("/acm/contest/")) {
    return "nowcoder";
  }

  if (hasHost(hostname, "qoj.ac") && pathname.startsWith("/contest/")) {
    return "qoj";
  }

  if (hasHost(hostname, "luogu.com.cn") && (pathname.startsWith("/problem/") || pathname.startsWith("/contest/"))) {
    return "luogu";
  }

  if (hasHost(hostname, "jisuanke.com") && pathname.startsWith("/contest/")) {
    return "jisuanke";
  }

  if (hasHost(hostname, "vjudge.net") && (pathname.startsWith("/contest/") || pathname.startsWith("/problem/"))) {
    return "vjudge";
  }

  if (hasHost(hostname, "hdu.edu.cn") && (pathname.includes("showproblem") || pathname.includes("contest"))) {
    return "hdu";
  }

  return "unknown";
}

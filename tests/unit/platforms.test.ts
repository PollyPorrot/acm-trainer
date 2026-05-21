import { describe, expect, test } from "vitest";
import { detectPlatformFromUrl } from "../../src/shared/platforms";

describe("platform detection", () => {
  test.each([
    ["https://codeforces.com/contest/2042", "codeforces"],
    ["https://atcoder.jp/contests/abc400", "atcoder"],
    ["https://ac.nowcoder.com/acm/contest/99999", "nowcoder"],
    ["https://qoj.ac/contest/1234", "qoj"],
    ["https://www.luogu.com.cn/problem/P1001", "luogu"],
    ["https://www.jisuanke.com/contest/1234", "jisuanke"],
    ["https://vjudge.net/contest/612345", "vjudge"],
    ["https://acm.hdu.edu.cn/showproblem.php?pid=1000", "hdu"]
  ] as const)("detects %s as %s", (url, platform) => {
    expect(detectPlatformFromUrl(url)).toBe(platform);
  });

  test("returns unknown for unsupported or invalid URLs", () => {
    expect(detectPlatformFromUrl("https://example.com/contest/123")).toBe("unknown");
    expect(detectPlatformFromUrl("not a url")).toBe("unknown");
  });
});

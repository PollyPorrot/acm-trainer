import { describe, expect, test } from "vitest";
import { createDatabase } from "../../src/data/db";
import { listContestCache, upsertContestCache } from "../../src/data/repositories/contestCacheRepo";
import { refreshContestCache, type ContestProvider } from "../../src/main/contestRefresh";
import { fetchAtCoderContests } from "../../src/providers/atcoder";
import { fetchCodeforcesContests } from "../../src/providers/codeforces";
import { fetchNowcoderContests } from "../../src/providers/nowcoder";
import type { ContestReminder } from "../../src/shared/types";

function responseFetch(body: unknown, init: ResponseInit = {}): typeof fetch {
  return (async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status: 200,
      ...init
    })) as typeof fetch;
}

function reminder(platform: ContestReminder["platform"], id: string, title: string): ContestReminder {
  return {
    id,
    platform,
    title,
    url: `https://example.com/${id}`,
    startTimeIso: "2026-05-22T12:00:00.000Z",
    durationSeconds: 7200,
    source: "auto",
    fetchedAtIso: "2026-05-21T00:00:00.000Z"
  };
}

describe("contest providers", () => {
  test("normalizes upcoming Codeforces contests", async () => {
    const startTimeSeconds = 1_800_000_000;
    const contests = await fetchCodeforcesContests(
      responseFetch({
        status: "OK",
        result: [
          {
            id: 1000,
            name: "Codeforces Round 1000",
            phase: "BEFORE",
            durationSeconds: 7200,
            startTimeSeconds
          },
          {
            id: 999,
            name: "Old Round",
            phase: "FINISHED",
            durationSeconds: 7200,
            startTimeSeconds: startTimeSeconds - 100_000
          }
        ]
      })
    );

    expect(contests).toEqual([
      expect.objectContaining({
        id: "codeforces:1000",
        platform: "codeforces",
        title: "Codeforces Round 1000",
        url: "https://codeforces.com/contest/1000",
        startTimeIso: new Date(startTimeSeconds * 1000).toISOString(),
        endTimeIso: new Date((startTimeSeconds + 7200) * 1000).toISOString(),
        durationSeconds: 7200,
        source: "auto"
      })
    ]);
  });

  test("parses upcoming AtCoder contests from static HTML", async () => {
    const contests = await fetchAtCoderContests(
      responseFetch(`
        <section id="contest-table-upcoming">
          <table>
            <tbody>
              <tr>
                <td><time>2026-05-22 21:00:00+0900</time></td>
                <td><a href="/contests/abc400">AtCoder Beginner Contest 400</a></td>
                <td>02:00</td>
              </tr>
            </tbody>
          </table>
        </section>
      `)
    );

    expect(contests).toEqual([
      expect.objectContaining({
        id: "atcoder:abc400",
        platform: "atcoder",
        title: "AtCoder Beginner Contest 400",
        url: "https://atcoder.jp/contests/abc400",
        startTimeIso: "2026-05-22T12:00:00.000Z",
        durationSeconds: 7200,
        source: "auto"
      })
    ]);
  });

  test("keeps only Nowcoder weekly, monthly, and challenge series contests", async () => {
    const contests = await fetchNowcoderContests(responseFetch(`
      <main>
        <article>
          <a href="/acm/contest/111">牛客周赛 Round 100</a>
          <span>2026-05-22 19:00</span>
        </article>
        <article>
          <a href="/acm/contest/222">牛客月赛 Round 88</a>
          <span>2026-05-23 19:00</span>
        </article>
        <article>
          <a href="/acm/contest/333">牛客挑战赛 77</a>
          <span>2026-05-24 19:00</span>
        </article>
        <article>
          <a href="/acm/contest/444">牛客寒假训练营 1</a>
          <span>2026-05-25 19:00</span>
        </article>
      </main>
    `));

    expect(contests.map((contest) => contest.id)).toEqual([
      "nowcoder:111",
      "nowcoder:222",
      "nowcoder:333"
    ]);
  });

  test("continues Nowcoder parsing when one candidate page fails", async () => {
    let calls = 0;
    const contests = await fetchNowcoderContests(
      (async () => {
        calls += 1;

        if (calls === 1) {
          throw new Error("offline");
        }

        return new Response(`
          <article>
            <a href="/acm/contest/555">牛客周赛 Round 101</a>
            <span>2026-05-26 19:00</span>
          </article>
        `);
      }) as typeof fetch,
      ["https://example.invalid/first", "https://example.invalid/second"]
    );

    expect(contests.map((contest) => contest.id)).toEqual(["nowcoder:555"]);
  });

  test("refreshes successful providers and keeps failed provider cache", async () => {
    const db = createDatabase({ memory: true });

    try {
      upsertContestCache(db, [
        {
          platform: "atcoder",
          providerContestId: "atcoder:old",
          title: "Cached AtCoder",
          url: "https://atcoder.jp/contests/old",
          startTimeIso: "2026-05-22T13:00:00.000Z",
          durationSeconds: 7200,
          fetchedAtIso: "2026-05-20T00:00:00.000Z"
        }
      ]);

      const providers: ContestProvider[] = [
        {
          platform: "codeforces",
          fetchContests: async () => [reminder("codeforces", "codeforces:new", "Fresh Codeforces")]
        },
        {
          platform: "atcoder",
          fetchContests: async () => {
            throw new Error("offline");
          }
        }
      ];

      const result = await refreshContestCache(db, { providers });

      expect(result.failedProviders).toEqual(["atcoder"]);
      expect(listContestCache(db, { platform: "codeforces" }).map((item) => item.providerContestId)).toEqual([
        "codeforces:new"
      ]);
      expect(listContestCache(db, { platform: "atcoder" }).map((item) => item.providerContestId)).toEqual([
        "atcoder:old"
      ]);
    } finally {
      db.close();
    }
  });
});

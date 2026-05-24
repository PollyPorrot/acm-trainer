import { describe, expect, test } from "vitest";
import { recognizeContestLink } from "../../src/main/linkRecognition";

function responseFetch(routes: Record<string, string>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = routes[url];

    if (body === undefined) {
      return new Response("", { status: 404 });
    }

    return new Response(body, { status: 200 });
  }) as typeof fetch;
}

describe("contest link recognition", () => {
  test("recognizes Codeforces Gym title from the contest API", async () => {
    const metadata = await recognizeContestLink(
      "https://codeforces.com/gym/105945",
      responseFetch({
        "https://codeforces.com/gym/105945": `<title>Just a moment...</title>`,
        "https://codeforces.com/api/contest.list?gym=true": JSON.stringify({
          status: "OK",
          result: [
            {
              id: 105945,
              name:
                "The 2025 Jiangsu Collegiate Programming Contest, The 2025 Guangdong Provincial Collegiate Programming Contest"
            }
          ]
        })
      })
    );

    expect(metadata).toEqual({
      url: "https://codeforces.com/gym/105945",
      platform: "codeforces",
      title:
        "The 2025 Jiangsu Collegiate Programming Contest, The 2025 Guangdong Provincial Collegiate Programming Contest"
    });
  });

  test("recognizes QOJ title from the contest page heading", async () => {
    const metadata = await recognizeContestLink(
      "https://qoj.ac/contest/1780",
      responseFetch({
        "https://qoj.ac/contest/1780": `
          <html>
            <head><title>Login - QOJ.ac</title></head>
            <body><h1>The 3rd Universal Cup. Stage 8: Cangqian</h1></body>
          </html>
        `
      })
    );

    expect(metadata.title).toBe("The 3rd Universal Cup. Stage 8: Cangqian");
  });

  test("falls back to Universal Cup results for protected QOJ pages", async () => {
    const metadata = await recognizeContestLink(
      "https://qoj.ac/contest/1780",
      responseFetch({
        "https://qoj.ac/contest/1780": `<title>Login - QOJ.ac</title>`,
        "https://contest.ucup.ac/contest/1780": `
          <html>
            <head><title>The 3rd Universal Cup. Stage 8: Cangqian - Dashboard - Contest - Universal Cup Judging System</title></head>
          </html>
        `
      })
    );

    expect(metadata.title).toBe("The 3rd Universal Cup. Stage 8: Cangqian");
  });

  test("recognizes Nowcoder title from pageInfo instead of the generic document title", async () => {
    const expectedTitle =
      "2024\u5e74\u56fd\u9645\u5927\u5b66\u751f\u7a0b\u5e8f\u8bbe\u8ba1\u7ade\u8d5b\uff08ACM-ICPC\uff09\u65b0\u7586\u8d5b\u533a\u5927\u8d5b";
    const metadata = await recognizeContestLink(
      "https://ac.nowcoder.com/acm/contest/82345",
      responseFetch({
        "https://ac.nowcoder.com/acm/contest/82345": `
          <html>
            <head><title>\u725b\u5ba2\u7ade\u8d5b_ACM/NOI/CSP/CCPC/ICPC\u7b97\u6cd5\u7f16\u7a0b\u9ad8\u96be\u5ea6\u7ec3\u4e60\u8d5b_\u725b\u5ba2\u7ade\u8d5bOJ</title></head>
            <script>
              window.pageInfo = {
                "competitionName_var": "${expectedTitle}",
                "name": "${expectedTitle}"
              };
            </script>
          </html>
        `
      })
    );

    expect(metadata).toEqual({
      url: "https://ac.nowcoder.com/acm/contest/82345",
      platform: "nowcoder",
      title: expectedTitle
    });
  });
});

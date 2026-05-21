import { describe, expect, test } from "vitest";
import { extractLinkMetadata } from "../../src/shared/linkMetadata";

describe("link metadata parser", () => {
  test("extracts and trims a static HTML title", () => {
    const metadata = extractLinkMetadata(`
      <html>
        <head><title>  Example Contest &amp; Practice  </title></head>
      </html>
    `);

    expect(metadata.title).toBe("Example Contest & Practice");
  });

  test("prefers Open Graph title over the static title", () => {
    const metadata = extractLinkMetadata(`
      <html>
        <head>
          <meta property="og:title" content="OG Contest Title" />
          <title>Fallback Title</title>
        </head>
      </html>
    `);

    expect(metadata.title).toBe("OG Contest Title");
  });
});

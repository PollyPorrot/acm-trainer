import path from "node:path";
import { describe, expect, test } from "vitest";
import { resolveAppDataDirectory } from "../../src/data/appDataPath";
import { resolveDatabasePath } from "../../src/data/db";

describe("app data directory", () => {
  test("packaged builds store data beside the executable", () => {
    const executablePath = path.join("D:", "ACM Trainer", "ACM Trainer.exe");

    expect(
      resolveAppDataDirectory({
        envDataDir: "",
        execPath: executablePath,
        isPackaged: true
      })
    ).toBe(path.join("D:", "ACM Trainer", "data"));
  });

  test("development builds store data in the project data directory", () => {
    const projectPath = path.join("E:", "vibecoding", "VP");

    expect(
      resolveAppDataDirectory({
        cwd: projectPath,
        envDataDir: "",
        isPackaged: false
      })
    ).toBe(path.join(projectPath, "data"));
  });

  test("explicit data directory still overrides the default", () => {
    const customPath = path.join("D:", "custom-acm-data");

    expect(resolveAppDataDirectory({ envDataDir: customPath })).toBe(customPath);
    expect(resolveDatabasePath({ appDataPath: customPath })).toBe(
      path.join(customPath, "acm-trainer.sqlite")
    );
  });
});

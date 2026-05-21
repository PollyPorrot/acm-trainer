import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("Electron shell scaffold", () => {
  test("package scripts launch the renderer and compiled Electron main process", () => {
    const pkg = JSON.parse(readProjectFile("package.json")) as {
      main: string;
      scripts: Record<string, string>;
    };

    expect(pkg.main).toBe("dist-electron/main/main.js");
    expect(pkg.scripts.dev).toContain("concurrently");
    expect(pkg.scripts["dev:renderer"]).toBe("vite --host 127.0.0.1");
    expect(pkg.scripts["dev:electron"]).toBe(
      "wait-on http://127.0.0.1:5173 && npm run build:main && electron ."
    );
    expect(pkg.scripts["build:main"]).toBe("tsc -p tsconfig.node.json");
  });

  test("main and preload entry points exist", () => {
    [
      "src/main/main.ts",
      "src/main/windows.ts",
      "src/main/tray.ts",
      "src/main/ipc.ts",
      "src/main/autostart.ts",
      "src/main/timerWindow.ts",
      "src/preload/preload.ts"
    ].forEach((path) => {
      expect(existsSync(join(root, path)), `${path} should exist`).toBe(true);
    });
  });

  test("preload exposes the typed ACM Trainer bridge", () => {
    const preload = readProjectFile("src/preload/preload.ts");

    expect(preload).toContain("contextBridge.exposeInMainWorld");
    expect(preload).toContain("acmTrainer");
    expect(preload).toContain("getSettings");
    expect(preload).toContain("refreshContests");
    expect(preload).toContain("listVpContests");
    expect(preload).toContain("listReviews");
    expect(preload).toContain("listImages");
    expect(preload).toContain("openTimer");
    expect(preload).toContain("showTodayReminder");
  });
});

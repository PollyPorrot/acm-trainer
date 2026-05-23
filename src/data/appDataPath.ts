import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type ElectronRuntime = {
  app?: {
    isPackaged?: boolean;
  };
};

export type ResolveAppDataDirectoryOptions = {
  appDataPath?: string;
  cwd?: string;
  envDataDir?: string;
  execPath?: string;
  isPackaged?: boolean;
};

function readElectronPackagedState(): boolean | null {
  try {
    const electron = require("electron") as ElectronRuntime;
    return typeof electron.app?.isPackaged === "boolean" ? electron.app.isPackaged : null;
  } catch {
    return null;
  }
}

export function resolveAppDataDirectory(options: ResolveAppDataDirectoryOptions = {}): string {
  if (options.appDataPath) {
    return options.appDataPath;
  }

  const envDataDir = options.envDataDir ?? process.env.ACM_TRAINER_DATA_DIR;
  if (envDataDir) {
    return envDataDir;
  }

  const isPackaged = options.isPackaged ?? readElectronPackagedState() ?? false;

  if (isPackaged) {
    return path.join(path.dirname(options.execPath ?? process.execPath), "data");
  }

  return path.join(options.cwd ?? process.cwd(), "data");
}

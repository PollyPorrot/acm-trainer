import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createImageWallItem, type CreateImageWallItemInput } from "../data/repositories/imageWallRepo.js";
import { resolveAppDataDirectory } from "../data/appDataPath.js";
import type { AppDatabase } from "../data/db.js";

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"]);

function mediaDirectory(appDataPath = resolveAppDataDirectory()): string {
  return path.join(appDataPath, "media", "images");
}

function safeFileName(fileName: string): string {
  return fileName.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").slice(0, 120);
}

function imageTitleFromFile(fileName: string): string {
  return path.basename(fileName, path.extname(fileName)).trim() || "Image";
}

export function mimeTypeFromPath(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".bmp":
      return "image/bmp";
    default:
      return "application/octet-stream";
  }
}

export function readImageDataUrl(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return `data:${mimeTypeFromPath(filePath)};base64,${data.toString("base64")}`;
}

export function deleteStoredImage(filePath: string): void {
  fs.rmSync(filePath, { force: true });
}

export function importImageFiles(
  db: AppDatabase,
  filePaths: readonly string[],
  options: { appDataPath?: string } = {}
) {
  const targetDirectory = mediaDirectory(options.appDataPath);
  fs.mkdirSync(targetDirectory, { recursive: true });

  return filePaths.map((filePath) => {
    const extension = path.extname(filePath).toLowerCase();

    if (!imageExtensions.has(extension)) {
      throw new Error(`Unsupported image type: ${filePath}`);
    }

    const originalFileName = path.basename(filePath);
    const storedFileName = `${Date.now()}-${randomUUID()}-${safeFileName(originalFileName)}`;
    const storedPath = path.join(targetDirectory, storedFileName);

    fs.copyFileSync(filePath, storedPath);

    const input: CreateImageWallItemInput = {
      title: imageTitleFromFile(originalFileName),
      originalFileName,
      storedPath,
      tags: [],
      allowRandomReminder: true
    };

    return createImageWallItem(db, input);
  });
}

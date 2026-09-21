import {
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { createCanvas, loadImage } from "canvas";
import { ASSETS_DIR } from "./paths.js";
import { ART_SIZE } from "./cards/render/layout.js";

export function sanitizeFilename(filename: string): string {
  return filename.replace(/\//g, "|");
}

export function objectImagePath(id: string): string {
  return path.join(ASSETS_DIR, "objects", `${sanitizeFilename(id)}.png`);
}

export function originCardPath(key: string): string {
  return path.join(ASSETS_DIR, "origins", `${key}.png`);
}

export function originSourcePath(key: string, ext = ".png"): string {
  return path.join(ASSETS_DIR, "origins", "sources", `${key}${ext}`);
}

export async function bufferToPng(buf: Buffer): Promise<Buffer> {
  const img = await loadImage(buf);
  const canvas = createCanvas(img.width, img.height);
  canvas.getContext("2d").drawImage(img, 0, 0);
  return canvas.toBuffer("image/png");
}

export async function saveObjectImage(id: string, buf: Buffer): Promise<string> {
  mkdirSync(path.join(ASSETS_DIR, "objects"), { recursive: true });
  const png = await bufferToPng(buf);
  const dest = objectImagePath(id);
  writeFileSync(dest, png);
  return dest;
}

export function renameObjectImage(oldId: string, newId: string): void {
  if (oldId === newId) return;
  const src = objectImagePath(oldId);
  if (!existsSync(src)) return;
  mkdirSync(path.join(ASSETS_DIR, "objects"), { recursive: true });
  const dest = objectImagePath(newId);
  if (existsSync(dest) && dest !== src) unlinkSync(dest);
  renameSync(src, dest);
}

export function deleteObjectImage(id: string): void {
  const file = objectImagePath(id);
  if (existsSync(file)) unlinkSync(file);
}

function extOf(filename: string): string {
  const ext = path.extname(filename || "").toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return ext;
  return ".png";
}

/** Store original in origins/sources and a 30%-softened card-sized copy in origins/. */
export async function saveOriginImage(
  key: string,
  buf: Buffer,
  filename = "upload.png"
): Promise<void> {
  mkdirSync(path.join(ASSETS_DIR, "origins", "sources"), { recursive: true });
  const ext = extOf(filename);
  writeFileSync(originSourcePath(key, ext), buf);

  const img = await loadImage(buf);
  const [w, h] = ART_SIZE;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  const scale = 0.7;
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  const tmp = createCanvas(tw, th);
  tmp.getContext("2d").drawImage(img, 0, 0, tw, th);
  ctx.drawImage(tmp, 0, 0, w, h);
  writeFileSync(originCardPath(key), canvas.toBuffer("image/png"));
}

export function deleteOriginImages(key: string): void {
  const card = originCardPath(key);
  if (existsSync(card)) unlinkSync(card);
  const dir = path.join(ASSETS_DIR, "origins", "sources");
  for (const ext of [".png", ".jpg", ".jpeg", ".webp", ".gif"]) {
    const file = path.join(dir, `${key}${ext}`);
    if (existsSync(file)) unlinkSync(file);
  }
}

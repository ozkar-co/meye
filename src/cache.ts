import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CACHE_DIR } from "./paths.js";

function ensureCacheDir(): void {
  mkdirSync(CACHE_DIR, { recursive: true });
}

export function cacheKey(parts: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(parts))
    .digest("hex")
    .slice(0, 32);
}

/** Return cached PNG bytes or build, store, and return them. */
export async function getOrCreatePng(
  key: string,
  builder: () => Promise<Buffer>
): Promise<Buffer> {
  ensureCacheDir();
  const file = path.join(CACHE_DIR, `${key}.png`);
  if (existsSync(file)) {
    return readFileSync(file);
  }
  const buf = await builder();
  writeFileSync(file, buf);
  return buf;
}

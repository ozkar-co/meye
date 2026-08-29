import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const ROOT = root;
export const DATA_DIR = process.env.DATA_DIR || path.join(root, "data");
export const CACHE_DIR =
  process.env.CACHE_DIR || path.join(root, "cache", "images");
export const ASSETS_DIR = path.join(DATA_DIR, "assets");

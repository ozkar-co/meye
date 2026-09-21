import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./paths.js";
import type { ItemEffect, ItemMods } from "./cards/models.js";

export type StoredItem = {
  id: string;
  base_code: string;
  custom_code: string | null;
  name: string;
  effects: ItemEffect[];
  modifications: ItemMods;
  created_at: string;
  updated_at: string;
};

let db: Database.Database | null = null;

function dbPath(): string {
  return path.join(DATA_DIR, "meye.sqlite");
}

export function getDb(): Database.Database {
  if (db) return db;
  mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(dbPath());
  db.pragma("journal_mode = DELETE");
  migrate(db);
  return db;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function migrate(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      base_code TEXT NOT NULL,
      custom_code TEXT,
      name TEXT NOT NULL,
      effects TEXT NOT NULL DEFAULT '[]',
      modifications TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS materials (
      symbol TEXT PRIMARY KEY,
      encoding_id INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      weight REAL NOT NULL,
      resistence REAL NOT NULL,
      damping REAL NOT NULL,
      slice REAL NOT NULL,
      damage REAL NOT NULL DEFAULT 0,
      useful_life REAL NOT NULL,
      level TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      decadency TEXT NOT NULL,
      grp INTEGER NOT NULL,
      color TEXT NOT NULL DEFAULT '',
      epoch TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS origins (
      key TEXT PRIMARY KEY,
      encoding_id INTEGER NOT NULL UNIQUE,
      label TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sub_types (
      class TEXT NOT NULL,
      type TEXT NOT NULL,
      key TEXT NOT NULL,
      encoding_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      PRIMARY KEY (class, type, key)
    );
    CREATE TABLE IF NOT EXISTS specializations (
      class TEXT NOT NULL,
      key TEXT NOT NULL,
      encoding_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      PRIMARY KEY (class, key)
    );
  `);

  const itemCount = database.prepare("SELECT COUNT(*) AS c FROM items").get() as {
    c: number;
  };
  if (itemCount.c === 0) seedFromCollection(database);

  const matCount = database
    .prepare("SELECT COUNT(*) AS c FROM materials")
    .get() as { c: number };
  if (matCount.c === 0) seedMaterials(database);

  const originCount = database
    .prepare("SELECT COUNT(*) AS c FROM origins")
    .get() as { c: number };
  if (originCount.c === 0) seedOrigins(database);

  const subCount = database
    .prepare("SELECT COUNT(*) AS c FROM sub_types")
    .get() as { c: number };
  if (subCount.c === 0) seedSubTypes(database);

  const specCount = database
    .prepare("SELECT COUNT(*) AS c FROM specializations")
    .get() as { c: number };
  if (specCount.c === 0) seedSpecializations(database);
}

function readJson<T>(name: string): T | null {
  const file = path.join(DATA_DIR, name);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function seedFromCollection(database: Database.Database): void {
  const collection = readJson<
    Record<string, { name: string; effects?: ItemEffect[]; modifications?: ItemMods }>
  >("collection.json");
  if (!collection) return;
  const now = new Date().toISOString();
  const insert = database.prepare(`
    INSERT INTO items (id, base_code, custom_code, name, effects, modifications, created_at, updated_at)
    VALUES (@id, @base_code, @custom_code, @name, @effects, @modifications, @created_at, @updated_at)
  `);
  const tx = database.transaction(() => {
    for (const [id, row] of Object.entries(collection)) {
      const dash = id.indexOf("-");
      const base_code = dash === -1 ? id : id.slice(0, dash);
      const custom_code = dash === -1 ? null : id.slice(dash + 1);
      insert.run({
        id,
        base_code,
        custom_code,
        name: row.name,
        effects: JSON.stringify(row.effects || []),
        modifications: JSON.stringify(row.modifications || {}),
        created_at: now,
        updated_at: now,
      });
    }
  });
  tx();
}

type SeedMaterial = {
  symbol: string;
  name: string;
  weight: unknown;
  resistence: unknown;
  damping: unknown;
  slice: unknown;
  damage?: unknown;
  useful_life: unknown;
  level: string;
  price: unknown;
  category: string;
  decadency: string;
  group: unknown;
  color?: string;
  epoch?: string;
};

function seedMaterials(database: Database.Database): void {
  const rows = readJson<SeedMaterial[]>("materials.json");
  const dict = readJson<{ materials: Record<string, number> }>("dictionary.json");
  if (!rows) return;
  const ids = dict?.materials || {};
  const insert = database.prepare(`
    INSERT INTO materials (
      symbol, encoding_id, name, weight, resistence, damping, slice, damage,
      useful_life, level, price, category, decadency, grp, color, epoch
    ) VALUES (
      @symbol, @encoding_id, @name, @weight, @resistence, @damping, @slice, @damage,
      @useful_life, @level, @price, @category, @decadency, @grp, @color, @epoch
    )
  `);
  const used = new Set<number>();
  const tx = database.transaction(() => {
    for (const row of rows) {
      let encoding_id = ids[row.symbol];
      if (encoding_id == null) {
        encoding_id = 0;
        while (used.has(encoding_id) && encoding_id < 127) encoding_id++;
      }
      if (used.has(encoding_id)) continue;
      used.add(encoding_id);
      insert.run({
        symbol: row.symbol,
        encoding_id,
        name: row.name,
        weight: num(row.weight),
        resistence: num(row.resistence),
        damping: num(row.damping),
        slice: num(row.slice),
        damage: num(row.damage),
        useful_life: num(row.useful_life),
        level: row.level,
        price: num(row.price),
        category: row.category,
        decadency: row.decadency || "-",
        grp: num(row.group),
        color: row.color || "",
        epoch: row.epoch || "",
      });
    }
  });
  tx();
}

function seedOrigins(database: Database.Database): void {
  const dict = readJson<{ origins: Record<string, number> }>("dictionary.json");
  const labels = readJson<Record<string, string>>("labels.json") || {};
  if (!dict) return;
  const insert = database.prepare(
    `INSERT INTO origins (key, encoding_id, label) VALUES (@key, @encoding_id, @label)`
  );
  const tx = database.transaction(() => {
    for (const [key, encoding_id] of Object.entries(dict.origins)) {
      if (key === "desconocido") continue;
      insert.run({
        key,
        encoding_id,
        label: labels[key] || key,
      });
    }
  });
  tx();
}

function seedSubTypes(database: Database.Database): void {
  const dict = readJson<{
    classes: Record<
      string,
      { sub_types?: Record<string, Record<string, number>> }
    >;
  }>("dictionary.json");
  const labels = readJson<Record<string, string>>("labels.json") || {};
  if (!dict) return;
  const insert = database.prepare(`
    INSERT INTO sub_types (class, type, key, encoding_id, label)
    VALUES (@class, @type, @key, @encoding_id, @label)
  `);
  const tx = database.transaction(() => {
    for (const [cls, def] of Object.entries(dict.classes)) {
      for (const [type, map] of Object.entries(def.sub_types || {})) {
        for (const [key, encoding_id] of Object.entries(map)) {
          if (key === "none" || key === "desconocido") continue;
          insert.run({
            class: cls,
            type,
            key,
            encoding_id,
            label: labels[key] || key,
          });
        }
      }
    }
  });
  tx();
}

function seedSpecializations(database: Database.Database): void {
  const dict = readJson<{
    classes: Record<string, { specializations?: Record<string, number> }>;
  }>("dictionary.json");
  const labels = readJson<Record<string, string>>("labels.json") || {};
  if (!dict) return;
  const insert = database.prepare(`
    INSERT INTO specializations (class, key, encoding_id, label)
    VALUES (@class, @key, @encoding_id, @label)
  `);
  const tx = database.transaction(() => {
    for (const [cls, def] of Object.entries(dict.classes)) {
      for (const [key, encoding_id] of Object.entries(def.specializations || {})) {
        if (key === "none" || key === "desconocido") continue;
        insert.run({
          class: cls,
          key,
          encoding_id,
          label: labels[key] || key,
        });
      }
    }
  });
  tx();
}

function rowToStored(row: Record<string, unknown>): StoredItem {
  return {
    id: String(row.id),
    base_code: String(row.base_code),
    custom_code: row.custom_code == null ? null : String(row.custom_code),
    name: String(row.name),
    effects: JSON.parse(String(row.effects)),
    modifications: JSON.parse(String(row.modifications)),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function findItem(id: string): StoredItem | undefined {
  const row = getDb().prepare("SELECT * FROM items WHERE id = ?").get(id);
  return row ? rowToStored(row as Record<string, unknown>) : undefined;
}

export function listItems(): StoredItem[] {
  const rows = getDb()
    .prepare("SELECT * FROM items ORDER BY name COLLATE NOCASE")
    .all() as Record<string, unknown>[];
  return rows.map(rowToStored);
}

export function upsertItem(input: {
  id: string;
  base_code: string;
  custom_code?: string | null;
  name: string;
  effects?: ItemEffect[];
  modifications?: ItemMods;
}): StoredItem {
  if (!input.name) throw new Error("Item name is required to persist");
  const now = new Date().toISOString();
  const existing = findItem(input.id);
  getDb()
    .prepare(
      `
    INSERT INTO items (id, base_code, custom_code, name, effects, modifications, created_at, updated_at)
    VALUES (@id, @base_code, @custom_code, @name, @effects, @modifications, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      effects = excluded.effects,
      modifications = excluded.modifications,
      updated_at = excluded.updated_at
  `
    )
    .run({
      id: input.id,
      base_code: input.base_code,
      custom_code: input.custom_code ?? null,
      name: input.name,
      effects: JSON.stringify(input.effects || []),
      modifications: JSON.stringify(input.modifications || {}),
      created_at: existing?.created_at || now,
      updated_at: now,
    });
  return findItem(input.id)!;
}

export function deleteItem(id: string): boolean {
  const info = getDb().prepare("DELETE FROM items WHERE id = ?").run(id);
  return info.changes > 0;
}

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
  `);
  const count = database.prepare("SELECT COUNT(*) AS c FROM items").get() as {
    c: number;
  };
  if (count.c === 0) {
    seedFromCollection(database);
  }
}

function seedFromCollection(database: Database.Database): void {
  const collectionPath = path.join(DATA_DIR, "collection.json");
  if (!existsSync(collectionPath)) return;
  const collection = JSON.parse(readFileSync(collectionPath, "utf8")) as Record<
    string,
    { name: string; effects?: ItemEffect[]; modifications?: ItemMods }
  >;
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

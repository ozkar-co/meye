import { existsSync } from "node:fs";
import path from "node:path";
import { getDb } from "./db.js";
import { ASSETS_DIR } from "./paths.js";

export function httpError(status: number, message: string): Error {
  return Object.assign(new Error(message), { statusCode: status });
}

export type CatalogMaterial = {
  symbol: string;
  encoding_id: number;
  name: string;
  weight: number;
  resistence: number;
  damping: number;
  slice: number;
  damage: number;
  useful_life: number;
  level: string;
  price: number;
  category: string;
  decadency: string;
  group: number;
  color: string;
  epoch: string;
};

export type CatalogOrigin = {
  key: string;
  encoding_id: number;
  label: string;
  has_image: boolean;
};

export type CatalogSubType = {
  class: string;
  type: string;
  key: string;
  encoding_id: number;
  label: string;
};

export type CatalogSpec = {
  class: string;
  key: string;
  encoding_id: number;
  label: string;
};

function slug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function nextId(used: number[], min: number, max: number): number {
  const set = new Set(used);
  for (let i = min; i <= max; i++) {
    if (!set.has(i)) return i;
  }
  throw httpError(400, `No hay IDs libres entre ${min} y ${max}`);
}

function originCardPath(key: string): string {
  return path.join(ASSETS_DIR, "origins", `${key}.png`);
}

function rowToMaterial(row: Record<string, unknown>): CatalogMaterial {
  return {
    symbol: String(row.symbol),
    encoding_id: Number(row.encoding_id),
    name: String(row.name),
    weight: Number(row.weight),
    resistence: Number(row.resistence),
    damping: Number(row.damping),
    slice: Number(row.slice),
    damage: Number(row.damage),
    useful_life: Number(row.useful_life),
    level: String(row.level),
    price: Number(row.price),
    category: String(row.category),
    decadency: String(row.decadency),
    group: Number(row.grp),
    color: String(row.color || ""),
    epoch: String(row.epoch || ""),
  };
}

export function listMaterials(): CatalogMaterial[] {
  const rows = getDb()
    .prepare("SELECT * FROM materials ORDER BY symbol")
    .all() as Record<string, unknown>[];
  return rows.map(rowToMaterial);
}

export function materialIds(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of listMaterials()) out[m.symbol] = m.encoding_id;
  return out;
}

export function getMaterialRow(symbol: string): CatalogMaterial {
  const row = getDb()
    .prepare("SELECT * FROM materials WHERE symbol = ?")
    .get(symbol) as Record<string, unknown> | undefined;
  if (!row) throw httpError(404, `Unknown material: ${symbol}`);
  return rowToMaterial(row);
}

export function createMaterial(input: {
  symbol: string;
  name: string;
  encoding_id?: number;
  weight: number;
  resistence: number;
  damping: number;
  slice: number;
  damage?: number;
  useful_life: number;
  level: string;
  price: number;
  category: string;
  decadency: string;
  group: number;
  color?: string;
  epoch?: string;
}): CatalogMaterial {
  const symbol = input.symbol.trim().toUpperCase();
  if (!/^[A-Z]{1,4}\+?$/.test(symbol)) {
    throw httpError(400, "Símbolo inválido (1–4 letras, opcional +)");
  }
  const existing = listMaterials();
  if (existing.some((m) => m.symbol === symbol)) {
    throw httpError(409, `Ya existe el material ${symbol}`);
  }
  const encoding_id =
    input.encoding_id != null
      ? Number(input.encoding_id)
      : nextId(
          existing.map((m) => m.encoding_id),
          0,
          126
        );
  if (encoding_id < 0 || encoding_id > 126) {
    throw httpError(400, "encoding_id de material debe estar entre 0 y 126");
  }
  if (existing.some((m) => m.encoding_id === encoding_id)) {
    throw httpError(409, `encoding_id ${encoding_id} ya está en uso`);
  }
  getDb()
    .prepare(
      `
    INSERT INTO materials (
      symbol, encoding_id, name, weight, resistence, damping, slice, damage,
      useful_life, level, price, category, decadency, grp, color, epoch
    ) VALUES (
      @symbol, @encoding_id, @name, @weight, @resistence, @damping, @slice, @damage,
      @useful_life, @level, @price, @category, @decadency, @grp, @color, @epoch
    )
  `
    )
    .run({
      symbol,
      encoding_id,
      name: input.name.trim(),
      weight: Number(input.weight),
      resistence: Number(input.resistence),
      damping: Number(input.damping),
      slice: Number(input.slice),
      damage: Number(input.damage || 0),
      useful_life: Number(input.useful_life),
      level: input.level,
      price: Number(input.price),
      category: input.category,
      decadency: input.decadency || "-",
      grp: Number(input.group),
      color: input.color || "",
      epoch: input.epoch || "",
    });
  return getMaterialRow(symbol);
}

export function deleteMaterial(symbol: string): void {
  const info = getDb().prepare("DELETE FROM materials WHERE symbol = ?").run(symbol);
  if (!info.changes) throw httpError(404, `Unknown material: ${symbol}`);
}

export function listOrigins(): CatalogOrigin[] {
  const rows = getDb()
    .prepare("SELECT * FROM origins ORDER BY label COLLATE NOCASE")
    .all() as Record<string, unknown>[];
  return rows.map((row) => ({
    key: String(row.key),
    encoding_id: Number(row.encoding_id),
    label: String(row.label),
    has_image: existsSync(originCardPath(String(row.key))),
  }));
}

export function originIds(): Record<string, number> {
  const out: Record<string, number> = { desconocido: 0 };
  for (const o of listOrigins()) out[o.key] = o.encoding_id;
  return out;
}

export function createOrigin(input: { key?: string; label: string }): CatalogOrigin {
  const label = input.label.trim();
  const key = slug(input.key || label);
  if (!key) throw httpError(400, "Clave de origen inválida");
  const existing = listOrigins();
  if (existing.some((o) => o.key === key)) {
    throw httpError(409, `Ya existe el origen ${key}`);
  }
  const encoding_id = nextId(
    existing.map((o) => o.encoding_id),
    1,
    127
  );
  getDb()
    .prepare("INSERT INTO origins (key, encoding_id, label) VALUES (?, ?, ?)")
    .run(key, encoding_id, label);
  return listOrigins().find((o) => o.key === key)!;
}

export function deleteOrigin(key: string): void {
  const info = getDb().prepare("DELETE FROM origins WHERE key = ?").run(key);
  if (!info.changes) throw httpError(404, `Unknown origin: ${key}`);
}

export function listSubTypes(cls?: string, type?: string): CatalogSubType[] {
  let sql = "SELECT * FROM sub_types";
  const params: string[] = [];
  if (cls && type) {
    sql += " WHERE class = ? AND type = ?";
    params.push(cls, type);
  } else if (cls) {
    sql += " WHERE class = ?";
    params.push(cls);
  }
  sql += " ORDER BY class, type, label COLLATE NOCASE";
  const rows = getDb().prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map((row) => ({
    class: String(row.class),
    type: String(row.type),
    key: String(row.key),
    encoding_id: Number(row.encoding_id),
    label: String(row.label),
  }));
}

export function subTypeMap(itemClass: string, itemType: string): Record<string, number> {
  const out: Record<string, number> = { none: 15 };
  for (const row of listSubTypes(itemClass, itemType)) {
    out[row.key] = row.encoding_id;
  }
  return out;
}

export function createSubType(input: {
  class: string;
  type: string;
  key?: string;
  label: string;
}): CatalogSubType {
  const label = input.label.trim();
  const key = slug(input.key || label);
  if (!key) throw httpError(400, "Clave de subtipo inválida");
  const existing = listSubTypes(input.class, input.type);
  if (existing.some((s) => s.key === key)) {
    throw httpError(409, `Ya existe el subtipo ${key}`);
  }
  const encoding_id = nextId(
    existing.map((s) => s.encoding_id),
    0,
    14
  );
  getDb()
    .prepare(
      `INSERT INTO sub_types (class, type, key, encoding_id, label) VALUES (?, ?, ?, ?, ?)`
    )
    .run(input.class, input.type, key, encoding_id, label);
  return listSubTypes(input.class, input.type).find((s) => s.key === key)!;
}

export function deleteSubType(cls: string, type: string, key: string): void {
  const info = getDb()
    .prepare("DELETE FROM sub_types WHERE class = ? AND type = ? AND key = ?")
    .run(cls, type, key);
  if (!info.changes) throw httpError(404, "Subtipo no encontrado");
}

export function listSpecs(cls?: string): CatalogSpec[] {
  let sql = "SELECT * FROM specializations";
  const params: string[] = [];
  if (cls) {
    sql += " WHERE class = ?";
    params.push(cls);
  }
  sql += " ORDER BY class, label COLLATE NOCASE";
  const rows = getDb().prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map((row) => ({
    class: String(row.class),
    key: String(row.key),
    encoding_id: Number(row.encoding_id),
    label: String(row.label),
  }));
}

export function specMap(itemClass: string): Record<string, number> {
  const out: Record<string, number> = { none: 0 };
  for (const row of listSpecs(itemClass)) out[row.key] = row.encoding_id;
  return out;
}

export function createSpec(input: {
  class: string;
  key?: string;
  label: string;
}): CatalogSpec {
  const label = input.label.trim();
  const key = slug(input.key || label);
  if (!key) throw httpError(400, "Clave de especialización inválida");
  const existing = listSpecs(input.class);
  if (existing.some((s) => s.key === key)) {
    throw httpError(409, `Ya existe la especialización ${key}`);
  }
  const encoding_id = nextId(
    existing.map((s) => s.encoding_id),
    1,
    7
  );
  getDb()
    .prepare(
      `INSERT INTO specializations (class, key, encoding_id, label) VALUES (?, ?, ?, ?)`
    )
    .run(input.class, key, encoding_id, label);
  return listSpecs(input.class).find((s) => s.key === key)!;
}

export function deleteSpec(cls: string, key: string): void {
  const info = getDb()
    .prepare("DELETE FROM specializations WHERE class = ? AND key = ?")
    .run(cls, key);
  if (!info.changes) throw httpError(404, "Especialización no encontrada");
}

export function catalogLabels(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const o of listOrigins()) out[o.key] = o.label;
  for (const s of listSubTypes()) out[s.key] = s.label;
  for (const s of listSpecs()) out[s.key] = s.label;
  for (const m of listMaterials()) out[m.symbol] = m.name;
  return out;
}

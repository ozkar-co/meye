import {
  existsSync,
} from "node:fs";
import path from "node:path";
import {
  createCanvas,
  loadImage,
  registerFont,
  type CanvasRenderingContext2D,
} from "canvas";
import { ASSETS_DIR } from "../../paths.js";
import { get as getMaterial, all as allMaterials } from "../materials.js";
import * as util from "../util.js";
import { stringFormat as s, numberFormat as n, toCap } from "../i18n.js";
import type { Item } from "../models.js";
import { cacheKey, getOrCreatePng } from "../../cache.js";
import * as L from "./layout.js";

const BLACKLETTER = "UnifrakturCook";
const blackletterFile = path.join(
  ASSETS_DIR,
  "fonts",
  "UnifrakturCook-Bold.ttf"
);
if (existsSync(blackletterFile)) {
  registerFont(blackletterFile, { family: BLACKLETTER });
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/\//g, "|");
}

function round1(n: number): number {
  return util.round1(n);
}

type Ctx = CanvasRenderingContext2D;

function multiline(
  ctx: Ctx,
  text: string,
  pos: number[],
  maxWidth: number,
  size: number,
  align: CanvasTextAlign = "start",
  color = "#000",
  variant = "normal"
): number {
  ctx.font = `${variant} ${size}pt Sans`;
  ctx.textAlign = align;
  ctx.fillStyle = color;
  const words = text.split(" ");
  let line = "";
  let y = pos[1];
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    if (ctx.measureText(testLine).width > maxWidth && i > 0) {
      ctx.fillText(line, pos[0], y);
      line = words[i] + " ";
      y += size + 15;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, pos[0], y);
  return y;
}

function text(
  ctx: Ctx,
  value: string,
  pos: number[],
  size: number,
  align: CanvasTextAlign = "start",
  color = "#000",
  variant = "normal"
): void {
  ctx.font = `${variant} ${size}pt Sans`;
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.fillText(value, pos[0], pos[1]);
}

function strokeText(
  ctx: Ctx,
  value: string,
  pos: number[],
  size: number,
  align: CanvasTextAlign = "start",
  color = "#FFF",
  variant = "normal"
): void {
  ctx.font = `${variant} ${size}pt Sans`;
  ctx.textAlign = align;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 10;
  ctx.strokeText(value, pos[0], pos[1]);
  ctx.lineWidth = 1;
  ctx.fillStyle = color;
  ctx.fillText(value, pos[0], pos[1]);
}

/** Soft parchment wipe over the base glyph, then letter + value with a halo. */
function restrictionLabel(
  ctx: Ctx,
  letter: string,
  value: string,
  center: [number, number]
): void {
  const cx = center[0];
  const cy = center[1] - 8;
  const letterFont = `44pt ${BLACKLETTER}`;
  const valueFont = "bold 40pt Sans";
  const gap = 2;

  ctx.save();
  ctx.textBaseline = "middle";
  ctx.font = letterFont;
  const letterW = ctx.measureText(letter).width;
  ctx.font = valueFont;
  const valueW = ctx.measureText(value).width;
  const total = letterW + gap + valueW;
  const x0 = cx - total / 2;
  const scale = 1.5;
  const w = (total + 36) * scale;
  const h = 78 * scale;

  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 12 * scale);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.scale(w / 2, h / 2);
  const fade = ctx.createRadialGradient(0, 0, 0.08, 0, 0, 1);
  fade.addColorStop(0, "rgba(230, 208, 154, 0.92)");
  fade.addColorStop(0.42, "rgba(222, 198, 142, 0.5)");
  fade.addColorStop(1, "rgba(214, 188, 130, 0)");
  ctx.fillStyle = fade;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();

  ctx.save();
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.strokeStyle = "#ead7a4";
  ctx.lineWidth = 12;
  ctx.fillStyle = "#1a1208";
  ctx.textAlign = "start";
  ctx.font = letterFont;
  ctx.strokeText(letter, x0, cy);
  ctx.fillText(letter, x0, cy);
  ctx.font = valueFont;
  ctx.strokeText(value, x0 + letterW + gap, cy);
  ctx.fillText(value, x0 + letterW + gap, cy);
  ctx.restore();
}

async function drawPng(
  ctx: Ctx,
  name: string,
  pos: number[],
  size: number[]
): Promise<boolean> {
  const file = path.join(ASSETS_DIR, `${name}.png`);
  if (!existsSync(file)) return false;
  const img = await loadImage(file);
  ctx.drawImage(img, pos[0], pos[1], size[0], size[1]);
  return true;
}

async function renderFront(obj: Item): Promise<Buffer> {
  const canvas = createCanvas(L.CARD_W, L.CARD_H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, L.CARD_W, L.CARD_H);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, L.FOOTER_Y, L.CARD_W, L.CARD_H);

  const name = toCap(obj.type);
  let suffix = "";
  if (!isNaN(Number(obj.size_type)) && String(obj.size_type) !== "") {
    suffix = Number(obj.size_type) === 1 ? "pieza_completa" : "pieza_completas";
  }
  const desc = [
    obj.class === "comun" ? "" : obj.class,
    obj.type,
    obj.class === "explosivo" ? getMaterial(obj.material).name : "",
    obj.extra?.sub_type,
    obj.extra?.specialization,
    String(obj.size_type),
    suffix,
  ]
    .filter(
      (element) =>
        !["", "none", null, undefined, "desconocido"].includes(
          element as string
        )
    )
    .join(" ");

  await drawPng(ctx, "backgrounds/front", [0, 0], [L.CARD_W, L.CARD_H]);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, L.FOOTER_Y, L.CARD_W, L.CARD_H);

  text(ctx, obj.name || name, L.TITLE_POS, 60, "start", "#000", "bold");
  text(ctx, s(toCap(desc)), L.SUBTITLE_POS, 40, "start", "#555", "italic");

  text(ctx, "tamaño", [1230, 110], 40, "center", "#555", "bold");
  let labelSize = round1(Number(obj.size));
  if (obj.class === "explosivo") labelSize = round1(Number(obj.dimension));
  text(ctx, String(labelSize), [1250, 220], 80, "end", "#000", "bold");
  let labelThickness = round1(Number(obj.thickness)) + " G";
  if (obj.class === "explosivo") {
    labelThickness = round1(Number(obj.thickness) * 10) + " %";
  }
  text(ctx, labelThickness, [1260, 170], 40, "start");
  text(ctx, round1(Number(obj.dimension)) + " D", [1260, 220], 40, "start");

  const originKey = obj.extra?.origin;
  if (originKey && originKey !== "desconocido") {
    await drawPng(ctx, "origins/" + originKey, L.ART_POS, L.ART_SIZE);
  }
  const id = sanitizeFilename(
    obj.code + (obj.custom_code ? "-" : "") + (obj.custom_code || "")
  );
  const typeDefault = `objects/types/${obj.class}__${obj.type}`;
  if (
    !(await drawPng(ctx, "objects/" + id, L.ART_POS, L.ART_SIZE)) &&
    !(await drawPng(ctx, typeDefault, L.ART_POS, L.ART_SIZE))
  ) {
    await drawPng(ctx, "objects/desconocido", L.ART_POS, L.ART_SIZE);
  }
  if (obj.custom_code) {
    strokeText(ctx, `#${obj.code}`, [110, 980], 40, "start", "#FFF", "bold");
    strokeText(
      ctx,
      `#${obj.custom_code}`,
      [110, 1050],
      40,
      "start",
      "#FFF",
      "bold"
    );
  } else {
    strokeText(ctx, `#${obj.code}`, [110, 1050], 40, "start", "#FFF", "bold");
  }
  let symbol = obj.material;
  if (obj.extra?.material) symbol += "/" + obj.extra.material;
  const decay = getMaterial(obj.material).decadency;
  if (decay !== "-") symbol += " → " + decay;
  strokeText(ctx, symbol, [1375, 435], 40, "end", "#FFF", "bold");

  await drawPng(ctx, "levels/" + obj.crafting_level, [100, 1150], [200, 200]);
  const rarityQuality = `${obj.rarity}_${Number(obj.quality) * 10}`;
  await drawPng(ctx, "rarities/" + rarityQuality, [100, 1350], [200, 200]);

  text(ctx, "Lance", [380, 1200], 50);
  text(ctx, "Peso", [380, 1280], 50);
  text(ctx, obj.class === "explosivo" ? "Impacto" : "Amort.", [380, 1360], 50);
  text(ctx, "Resist.", [380, 1440], 50);
  text(ctx, "Vida Util", [380, 1520], 50);

  text(ctx, obj.throwing.toFixed(0), [1030, 1200], 50, "end");
  text(ctx, String(round1(Number(obj.weight))), [1030, 1280], 50, "end");
  let damping: string | number = obj.damping;
  if (!isNaN(Number(damping))) damping = round1(Number(damping));
  text(ctx, String(damping), [1030, 1360], 50, "end");
  let resistence: string | number = obj.resistence;
  if (!isNaN(Number(resistence))) resistence = round1(Number(resistence));
  text(ctx, String(resistence), [1030, 1440], 50, "end");
  let usefulLife: string | number = obj.useful_life;
  if (!isNaN(Number(usefulLife))) usefulLife = round1(Number(usefulLife));
  text(ctx, String(usefulLife), [1030, 1520], 50, "end");

  const restrictions: Record<string, string> = {};
  obj.restrictions.forEach(
    (rest) => (restrictions[rest.restriction] = util.plus(-rest.reduction))
  );
  const restPos: Record<string, [number, number]> = {
    F: [1160, 1210],
    A: [1160, 1310],
    V: [1160, 1410],
    R: [1160, 1510],
    I: [1320, 1210],
    S: [1320, 1310],
    C: [1320, 1410],
    W: [1320, 1510],
  };
  for (const [k, pos] of Object.entries(restPos)) {
    if (restrictions[k]) {
      restrictionLabel(ctx, k, restrictions[k], pos);
    }
  }

  let range = "—";
  obj.range.forEach((unit) => {
    range += `${unit}—`;
  });
  text(ctx, s("rango"), [350, 1675], 40, "center", "#555", "bold");
  text(ctx, range, [350, 1775], 50, "center");
  const data = `${obj.damage.toFixed()} / ${obj.slice.toFixed()} / ${obj.bleeding.toFixed()}`;
  text(ctx, data, [350, 1870], 70, "center");
  text(
    ctx,
    `${s("daño")} / ${s("corte")} / ${s("desangre")}`,
    [350, 1950],
    30,
    "center",
    "#555",
    "bold"
  );

  text(ctx, s("costos de fabricación"), [1050, 1675], 40, "center", "#555", "bold");
  await drawPng(ctx, "prices/raw", [750, 1720], [150, 150]);
  await drawPng(ctx, "prices/crafting", [1000, 1720], [150, 150]);
  await drawPng(ctx, "prices/fee", [1250, 1720], [150, 150]);
  text(
    ctx,
    `${n(Number(obj.price.raw).toFixed(0))} R`,
    [825, 1950],
    40,
    "center"
  );
  text(
    ctx,
    `${n(round1(Number(obj.price.crafting)))} R`,
    [1075, 1950],
    40,
    "center"
  );
  text(
    ctx,
    `${n(round1(Number(obj.price.fee)))} R`,
    [1325, 1950],
    40,
    "center"
  );
  text(ctx, s(obj.mod_code || ""), [100, 2075], 30, "start", "#FFF", "bold");

  if (obj.extra?.flags) {
    await Promise.all(
      obj.extra.flags.map((flag, idx) =>
        drawPng(
          ctx,
          "flags/" + flag,
          [L.FLAG_FRONT_X, L.FLAG_START_Y + L.FLAG_STEP_Y * idx],
          L.FLAG_FRONT_SIZE
        )
      )
    );
  }
  return canvas.toBuffer("image/png");
}

async function renderBack(obj: Item): Promise<Buffer> {
  const canvas = createCanvas(L.CARD_W, L.CARD_H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, L.CARD_W, L.CARD_H);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, L.FOOTER_Y, L.CARD_W, L.CARD_H);
  await drawPng(ctx, "backgrounds/back", [0, 0], [L.CARD_W, L.CARD_H]);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, L.FOOTER_Y, L.CARD_W, L.CARD_H);

  if (obj.extra?.flags) {
    await Promise.all(
      obj.extra.flags.map((flag, idx) =>
        drawPng(
          ctx,
          "flags/" + flag,
          [L.FLAG_BACK_X, L.FLAG_START_Y + L.FLAG_STEP_Y * idx],
          L.FLAG_BACK_SIZE
        )
      )
    );
  }

  let nextY = 160;
  for (const effect of obj.effects || []) {
    text(ctx, effect.title, [100, nextY - 60], 40, "start", "#000", "bold");
    nextY = 160 + multiline(ctx, effect.description, [100, nextY], 1100, 40);
  }
  text(ctx, s("Tierras de Meye"), [1400, 2075], 30, "end", "#FFF", "bold");
  return canvas.toBuffer("image/png");
}

async function renderTable(): Promise<Buffer> {
  const canvas = createCanvas(L.TABLE_W, L.TABLE_H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, L.TABLE_W, L.TABLE_H);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#000";
  const initPos = [300, 500];
  const boxW = 260;
  const boxH = 150;
  const periods = [0, 0.1, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5];
  const categories: Record<string, string> = {
    Volatil: "#538",
    Reactivo: "#a44",
    Precioso: "#bb5",
    Organico: "#8b8",
    No_Metalico: "#378",
    Mistico: "#79d",
    Metalico: "#999",
    Metal_Blando: "#98a",
    Alquimenidos: "#336",
  };

  periods.forEach((period) => {
    const pos = util.addVec(initPos, [
      -80,
      periods.indexOf(Number(period)) * boxH - 20,
    ]);
    text(ctx, String(period), pos, 65, "end", "#000", "bold");
  });
  for (let group = 10; group >= 0; group--) {
    const pos = util.addVec(initPos, [group * boxW + 50, -200]);
    text(ctx, String(group), pos, 65, "center", "#000", "bold");
  }

  for (const mat of allMaterials()) {
    if (mat.symbol.includes("+")) continue;
    const pos = util.addVec(initPos, [
      mat.group * boxW,
      periods.indexOf(Number(mat.weight)) * boxH,
    ]);
    ctx.fillStyle = categories[mat.category] || "#ccc";
    const boxPos = util.addVec(pos, [-15, -130]);
    ctx.fillRect(boxPos[0], boxPos[1], boxW, boxH);
    text(ctx, mat.symbol, pos, 65, "start", "#000", "bold");
    text(ctx, mat.name, util.addVec(pos, [0, -90]), 20);
    text(ctx, String(mat.resistence), util.addVec(pos, [boxW - 30, -100]), 15, "end");
    text(ctx, String(mat.damping), util.addVec(pos, [boxW - 30, -80]), 15, "end");
    text(ctx, String(mat.useful_life), util.addVec(pos, [boxW - 30, -60]), 15, "end");
    text(
      ctx,
      `${mat.damage ?? 0}/${mat.slice}`,
      util.addVec(pos, [boxW - 30, -40]),
      15,
      "end"
    );
    text(ctx, mat.level, util.addVec(pos, [boxW - 30, -20]), 15, "end");
    text(ctx, mat.decadency, util.addVec(pos, [boxW - 30, 0]), 15, "end");
    ctx.strokeRect(boxPos[0], boxPos[1], boxW, boxH);
  }
  return canvas.toBuffer("image/png");
}

/** Cached front/back card PNGs. */
export async function renderCard(
  obj: Item,
  side: "front" | "back" | "both" = "both"
): Promise<{ front?: Buffer; back?: Buffer }> {
  const keyBase = cacheKey({
    rev: 8,
    code: obj.code,
    custom: obj.custom_code,
    mods: obj.modifications,
    effects: obj.effects,
    name: obj.name,
  });
  const out: { front?: Buffer; back?: Buffer } = {};
  if (side === "front" || side === "both") {
    out.front = await getOrCreatePng(`${keyBase}_front`, () =>
      renderFront(obj)
    );
  }
  if (side === "back" || side === "both") {
    out.back = await getOrCreatePng(`${keyBase}_back`, () => renderBack(obj));
  }
  return out;
}

export async function renderMaterialsTable(): Promise<Buffer> {
  const mats = allMaterials().map((m) => m.symbol);
  return getOrCreatePng(
    `materials_table_${cacheKey(mats)}`,
    () => renderTable()
  );
}

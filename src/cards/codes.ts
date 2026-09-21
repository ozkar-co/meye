import { readFileSync } from "node:fs";
import path from "node:path";
import numberToBase64 from "number-to-base64";
import { DATA_DIR } from "../paths.js";
import * as catalog from "../catalog.js";
import * as util from "./util.js";
import type { ItemExtra, ItemMods, ItemParams } from "./models.js";

const { ntob } = numberToBase64 as { ntob: (n: number) => string };

type Dict = {
  sizes: Record<string, number>;
  modifications: Record<string, string>;
  classes: Record<
    string,
    {
      value: number;
      types: Record<string, number>;
    }
  >;
};

const dict: Dict = JSON.parse(
  readFileSync(path.join(DATA_DIR, "dictionary.json"), "utf8")
);

function atob3(code: string): number {
  const raw = Buffer.from(code, "base64").toString("binary");
  return (
    raw.charCodeAt(2) + (raw.charCodeAt(1) << 8) + (raw.charCodeAt(0) << 16)
  );
}

export function decodeBase(code: string) {
  const data = atob3(code);
  const itemClass = util.getKeyByParam(
    dict.classes as unknown as Record<string, Record<string, unknown>>,
    "value",
    (data >> 14) & 0x7
  );
  if (!itemClass) throw new Error(`Invalid base code class bits: ${code}`);
  const material = util.getKey(catalog.materialIds(), data >> 17);
  const type = util.getKey(dict.classes[itemClass].types, (data >> 10) & 0xf);
  const dimension = util.getKey(dict.sizes, (data >> 7) & 0x7);
  const thickness = util.getKey(dict.sizes, (data >> 4) & 0x7);
  if (!material || !type || !dimension || !thickness) {
    throw new Error(`Invalid base code: ${code}`);
  }
  return {
    material,
    class: itemClass,
    type,
    dimension: Number(dimension),
    thickness: Number(thickness),
    quality: ((data & 0xf) * 0.1).toFixed(1),
  };
}

export function encodeBase(params: ItemParams): string {
  const matId = catalog.materialIds()[params.material];
  if (matId == null) throw new Error(`Unknown material: ${params.material}`);
  let result = Number(params.quality) * 10;
  result += dict.sizes[String(params.thickness)] << 4;
  result += dict.sizes[String(params.dimension)] << 7;
  result += dict.classes[params.class].types[params.type] << 10;
  result += dict.classes[params.class].value << 14;
  result += matId << 17;
  return ntob(result);
}

export function decodeCustom(
  code: string,
  itemClass: string,
  itemType: string
): ItemExtra {
  const extraPart = code.split("-")[1];
  const data = atob3(code.split("-")[0]);
  const flagsMap: Record<string, number> = {
    graphy: (data >> 9) & 0x1,
    lacing: (data >> 8) & 0x1,
    alchemy: (data >> 7) & 0x1,
    cenobism: (data >> 6) & 0x1,
    energy: (data >> 5) & 0x1,
    object_manipulation: (data >> 4) & 0x1,
    ilusion: (data >> 3) & 0x1,
    mental_manipulation: (data >> 2) & 0x1,
    potentiation: (data >> 1) & 0x1,
    vital_control: data & 0x1,
  };
  const subId = (data >> 13) & 0xf;
  const subMap = catalog.subTypeMap(itemClass, itemType);
  const sub_type = util.getKey(subMap, subId) || "none";
  const result: ItemExtra = {
    origin:
      util.getKey(catalog.originIds(), (data >> 17) & 0x7f) || "desconocido",
    sub_type: sub_type === "desconocido" ? "none" : sub_type,
    specialization:
      util.getKey(catalog.specMap(itemClass), (data >> 10) & 0x7) || "none",
    flags: Object.keys(flagsMap).filter((key) => flagsMap[key]),
  };
  if (result.specialization === "desconocido") {
    result.specialization = "none";
  }
  if (extraPart) {
    const hexData = parseInt(extraPart, 16);
    result.material = util.getKey(catalog.materialIds(), hexData >> 3);
    const th = util.getKey(dict.sizes, hexData & 0x7);
    result.thickness = th !== undefined ? Number(th) : undefined;
  }
  return result;
}

export function encodeCustom(params: ItemParams): string {
  if (!params.extra) throw new Error("encodeCustom requires params.extra");
  const subMap = catalog.subTypeMap(params.class, params.type);
  const subKey = params.extra.sub_type || "none";
  const subId = subMap[subKey] ?? 15;
  const specKey = params.extra.specialization || "none";
  const specId = catalog.specMap(params.class)[specKey] ?? 0;

  let result = (catalog.originIds()[params.extra.origin] ?? 0) << 17;
  result += subId << 13;
  result += specId << 10;
  if (params.extra.flags) {
    result += (params.extra.flags.includes("graphy") ? 1 : 0) << 9;
    result += (params.extra.flags.includes("lacing") ? 1 : 0) << 8;
    result += (params.extra.flags.includes("alchemy") ? 1 : 0) << 7;
    result += (params.extra.flags.includes("cenobism") ? 1 : 0) << 6;
    result += (params.extra.flags.includes("energy") ? 1 : 0) << 5;
    result +=
      (params.extra.flags.includes("object_manipulation") ? 1 : 0) << 4;
    result += (params.extra.flags.includes("ilusion") ? 1 : 0) << 3;
    result +=
      (params.extra.flags.includes("mental_manipulation") ? 1 : 0) << 2;
    result += (params.extra.flags.includes("potentiation") ? 1 : 0) << 1;
    result += (params.extra.flags.includes("vital_control") ? 1 : 0) << 0;
  }
  let out = ntob(result);
  if (params.extra.material && params.extra.thickness != null) {
    const extraMat = catalog.materialIds()[params.extra.material];
    if (extraMat == null) {
      throw new Error(`Unknown extra material: ${params.extra.material}`);
    }
    let hex = extraMat << 3;
    hex += dict.sizes[String(params.extra.thickness)];
    out += "-" + hex.toString(16);
  }
  return out;
}

export function modString(params: { modifications?: ItemMods }): string {
  if (!params.modifications) return "";
  const result: string[] = [];
  for (const mod of Object.keys(params.modifications)) {
    const value = params.modifications[mod as keyof ItemMods];
    const name = dict.modifications[mod];
    if (value == null || !name) continue;
    if (!isNaN(Number(value)) && typeof value !== "object") {
      result.push(name + util.plus(Number(value)));
      continue;
    }
    if (Array.isArray(value)) {
      result.push(
        name +
          "[" +
          value
            .map((e) => {
              if (typeof e === "object" && e !== null && "restriction" in e) {
                return (
                  (e as { restriction: string; reduction: number })
                    .restriction +
                  util.plus(
                    Number(
                      (e as { restriction: string; reduction: number })
                        .reduction
                    )
                  )
                );
              }
              return util.plus(Number(e));
            })
            .join("/") +
          "]"
      );
      continue;
    }
    if (typeof value === "object") {
      const price = value as { raw?: number; crafting?: number; fee?: number };
      result.push(
        name +
          "{" +
          util.plus(Number(price.raw || 0)) +
          "/" +
          util.plus(Number(price.crafting || 0)) +
          "/" +
          util.plus(Number(price.fee || 0)) +
          "}"
      );
    }
  }
  return result.join(" ");
}

export function itemId(baseCode: string, customCode?: string): string {
  return customCode ? `${baseCode}-${customCode}` : baseCode;
}

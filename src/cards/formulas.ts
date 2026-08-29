import { readFileSync } from "node:fs";
import path from "node:path";
import { DATA_DIR } from "../paths.js";
import { createRaw } from "./materials.js";
import * as util from "./util.js";
import * as code from "./codes.js";
import type {
  Item,
  ItemMods,
  ItemParams,
  Restriction,
} from "./models.js";

type ObjectsDef = {
  crafting_level: Record<
    string,
    { quality: number; score: number; fee: number }
  >;
  class: Record<
    string,
    {
      dimension: Record<string, { value: number; level?: number }>;
      type: Record<
        string,
        {
          level?: number;
          variable_damage?: number;
          damage?: number[];
          slice?: number[];
          bleeding?: number[];
          throwing?: number;
          range?: number;
          weight_factor?: number;
          max_thickness?: number;
        }
      >;
      restrictions: {
        property?: string;
        ranges?: Record<string, string[]>;
      };
    }
  >;
};

const objects: ObjectsDef = JSON.parse(
  readFileSync(path.join(DATA_DIR, "objects.json"), "utf8")
);

function calculateRequiredLevel(params: ItemParams): string {
  const rawMaterial = createRaw(params);
  const material = rawMaterial.material;
  let qualityScore = Infinity;
  Object.values(objects.crafting_level).forEach((e) => {
    if (e.quality >= Number(params.quality) && e.score < qualityScore) {
      qualityScore = e.score;
    }
  });
  const ranges = objects.class[params.class].dimension;
  const dim = util.getKeyByParamLess(
    ranges as unknown as Record<string, Record<string, unknown>>,
    "value",
    params.dimension
  );
  const aprendizLevel = 0;
  const objectLevel =
    objects.class[params.class].type[params.type]?.level ||
    (dim ? objects.class[params.class].dimension[dim]?.level : undefined) ||
    aprendizLevel;
  const outOfLimits =
    (params.thickness < Math.floor(params.dimension / 2) ? 1 : 0) *
    objects.crafting_level["mistico"].score;
  const score = Math.max(
    objects.crafting_level[material.level].score,
    objectLevel,
    qualityScore === Infinity ? 0 : qualityScore,
    outOfLimits
  );
  const level = util.getKeyByParam(
    objects.crafting_level as unknown as Record<
      string,
      Record<string, unknown>
    >,
    "score",
    score
  );
  if (!level) throw new Error(`No crafting level for score ${score}`);
  return level;
}

function calculateWeight(params: ItemParams): number {
  const rawMaterial = createRaw(params);
  const objectType = objects.class[params.class].type[params.type];
  if (params.class === "comun") {
    return rawMaterial.weight * (objectType.weight_factor || 1);
  }
  return rawMaterial.weight;
}

function calculateDamping(params: ItemParams): number {
  const rawMaterial = createRaw(params);
  const material = rawMaterial.material;
  if (params.class === "explosivo") {
    return material.damping * rawMaterial.size;
  }
  return Math.min(
    (params.thickness / 5) * material.damping,
    material.damping
  );
}

function calculateUsefulLife(params: ItemParams): number {
  const rawMaterial = createRaw(params);
  const material = rawMaterial.material;
  if (params.class === "explosivo") return 1;
  return Math.floor(Number(params.quality) * material.useful_life);
}

function calculateRestrictions(params: ItemParams): Restriction[] {
  let restrictions = objects.class[params.class].restrictions;
  if (!restrictions || Object.keys(restrictions).length === 0) return [];
  const property = restrictions.property!;
  const range = util.closest(
    Object.keys(restrictions.ranges!),
    Number((params as Record<string, unknown>)[property])
  );
  let list = restrictions.ranges![range];
  const weight = calculateWeight(params);
  const reduction = Math.floor(weight / list.length);
  const result = list.map((r) => ({ restriction: r, reduction }));
  const missing = weight - reduction * list.length;
  for (let i = 0; i < missing; i++) {
    result[i].reduction++;
  }
  return result;
}

function calculateRarity(params: ItemParams): string {
  const level = calculateRequiredLevel(params);
  let rarity = "comun";
  if (Number(params.quality) === 1) rarity = "magistral";
  switch (level) {
    case "ciencia":
      if (rarity !== "magistral") rarity = "raro";
      break;
    case "mistico":
      rarity = "especial";
      break;
    case "divino":
      rarity = "legendario";
      break;
  }
  return rarity;
}

function calculateDamage(params: ItemParams): number {
  const rawMaterial = createRaw(params);
  if (!["arma", "explosivo"].includes(params.class)) {
    return calculateWeight(params);
  }
  const material = rawMaterial.material;
  const armaType = objects.class[params.class].type[params.type];
  const variableDamage = armaType.variable_damage || 0;
  const damping = calculateDamping(params);
  let baseDamage: number;
  switch (params.type) {
    case "contundente":
      baseDamage = calculateWeight(params);
      break;
    case "de_tension":
      baseDamage = Math.max(
        0,
        Math.round((damping * params.dimension) / 10)
      );
      break;
    case "deflagrante":
    case "detonante":
      baseDamage = Math.round(
        material.resistence * params.thickness * params.dimension
      );
      break;
    default:
      baseDamage = Math.abs(
        Math.round(
          (armaType.damage![0] || 0) +
            (armaType.damage![1] || 0) * params.thickness +
            (armaType.damage![2] || 0) * params.thickness ** 2
        )
      );
      break;
  }
  const damage = baseDamage * (1 - variableDamage * (1 - Number(params.quality)));
  return Number(Math.round(damage).toFixed());
}

function calculateSlice(params: ItemParams): number {
  if (params.class !== "arma") return 0;
  const rawMaterial = createRaw(params);
  const material = rawMaterial.material;
  const armaType = objects.class[params.class].type[params.type];
  const thickness = params.thickness;
  let slice: number;
  switch (params.type) {
    case "contundente":
    case "de_tension":
      slice = 0;
      break;
    default:
      slice = Math.abs(
        Math.round(
          (armaType.slice![0] || 0) +
            (armaType.slice![1] || 0) * thickness +
            (armaType.slice![2] || 0) * thickness ** 2
        )
      );
      break;
  }
  return Math.min(slice, material.slice);
}

function calculateBleeding(params: ItemParams): number {
  if (params.class !== "arma") return 0;
  const armaType = objects.class[params.class].type[params.type];
  const thickness = params.thickness;
  switch (params.type) {
    case "contundente":
    case "de_tension":
      return 0;
    default:
      return Math.round(
        (armaType.bleeding![0] || 0) +
          (armaType.bleeding![1] || 0) * thickness +
          (armaType.bleeding![2] || 0) * thickness ** 2
      );
  }
}

function calculateThrowing(params: ItemParams): number {
  if (params.class !== "arma") {
    return calculateWeight(params) * 2;
  }
  const armaType = objects.class[params.class].type[params.type];
  return calculateWeight(params) * (armaType.throwing || 1);
}

function generateSizeType(params: ItemParams): string {
  const ranges = objects.class[params.class].dimension;
  return (
    util.getKeyByParamLess(
      ranges as unknown as Record<string, Record<string, unknown>>,
      "value",
      params.dimension
    ) || "desconocido"
  );
}

function calculateRange(params: ItemParams): Array<number | string> {
  const rawMaterial = createRaw(params);
  if (!["arma", "explosivo"].includes(params.class)) {
    return [
      Math.round(params.dimension * 2),
      Math.round(params.dimension * 4),
    ];
  }
  const armaType = objects.class[params.class].type[params.type];
  let rangeMax: number;
  switch (params.type) {
    case "de_tension":
      rangeMax =
        Math.round(
          Math.abs(290 + 140 * Math.log(params.dimension)) / 10
        ) * 10;
      break;
    case "deflagrante":
    case "detonante":
      return [
        rawMaterial.weight.toFixed(0),
        (rawMaterial.weight * 2).toFixed(0),
        (rawMaterial.weight * 4).toFixed(0),
      ];
    default:
      rangeMax = Math.round(params.dimension * (armaType.range || 1));
      break;
  }
  return [Math.floor(rangeMax / 2), rangeMax];
}

function calculatePrice(params: ItemParams) {
  const rawMaterial = createRaw(params);
  const level = calculateRequiredLevel(params);
  const raw = rawMaterial.price;
  let crafting = Math.ceil(
    rawMaterial.price *
      (0.2 + Math.abs(params.dimension - params.thickness))
  );
  const fee = objects.crafting_level[level].fee;
  if (params.class === "explosivo") {
    crafting = rawMaterial.price * params.thickness;
  }
  return { raw, crafting, fee };
}

function addRestriction(
  restrictions: Restriction[],
  update: Restriction
): Restriction[] {
  let found = false;
  restrictions.forEach((element, index) => {
    if (element.restriction === update.restriction) {
      restrictions[index].reduction += Number(update.reduction);
      found = true;
    }
  });
  if (!found) {
    restrictions = restrictions.concat([update]);
  }
  return restrictions;
}

function applyExtra(obj: Item): Item {
  if (!obj.extra) return obj;
  if (obj.extra.material) {
    const extraParams: ItemParams = {
      class: obj.class,
      dimension: obj.dimension,
      material: obj.extra.material,
      thickness: obj.extra.thickness || 0,
      quality: obj.quality,
      type: obj.type,
    };
    const raw = createRaw(extraParams);
    const damping = calculateDamping(extraParams);
    const usefulLife = calculateUsefulLife(extraParams);
    obj.price.raw += Number(raw.price);
    obj.weight += Number(raw.weight);
    obj.size += Number(raw.size);
    obj.damping += "/" + Number(damping);
    obj.resistence += "/" + Number(raw.material.resistence);
    obj.useful_life += "/" + Number(usefulLife);
    const reduction = Math.floor(raw.weight);
    if (reduction) {
      obj.restrictions = addRestriction(obj.restrictions, {
        restriction: "R",
        reduction,
      });
    }
    obj.thickness = Number(obj.thickness) + Number(obj.extra.thickness || 0);
    obj.throwing = calculateThrowing(obj);
    obj.damage = calculateDamage(obj);
    obj.slice = calculateSlice(obj);
    obj.bleeding = calculateBleeding(obj);
  }
  obj.price.crafting = Math.ceil(obj.price.crafting * 1.1);
  obj.price.fee *= 1.5;
  if (obj.extra.flags && obj.extra.flags.length > 0) {
    obj.price.fee += objects.crafting_level.mistico.fee;
    if (obj.crafting_level !== "divino") {
      obj.crafting_level = "mistico";
    }
    if (obj.rarity !== "sobrenatural" && obj.rarity !== "legendario") {
      obj.rarity = "especial";
    }
    if (obj.rarity !== "legendario" && obj.extra.flags.includes("cenobism")) {
      obj.rarity = "sobrenatural";
    }
  }
  return obj;
}

function applyMods(obj: Item): Item {
  if (!obj.modifications) return obj;
  const mods = obj.modifications as ItemMods;
  for (const mod of Object.keys(mods)) {
    if (mod === "restrictions") {
      for (const res of mods.restrictions || []) {
        obj.restrictions = addRestriction(obj.restrictions, res);
      }
      continue;
    }
    if (mod === "range") {
      obj.range = obj.range.map(
        (ran, idx) => Number(ran) + Number((mods.range || [])[idx] || 0)
      );
      continue;
    }
    if (mod === "price") {
      obj.price.raw += Number(mods.price?.raw || 0);
      obj.price.crafting += Number(mods.price?.crafting || 0);
      obj.price.fee += Number(mods.price?.fee || 0);
      continue;
    }
    if (mod === "crafting_level") {
      obj.crafting_level = String(mods.crafting_level);
      continue;
    }
    if (mod === "rarity") {
      obj.rarity = String(mods.rarity);
      continue;
    }
    const key = mod as keyof Item;
    (obj as Record<string, unknown>)[mod] =
      Number((obj as Record<string, unknown>)[mod]) + Number(mods[mod]);
    if (Number((obj as Record<string, unknown>)[mod]) < 0) {
      (obj as Record<string, unknown>)[mod] = 1;
    }
    void key;
  }
  return obj;
}

/** Calculate full item stats from creation params. Does not persist. */
export function create(params: ItemParams): Item {
  if (!objects.class[params.class]) {
    throw new Error(`Unknown class: ${params.class}`);
  }
  if (!objects.class[params.class].type[params.type]) {
    throw new Error(`Unknown type ${params.type} for class ${params.class}`);
  }
  const p: ItemParams = { ...params };
  if (p.class === "armadura") {
    p.thickness = Math.min(
      p.thickness,
      objects.class[p.class].type[p.type].max_thickness || p.thickness
    );
  }
  p.quality = Number(p.quality).toFixed(1);
  const rawMaterial = createRaw(p);
  const material = rawMaterial.material;
  const baseObject: Item = {
    ...p,
    damage: calculateDamage(p),
    slice: calculateSlice(p),
    bleeding: calculateBleeding(p),
    resistence: material.resistence,
    size: rawMaterial.size,
    size_type: generateSizeType(p),
    throwing: calculateThrowing(p),
    weight: calculateWeight(p),
    restrictions: calculateRestrictions(p),
    range: calculateRange(p),
    damping: calculateDamping(p),
    useful_life: calculateUsefulLife(p),
    crafting_level: calculateRequiredLevel(p),
    price: calculatePrice(p),
    code: code.encodeBase(p),
    custom_code: p.extra ? code.encodeCustom(p) : undefined,
    mod_code: p.modifications ? code.modString(p) : undefined,
    rarity: calculateRarity(p),
  };
  return applyExtra(applyMods(baseObject));
}

/** Rebuild item from codes; optional overlay for name/effects/mods from DB. */
export function load(
  baseCode: string,
  customCode?: string,
  overlay?: {
    name?: string;
    effects?: ItemParams["effects"];
    modifications?: ItemMods;
  }
): Item {
  const params: ItemParams = {
    ...decodeBaseAsParams(baseCode),
  };
  if (customCode) {
    params.extra = code.decodeCustom(customCode, params.class);
  }
  if (overlay) {
    if (overlay.name) params.name = overlay.name;
    if (overlay.effects) params.effects = overlay.effects;
    if (overlay.modifications) params.modifications = overlay.modifications;
  }
  return create(params);
}

function decodeBaseAsParams(baseCode: string): ItemParams {
  const d = code.decodeBase(baseCode);
  return {
    material: d.material,
    class: d.class,
    type: d.type,
    dimension: d.dimension,
    thickness: d.thickness,
    quality: d.quality,
  };
}

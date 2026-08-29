import { readFileSync } from "node:fs";
import path from "node:path";
import { DATA_DIR } from "../paths.js";

export type Material = {
  symbol: string;
  name: string;
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
};

const materials: Material[] = JSON.parse(
  readFileSync(path.join(DATA_DIR, "materials.json"), "utf8")
);

export const all = materials;

/** Fail fast if material symbol is unknown. */
export function get(symbol: string): Material {
  const mat = materials.find((element) => element.symbol === symbol);
  if (!mat) {
    throw new Error(`Unknown material: ${symbol}`);
  }
  return mat;
}

export type RawStats = {
  weight: number;
  price: number;
  damping: number;
  size: number;
  material: Material;
};

/** Size/weight/price from dimension × thickness. */
export function createRaw(params: {
  material: string;
  dimension: number;
  thickness: number;
}): RawStats {
  const size = params.dimension * params.thickness;
  const rawMaterial = get(params.material);
  const damping = Math.min(
    (params.thickness / 5) * rawMaterial.damping,
    rawMaterial.damping
  );
  return {
    weight: rawMaterial.weight * size,
    price: rawMaterial.price * size,
    damping,
    size,
    material: rawMaterial,
  };
}

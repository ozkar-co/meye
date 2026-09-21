import { getMaterialRow, listMaterials } from "../catalog.js";
import type { CatalogMaterial } from "../catalog.js";

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

function toMaterial(row: CatalogMaterial): Material {
  return {
    symbol: row.symbol,
    name: row.name,
    weight: row.weight,
    resistence: row.resistence,
    damping: row.damping,
    slice: row.slice,
    damage: row.damage,
    useful_life: row.useful_life,
    level: row.level,
    price: row.price,
    category: row.category,
    decadency: row.decadency,
    group: row.group,
  };
}

export function all(): Material[] {
  return listMaterials().map(toMaterial);
}

/** Fail fast if material symbol is unknown. */
export function get(symbol: string): Material {
  return toMaterial(getMaterialRow(symbol));
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

export type Restriction = {
  restriction: string;
  reduction: number;
};

export type ItemEffect = {
  title: string;
  description: string;
};

export type ItemExtra = {
  origin: string;
  sub_type: string;
  specialization: string;
  flags?: string[];
  material?: string;
  thickness?: number;
};

export type ItemMods = {
  restrictions?: Restriction[];
  range?: number[];
  price?: { raw?: number; crafting?: number; fee?: number };
  crafting_level?: string;
  rarity?: string;
  [key: string]: unknown;
};

export type ItemParams = {
  name?: string;
  quality: number | string;
  class: string;
  dimension: number;
  type: string;
  material: string;
  thickness: number;
  extra?: ItemExtra;
  modifications?: ItemMods;
  effects?: ItemEffect[];
};

export type ItemPrice = {
  raw: number;
  crafting: number;
  fee: number;
};

export type Item = ItemParams & {
  damage: number;
  slice: number;
  bleeding: number;
  resistence: number | string;
  size: number;
  size_type: string | number;
  throwing: number;
  weight: number;
  restrictions: Restriction[];
  range: Array<number | string>;
  damping: number | string;
  useful_life: number | string;
  crafting_level: string;
  price: ItemPrice;
  code: string;
  custom_code?: string;
  mod_code?: string;
  rarity: string;
};

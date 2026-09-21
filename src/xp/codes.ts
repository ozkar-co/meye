import type {
  BasicStatsInput,
  SpecialStatsInput,
  SupernaturalStatsInput,
} from "./calculations.js";
import { clampStat } from "./calculations.js";

export const MAX_TYPE1 = 255;
export const MAX_TYPE2 = 1024;
export const MAX_CONTAINER = 1024;
export const MAX_TRANS = 1024;
export const MAX_SKILLS = 15;
export const MAX_TRANS_PER_SKILL = 15;

const TYPE1_BITS = 8;
const WIDE_BITS = 11;
const WIDTH_FIELD = 4;

export type CharacterCodeState = {
  doubleType1: boolean;
  includeSupernatural: boolean;
  basic: BasicStatsInput;
  special: SpecialStatsInput;
  supernatural: SupernaturalStatsInput;
};

function clamp(n: unknown, max: number): number {
  return Math.min(clampStat(n), max);
}

function bit(on: boolean): number {
  return on ? 1 : 0;
}

class BitWriter {
  private bytes: number[] = [];
  private cur = 0;
  private bit = 0;

  write(value: number, width: number): void {
    let v = value >>> 0;
    for (let i = 0; i < width; i++) {
      if (v & (1 << i)) this.cur |= 1 << this.bit;
      this.bit += 1;
      if (this.bit === 8) {
        this.bytes.push(this.cur);
        this.cur = 0;
        this.bit = 0;
      }
    }
  }

  finish(): Uint8Array {
    if (this.bit) this.bytes.push(this.cur);
    return Uint8Array.from(this.bytes);
  }
}

class BitReader {
  private i = 0;
  private bit = 0;

  constructor(private bytes: Uint8Array) {}

  read(width: number): number {
    let v = 0;
    for (let i = 0; i < width; i++) {
      const byte = this.bytes[this.i] ?? 0;
      if (byte & (1 << this.bit)) v |= 1 << i;
      this.bit += 1;
      if (this.bit === 8) {
        this.bit = 0;
        this.i += 1;
      }
    }
    return v;
  }
}

function bytesToB64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64").replace(/=+$/, "");
}

function b64ToBytes(str: string): Uint8Array {
  const clean = str.replace(/\s/g, "");
  const pad = clean.length % 4 === 0 ? "" : "=".repeat(4 - (clean.length % 4));
  return Uint8Array.from(Buffer.from(clean + pad, "base64"));
}

function bitsNeeded(n: number): number {
  if (n <= 0) return 0;
  return Math.ceil(Math.log2(n + 1));
}

/** All-zero → 1 bit. Else pick min+delta or raw, whichever is shorter. */
function writeCluster(w: BitWriter, values: number[], valueBits: number): void {
  const cap = (1 << valueBits) - 1;
  const vals = values.map((n) => clamp(n, cap));
  const mx = Math.max(0, ...vals);
  if (mx === 0) {
    w.write(0, 1);
    return;
  }
  w.write(1, 1);
  const mn = Math.min(...vals);
  const rawW = bitsNeeded(mx);
  const relW = bitsNeeded(mx - mn);
  const rawCost = WIDTH_FIELD + vals.length * rawW;
  const relCost = valueBits + WIDTH_FIELD + vals.length * relW;
  if (relCost < rawCost) {
    w.write(1, 1);
    w.write(mn, valueBits);
    w.write(relW, WIDTH_FIELD);
    if (relW) for (const n of vals) w.write(n - mn, relW);
  } else {
    w.write(0, 1);
    w.write(rawW, WIDTH_FIELD);
    for (const n of vals) w.write(n, rawW);
  }
}

function readCluster(r: BitReader, count: number, valueBits: number): number[] {
  if (!r.read(1)) return Array.from({ length: count }, () => 0);
  const relative = Boolean(r.read(1));
  if (relative) {
    const mn = r.read(valueBits);
    const relW = r.read(WIDTH_FIELD);
    if (!relW) return Array.from({ length: count }, () => mn);
    return Array.from({ length: count }, () => mn + r.read(relW));
  }
  const rawW = r.read(WIDTH_FIELD);
  return Array.from({ length: count }, () => (rawW ? r.read(rawW) : 0));
}

function writeMasked(w: BitWriter, values: number[], valueBits: number): void {
  for (const n of values) w.write(n > 0 ? 1 : 0, 1);
  const present = values.filter((n) => n > 0);
  if (present.length) writeCluster(w, present, valueBits);
}

function readMasked(r: BitReader, count: number, valueBits: number): number[] {
  const mask: boolean[] = Array.from({ length: count }, () => Boolean(r.read(1)));
  const nPresent = mask.filter(Boolean).length;
  const packed = nPresent ? readCluster(r, nPresent, valueBits) : [];
  let j = 0;
  return mask.map((on) => (on ? packed[j++] ?? 0 : 0));
}

function writeMain(w: BitWriter, state: CharacterCodeState): void {
  const b = state.basic;
  const s = state.special;
  w.write(bit(b.physical.talented), 1);
  w.write(bit(b.coordination.talented), 1);
  w.write(bit(b.mental.talented), 1);
  w.write(bit(s.energyTankTalented), 1);
  w.write(bit(s.physical.talented), 1);
  w.write(bit(s.mental.talented), 1);
  w.write(bit(s.energy.talented), 1);
  w.write(bit(state.doubleType1), 1);

  writeCluster(
    w,
    [
      b.physical.strength,
      b.physical.agility,
      b.physical.speed,
      b.physical.resistance,
    ].map((n) => clamp(n, MAX_TYPE1)),
    TYPE1_BITS
  );
  writeCluster(
    w,
    [
      b.coordination.precision,
      b.coordination.calculation,
      b.coordination.range,
      b.coordination.reflexes,
    ].map((n) => clamp(n, MAX_TYPE1)),
    TYPE1_BITS
  );
  writeCluster(
    w,
    [
      b.mental.intelligence,
      b.mental.wisdom,
      b.mental.concentration,
      b.mental.will,
    ].map((n) => clamp(n, MAX_TYPE1)),
    TYPE1_BITS
  );

  writeMasked(
    w,
    [
      s.physical.empowerment,
      s.physical.vitalControl,
      s.mental.illusion,
      s.mental.mentalControl,
      s.energy.energyHandling,
      s.energy.objectHandling,
    ].map((n) => clamp(n, MAX_TYPE2)),
    WIDE_BITS
  );

  writeMasked(
    w,
    [clamp(b.life, MAX_CONTAINER), clamp(s.energyTank, MAX_CONTAINER)],
    WIDE_BITS
  );
}

function writeExtra(w: BitWriter, state: CharacterCodeState): void {
  w.write(1, 1);
  const skills = (state.supernatural?.skills || []).slice(0, MAX_SKILLS);
  w.write(skills.length, 4);
  const transLists = skills.map((skill) => {
    const trans = (skill.transformations || [0])
      .slice(0, MAX_TRANS_PER_SKILL)
      .map((n) => clamp(n, MAX_TRANS));
    return trans.length ? trans : [0];
  });
  const flat = transLists.flat();
  const tw = bitsNeeded(Math.max(0, ...flat));
  w.write(tw, WIDTH_FIELD);
  for (const list of transLists) {
    w.write(list.length, 4);
    if (tw) for (const n of list) w.write(n, tw);
  }
}

export function encodeCharacter(state: CharacterCodeState): string {
  const main = new BitWriter();
  writeMain(main, state);
  let code = bytesToB64(main.finish());
  if (state.includeSupernatural) {
    const extra = new BitWriter();
    writeExtra(extra, state);
    code += "-" + bytesToB64(extra.finish());
  }
  return code;
}

export function decodeCharacter(code: string): CharacterCodeState {
  const raw = String(code || "").trim();
  const dash = raw.indexOf("-");
  const mainStr = dash === -1 ? raw : raw.slice(0, dash);
  const extraStr = dash === -1 ? "" : raw.slice(dash + 1);
  if (!mainStr) throw new Error("código vacío");

  const mainBytes = b64ToBytes(mainStr);
  if (!mainBytes.length) throw new Error("código base incompleto");
  const r = new BitReader(mainBytes);
  const physicalTalented = Boolean(r.read(1));
  const coordinationTalented = Boolean(r.read(1));
  const mentalTalented = Boolean(r.read(1));
  const energyTankTalented = Boolean(r.read(1));
  const hPhysicalTalented = Boolean(r.read(1));
  const hMentalTalented = Boolean(r.read(1));
  const hEnergyTalented = Boolean(r.read(1));
  const doubleType1 = Boolean(r.read(1));

  const phys = readCluster(r, 4, TYPE1_BITS);
  const coord = readCluster(r, 4, TYPE1_BITS);
  const ment = readCluster(r, 4, TYPE1_BITS);
  const t2 = readMasked(r, 6, WIDE_BITS);
  const containers = readMasked(r, 2, WIDE_BITS);

  let includeSupernatural = false;
  let skills: { transformations: number[] }[] = [{ transformations: [0] }];
  if (extraStr) {
    const e = new BitReader(b64ToBytes(extraStr));
    includeSupernatural = Boolean(e.read(1));
    const nSkills = e.read(4);
    const tw = e.read(WIDTH_FIELD);
    const decoded: { transformations: number[] }[] = [];
    for (let i = 0; i < nSkills; i++) {
      const nTrans = Math.max(1, e.read(4));
      const transformations = Array.from({ length: nTrans }, () =>
        tw ? Math.min(e.read(tw), MAX_TRANS) : 0
      );
      decoded.push({ transformations });
    }
    if (decoded.length) skills = decoded;
  }

  return {
    doubleType1,
    includeSupernatural,
    basic: {
      physical: {
        strength: Math.min(phys[0], MAX_TYPE1),
        agility: Math.min(phys[1], MAX_TYPE1),
        speed: Math.min(phys[2], MAX_TYPE1),
        resistance: Math.min(phys[3], MAX_TYPE1),
        talented: physicalTalented,
      },
      coordination: {
        precision: Math.min(coord[0], MAX_TYPE1),
        calculation: Math.min(coord[1], MAX_TYPE1),
        range: Math.min(coord[2], MAX_TYPE1),
        reflexes: Math.min(coord[3], MAX_TYPE1),
        talented: coordinationTalented,
      },
      mental: {
        intelligence: Math.min(ment[0], MAX_TYPE1),
        wisdom: Math.min(ment[1], MAX_TYPE1),
        concentration: Math.min(ment[2], MAX_TYPE1),
        will: Math.min(ment[3], MAX_TYPE1),
        talented: mentalTalented,
      },
      life: Math.min(containers[0], MAX_CONTAINER),
    },
    special: {
      physical: {
        empowerment: Math.min(t2[0], MAX_TYPE2),
        vitalControl: Math.min(t2[1], MAX_TYPE2),
        talented: hPhysicalTalented,
      },
      mental: {
        illusion: Math.min(t2[2], MAX_TYPE2),
        mentalControl: Math.min(t2[3], MAX_TYPE2),
        talented: hMentalTalented,
      },
      energy: {
        energyHandling: Math.min(t2[4], MAX_TYPE2),
        objectHandling: Math.min(t2[5], MAX_TYPE2),
        talented: hEnergyTalented,
      },
      energyTank: Math.min(containers[1], MAX_CONTAINER),
      energyTankTalented,
    },
    supernatural: { skills },
  };
}

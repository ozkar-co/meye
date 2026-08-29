/** Sujfi syllable map (Spanish-ish chunks → Sujfi). */
export const SUJFI: Record<string, string> = {
  a: "u",
  e: "o",
  i: "i",
  o: "e",
  u: "a",
  b: "fa",
  c: "ha",
  d: "ja",
  f: "ke",
  g: "le",
  k: "na",
  l: "ra",
  m: "ta",
  n: "fe",
  p: "he",
  q: "ki",
  r: "li",
  s: "me",
  t: "ne",
  v: "ru",
  w: "se",
  x: "ti",
  y: "ko",
  z: "je",
  ba: "fol",
  ca: "faj",
  da: "mis",
  fa: "fi",
  ga: "fu",
  be: "hej",
  ce: "hon",
  de: "nas",
  fe: "ho",
  ge: "hu",
  bi: "jak",
  ci: "jul",
  di: "rah",
  fi: "ji",
  gi: "jo",
  bo: "kej",
  co: "kut",
  do: "sel",
  fo: "ka",
  go: "ku",
  bu: "lit",
  cu: "lot",
  du: "tum",
  fu: "lu",
  gu: "lek",
  ja: "fef",
  ka: "fif",
  la: "met",
  ma: "fah",
  na: "mek",
  je: "haf",
  ke: "mu",
  le: "nut",
  me: "his",
  ne: "nij",
  ji: "ju",
  ki: "jim",
  li: "rem",
  mi: "jum",
  ni: "rol",
  jo: "kil",
  ko: "koh",
  lo: "sir",
  mo: "kam",
  no: "shi",
  ju: "lik",
  ku: "luh",
  lu: "tem",
  mu: "lal",
  nu: "tel",
  pa: "mi",
  qa: "mo",
  ra: "muj",
  sa: "for",
  ta: "muh",
  pe: "no",
  qe: "nu",
  re: "suj",
  se: "hos",
  te: "nuh",
  pi: "raf",
  qi: "rej",
  ri: "rik",
  si: "jen",
  ti: "ruj",
  po: "si",
  qo: "suh",
  ro: "suf",
  so: "kan",
  to: "su",
  pu: "te",
  qu: "teh",
  ru: "tuk",
  su: "lam",
  tu: "toj",
  va: "fur",
  wa: "mum",
  xa: "fus",
  ya: "men",
  za: "mal",
  ve: "hus",
  we: "nul",
  xe: "heh",
  ye: "nem",
  ze: "nah",
  vi: "jar",
  wi: "res",
  xi: "jas",
  yi: "rit",
  zi: "run",
  vo: "kih",
  wo: "sek",
  xo: "kos",
  yo: "sok",
  zo: "sa",
  vu: "lon",
  wu: "tus",
  xu: "les",
  yu: "tut",
  zu: "tir",
};

const reverse = new Map<string, string>();

/** Fail fast if dictionary is invalid. */
export function assertDictHealthy(): void {
  const values = Object.values(SUJFI);
  const seen = new Set<string>();
  for (const [key, value] of Object.entries(SUJFI)) {
    if (!key || key.length > 3) {
      throw new Error(`Sujfi dict bad key: "${key}"`);
    }
    if (!value || value.length > 3) {
      throw new Error(`Sujfi dict bad value for ${key}: "${value}"`);
    }
    if (seen.has(value)) {
      throw new Error(`Sujfi dict duplicate value: "${value}"`);
    }
    seen.add(value);
    reverse.set(value, key);
  }
  if (values.length !== seen.size) {
    throw new Error("Sujfi dict value uniqueness check failed");
  }
}

assertDictHealthy();

export function reverseLookup(sujfiChunk: string): string | undefined {
  return reverse.get(sujfiChunk);
}

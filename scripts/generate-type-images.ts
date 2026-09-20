/**
 * Generate default object art for every class/type pair via Genkit.
 *
 * Usage:
 *   npx tsx scripts/generate-type-images.ts [--dry-run] [--force] [--filter arma/de_hoja]
 *
 * Env:
 *   GENKIT_DIR  path to genkit repo (default: ../genkit from project root)
 */
import { existsSync, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const ASSETS_DIR = path.join(DATA_DIR, "assets");
const OUT_DIR = path.join(ASSETS_DIR, "objects", "types");
const GENKIT_DIR =
  process.env.GENKIT_DIR || path.resolve(ROOT, "..", "genkit");
const PROFILE = "fantasy-item-alpha";
const PROJECT = "meye";

/** English object descriptions for fantasy-item-alpha (wrapper adds isolation/bg). */
const PROMPTS: Record<string, string> = {
  "arma/proyectil": "medieval fantasy throwing javelin with iron head",
  "arma/penetrante": "fantasy piercing spear with steel tip and wooden shaft",
  "arma/de_hoja": "classic medieval fantasy longsword with crossguard",
  "arma/cizallante": "battle axe with wooden haft and steel blade",
  "arma/contundente": "flanged war mace with studded head",
  "arma/de_tension": "recurve longbow with leather grip, unstrung",

  "armadura/coraza": "fantasy cuirass breastplate armor piece",
  "armadura/placas": "segmented plate armor pauldron piece",
  "armadura/escamada": "scale mail armor section with overlapping metal scales",
  "armadura/tachonada": "studded leather brigandine armor vest",
  "armadura/malla": "chainmail coif hood armor piece",
  "armadura/fibras": "woven padded gambeson armor jacket",

  "comun/hueco": "hollow ceramic amphora jar vessel",
  "comun/solido": "solid carved stone block with rune markings",
  "comun/instrumento_musical": "medieval wooden lute musical instrument",
  "comun/comestible": "round fantasy bread loaf ration",
  "comun/contenedor": "leather drawstring pouch container",
  "comun/utilitario": "brass oil lantern utility item",
  "comun/escritura": "rolled parchment scroll with wax seal",
  "comun/amuleto": "fantasy talisman amulet on leather cord",
  "comun/ornamento": "ornate fantasy jewel brooch pin",

  "explosivo/deflagrante": "alchemical flash powder horn container",
  "explosivo/detonante": "iron blasting sphere bomb with short fuse",

  "escudo/trigonal": "triangular kite shield with metal boss",
  "escudo/ojivado": "pointed heater shield with rivets",
  "escudo/tripuntado": "three-pointed fantasy shield",
  "escudo/bourbon": "bourbon-style rounded shield with emblem",
  "escudo/tarja": "tall rectangular pavise shield",
  "escudo/rodela": "small round buckler shield",
  "escudo/pelta": "crescent pelta shield",
  "escudo/gota_de_agua": "teardrop-shaped fantasy shield",
  "escudo/parma": "small round parma shield",
  "escudo/aspis": "Greek hoplite aspis round shield",
  "escudo/escotado": "notched scutum shield with curved top",
  "escudo/rectangular": "tall rectangular tower shield",
  "escudo/scutum": "Roman scutum legionary shield",
  "escudo/glagwa": "fantasy tribal wooden glagwa shield",
  "escudo/adarga": "Moorish leather adarga shield pair shape",
  "escudo/medialuna": "crescent moon shaped shield",
};

type Dictionary = {
  classes: Record<string, { types: Record<string, number> }>;
};

type Combo = { class: string; type: string; prompt: string; out: string };

function comboKey(cls: string, type: string): string {
  return `${cls}/${type}`;
}

function outName(cls: string, type: string): string {
  return `${cls}__${type}`;
}

async function loadCombos(): Promise<Combo[]> {
  const raw = await readFile(path.join(DATA_DIR, "dictionary.json"), "utf8");
  const dict = JSON.parse(raw) as Dictionary;
  const combos: Combo[] = [];

  for (const [cls, def] of Object.entries(dict.classes)) {
    for (const type of Object.keys(def.types)) {
      const key = comboKey(cls, type);
      const prompt = PROMPTS[key];
      if (!prompt) {
        throw new Error(`missing prompt for ${key} — add it to PROMPTS in generate-type-images.ts`);
      }
      combos.push({
        class: cls,
        type,
        prompt,
        out: path.join(OUT_DIR, `${outName(cls, type)}.png`),
      });
    }
  }

  combos.sort((a, b) => comboKey(a.class, a.type).localeCompare(comboKey(b.class, b.type)));
  return combos;
}

function parseArgs(argv: string[]) {
  const dryRun = argv.includes("--dry-run");
  const force = argv.includes("--force");
  const filterIdx = argv.indexOf("--filter");
  const filter = filterIdx >= 0 ? argv[filterIdx + 1] : undefined;
  const batchIdx = argv.indexOf("--batch");
  const batch =
    batchIdx >= 0
      ? argv[batchIdx + 1]
      : `type-images-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  return { dryRun, force, filter, batch };
}

function runGenkit(combo: Combo, batch: string): void {
  const runSh = path.join(GENKIT_DIR, "run.sh");
  if (!existsSync(runSh)) {
    throw new Error(`genkit not found at ${GENKIT_DIR} (set GENKIT_DIR)`);
  }

  const result = spawnSync(
    runSh,
    [
      "image",
      "--profile",
      PROFILE,
      "--prompt",
      combo.prompt,
      "--out",
      combo.out,
      "--project",
      PROJECT,
      "--batch",
      batch,
    ],
    { cwd: GENKIT_DIR, stdio: "inherit", encoding: "utf8" }
  );

  if (result.status !== 0) {
    throw new Error(
      `genkit failed for ${comboKey(combo.class, combo.type)} (exit ${result.status})`
    );
  }
}

async function main(): Promise<void> {
  const { dryRun, force, filter, batch } = parseArgs(process.argv.slice(2));
  const combos = await loadCombos();
  const selected = filter
    ? combos.filter((c) => comboKey(c.class, c.type) === filter)
    : combos;

  if (selected.length === 0) {
    throw new Error(filter ? `no combo matches --filter ${filter}` : "no combos");
  }

  mkdirSync(OUT_DIR, { recursive: true });

  console.log(`profile=${PROFILE}  genkit=${GENKIT_DIR}`);
  console.log(`out=${OUT_DIR}  batch=${batch}  items=${selected.length}`);

  let ok = 0;
  let skipped = 0;

  for (const combo of selected) {
    const key = comboKey(combo.class, combo.type);
    if (!force && existsSync(combo.out)) {
      console.log(`skip ${key} (exists)`);
      skipped++;
      continue;
    }

    console.log(`\n→ ${key}`);
    console.log(`  prompt: ${combo.prompt}`);
    console.log(`  out:    ${combo.out}`);

    if (dryRun) continue;

    runGenkit(combo, batch);
    ok++;
  }

  console.log(
    `\ndone: generated=${ok} skipped=${skipped} dry_run=${dryRun}`
  );
  if (!dryRun && ok > 0) {
    console.log(`report: ${GENKIT_DIR}/run.sh report --project ${PROJECT} --batch ${batch}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

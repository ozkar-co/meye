import { readFileSync } from "node:fs";
import path from "node:path";
import type { FastifyPluginAsync } from "fastify";
import { DATA_DIR } from "../paths.js";
import { all as allMaterials } from "../cards/materials.js";
import * as catalog from "../catalog.js";

type Dict = {
  classes: Record<string, { types: Record<string, number> }>;
  sizes: Record<string, number>;
  flags: Record<string, number>;
};

function uniqueKeys(obj: Record<string, unknown> | undefined): string[] {
  if (!obj) return [];
  return [...new Set(Object.keys(obj))]
    .filter((k) => k !== "desconocido" && k !== "none" && k !== "XX")
    .sort();
}

const dict: Dict = JSON.parse(
  readFileSync(path.join(DATA_DIR, "dictionary.json"), "utf8")
);
const staticLabels: Record<string, string> = JSON.parse(
  readFileSync(path.join(DATA_DIR, "labels.json"), "utf8")
);

const NUMERIC_MODS = [
  "damage",
  "slice",
  "bleeding",
  "resistence",
  "size",
  "throwing",
  "weight",
  "damping",
  "useful_life",
];

export const metaRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/meta",
    {
      schema: {
        tags: ["system"],
        summary: "Form options for the UI",
      },
    },
    async () => {
      const classes = Object.keys(dict.classes);
      const typesByClass: Record<string, string[]> = {};
      const subTypesByType: Record<string, Record<string, string[]>> = {};
      const specializationsByClass: Record<string, string[]> = {};
      for (const c of classes) {
        typesByClass[c] = uniqueKeys(dict.classes[c].types);
        specializationsByClass[c] = catalog.listSpecs(c).map((s) => s.key);
        subTypesByType[c] = {};
        for (const t of typesByClass[c]) {
          subTypesByType[c][t] = catalog.listSubTypes(c, t).map((s) => s.key);
        }
      }
      const sizes = [
        ...new Set(Object.keys(dict.sizes).map((s) => Number(s))),
      ].sort((a, b) => a - b);
      const origins = catalog.listOrigins();
      return {
        classes,
        typesByClass,
        subTypesByType,
        specializationsByClass,
        sizes,
        materials: allMaterials()
          .filter((m) => !m.symbol.includes("+"))
          .map((m) => ({ symbol: m.symbol, name: m.name })),
        origins: origins.map((o) => o.key),
        originDetails: origins,
        flags: Object.keys(dict.flags),
        qualities: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        labels: { ...staticLabels, ...catalog.catalogLabels() },
        modFields: NUMERIC_MODS,
        restrictionAttrs: ["F", "A", "V", "R", "I", "S", "C", "W"],
        craftingLevels: [
          "aprendiz",
          "funcion",
          "disciplina",
          "ciencia",
          "mistico",
          "divino",
        ],
        materialCategories: [
          "Volatil",
          "Reactivo",
          "Precioso",
          "Organico",
          "No_Metalico",
          "Mistico",
          "Metalico",
          "Metal_Blando",
          "Alquimenidos",
        ],
      };
    }
  );
};

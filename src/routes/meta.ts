import { readFileSync } from "node:fs";
import path from "node:path";
import type { FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import { DATA_DIR } from "../paths.js";
import { all as materials } from "../cards/materials.js";

type DictClass = {
  types: Record<string, number>;
  sub_types: Record<string, Record<string, number>>;
  specializations: Record<string, number>;
};

type Dict = {
  classes: Record<string, DictClass>;
  sizes: Record<string, number>;
  origins: Record<string, number>;
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

export const metaRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/meta",
    {
      schema: {
        tags: ["system"],
        summary: "Form options for the UI",
        response: {
          200: Type.Object({
            classes: Type.Array(Type.String()),
            typesByClass: Type.Record(Type.String(), Type.Array(Type.String())),
            /** class → type → subtype names */
            subTypesByType: Type.Record(
              Type.String(),
              Type.Record(Type.String(), Type.Array(Type.String()))
            ),
            specializationsByClass: Type.Record(
              Type.String(),
              Type.Array(Type.String())
            ),
            sizes: Type.Array(Type.Number()),
            materials: Type.Array(
              Type.Object({
                symbol: Type.String(),
                name: Type.String(),
              })
            ),
            origins: Type.Array(Type.String()),
            flags: Type.Array(Type.String()),
            qualities: Type.Array(Type.Number()),
          }),
        },
      },
    },
    async () => {
      const classes = Object.keys(dict.classes);
      const typesByClass: Record<string, string[]> = {};
      const subTypesByType: Record<string, Record<string, string[]>> = {};
      const specializationsByClass: Record<string, string[]> = {};
      for (const c of classes) {
        typesByClass[c] = uniqueKeys(dict.classes[c].types);
        specializationsByClass[c] = uniqueKeys(
          dict.classes[c].specializations
        );
        subTypesByType[c] = {};
        for (const t of typesByClass[c]) {
          subTypesByType[c][t] = uniqueKeys(dict.classes[c].sub_types?.[t]);
        }
      }
      const sizes = [
        ...new Set(Object.keys(dict.sizes).map((s) => Number(s))),
      ].sort((a, b) => a - b);
      return {
        classes,
        typesByClass,
        subTypesByType,
        specializationsByClass,
        sizes,
        materials: materials
          .filter((m) => !m.symbol.includes("+"))
          .map((m) => ({ symbol: m.symbol, name: m.name })),
        origins: uniqueKeys(dict.origins),
        flags: Object.keys(dict.flags),
        qualities: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
      };
    }
  );
};

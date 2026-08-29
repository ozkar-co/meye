#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { create, load } from "./cards/formulas.js";
import { itemId } from "./cards/codes.js";
import { findItem, listItems, upsertItem } from "./db.js";
import {
  renderCard,
  renderMaterialsTable,
  writeCardFiles,
} from "./cards/render/index.js";
import {
  translateFromSujfi,
  translateToSujfi,
  renderSujfiImage,
} from "./languages/sujfi/index.js";
import type { ItemParams } from "./cards/models.js";

const program = new Command();
program.name("meye").description("Meye tools CLI").version("2.0.0");

const item = program.command("item").description("Item / card tools");

item
  .command("list")
  .description("List persisted items")
  .action(() => {
    console.log(JSON.stringify(listItems(), null, 2));
  });

item
  .command("get")
  .argument("<base>")
  .argument("[custom]")
  .description("Load item by code")
  .action((base: string, custom?: string) => {
    const id = itemId(base, custom);
    const stored = findItem(id);
    const obj = load(
      base,
      custom,
      stored
        ? {
            name: stored.name,
            effects: stored.effects,
            modifications: stored.modifications,
          }
        : undefined
    );
    console.log(JSON.stringify(obj, null, 2));
  });

item
  .command("create")
  .requiredOption("--class <class>")
  .requiredOption("--type <type>")
  .requiredOption("--material <symbol>")
  .requiredOption("--dimension <n>", "dimension", Number)
  .requiredOption("--thickness <n>", "thickness", Number)
  .requiredOption("--quality <n>", "quality 0.1-1", Number)
  .option("--name <name>")
  .option("--persist", "save to sqlite if name set")
  .description("Create item from params (JSON extras via stdin not supported yet)")
  .action((opts) => {
    const params: ItemParams = {
      class: opts.class,
      type: opts.type,
      material: opts.material,
      dimension: opts.dimension,
      thickness: opts.thickness,
      quality: opts.quality,
      name: opts.name,
    };
    const obj = create(params);
    if (opts.persist && opts.name) {
      upsertItem({
        id: itemId(obj.code, obj.custom_code),
        base_code: obj.code,
        custom_code: obj.custom_code,
        name: opts.name,
      });
    }
    console.log(JSON.stringify(obj, null, 2));
  });

item
  .command("card")
  .argument("<base>")
  .argument("[custom]")
  .option("-o, --out <dir>", "output directory", "./out")
  .description("Render card PNGs")
  .action(async (base: string, custom: string | undefined, opts) => {
    const stored = findItem(itemId(base, custom));
    const obj = load(
      base,
      custom,
      stored
        ? {
            name: stored.name,
            effects: stored.effects,
            modifications: stored.modifications,
          }
        : undefined
    );
    mkdirSync(opts.out, { recursive: true });
    const paths = await writeCardFiles(obj, opts.out);
    console.log(JSON.stringify(paths, null, 2));
  });

program
  .command("materials-table")
  .option("-o, --out <file>", "output PNG", "./out/table.png")
  .description("Render materials table")
  .action(async (opts) => {
    const buf = await renderMaterialsTable();
    mkdirSync(path.dirname(opts.out), { recursive: true });
    writeFileSync(opts.out, buf);
    console.log(opts.out);
  });

const lang = program.command("lang").description("Constructed languages");

lang
  .command("translate")
  .argument("<language>")
  .argument("<word>")
  .option("--from", "translate from constructed language")
  .action((language: string, word: string, opts) => {
    if (language !== "sujfi") {
      console.error(`Unknown language: ${language}`);
      process.exit(1);
    }
    const result = opts.from
      ? translateFromSujfi(word)
      : translateToSujfi(word);
    console.log(result);
  });

lang
  .command("image")
  .argument("<language>")
  .argument("<word>")
  .option("-o, --out <file>", "output PNG", "./out/sujfi.png")
  .action(async (language: string, word: string, opts) => {
    if (language !== "sujfi") {
      console.error(`Unknown language: ${language}`);
      process.exit(1);
    }
    const buf = await renderSujfiImage(word);
    mkdirSync(path.dirname(opts.out), { recursive: true });
    writeFileSync(opts.out, buf);
    console.log(opts.out);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});

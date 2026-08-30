import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import { create, load } from "../cards/formulas.js";
import { itemId } from "../cards/codes.js";
import { findItem, listItems, upsertItem } from "../db.js";
import { renderCard } from "../cards/render/index.js";
import type { ItemParams } from "../cards/models.js";

const EffectSchema = Type.Object({
  title: Type.String(),
  description: Type.String(),
});

const ExtraSchema = Type.Object({
  origin: Type.String(),
  sub_type: Type.String(),
  specialization: Type.String(),
  flags: Type.Optional(Type.Array(Type.String())),
  material: Type.Optional(Type.String()),
  thickness: Type.Optional(Type.Number()),
});

const CreateBody = Type.Object({
  name: Type.Optional(Type.String()),
  quality: Type.Union([Type.Number(), Type.String()]),
  class: Type.String(),
  dimension: Type.Number(),
  type: Type.String(),
  material: Type.String(),
  thickness: Type.Number(),
  extra: Type.Optional(ExtraSchema),
  modifications: Type.Optional(Type.Record(Type.String(), Type.Any())),
  effects: Type.Optional(Type.Array(EffectSchema)),
  persist: Type.Optional(Type.Boolean()),
});

export const itemsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/items",
    {
      schema: {
        tags: ["items"],
        summary: "List persisted items",
        response: {
          200: Type.Array(
            Type.Object({
              id: Type.String(),
              base_code: Type.String(),
              custom_code: Type.Union([Type.String(), Type.Null()]),
              name: Type.String(),
              created_at: Type.String(),
              updated_at: Type.String(),
            })
          ),
        },
      },
    },
    async () =>
      listItems().map(({ id, base_code, custom_code, name, created_at, updated_at }) => ({
        id,
        base_code,
        custom_code,
        name,
        created_at,
        updated_at,
      }))
  );

  app.post(
    "/items",
    {
      schema: {
        tags: ["items"],
        summary: "Create item (optionally persist if name/persist)",
        body: CreateBody,
      },
    },
    async (req) => {
      const body = req.body as ItemParams & { persist?: boolean };
      const item = create(body);
      const shouldPersist = Boolean(body.name) && body.persist !== false;
      if (shouldPersist && body.name) {
        const id = itemId(item.code, item.custom_code);
        upsertItem({
          id,
          base_code: item.code,
          custom_code: item.custom_code,
          name: body.name,
          effects: body.effects,
          modifications: body.modifications,
        });
      }
      return item;
    }
  );

  const loadByCodes = (base: string, custom?: string) => {
    const stored = findItem(itemId(base, custom));
    return load(
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
  };

  const sendCard = async (
    reply: FastifyReply,
    base: string,
    custom: string | undefined,
    side: "front" | "back"
  ) => {
    const item = loadByCodes(base, custom);
    const pngs = await renderCard(item, side);
    const buf = side === "back" ? pngs.back! : pngs.front!;
    return reply.type("image/png").send(buf);
  };

  const cardParams = Type.Object({
    base: Type.String(),
    custom: Type.String(),
  });
  const baseParams = Type.Object({ base: Type.String() });

  app.get(
    "/items/:base/:custom/card/front",
    {
      schema: {
        tags: ["items"],
        summary: "Render card front PNG",
        params: cardParams,
      },
    },
    async (req, reply) => {
      const { base, custom } = req.params as { base: string; custom: string };
      return sendCard(reply, base, custom, "front");
    }
  );

  app.get(
    "/items/:base/:custom/card/back",
    {
      schema: {
        tags: ["items"],
        summary: "Render card back PNG",
        params: cardParams,
      },
    },
    async (req, reply) => {
      const { base, custom } = req.params as { base: string; custom: string };
      return sendCard(reply, base, custom, "back");
    }
  );

  app.get(
    "/items/:base/card/front",
    {
      schema: {
        tags: ["items"],
        summary: "Render card front PNG (base code only)",
        params: baseParams,
      },
    },
    async (req, reply) => {
      const { base } = req.params as { base: string };
      return sendCard(reply, base, undefined, "front");
    }
  );

  app.get(
    "/items/:base/card/back",
    {
      schema: {
        tags: ["items"],
        summary: "Render card back PNG (base code only)",
        params: baseParams,
      },
    },
    async (req, reply) => {
      const { base } = req.params as { base: string };
      return sendCard(reply, base, undefined, "back");
    }
  );

  app.get(
    "/items/:base/:custom",
    {
      schema: {
        tags: ["items"],
        summary: "Load item by base + custom code",
        params: cardParams,
      },
    },
    async (req) => {
      const { base, custom } = req.params as { base: string; custom: string };
      return loadByCodes(base, custom);
    }
  );

  app.get(
    "/items/:base",
    {
      schema: {
        tags: ["items"],
        summary: "Load item by base code only",
        params: baseParams,
      },
    },
    async (req) => {
      const { base } = req.params as { base: string };
      return loadByCodes(base);
    }
  );
};

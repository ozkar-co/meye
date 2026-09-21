import type { FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import { createReadStream, existsSync } from "node:fs";
import * as catalog from "../catalog.js";
import {
  deleteOriginImages,
  originCardPath,
  saveOriginImage,
} from "../assets.js";

export const catalogRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/materials",
    {
      schema: {
        tags: ["catalog"],
        summary: "List materials",
      },
    },
    async () => catalog.listMaterials()
  );

  app.post(
    "/materials",
    {
      schema: {
        tags: ["catalog"],
        summary: "Create material",
        body: Type.Object({
          symbol: Type.String(),
          name: Type.String(),
          encoding_id: Type.Optional(Type.Number()),
          weight: Type.Number(),
          resistence: Type.Number(),
          damping: Type.Number(),
          slice: Type.Number(),
          damage: Type.Optional(Type.Number()),
          useful_life: Type.Number(),
          level: Type.String(),
          price: Type.Number(),
          category: Type.String(),
          decadency: Type.String(),
          group: Type.Number(),
          color: Type.Optional(Type.String()),
          epoch: Type.Optional(Type.String()),
        }),
      },
    },
    async (req) => catalog.createMaterial(req.body as Parameters<typeof catalog.createMaterial>[0])
  );

  app.delete(
    "/materials/:symbol",
    {
      schema: {
        tags: ["catalog"],
        summary: "Delete material",
        params: Type.Object({ symbol: Type.String() }),
      },
    },
    async (req) => {
      catalog.deleteMaterial((req.params as { symbol: string }).symbol);
      return { ok: true };
    }
  );

  app.get(
    "/origins",
    {
      schema: { tags: ["catalog"], summary: "List origins" },
    },
    async () => catalog.listOrigins()
  );

  app.post(
    "/origins",
    {
      schema: {
        tags: ["catalog"],
        summary: "Create origin",
        body: Type.Object({
          key: Type.Optional(Type.String()),
          label: Type.String(),
        }),
      },
    },
    async (req) =>
      catalog.createOrigin(req.body as { key?: string; label: string })
  );

  app.delete(
    "/origins/:key",
    {
      schema: {
        tags: ["catalog"],
        summary: "Delete origin",
        params: Type.Object({ key: Type.String() }),
      },
    },
    async (req) => {
      const { key } = req.params as { key: string };
      catalog.deleteOrigin(key);
      deleteOriginImages(key);
      return { ok: true };
    }
  );

  app.get(
    "/media/origins/:key",
    {
      schema: {
        tags: ["catalog"],
        summary: "Origin card image",
        params: Type.Object({ key: Type.String() }),
      },
    },
    async (req, reply) => {
      const { key } = req.params as { key: string };
      const file = originCardPath(key);
      if (!existsSync(file)) {
        return reply.status(404).send({ error: "Not found", message: key });
      }
      return reply.type("image/png").send(createReadStream(file));
    }
  );

  app.post(
    "/origins/:key/image",
    {
      schema: {
        tags: ["catalog"],
        summary: "Upload origin source image (stores original + blurred card copy)",
        params: Type.Object({ key: Type.String() }),
      },
    },
    async (req) => {
      const { key } = req.params as { key: string };
      const file = await req.file();
      if (!file) throw catalog.httpError(400, "Falta el archivo");
      const buf = await file.toBuffer();
      await saveOriginImage(key, buf, file.filename);
      return catalog.listOrigins().find((o) => o.key === key);
    }
  );

  app.get(
    "/sub-types",
    {
      schema: {
        tags: ["catalog"],
        summary: "List subtypes",
        querystring: Type.Object({
          class: Type.Optional(Type.String()),
          type: Type.Optional(Type.String()),
        }),
      },
    },
    async (req) => {
      const q = req.query as { class?: string; type?: string };
      return catalog.listSubTypes(q.class, q.type);
    }
  );

  app.post(
    "/sub-types",
    {
      schema: {
        tags: ["catalog"],
        summary: "Create subtype",
        body: Type.Object({
          class: Type.String(),
          type: Type.String(),
          key: Type.Optional(Type.String()),
          label: Type.String(),
        }),
      },
    },
    async (req) =>
      catalog.createSubType(
        req.body as { class: string; type: string; key?: string; label: string }
      )
  );

  app.delete(
    "/sub-types/:class/:type/:key",
    {
      schema: {
        tags: ["catalog"],
        summary: "Delete subtype",
        params: Type.Object({
          class: Type.String(),
          type: Type.String(),
          key: Type.String(),
        }),
      },
    },
    async (req) => {
      const p = req.params as { class: string; type: string; key: string };
      catalog.deleteSubType(p.class, p.type, p.key);
      return { ok: true };
    }
  );

  app.get(
    "/specializations",
    {
      schema: {
        tags: ["catalog"],
        summary: "List specializations",
        querystring: Type.Object({
          class: Type.Optional(Type.String()),
        }),
      },
    },
    async (req) => {
      const q = req.query as { class?: string };
      return catalog.listSpecs(q.class);
    }
  );

  app.post(
    "/specializations",
    {
      schema: {
        tags: ["catalog"],
        summary: "Create specialization",
        body: Type.Object({
          class: Type.String(),
          key: Type.Optional(Type.String()),
          label: Type.String(),
        }),
      },
    },
    async (req) =>
      catalog.createSpec(
        req.body as { class: string; key?: string; label: string }
      )
  );

  app.delete(
    "/specializations/:class/:key",
    {
      schema: {
        tags: ["catalog"],
        summary: "Delete specialization",
        params: Type.Object({ class: Type.String(), key: Type.String() }),
      },
    },
    async (req) => {
      const p = req.params as { class: string; key: string };
      catalog.deleteSpec(p.class, p.key);
      return { ok: true };
    }
  );
};

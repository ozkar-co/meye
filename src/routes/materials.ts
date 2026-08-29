import type { FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import { renderMaterialsTable } from "../cards/render/index.js";

export const materialsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/materials/table",
    {
      schema: {
        tags: ["materials"],
        summary: "Materials periodic table PNG",
        produces: ["image/png"],
      },
    },
    async (_req, reply) => {
      const buf = await renderMaterialsTable();
      return reply.type("image/png").send(buf);
    }
  );
};

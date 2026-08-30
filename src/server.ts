import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  TypeBoxTypeProvider,
} from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { getDb } from "./db.js";
import { itemsRoutes } from "./routes/items.js";
import { materialsRoutes } from "./routes/materials.js";
import { languagesRoutes } from "./routes/languages.js";

const PORT = Number(process.env.PORT || 3008);
const HOST = process.env.HOST || "0.0.0.0";

async function main() {
  getDb();

  const app = Fastify({
    logger: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await app.register(swagger, {
    openapi: {
      info: {
        title: "meye-tools",
        description:
          "Item cards and constructed languages for Tierras de Meye",
        version: "2.0.0",
      },
      servers: [
        { url: "https://meye-tools.ozkr.net", description: "production" },
        { url: `http://localhost:${PORT}`, description: "local" },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  app.get(
    "/health",
    {
      schema: {
        tags: ["system"],
        summary: "Health check",
        response: { 200: Type.Object({ ok: Type.Boolean() }) },
      },
    },
    async () => ({ ok: true })
  );

  await app.register(itemsRoutes);
  await app.register(materialsRoutes);
  await app.register(languagesRoutes);

  app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
    const status = err.statusCode || 500;
    reply.status(status).send({
      error: err.name || "Error",
      message: err.message,
    });
  });

  await app.listen({ port: PORT, host: HOST });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

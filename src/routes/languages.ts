import type { FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import {
  translateFromSujfi,
  translateToSujfi,
  renderSujfiImage,
} from "../languages/sujfi/index.js";

export const languagesRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/languages/:lang/translate",
    {
      schema: {
        tags: ["languages"],
        summary: "Translate a word to/from a constructed language",
        params: Type.Object({ lang: Type.String() }),
        body: Type.Object({
          word: Type.String(),
          direction: Type.Optional(
            Type.Union([Type.Literal("to"), Type.Literal("from")])
          ),
        }),
        response: {
          200: Type.Object({
            lang: Type.String(),
            word: Type.String(),
            result: Type.String(),
            direction: Type.String(),
          }),
        },
      },
    },
    async (req) => {
      const { lang } = req.params as { lang: string };
      const body = req.body as { word: string; direction?: "to" | "from" };
      const direction = body.direction || "to";
      if (lang !== "sujfi") {
        throw Object.assign(new Error(`Unknown language: ${lang}`), {
          statusCode: 404,
        });
      }
      const result =
        direction === "from"
          ? translateFromSujfi(body.word)
          : translateToSujfi(body.word);
      return { lang, word: body.word, result, direction };
    }
  );

  app.post(
    "/languages/:lang/image",
    {
      schema: {
        tags: ["languages"],
        summary: "Render language word image",
        params: Type.Object({ lang: Type.String() }),
        body: Type.Object({ word: Type.String() }),
        produces: ["image/png"],
      },
    },
    async (req, reply) => {
      const { lang } = req.params as { lang: string };
      const { word } = req.body as { word: string };
      if (lang !== "sujfi") {
        throw Object.assign(new Error(`Unknown language: ${lang}`), {
          statusCode: 404,
        });
      }
      const buf = await renderSujfiImage(word);
      return reply.type("image/png").send(buf);
    }
  );
};

import type { FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import { calculateExperience } from "../xp/calculations.js";

const NonNeg = Type.Optional(Type.Number({ minimum: 0 }));

const BasicBody = Type.Object({
  physical: Type.Object({
    strength: NonNeg,
    agility: NonNeg,
    speed: NonNeg,
    resistance: NonNeg,
    talented: Type.Optional(Type.Boolean()),
  }),
  mental: Type.Object({
    intelligence: NonNeg,
    wisdom: NonNeg,
    concentration: NonNeg,
    will: NonNeg,
    talented: Type.Optional(Type.Boolean()),
  }),
  coordination: Type.Object({
    precision: NonNeg,
    calculation: NonNeg,
    range: NonNeg,
    reflexes: NonNeg,
    talented: Type.Optional(Type.Boolean()),
  }),
  life: NonNeg,
});

const SpecialBody = Type.Object({
  physical: Type.Object({
    empowerment: NonNeg,
    vitalControl: NonNeg,
    talented: Type.Optional(Type.Boolean()),
  }),
  energy: Type.Object({
    energyHandling: NonNeg,
    objectHandling: NonNeg,
    talented: Type.Optional(Type.Boolean()),
  }),
  mental: Type.Object({
    illusion: NonNeg,
    mentalControl: NonNeg,
    talented: Type.Optional(Type.Boolean()),
  }),
  energyTank: NonNeg,
  energyTankTalented: Type.Optional(Type.Boolean()),
});

const CalculateBody = Type.Object({
  basic: BasicBody,
  special: SpecialBody,
  supernatural: Type.Optional(
    Type.Object({
      skills: Type.Array(
        Type.Object({
          transformations: Type.Array(Type.Number({ minimum: 0 })),
        })
      ),
    })
  ),
  includeSupernatural: Type.Optional(Type.Boolean()),
});

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export const xpRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/xp/calculate",
    {
      schema: {
        tags: ["xp"],
        summary: "Calculate spent experience from current stats",
        body: CalculateBody,
      },
    },
    async (req) => {
      const body = req.body as {
        basic: {
          physical: Record<string, unknown>;
          mental: Record<string, unknown>;
          coordination: Record<string, unknown>;
          life?: number;
        };
        special: {
          physical: Record<string, unknown>;
          energy: Record<string, unknown>;
          mental: Record<string, unknown>;
          energyTank?: number;
          energyTankTalented?: boolean;
        };
        supernatural?: { skills: { transformations: number[] }[] };
        includeSupernatural?: boolean;
      };

      return calculateExperience({
        basic: {
          physical: {
            strength: num(body.basic.physical.strength),
            agility: num(body.basic.physical.agility),
            speed: num(body.basic.physical.speed),
            resistance: num(body.basic.physical.resistance),
            talented: Boolean(body.basic.physical.talented),
          },
          mental: {
            intelligence: num(body.basic.mental.intelligence),
            wisdom: num(body.basic.mental.wisdom),
            concentration: num(body.basic.mental.concentration),
            will: num(body.basic.mental.will),
            talented: Boolean(body.basic.mental.talented),
          },
          coordination: {
            precision: num(body.basic.coordination.precision),
            calculation: num(body.basic.coordination.calculation),
            range: num(body.basic.coordination.range),
            reflexes: num(body.basic.coordination.reflexes),
            talented: Boolean(body.basic.coordination.talented),
          },
          life: num(body.basic.life),
        },
        special: {
          physical: {
            empowerment: num(body.special.physical.empowerment),
            vitalControl: num(body.special.physical.vitalControl),
            talented: Boolean(body.special.physical.talented),
          },
          energy: {
            energyHandling: num(body.special.energy.energyHandling),
            objectHandling: num(body.special.energy.objectHandling),
            talented: Boolean(body.special.energy.talented),
          },
          mental: {
            illusion: num(body.special.mental.illusion),
            mentalControl: num(body.special.mental.mentalControl),
            talented: Boolean(body.special.mental.talented),
          },
          energyTank: num(body.special.energyTank),
          energyTankTalented: Boolean(body.special.energyTankTalented),
        },
        supernatural: body.supernatural,
        includeSupernatural: body.includeSupernatural,
      });
    }
  );
};

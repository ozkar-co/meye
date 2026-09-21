/** Experience cost formulas ported from the Go campaign domain. */

export const LEVEL_STEP_BASIC = 10;
export const LEVEL_STEP_SPECIAL = 100;
export const LEVEL_STEP_SUPERNATURAL = 100;
export const COST_LIFE = 5;
export const ENERGY_TANK_COST = 10;
export const ENERGY_TANK_TALENTED_COST = 5;

export function clampStat(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return 0;
  return Math.floor(x);
}

/** Triangular cost: each block of `levelStep` points costs 1 more than the previous. */
export function getStatRequiredXp(
  stat: number,
  levelStep: number,
  firstLevelCost: number
): number {
  const value = clampStat(stat);
  const completeLevels = Math.floor(value / levelStep);
  const lastLevelPoints = value % levelStep;

  const delta =
    ((firstLevelCost * (firstLevelCost - 1)) / 2) * levelStep;
  const n = completeLevels + firstLevelCost - 1;

  const completeLevelsRequiredXp = ((n * (n + 1)) / 2) * levelStep - delta;
  const lastLevelPointsRequiredXp =
    (completeLevels + firstLevelCost) * lastLevelPoints;

  return completeLevelsRequiredXp + lastLevelPointsRequiredXp;
}

export function getGroupRequiredXp(
  group: number[],
  levelStep: number,
  firstLevelCost: number
): number {
  return group.reduce(
    (sum, stat) => sum + getStatRequiredXp(stat, levelStep, firstLevelCost),
    0
  );
}

export function nextPointCost(
  stat: number,
  levelStep: number,
  firstLevelCost: number
): number {
  return firstLevelCost + Math.floor(clampStat(stat) / levelStep);
}

export function basicFirstLevelCost(talented: boolean): number {
  return talented ? 1 : 3;
}

export function specialFirstLevelCost(talented: boolean): number {
  return talented ? 1 : 2;
}

export function energyTankCost(talented: boolean): number {
  return talented ? ENERGY_TANK_TALENTED_COST : ENERGY_TANK_COST;
}

/** Integer cap: 2 × average of the four physical stats (floor). */
export function maxLifeFromPhysical(physical: {
  strength: number;
  agility: number;
  speed: number;
  resistance: number;
}): number {
  const sum =
    clampStat(physical.strength) +
    clampStat(physical.agility) +
    clampStat(physical.speed) +
    clampStat(physical.resistance);
  return Math.floor(sum / 2);
}

export type BasicStatsInput = {
  physical: {
    strength: number;
    agility: number;
    speed: number;
    resistance: number;
    talented: boolean;
  };
  mental: {
    intelligence: number;
    wisdom: number;
    concentration: number;
    will: number;
    talented: boolean;
  };
  coordination: {
    precision: number;
    calculation: number;
    range: number;
    reflexes: number;
    talented: boolean;
  };
  life: number;
};

export type SpecialStatsInput = {
  physical: {
    empowerment: number;
    vitalControl: number;
    talented: boolean;
  };
  energy: {
    energyHandling: number;
    objectHandling: number;
    talented: boolean;
  };
  mental: {
    illusion: number;
    mentalControl: number;
    talented: boolean;
  };
  energyTank: number;
  energyTankTalented: boolean;
};

export type SupernaturalStatsInput = {
  skills: { transformations: number[] }[];
};

export type StatBreakdown = {
  value: number;
  spent: number;
  next: number;
};

export type GroupBreakdown = {
  spent: number;
  next: number;
  stats: Record<string, StatBreakdown>;
};

export type PairedGroupBreakdown = {
  sum: number;
  spent: number;
  next: number;
  stats: Record<string, number>;
};

export type SkillBreakdown = {
  sum: number;
  spent: number;
  next: number;
  transformations: number[];
};

export function calculateBasicXp(stats: BasicStatsInput) {
  const physicalCost = basicFirstLevelCost(stats.physical.talented);
  const mentalCost = basicFirstLevelCost(stats.mental.talented);
  const coordCost = basicFirstLevelCost(stats.coordination.talented);

  const physical = breakdownIndependentGroup(
    {
      strength: stats.physical.strength,
      agility: stats.physical.agility,
      speed: stats.physical.speed,
      resistance: stats.physical.resistance,
    },
    LEVEL_STEP_BASIC,
    physicalCost
  );
  const mental = breakdownIndependentGroup(
    {
      intelligence: stats.mental.intelligence,
      wisdom: stats.mental.wisdom,
      concentration: stats.mental.concentration,
      will: stats.mental.will,
    },
    LEVEL_STEP_BASIC,
    mentalCost
  );
  const coordination = breakdownIndependentGroup(
    {
      precision: stats.coordination.precision,
      calculation: stats.coordination.calculation,
      range: stats.coordination.range,
      reflexes: stats.coordination.reflexes,
    },
    LEVEL_STEP_BASIC,
    coordCost
  );
  const maxLife = maxLifeFromPhysical(stats.physical);
  const lifeValue = Math.min(clampStat(stats.life), maxLife);
  const life = {
    value: lifeValue,
    max: maxLife,
    spent: COST_LIFE * lifeValue,
    next: lifeValue < maxLife ? COST_LIFE : 0,
  };

  return {
    total: physical.spent + mental.spent + coordination.spent + life.spent,
    physical,
    mental,
    coordination,
    life,
  };
}

export function calculateSpecialXp(stats: SpecialStatsInput) {
  const physical = breakdownPairedGroup(
    {
      empowerment: stats.physical.empowerment,
      vitalControl: stats.physical.vitalControl,
    },
    LEVEL_STEP_SPECIAL,
    specialFirstLevelCost(stats.physical.talented)
  );
  const energy = breakdownPairedGroup(
    {
      energyHandling: stats.energy.energyHandling,
      objectHandling: stats.energy.objectHandling,
    },
    LEVEL_STEP_SPECIAL,
    specialFirstLevelCost(stats.energy.talented)
  );
  const mental = breakdownPairedGroup(
    {
      illusion: stats.mental.illusion,
      mentalControl: stats.mental.mentalControl,
    },
    LEVEL_STEP_SPECIAL,
    specialFirstLevelCost(stats.mental.talented)
  );
  const tankCost = energyTankCost(stats.energyTankTalented);
  const tankValue = clampStat(stats.energyTank);
  const energyTank = {
    value: tankValue,
    spent: tankCost * tankValue,
    next: tankCost,
  };

  return {
    total: physical.spent + energy.spent + mental.spent + energyTank.spent,
    physical,
    energy,
    mental,
    energyTank,
  };
}

export function calculateSupernaturalXp(stats: SupernaturalStatsInput) {
  const skills: SkillBreakdown[] = (stats.skills || []).map((skill) => {
    const transformations = (skill.transformations || []).map(clampStat);
    const sum = transformations.reduce((a, b) => a + b, 0);
    return {
      sum,
      spent: getStatRequiredXp(sum, LEVEL_STEP_SUPERNATURAL, 1),
      next: nextPointCost(sum, LEVEL_STEP_SUPERNATURAL, 1),
      transformations,
    };
  });
  const total = skills.reduce((a, s) => a + s.spent, 0);
  return { total, skills };
}

export type ExperienceInput = {
  basic: BasicStatsInput;
  special: SpecialStatsInput;
  supernatural?: SupernaturalStatsInput | null;
  includeSupernatural?: boolean;
};

export function calculateExperience(input: ExperienceInput) {
  const basic = calculateBasicXp(input.basic);
  const special = calculateSpecialXp(input.special);
  const include =
    input.includeSupernatural !== false && input.supernatural != null;
  const supernatural = include
    ? calculateSupernaturalXp(input.supernatural as SupernaturalStatsInput)
    : { total: 0, skills: [] as SkillBreakdown[] };

  return {
    basic,
    special,
    supernatural,
    total: basic.total + special.total + supernatural.total,
  };
}

function breakdownIndependentGroup(
  stats: Record<string, number>,
  levelStep: number,
  firstLevelCost: number
): GroupBreakdown {
  const out: Record<string, StatBreakdown> = {};
  let spent = 0;
  for (const [key, raw] of Object.entries(stats)) {
    const value = clampStat(raw);
    const statSpent = getStatRequiredXp(value, levelStep, firstLevelCost);
    out[key] = {
      value,
      spent: statSpent,
      next: nextPointCost(value, levelStep, firstLevelCost),
    };
    spent += statSpent;
  }
  const values = Object.values(out);
  return {
    spent,
    next: values.length ? Math.min(...values.map((s) => s.next)) : firstLevelCost,
    stats: out,
  };
}

function breakdownPairedGroup(
  stats: Record<string, number>,
  levelStep: number,
  firstLevelCost: number
): PairedGroupBreakdown {
  const clamped: Record<string, number> = {};
  let sum = 0;
  for (const [key, raw] of Object.entries(stats)) {
    const value = clampStat(raw);
    clamped[key] = value;
    sum += value;
  }
  return {
    sum,
    spent: getStatRequiredXp(sum, levelStep, firstLevelCost),
    next: nextPointCost(sum, levelStep, firstLevelCost),
    stats: clamped,
  };
}

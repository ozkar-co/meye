      (function (global) {
        const LEVEL_STEP_BASIC = 10;
        const LEVEL_STEP_SPECIAL = 100;
        const LEVEL_STEP_SUPERNATURAL = 100;
        const COST_LIFE = 5;
        const ENERGY_TANK_COST = 10;
        const ENERGY_TANK_TALENTED_COST = 5;

        function clampStat(n) {
          const x = Number(n);
          if (!Number.isFinite(x) || x < 0) return 0;
          return Math.floor(x);
        }

        function getStatRequiredXp(stat, levelStep, firstLevelCost) {
          const value = clampStat(stat);
          const completeLevels = Math.floor(value / levelStep);
          const lastLevelPoints = value % levelStep;
          const delta = ((firstLevelCost * (firstLevelCost - 1)) / 2) * levelStep;
          const n = completeLevels + firstLevelCost - 1;
          const completeLevelsRequiredXp = ((n * (n + 1)) / 2) * levelStep - delta;
          const lastLevelPointsRequiredXp =
            (completeLevels + firstLevelCost) * lastLevelPoints;
          return completeLevelsRequiredXp + lastLevelPointsRequiredXp;
        }

        function nextPointCost(stat, levelStep, firstLevelCost) {
          return firstLevelCost + Math.floor(clampStat(stat) / levelStep);
        }

        function basicFirstLevelCost(talented) {
          return talented ? 1 : 3;
        }

        function specialFirstLevelCost(talented) {
          return talented ? 1 : 2;
        }

        function energyTankCost(talented) {
          return talented ? ENERGY_TANK_TALENTED_COST : ENERGY_TANK_COST;
        }

        function maxLifeFromPhysical(physical) {
          const sum =
            clampStat(physical.strength) +
            clampStat(physical.agility) +
            clampStat(physical.speed) +
            clampStat(physical.resistance);
          return Math.floor(sum / 2);
        }

        function independentGroup(stats, levelStep, firstLevelCost) {
          const out = {};
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
          return { spent, stats: out };
        }

        function pairedGroup(stats, levelStep, firstLevelCost) {
          const clamped = {};
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

        function calculateBasicXp(stats) {
          const physical = independentGroup(
            {
              strength: stats.physical.strength,
              agility: stats.physical.agility,
              speed: stats.physical.speed,
              resistance: stats.physical.resistance,
            },
            LEVEL_STEP_BASIC,
            basicFirstLevelCost(stats.physical.talented)
          );
          const mental = independentGroup(
            {
              intelligence: stats.mental.intelligence,
              wisdom: stats.mental.wisdom,
              concentration: stats.mental.concentration,
              will: stats.mental.will,
            },
            LEVEL_STEP_BASIC,
            basicFirstLevelCost(stats.mental.talented)
          );
          const coordination = independentGroup(
            {
              precision: stats.coordination.precision,
              calculation: stats.coordination.calculation,
              range: stats.coordination.range,
              reflexes: stats.coordination.reflexes,
            },
            LEVEL_STEP_BASIC,
            basicFirstLevelCost(stats.coordination.talented)
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

        function calculateSpecialXp(stats) {
          const physical = pairedGroup(
            {
              empowerment: stats.physical.empowerment,
              vitalControl: stats.physical.vitalControl,
            },
            LEVEL_STEP_SPECIAL,
            specialFirstLevelCost(stats.physical.talented)
          );
          const energy = pairedGroup(
            {
              energyHandling: stats.energy.energyHandling,
              objectHandling: stats.energy.objectHandling,
            },
            LEVEL_STEP_SPECIAL,
            specialFirstLevelCost(stats.energy.talented)
          );
          const mental = pairedGroup(
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

        function calculateSupernaturalXp(stats) {
          const skills = (stats.skills || []).map((skill) => {
            const transformations = (skill.transformations || []).map(clampStat);
            const sum = transformations.reduce((a, b) => a + b, 0);
            return {
              sum,
              spent: getStatRequiredXp(sum, LEVEL_STEP_SUPERNATURAL, 1),
              next: nextPointCost(sum, LEVEL_STEP_SUPERNATURAL, 1),
              transformations,
            };
          });
          return {
            total: skills.reduce((a, s) => a + s.spent, 0),
            skills,
          };
        }

        function calculateExperience(input) {
          const basic = calculateBasicXp(input.basic);
          const special = calculateSpecialXp(input.special);
          const include =
            input.includeSupernatural !== false && input.supernatural != null;
          const supernatural = include
            ? calculateSupernaturalXp(input.supernatural)
            : { total: 0, skills: [] };
          return {
            basic,
            special,
            supernatural,
            total: basic.total + special.total + supernatural.total,
          };
        }

        global.MeyeXp = {
          clampStat,
          maxLifeFromPhysical,
          calculateExperience,
        };
      })(window);

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

        function statAverage(values) {
          if (!values.length) return 0;
          return values.reduce((a, n) => a + clampStat(n), 0) / values.length;
        }

        function dieForAverage(avg) {
          if (avg >= 50) return "d20";
          if (avg >= 40) return "d12";
          if (avg >= 30) return "d10";
          if (avg >= 20) return "d8";
          if (avg >= 10) return "d6";
          return "d4";
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

        const MAX_TYPE1 = 255;
        const MAX_TYPE2 = 1024;
        const MAX_CONTAINER = 1024;
        const MAX_TRANS = 1024;
        const MAX_SKILLS = 15;
        const MAX_TRANS_PER_SKILL = 15;
        const TYPE1_BITS = 8;
        const WIDE_BITS = 11;
        const WIDTH_FIELD = 4;

        function clampMax(n, max) {
          return Math.min(clampStat(n), max);
        }

        function BitWriter() {
          this.bytes = [];
          this.cur = 0;
          this.bit = 0;
        }
        BitWriter.prototype.write = function (value, width) {
          let v = value >>> 0;
          for (let i = 0; i < width; i++) {
            if (v & (1 << i)) this.cur |= 1 << this.bit;
            this.bit += 1;
            if (this.bit === 8) {
              this.bytes.push(this.cur);
              this.cur = 0;
              this.bit = 0;
            }
          }
        };
        BitWriter.prototype.finish = function () {
          if (this.bit) this.bytes.push(this.cur);
          return Uint8Array.from(this.bytes);
        };

        function BitReader(bytes) {
          this.bytes = bytes;
          this.i = 0;
          this.bit = 0;
        }
        BitReader.prototype.read = function (width) {
          let v = 0;
          for (let i = 0; i < width; i++) {
            const byte = this.bytes[this.i] || 0;
            if (byte & (1 << this.bit)) v |= 1 << i;
            this.bit += 1;
            if (this.bit === 8) {
              this.bit = 0;
              this.i += 1;
            }
          }
          return v;
        };

        function bytesToB64(bytes) {
          let s = "";
          for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
          return btoa(s).replace(/=+$/, "");
        }

        function b64ToBytes(str) {
          const clean = String(str || "").replace(/\s/g, "");
          const pad = clean.length % 4 === 0 ? "" : "=".repeat(4 - (clean.length % 4));
          const bin = atob(clean + pad);
          const out = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
          return out;
        }

        function bitsNeeded(n) {
          if (n <= 0) return 0;
          return Math.ceil(Math.log2(n + 1));
        }

        function writeCluster(w, values, valueBits) {
          const cap = (1 << valueBits) - 1;
          const vals = values.map((n) => clampMax(n, cap));
          const mx = Math.max(0, ...vals);
          if (mx === 0) {
            w.write(0, 1);
            return;
          }
          w.write(1, 1);
          const mn = Math.min(...vals);
          const rawW = bitsNeeded(mx);
          const relW = bitsNeeded(mx - mn);
          const rawCost = WIDTH_FIELD + vals.length * rawW;
          const relCost = valueBits + WIDTH_FIELD + vals.length * relW;
          if (relCost < rawCost) {
            w.write(1, 1);
            w.write(mn, valueBits);
            w.write(relW, WIDTH_FIELD);
            if (relW) vals.forEach((n) => w.write(n - mn, relW));
          } else {
            w.write(0, 1);
            w.write(rawW, WIDTH_FIELD);
            vals.forEach((n) => w.write(n, rawW));
          }
        }

        function readCluster(r, count, valueBits) {
          if (!r.read(1)) return Array.from({ length: count }, () => 0);
          if (r.read(1)) {
            const mn = r.read(valueBits);
            const relW = r.read(WIDTH_FIELD);
            if (!relW) return Array.from({ length: count }, () => mn);
            return Array.from({ length: count }, () => mn + r.read(relW));
          }
          const rawW = r.read(WIDTH_FIELD);
          return Array.from({ length: count }, () => (rawW ? r.read(rawW) : 0));
        }

        function writeMasked(w, values, valueBits) {
          values.forEach((n) => w.write(n > 0 ? 1 : 0, 1));
          const present = values.filter((n) => n > 0);
          if (present.length) writeCluster(w, present, valueBits);
        }

        function readMasked(r, count, valueBits) {
          const mask = [];
          for (let i = 0; i < count; i++) mask.push(!!r.read(1));
          const nPresent = mask.filter(Boolean).length;
          const packed = nPresent ? readCluster(r, nPresent, valueBits) : [];
          let j = 0;
          return mask.map((on) => (on ? packed[j++] || 0 : 0));
        }

        function encodeCharacter(state) {
          const w = new BitWriter();
          const b = state.basic;
          const s = state.special;
          w.write(b.physical.talented ? 1 : 0, 1);
          w.write(b.coordination.talented ? 1 : 0, 1);
          w.write(b.mental.talented ? 1 : 0, 1);
          w.write(s.energyTankTalented ? 1 : 0, 1);
          w.write(s.physical.talented ? 1 : 0, 1);
          w.write(s.mental.talented ? 1 : 0, 1);
          w.write(s.energy.talented ? 1 : 0, 1);
          w.write(state.doubleType1 ? 1 : 0, 1);
          writeCluster(
            w,
            [
              b.physical.strength,
              b.physical.agility,
              b.physical.speed,
              b.physical.resistance,
            ].map((n) => clampMax(n, MAX_TYPE1)),
            TYPE1_BITS
          );
          writeCluster(
            w,
            [
              b.coordination.precision,
              b.coordination.calculation,
              b.coordination.range,
              b.coordination.reflexes,
            ].map((n) => clampMax(n, MAX_TYPE1)),
            TYPE1_BITS
          );
          writeCluster(
            w,
            [
              b.mental.intelligence,
              b.mental.wisdom,
              b.mental.concentration,
              b.mental.will,
            ].map((n) => clampMax(n, MAX_TYPE1)),
            TYPE1_BITS
          );
          writeMasked(
            w,
            [
              s.physical.empowerment,
              s.physical.vitalControl,
              s.mental.illusion,
              s.mental.mentalControl,
              s.energy.energyHandling,
              s.energy.objectHandling,
            ].map((n) => clampMax(n, MAX_TYPE2)),
            WIDE_BITS
          );
          writeMasked(
            w,
            [clampMax(b.life, MAX_CONTAINER), clampMax(s.energyTank, MAX_CONTAINER)],
            WIDE_BITS
          );
          let code = bytesToB64(w.finish());
          if (state.includeSupernatural) {
            const e = new BitWriter();
            e.write(1, 1);
            const skills = (state.supernatural?.skills || []).slice(0, MAX_SKILLS);
            e.write(skills.length, 4);
            const transLists = skills.map((skill) => {
              let trans = (skill.transformations || [0])
                .slice(0, MAX_TRANS_PER_SKILL)
                .map((n) => clampMax(n, MAX_TRANS));
              return trans.length ? trans : [0];
            });
            const flat = transLists.reduce((a, l) => a.concat(l), []);
            const tw = bitsNeeded(Math.max(0, ...flat));
            e.write(tw, WIDTH_FIELD);
            transLists.forEach((list) => {
              e.write(list.length, 4);
              if (tw) list.forEach((n) => e.write(n, tw));
            });
            code += "-" + bytesToB64(e.finish());
          }
          return code;
        }

        function decodeCharacter(code) {
          const raw = String(code || "").trim();
          const dash = raw.indexOf("-");
          const mainStr = dash === -1 ? raw : raw.slice(0, dash);
          const extraStr = dash === -1 ? "" : raw.slice(dash + 1);
          if (!mainStr) throw new Error("código vacío");
          const mainBytes = b64ToBytes(mainStr);
          if (!mainBytes.length) throw new Error("código base incompleto");
          const r = new BitReader(mainBytes);
          const physicalTalented = !!r.read(1);
          const coordinationTalented = !!r.read(1);
          const mentalTalented = !!r.read(1);
          const energyTankTalented = !!r.read(1);
          const hPhysicalTalented = !!r.read(1);
          const hMentalTalented = !!r.read(1);
          const hEnergyTalented = !!r.read(1);
          const doubleType1 = !!r.read(1);
          const phys = readCluster(r, 4, TYPE1_BITS);
          const coord = readCluster(r, 4, TYPE1_BITS);
          const ment = readCluster(r, 4, TYPE1_BITS);
          const t2 = readMasked(r, 6, WIDE_BITS);
          const containers = readMasked(r, 2, WIDE_BITS);
          let includeSupernatural = false;
          let skills = [{ transformations: [0] }];
          if (extraStr) {
            const e = new BitReader(b64ToBytes(extraStr));
            includeSupernatural = !!e.read(1);
            const nSkills = e.read(4);
            const tw = e.read(WIDTH_FIELD);
            const decoded = [];
            for (let i = 0; i < nSkills; i++) {
              const nTrans = Math.max(1, e.read(4));
              const transformations = [];
              for (let t = 0; t < nTrans; t++) {
                transformations.push(tw ? Math.min(e.read(tw), MAX_TRANS) : 0);
              }
              decoded.push({ transformations });
            }
            if (decoded.length) skills = decoded;
          }
          return {
            doubleType1,
            includeSupernatural,
            basic: {
              physical: {
                strength: Math.min(phys[0], MAX_TYPE1),
                agility: Math.min(phys[1], MAX_TYPE1),
                speed: Math.min(phys[2], MAX_TYPE1),
                resistance: Math.min(phys[3], MAX_TYPE1),
                talented: physicalTalented,
              },
              coordination: {
                precision: Math.min(coord[0], MAX_TYPE1),
                calculation: Math.min(coord[1], MAX_TYPE1),
                range: Math.min(coord[2], MAX_TYPE1),
                reflexes: Math.min(coord[3], MAX_TYPE1),
                talented: coordinationTalented,
              },
              mental: {
                intelligence: Math.min(ment[0], MAX_TYPE1),
                wisdom: Math.min(ment[1], MAX_TYPE1),
                concentration: Math.min(ment[2], MAX_TYPE1),
                will: Math.min(ment[3], MAX_TYPE1),
                talented: mentalTalented,
              },
              life: Math.min(containers[0], MAX_CONTAINER),
            },
            special: {
              physical: {
                empowerment: Math.min(t2[0], MAX_TYPE2),
                vitalControl: Math.min(t2[1], MAX_TYPE2),
                talented: hPhysicalTalented,
              },
              mental: {
                illusion: Math.min(t2[2], MAX_TYPE2),
                mentalControl: Math.min(t2[3], MAX_TYPE2),
                talented: hMentalTalented,
              },
              energy: {
                energyHandling: Math.min(t2[4], MAX_TYPE2),
                objectHandling: Math.min(t2[5], MAX_TYPE2),
                talented: hEnergyTalented,
              },
              energyTank: Math.min(containers[1], MAX_CONTAINER),
              energyTankTalented,
            },
            supernatural: { skills },
          };
        }


        global.MeyeXp = {
          clampStat,
          maxLifeFromPhysical,
          statAverage,
          dieForAverage,
          calculateExperience,
          encodeCharacter,
          decodeCharacter,
          MAX_TYPE1,
          MAX_TYPE2,
          MAX_CONTAINER,
          MAX_TRANS,
        };
      })(window);

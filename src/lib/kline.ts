import type { KlinePoint, Palace, ZiweiChart } from "./types";

const KEY_PALACES = ["命宫", "财帛", "官禄", "迁移", "福德"];

const AUSPICIOUS = new Set([
  "紫微",
  "天府",
  "天机",
  "太阳",
  "武曲",
  "天同",
  "廉贞",
  "天相",
  "天梁",
  "七杀",
  "破军",
  "贪狼",
  "文昌",
  "文曲",
  "左辅",
  "右弼",
  "天魁",
  "天钺"
]);

const INAUSPICIOUS = new Set([
  "擎羊",
  "陀罗",
  "火星",
  "铃星",
  "地空",
  "地劫",
  "天刑",
  "化忌"
]);

const SCORE_WEIGHTS = {
  mainGood: 9,
  subGood: 3,
  mainBad: -9,
  subBad: -3,
  transformGood: 7,
  transformBad: -10
};

const parseRange = (range?: string): { start: number; end: number } | null => {
  if (!range) return null;
  const match = range.match(/(\d+)\D+(\d+)/);
  if (!match) return null;
  return { start: Number(match[1]), end: Number(match[2]) };
};

const countStars = (stars: string[], pool: Set<string>): number => {
  return stars.reduce((acc, star) => (pool.has(star) ? acc + 1 : acc), 0);
};

const countTransforms = (transforms: string[]) => {
  const good = transforms.filter(
    (item) => item.includes("禄") || item.includes("权") || item.includes("科")
  ).length;
  const bad = transforms.filter((item) => item.includes("忌")).length;
  return { good, bad };
};

const countTotals = (palaces: Palace[]) => {
  return palaces.reduce(
    (acc, palace) => {
      acc.main += palace.mainStars.length;
      acc.sub += palace.subStars.length;
      acc.transforms += palace.transforms.length;
      return acc;
    },
    { main: 0, sub: 0, transforms: 0 }
  );
};

const getActivePalace = (age: number, palaces: Palace[]): Palace => {
  const byRange = palaces.find((palace) => {
    const range = parseRange(palace.decadeRange);
    return range ? age >= range.start && age <= range.end : false;
  });

  if (byRange) return byRange;

  const index = Math.floor(age / 10) % palaces.length;
  return palaces[index] ?? palaces[0];
};

const aggregateCounts = (palaces: Palace[]) => {
  const stars = palaces.flatMap((palace) => [
    ...palace.mainStars,
    ...palace.subStars
  ]);
  const goodStars = countStars(stars, AUSPICIOUS);
  const badStars = countStars(stars, INAUSPICIOUS);
  const transforms = palaces.flatMap((palace) => palace.transforms);
  const transformCounts = countTransforms(transforms);

  return { goodStars, badStars, transformCounts };
};

const scorePalace = (palace: Palace) => {
  const mainGood = countStars(palace.mainStars, AUSPICIOUS);
  const mainBad = countStars(palace.mainStars, INAUSPICIOUS);
  const subGood = countStars(palace.subStars, AUSPICIOUS);
  const subBad = countStars(palace.subStars, INAUSPICIOUS);
  const transformCounts = countTransforms(palace.transforms);

  const score =
    mainGood * SCORE_WEIGHTS.mainGood +
    subGood * SCORE_WEIGHTS.subGood +
    mainBad * SCORE_WEIGHTS.mainBad +
    subBad * SCORE_WEIGHTS.subBad +
    transformCounts.good * SCORE_WEIGHTS.transformGood +
    transformCounts.bad * SCORE_WEIGHTS.transformBad;

  const starTotal =
    palace.mainStars.length +
    palace.subStars.length +
    palace.transforms.length;

  return {
    score,
    mainGood,
    mainBad,
    subGood,
    subBad,
    transformGood: transformCounts.good,
    transformBad: transformCounts.bad,
    starTotal
  };
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const hashSeed = (input: string) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const randByAge = (seed: number, age: number) => {
  let x = seed ^ Math.imul(age + 1, 2654435761);
  x ^= x >>> 16;
  x = Math.imul(x, 2246822519);
  x ^= x >>> 13;
  x = Math.imul(x, 3266489917);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967295;
};

const normalizeKline = (points: KlinePoint[]) => {
  const values = points.map((p) => p.luck);
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance) || 1;

  const targetLow = 12;
  const targetHigh = 96;
  const span = targetHigh - targetLow;
  const scale = span / (std * 6);

  return points.map((p) => {
    const adjusted = 50 + (p.luck - mean) * scale;
    return {
      ...p,
      luck: clamp(Math.round(adjusted), 0, 100)
    };
  });
};

export const generateKline = (chart: ZiweiChart): KlinePoint[] => {
  const seed = hashSeed(
    chart.palaces
      .map((p) => `${p.name}:${p.mainStars.join(",")}:${p.subStars.join(",")}`)
      .join("|")
  );

  const palacesByName = new Map(chart.palaces.map((p) => [p.name, p]));
  const keyPalaces = KEY_PALACES.map(
    (name) => palacesByName.get(name) ?? null
  ).filter((palace): palace is Palace => palace !== null);

  const base = aggregateCounts(keyPalaces);
  const baseTotals = countTotals(keyPalaces);
  const baseBias =
    (base.goodStars - base.badStars) * 3 +
    (base.transformCounts.good * 4 - base.transformCounts.bad * 6);

  const rawPoints = Array.from({ length: 101 }, (_, age) => {
    const active = getActivePalace(age, chart.palaces);
    const activeCounts = aggregateCounts([active]);
    const activeTotals = countTotals([active]);
    const activeScore = scorePalace(active);

    const goodScore = base.goodStars + activeCounts.goodStars;
    const badScore = base.badStars + activeCounts.badStars;
    const transformGood =
      base.transformCounts.good + activeCounts.transformCounts.good;
    const transformBad =
      base.transformCounts.bad + activeCounts.transformCounts.bad;

    const influence = goodScore + badScore + transformGood + transformBad;
    const fallbackLuck = clamp(
      40 +
        (baseTotals.main + activeTotals.main) * 3 +
        (baseTotals.sub + activeTotals.sub) +
        (baseTotals.transforms + activeTotals.transforms) * 2,
      0,
      100
    );

    const decadeStart = Math.floor(age / 10) * 10;
    const decadeProgress = (age - decadeStart) / 10;
    const volatility = clamp(8 + activeScore.starTotal * 1.6, 8, 32);
    const wave =
      Math.sin(decadeProgress * Math.PI * 2) *
      volatility *
      (activeScore.score >= 0 ? 0.9 : 0.6);
    const slope = (decadeProgress - 0.5) * activeScore.score * 0.7;
    const noise =
      (randByAge(seed, age) - 0.5) *
      clamp(10 + activeScore.starTotal * 1.4, 10, 28);
    const phaseBoost =
      decadeProgress < 0.2 ? clamp(activeScore.score * 0.6, -18, 18) : 0;

    const luck =
      influence > 0
        ? clamp(
            50 +
              baseBias +
              goodScore -
              badScore +
              transformGood * 2 -
              transformBad * 3 +
              wave +
              slope +
              noise +
              phaseBoost,
            0,
            100
          )
        : clamp(fallbackLuck + wave + slope + noise + phaseBoost, 0, 100);

    const phaseLabel = active.decadeRange
      ? `大限 ${active.decadeRange}`
      : `大限 ${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 9}`;

    const drivers =
      influence > 0
        ? [
            phaseLabel,
            goodScore > 0 ? `吉星+${goodScore}` : "吉星+0",
            badScore > 0 ? `煞星-${badScore}` : "煞星-0",
            transformGood > 0 ? `四化+${transformGood * 2}` : "四化+0",
            transformBad > 0 ? `四化-${transformBad * 3}` : "四化-0",
            `宫位评分 ${activeScore.score}`
          ]
        : [
            phaseLabel,
            `主星 ${baseTotals.main + activeTotals.main}`,
            `辅星 ${baseTotals.sub + activeTotals.sub}`,
            `四化 ${baseTotals.transforms + activeTotals.transforms}`,
            `宫位评分 ${activeScore.score}`
          ];

    return {
      age,
      luck,
      confidence: 0.68,
      drivers
    };
  });

  const smoothed = rawPoints.map((point, index) => {
    const window = rawPoints.slice(
      Math.max(0, index - 1),
      Math.min(rawPoints.length, index + 2)
    );
    const avg =
      window.reduce((acc, item) => acc + item.luck, 0) / window.length;

    return {
      ...point,
      luck: clamp(Math.round(avg), 0, 100)
    };
  });

  return normalizeKline(smoothed);
};

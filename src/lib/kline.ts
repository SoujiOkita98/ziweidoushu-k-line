import type { KlinePoint, Palace, ZiweiChart } from "./types";

const KEY_PALACES = ["??", "??", "??", "??", "??"];

const AUSPICIOUS = new Set([
  "??",
  "??",
  "??",
  "??",
  "??",
  "??",
  "??",
  "??",
  "??",
  "??",
  "??",
  "??",
  "??",
  "??",
  "??",
  "??",
  "??",
  "??"
]);

const INAUSPICIOUS = new Set([
  "??",
  "??",
  "??",
  "??",
  "??",
  "??",
  "??",
  "??"
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

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const clampDelta = (next: number, prev: number, maxDelta: number) => {
  const delta = next - prev;
  return prev + clamp(delta, -maxDelta, maxDelta);
};

const sigmoid = (x: number) => {
  return 1 / (1 + Math.exp(-x));
};

const countStars = (stars: string[], pool: Set<string>): number => {
  return stars.reduce((acc, star) => (pool.has(star) ? acc + 1 : acc), 0);
};

const countTransforms = (transforms: string[]) => {
  const good = transforms.filter(
    (item) => item.includes("?") || item.includes("?") || item.includes("?")
  ).length;
  const bad = transforms.filter((item) => item.includes("?")).length;
  return { good, bad };
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

export const generateKline = (chart: ZiweiChart): KlinePoint[] => {
  const seed = hashSeed(
    chart.palaces
      .map((p) => `${p.name}:${p.mainStars.join(",")}:${p.subStars.join(",")}`)
      .join("|")
  );

  const risk = randByAge(seed, 2026); // 0..1 ???"??"
  const optimism = randByAge(seed, 520); // 0..1 ???"???"
  const volMultiplier = 0.85 + risk * 0.6;

  const palacesByName = new Map(chart.palaces.map((p) => [p.name, p]));
  const keyPalaces = KEY_PALACES.map(
    (name) => palacesByName.get(name) ?? null
  ).filter((palace): palace is Palace => palace !== null);

  const base = aggregateCounts(keyPalaces);
  const baseGoodness =
    (base.goodStars - base.badStars) +
    (base.transformCounts.good * 0.8 - base.transformCounts.bad * 1.2);

  // "????"?????:??? 60 ??,??????????
  const baseBaseline = clamp(
    60 + baseGoodness * 3 + (optimism - 0.5) * 6,
    42,
    82
  );
  const minFloor = clamp(
    14 + Math.max(0, baseGoodness) * 2 + optimism * 3,
    12,
    30
  );

  const points: KlinePoint[] = [];

  let prevLuck = clamp(
    baseBaseline + (randByAge(seed, 999) - 0.5) * 8,
    minFloor,
    92
  );
  let prevPrevLuck = prevLuck;
  let prevPalaceName = "";

  // Absolute “achievement” is chart-driven and intentionally optimistic.
  const ambition = randByAge(seed, 9001); // 0..1
  const resilience = randByAge(seed, 9002); // 0..1
  const patience = randByAge(seed, 9003); // 0..1
  const arcType = Math.floor(randByAge(seed, 13331) * 3); // 0 early, 1 balanced, 2 late
  const cap = clamp(
    76 +
      baseGoodness * 2.2 +
      optimism * 10 +
      ambition * 8 +
      (randByAge(seed, 4040) - 0.5) * 10,
    72,
    99
  );
  let achievement = clamp(
    14 +
      (baseBaseline - 50) * 0.6 +
      optimism * 18 +
      (randByAge(seed, 4041) - 0.5) * 14,
    8,
    62
  );

  for (let age = 0; age <= 100; age += 1) {
    const active = getActivePalace(age, chart.palaces);
    const activeScore = scorePalace(active);
    const palaceGoodness =
      (activeScore.mainGood + activeScore.subGood) -
      (activeScore.mainBad + activeScore.subBad) +
      (activeScore.transformGood * 1.2 - activeScore.transformBad * 1.6);

    const changedPalace = age === 0 || active.name !== prevPalaceName;

    const target = clamp(
      baseBaseline +
        palaceGoodness * 6 +
        clamp(activeScore.score * 0.06, -6, 6),
      minFloor + 6,
      96
    );

    // ???:??/??????;?????"??"?
    const vol =
      clamp(
        6 +
          activeScore.starTotal * 1.1 +
          activeScore.transformBad * 1.2 +
          Math.max(0, -palaceGoodness) * 0.8,
        6,
        24
      ) * volMultiplier;

    const n1 = randByAge(seed, age) - 0.5;
    const n2 = randByAge(seed, age + 1337) - 0.5;
    const noise = (n1 * 1.25 + n2 * 0.55) * vol;

    const momentum = clamp((prevLuck - prevPrevLuck) * 0.35, -5, 5);

    const shockBase = clamp(palaceGoodness * 2.2, -10, 12);
    const shock =
      changedPalace && age !== 0
        ? clamp(shockBase + (randByAge(seed, age + 777) - 0.5) * 6, -12, 14)
        : 0;

    const sparkle =
      randByAge(seed, age + 4242) > 0.988 - optimism * 0.006 &&
      palaceGoodness > 0
        ? clamp(6 + palaceGoodness * 2, 6, 16)
        : 0;

    const alpha = clamp(
      0.18 + Math.min(0.12, Math.abs(palaceGoodness) * 0.02) + (1 - risk) * 0.05,
      0.18,
      0.32
    );

    let nextLuck =
      prevLuck * (1 - alpha) +
      target * alpha +
      noise +
      momentum +
      shock +
      sparkle;

    nextLuck = clampDelta(nextLuck, prevLuck, 18);
    nextLuck = clamp(nextLuck, minFloor, 98);

    // Achievement update:
    // - still overall rising (feel-good)
    // - but with decade "regimes" (plateau / leap) driven by the active palace
    // - plus early/mid/late archetypes to create distinct arcs per chart
    const luckSignal = clamp((nextLuck - 52) / 48, -1.2, 1.2);
    const palaceSignal = clamp(palaceGoodness / 10, -1.2, 1.2);
    const transformSignal = clamp(
      activeScore.transformGood * 0.9 - activeScore.transformBad * 1.25,
      -6,
      6
    );

    const earlyWindow = 1 - sigmoid((age - 30) / 5);
    const lateWindow = sigmoid((age - 42) / 6);
    const midWindow = sigmoid((age - 16) / 6) * (1 - sigmoid((age - 76) / 10));
    const archetypeWeight =
      arcType === 0
        ? 0.25 + 1.05 * earlyWindow
        : arcType === 2
          ? 0.25 + 1.05 * lateWindow
          : 0.55 + 0.8 * midWindow;

    const decadeStart = Math.floor(age / 10) * 10;
    const decadePhase = (age - decadeStart) / 10; // 0..0.9

    // Regime parameters change per decade based on palace strength + transforms.
    const decadeKey = 60000 + decadeStart + Math.round((palaceSignal + 2) * 37);
    const regimeRnd = randByAge(seed, decadeKey);
    const regimeBase = clamp(
      0.85 +
        palaceSignal * 0.55 +
        transformSignal * 0.05 +
        optimism * 0.35 -
        risk * 0.15,
      0.3,
      1.8
    );

    const isLeapDecade =
      regimeRnd < clamp(0.18 + Math.max(0, palaceSignal) * 0.22 + optimism * 0.08, 0.1, 0.55);
    const isPlateauDecade =
      !isLeapDecade &&
      regimeRnd > 0.72 &&
      (palaceSignal < -0.1 || transformSignal < -1);

    const leapKick =
      isLeapDecade && decadePhase < 0.22
        ? clamp(2.2 + regimeBase * 2.2 + (sparkle ? 2.4 : 0), 1.5, 9.5)
        : 0;

    const plateauBrake =
      isPlateauDecade
        ? (0.65 + (1 - patience) * 0.9) * (0.6 + Math.max(0, -palaceSignal))
        : 0;

    const headroom = Math.max(0, cap - achievement);
    const baseDrift =
      (0.28 + optimism * 0.55 + patience * 0.18) *
      (0.85 + ambition * 0.75) *
      archetypeWeight;

    const growthFromLuck =
      Math.max(0, luckSignal) * (1.2 + regimeBase * 1.4) * (0.65 + ambition * 0.75);
    const growthFromPalace =
      Math.max(0, palaceSignal) * (0.9 + regimeBase) + Math.max(0, transformSignal) * 0.12;

    const drawdown =
      Math.max(0, -luckSignal) * (1.8 - resilience) * (0.75 + risk * 0.7) +
      Math.max(0, -palaceSignal) * (1.1 - resilience) * 0.6 +
      Math.max(0, -transformSignal) * (1.1 - resilience) * 0.08;

    const milestone =
      age % 10 === 0 && age !== 0 && (isLeapDecade || luckSignal > 0.35)
        ? clamp(0.8 + regimeBase * 1.2 + Math.max(0, palaceSignal) * 1.6, 0.4, 4.6)
        : 0;

    const achNoise =
      (randByAge(seed, age + 90000) - 0.5) * (0.9 + (1 - resilience) * 2.0);

    const approachFactor = 0.28 + headroom / 160; // slower near cap
    let achNext =
      achievement +
      (baseDrift + growthFromLuck + growthFromPalace) * approachFactor -
      drawdown -
      plateauBrake +
      leapKick +
      milestone +
      achNoise;

    const maxStep = 4 + ambition * 6 + (isLeapDecade ? 6 : 0);
    achNext = clampDelta(achNext, achievement, maxStep);
    achNext = clamp(achNext, 0, cap);
    achievement = achNext;

    const phaseLabel = active.decadeRange
      ? `?? ${active.decadeRange}`
      : `?? ${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 9}`;

    const drivers = [
      phaseLabel,
      changedPalace && age !== 0 ? `?? ${active.name}` : `?? ${active.name}`,
      `?? ${Math.round(baseBaseline)}`,
      `?? ${Math.round(target)}`,
      shock !== 0
        ? `?? ${shock > 0 ? "+" : ""}${Math.round(shock)}`
        : `?? ${Math.round(vol)}`,
      sparkle !== 0
        ? `?? +${Math.round(sparkle)}`
        : `?? ${momentum > 0 ? "+" : ""}${Math.round(momentum)}`
    ];

    const confidence = clamp(
      0.56 +
        Math.min(0.18, activeScore.starTotal / 28) -
        Math.min(0.12, vol / 200),
      0.45,
      0.82
    );

    points.push({
      age,
      luck: clamp(Math.round(nextLuck), 0, 100),
      achievement: clamp(Math.round(achievement), 0, 100),
      confidence,
      drivers
    });

    prevPrevLuck = prevLuck;
    prevLuck = nextLuck;
    prevPalaceName = active.name;
  }

  return points;
};

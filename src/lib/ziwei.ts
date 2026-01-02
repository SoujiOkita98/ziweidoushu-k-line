import * as iztro from "iztro";
import type { Palace, ZiweiChart, ZiweiInput } from "./types";

const PALACE_NAMES = [
  "命宫",
  "兄弟",
  "夫妻",
  "子女",
  "财帛",
  "疾厄",
  "迁移",
  "交友",
  "官禄",
  "田宅",
  "福德",
  "父母"
];

const PALACE_ALIASES: Record<string, string[]> = {
  交友: ["仆役"]
};

const pickNames = (items: unknown): string[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item) return "";
      if (typeof item === "string") return item;
      if (typeof item === "object" && "name" in item) {
        const name = (item as { name?: string }).name;
        return name ?? "";
      }
      return "";
    })
    .filter((name) => name.length > 0);
};

const normalizeRange = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length >= 2) {
    return `${value[0]}-${value[1]}`;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "start" in value &&
    "end" in value
  ) {
    const start = (value as { start?: number }).start;
    const end = (value as { end?: number }).end;
    if (typeof start === "number" && typeof end === "number") {
      return `${start}-${end}`;
    }
  }
  return undefined;
};

const pickRange = (palace: any): string | undefined => {
  const range =
    palace?.decade?.range ??
    palace?.decadeRange ??
    palace?.tenYearRange ??
    palace?.decadal?.range ??
    undefined;
  return normalizeRange(range);
};

const toTimeIndex = (time: string): number => {
  const hour = Number.parseInt(time.split(":")[0] ?? "", 10);
  if (Number.isNaN(hour)) return 0;

  const util = (iztro as any).util ?? (iztro as any).utils;
  const timeToIndex = util?.timeToIndex;
  if (typeof timeToIndex === "function") {
    return timeToIndex(hour);
  }

  if (hour === 0) return 0;
  if (hour === 23) return 12;
  return Math.floor((hour + 1) / 2);
};

const createAstrolabe = (input: ZiweiInput): any => {
  const astro = (iztro as any).astro;
  const timeIndex = toTimeIndex(input.time);

  if (astro?.astrolabeBySolarDate) {
    if (input.calendarType === "lunar") {
      return astro.astrolabeByLunarDate(
        input.date,
        timeIndex,
        input.gender,
        false,
        false,
        "zh-CN"
      );
    }

    return astro.astrolabeBySolarDate(
      input.date,
      timeIndex,
      input.gender,
      false,
      "zh-CN"
    );
  }

  const astroFn = astro ?? (iztro as any).default ?? iztro;
  return astroFn({
    birth: `${input.date} ${input.time}`,
    lunar: input.calendarType === "lunar",
    gender: input.gender === "male" ? "male" : "female",
    language: "zh-CN"
  });
};

const findPalaceByFlag = (palaces: any[], flag: string): string | undefined => {
  const palace = palaces.find((item) => item && item[flag]);
  return palace?.name ?? palace?.palaceName;
};

const normalizePalaces = (palacesRaw: any[]): Palace[] => {
  return PALACE_NAMES.map((name) => {
    const aliases = PALACE_ALIASES[name] ?? [];
    const palace = palacesRaw.find((item) => {
      const rawName = item?.name ?? item?.palaceName;
      return rawName === name || aliases.includes(rawName);
    });

    return {
      name,
      mainStars: pickNames(
        palace?.majorStars ?? palace?.mainStars ?? palace?.stars ?? []
      ),
      subStars: pickNames(
        palace?.minorStars ?? palace?.subStars ?? palace?.assistStars ?? []
      ),
      transforms: pickNames(
        palace?.transformationStars ?? palace?.transforms ?? palace?.fourTransforms
      ),
      decadeRange: pickRange(palace)
    };
  });
};

export const generateZiweiChart = (input: ZiweiInput): ZiweiChart => {
  const astrolabe = createAstrolabe(input) as any;

  const palacesRaw = astrolabe?.palaces ?? astrolabe?.astrolabe?.palaces ?? [];
  const palaces = normalizePalaces(palacesRaw);
  const fourTransforms = pickNames(
    astrolabe?.fourTransforms ?? astrolabe?.fourTransformations
  );

  return {
    palaces,
    center: {
      name: astrolabe?.name ?? undefined,
      gender: input.gender,
      solarDate: astrolabe?.solarDate ?? input.date,
      lunarDate: astrolabe?.lunarDate ?? undefined,
      time: input.time,
      fatePalace:
        astrolabe?.fatePalace ??
        findPalaceByFlag(palacesRaw, "isFate") ??
        findPalaceByFlag(palacesRaw, "isOriginalPalace"),
      bodyPalace:
        astrolabe?.bodyPalace ??
        findPalaceByFlag(palacesRaw, "isBody") ??
        findPalaceByFlag(palacesRaw, "isBodyPalace"),
      fourTransforms: fourTransforms.length > 0 ? fourTransforms : undefined
    }
  };
};

export const palaceOrder = PALACE_NAMES;


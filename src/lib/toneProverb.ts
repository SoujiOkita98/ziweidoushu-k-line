import type { AnalysisInput } from "./aiPrompt";

export type ToneTheme =
  | "患得患失"
  | "太在意从前、又太担心将来"
  | "急于求成"
  | "不敢伸手"
  | "用力过猛"
  | "恐惧失去"
  | "犹豫不决"
  | "不肯止、不肯慢";

export type ToneProverb = {
  theme: ToneTheme;
  text: string;
};

const MAX_CHARS = 40;
const TITLE = "【箴言定调语】";

const POOL: Record<ToneTheme, string[]> = {
  "患得患失": [
    "心越抓紧，越容易失手；先松一口气再走。",
    "你怕失去，才会用力；把力气留给当下。"
  ],
  "太在意从前、又太担心将来": [
    "别把昨天当枷锁，也别把明天当审判。",
    "过去放在心里，未来放在脚下。"
  ],
  "急于求成": [
    "快不是本事，稳才是底气。",
    "先把路走对，再谈走多快。"
  ],
  "不敢伸手": [
    "机会不怕晚，怕的是你从未伸手。",
    "你不必完美才配得上开始。"
  ],
  "用力过猛": [
    "用力太满，反而走不远；留一分给呼吸。",
    "别把自己拧成一根弦，松一点更准。"
  ],
  "恐惧失去": [
    "越怕失去，越难拥有；先学会安住自己。",
    "你守得住的，从来不是抓紧，而是从容。"
  ],
  "犹豫不决": [
    "想得太多会停在原地，先做一步再修正。",
    "选择不必完美，只要愿意承担。"
  ],
  "不肯止、不肯慢": [
    "停一下不是退，是给自己换气。",
    "慢一点，你才能听见心里真正要走的方向。"
  ]
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

const pick = <T,>(items: T[], seed: number) => {
  if (items.length === 0) return null;
  const index = seed % items.length;
  return items[index] ?? null;
};

const normalizePunctuation = (text: string) => {
  return text.replace(/\s+/g, " ").trim();
};

const isTooLong = (text: string) => {
  return Array.from(text).length > MAX_CHARS;
};

const safePickProverb = (theme: ToneTheme, seed: number) => {
  const items = POOL[theme] ?? [];
  for (let offset = 0; offset < items.length; offset += 1) {
    const candidate = pick(items, seed + offset);
    if (!candidate) continue;
    const normalized = normalizePunctuation(candidate);
    if (!isTooLong(normalized)) return normalized;
  }
  return "先稳住心，再往前走。";
};

const inferTheme = (data: AnalysisInput): ToneTheme => {
  const { scores, kline } = data;

  const values = kline.map((p) => p.luck);
  const mean = values.reduce((acc, v) => acc + v, 0) / Math.max(1, values.length);
  const variance =
    values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
    Math.max(1, values.length);
  const std = Math.sqrt(variance) || 0;

  const start = values[0] ?? 50;
  const end = values[values.length - 1] ?? 50;
  const slope = end - start;

  const lowCount = values.filter((v) => v < 35).length;
  const highCount = values.filter((v) => v > 75).length;

  if (std >= 16 && lowCount >= 12) return "患得患失";
  if (std >= 18) return "恐惧失去";
  if (slope >= 18 && scores.career >= 70) return "急于求成";
  if (slope <= -12 && scores.emotion <= 55) return "太在意从前、又太担心将来";
  if (scores.career <= 55 && scores.wealth <= 55) return "不敢伸手";
  if (std >= 14 && highCount >= 18) return "用力过猛";
  if (scores.emotion <= 58 && std <= 10) return "犹豫不决";
  return "不肯止、不肯慢";
};

export const buildToneProverb = (data: AnalysisInput): ToneProverb => {
  const theme = inferTheme(data);
  const seed = hashSeed(
    [
      theme,
      data.chart.center.solarDate ?? "",
      data.chart.center.time ?? "",
      String(data.scores.total),
      String(data.kline[0]?.luck ?? ""),
      String(data.kline[data.kline.length - 1]?.luck ?? "")
    ].join("|")
  );

  return {
    theme,
    text: safePickProverb(theme, seed)
  };
};

export const formatAnalysisWithTone = (proverb: ToneProverb, analysisText: string) => {
  const trimmed = (analysisText ?? "").trim();
  return [TITLE, proverb.text, "", trimmed].join("\n").trim();
};

export const splitToneFromAnalysisText = (analysisText: string) => {
  const raw = analysisText ?? "";
  const lines = raw.split(/\r?\n/);
  const firstNonEmpty = lines.findIndex((l) => l.trim().length > 0);
  if (firstNonEmpty === -1) return { proverb: "", body: "" };

  if (lines[firstNonEmpty]?.trim() !== TITLE) {
    return { proverb: "", body: raw };
  }

  const proverbLineIndex = lines.findIndex(
    (l, idx) => idx > firstNonEmpty && l.trim().length > 0
  );
  const proverb = proverbLineIndex >= 0 ? (lines[proverbLineIndex] ?? "").trim() : "";

  const bodyStart = proverbLineIndex >= 0 ? proverbLineIndex + 1 : firstNonEmpty + 1;
  const body = lines.slice(bodyStart).join("\n").trimStart();
  return { proverb, body };
};


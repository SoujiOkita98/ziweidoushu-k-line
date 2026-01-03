import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAnalysisText } from "@/lib/ai";
import type { AnalysisInput } from "@/lib/aiPrompt";
import { buildToneProverb, formatAnalysisWithTone } from "@/lib/toneProverb";
import type { Palace, ZiweiChart } from "@/lib/types";

const schema = z.object({
  chart: z.object({
    center: z.object({
      solarDate: z.string().optional(),
      lunarDate: z.string().optional(),
      time: z.string(),
      gender: z.enum(["male", "female"]),
      fatePalace: z.string().optional(),
      bodyPalace: z.string().optional()
    }),
    palaces: z.array(
      z.object({
        name: z.string(),
        mainStars: z.array(z.string()),
        subStars: z.array(z.string()),
        transforms: z.array(z.string()),
        decadeRange: z.string().optional()
      })
    )
  }),
  kline: z.array(
    z.object({
      age: z.number(),
      luck: z.number(),
      confidence: z.number(),
      drivers: z.array(z.string())
    })
  )
});

const clamp = (value: number, min = 0, max = 100) => {
  return Math.min(max, Math.max(min, value));
};

const getPalace = (chart: ZiweiChart, name: string): Palace | undefined => {
  return chart.palaces.find((palace) => palace.name === name);
};

const scoreFromPalace = (palace?: Palace): number => {
  if (!palace) return 50;
  const main = palace.mainStars.length;
  const sub = palace.subStars.length;
  const transforms = palace.transforms.length;
  return clamp(40 + main * 6 + sub * 2 + transforms * 3);
};

const buildScores = (chart: ZiweiChart, kline: { luck: number }[]) => {
  const totalAvg =
    kline.reduce((acc, point) => acc + point.luck, 0) /
    Math.max(1, kline.length);

  const wealth = scoreFromPalace(getPalace(chart, "财帛"));
  const career = scoreFromPalace(getPalace(chart, "官禄"));
  const emotion = Math.round(
    (scoreFromPalace(getPalace(chart, "夫妻")) +
      scoreFromPalace(getPalace(chart, "交友"))) /
      2
  );
  const health = scoreFromPalace(getPalace(chart, "疾厄"));

  return {
    total: clamp(Math.round(totalAvg)),
    wealth,
    career,
    emotion,
    health
  };
};

export async function POST(req: Request) {
  try {
    const startedAt = Date.now();
    console.info("[api/analysis] start");
    const payload = await req.json();
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const chart = parsed.data.chart as ZiweiChart;
    const kline = parsed.data.kline;
    const scores = buildScores(chart, kline);

    const analysisInput: AnalysisInput = {
      chart,
      kline,
      scores
    };

    const analysisText = await generateAnalysisText(analysisInput);
    const proverb = buildToneProverb(analysisInput);
    console.info("[api/analysis] ok", { ms: Date.now() - startedAt });
    return NextResponse.json({
      analysisText: formatAnalysisWithTone(proverb, analysisText)
    });
  } catch (error) {
    console.error("[api/analysis] error", error);
    const message =
      (error as Error)?.name === "AbortError" ? "AI 超时，请重试" : "AI 生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


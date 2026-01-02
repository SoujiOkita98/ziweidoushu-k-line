import { NextResponse } from "next/server";
import { z } from "zod";
import { generateZiweiChart } from "@/lib/ziwei";
import { generateKline } from "@/lib/kline";
import type { ChartResponse, Palace, ZiweiChart } from "@/lib/types";

const schema = z.object({
  calendarType: z.enum(["solar", "lunar"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  gender: z.enum(["male", "female"])
});

const isValidDateTime = (date: string, time: string) => {
  const value = new Date(`${date}T${time}:00`);
  return !Number.isNaN(value.getTime());
};

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
    kline.reduce((acc, point) => acc + point.luck, 0) / Math.max(1, kline.length);

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

const buildKlinePhases = (kline: { age: number; luck: number }[]) => {
  const decades = [];
  for (let start = 0; start <= 90; start += 10) {
    const end = start === 90 ? 100 : start + 9;
    const points = kline.filter((p) => p.age >= start && p.age <= end);
    const avg =
      points.reduce((acc, p) => acc + p.luck, 0) / Math.max(1, points.length);
    const variance =
      points.reduce((acc, p) => acc + Math.pow(p.luck - avg, 2), 0) /
      Math.max(1, points.length);
    decades.push({ start, end, avg, variance });
  }

  const deltas = decades.slice(1).map((d, i) => ({
    to: d,
    delta: d.avg - decades[i].avg
  }));

  const rising = deltas
    .filter((d) => d.delta > 2)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3)
    .map((d) => `${d.to.start}-${d.to.end}岁`);

  const falling = deltas
    .filter((d) => d.delta < -2)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 2)
    .map((d) => `${d.to.start}-${d.to.end}岁`);

  const stable = decades
    .slice()
    .sort((a, b) => a.variance - b.variance)[0];

  return {
    rising,
    falling,
    stable: stable ? `${stable.start}-${stable.end}岁` : ""
  };
};

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const parsed = schema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const input = parsed.data;

    if (!isValidDateTime(input.date, input.time)) {
      return NextResponse.json({ error: "日期或时间无效" }, { status: 400 });
    }

    const chart = generateZiweiChart(input);
    const kline = generateKline(chart);
    const scores = buildScores(chart, kline);
    const klinePhases = buildKlinePhases(kline);

    const response: ChartResponse = {
      chart,
      kline,
      scores,
      klinePhases,
      summary: {
        fatePalace: chart.center.fatePalace,
        bodyPalace: chart.center.bodyPalace,
        fourTransforms: chart.center.fourTransforms,
        decadeRanges: chart.palaces
          .map((palace) => palace.decadeRange)
          .filter(Boolean)
      },
      warnings:
        input.calendarType === "lunar"
          ? ["阴历支持依赖 iztro 排盘，如遇失败请改用阳历。"]
          : undefined
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/chart] error", error);
    return NextResponse.json({ error: "服务不可用，请稍后再试" }, { status: 500 });
  }
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import type { KlinePoint } from "@/lib/types";

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const hash32 = (input: string) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const rand01 = (seed: number, salt: number) => {
  let x = seed ^ Math.imul(salt + 1, 2654435761);
  x ^= x >>> 16;
  x = Math.imul(x, 2246822519);
  x ^= x >>> 13;
  x = Math.imul(x, 3266489917);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967295;
};

const clampDelta = (next: number, prev: number, maxDelta: number) => {
  const delta = next - prev;
  return prev + clamp(delta, -maxDelta, maxDelta);
};

type CandlePoint = {
  age: number;
  open: number;
  close: number;
  high: number;
  low: number;
  score: number;
  reason: string;
  drivers: string[];
};

export default function LifeKline({ data }: { data: KlinePoint[] }) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<echarts.EChartsType | null>(null);
  const [showCandles, setShowCandles] = useState(true);
  const [showTrend, setShowTrend] = useState(true);
  const [yMode, setYMode] = useState<"relative" | "absolute">("relative");

  const relativeCandles = useMemo<CandlePoint[]>(() => {
    const points = data ?? [];
    return points.map((point, index) => {
      const close = point.luck;
      const open = index > 0 ? points[index - 1]!.luck : close;
      const delta = close - open;
      const wick = Math.min(
        14,
        Math.max(2, Math.round(3 + Math.abs(delta) * 0.55))
      );
      const high = Math.min(100, Math.max(open, close) + wick);
      const low = Math.max(0, Math.min(open, close) - wick);

      return {
        age: point.age,
        open,
        close,
        high,
        low,
        score: close,
        reason: point.drivers.join(" / "),
        drivers: point.drivers
      };
    });
  }, [data]);

  const absoluteCloses = useMemo(() => {
    const direct = data.map((p) => p.achievement).filter((v) => typeof v === "number");
    if (direct.length === data.length && direct.length > 0) {
      return data.map((p) => p.achievement ?? 0);
    }

    const rel = relativeCandles.map((p) => p.close);
    if (rel.length === 0) return [];

    const series: number[] = [];
    const seedText = relativeCandles
      .slice(0, 36)
      .map((p) => `${p.age}:${p.close}:${p.drivers.join(",")}`)
      .join("|");
    const seed = hash32(seedText);

    const mean = rel.reduce((acc, v) => acc + v, 0) / rel.length;
    const variance =
      rel.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / rel.length;
    const std = Math.sqrt(variance) || 1;

    const ambition = 0.75 + rand01(seed, 1) * 0.9; // 越大越“敢冲”
    const resilience = 0.55 + rand01(seed, 2) * 0.45; // 越大越抗回撤
    const patience = 0.5 + rand01(seed, 3) * 0.7; // 越大越不容易早早封顶

    const cap = clamp(
      86 + (mean - 55) * 0.35 + (rand01(seed, 10) - 0.5) * 10,
      80,
      99
    );
    let level = clamp(
      18 + (mean - 50) * 0.25 + (rand01(seed, 11) - 0.5) * 16,
      8,
      55
    );

    for (let i = 0; i < rel.length; i += 1) {
      const value = rel[i] ?? 50;
      const prev = i > 0 ? rel[i - 1] ?? value : value;

      const pos = Math.max(0, (value - 52) / 48); // 0..~1
      const neg = Math.max(0, (52 - value) / 52); // 0..~1
      const momentum = clamp((value - prev) / 30, -0.8, 0.8);

      const drivers = relativeCandles[i]?.drivers ?? [];
      const palaceSwitch = drivers.some((d) => d.startsWith("转宫")) ? 1 : 0;
      const sparkle = drivers.some((d) => d.includes("惊喜")) ? 1 : 0;

      const growthRate = clamp(
        (0.022 + (std / 40) * 0.02) * ambition * (0.85 + pos * 0.8),
        0.016,
        0.06
      );

      const headroom = Math.max(0, cap - level);
      const drift = headroom * growthRate;

      const setback =
        (level - 8) *
        (0.012 + neg * 0.025 + palaceSwitch * 0.01) *
        (1.05 - resilience);

      const breakthrough = sparkle ? clamp(2 + pos * 6, 2, 10) : 0;

      const noise =
        (rand01(seed, 2000 + i) - 0.5) * (1.4 + (1 - resilience) * 2.2);

      const plateauBrake =
        headroom < 18 ? (1 - patience) * (0.6 - headroom / 30) : 0;

      level =
        level +
        drift -
        setback +
        momentum * (1.0 + pos * 0.6) +
        breakthrough +
        noise -
        plateauBrake;

      level = clampDelta(level, series[i - 1] ?? level, 10 + ambition * 4);
      level = clamp(level, 0, cap);
      series.push(Math.round(level));
    }

    return series;
  }, [data, relativeCandles]);

  const absoluteCandles = useMemo<CandlePoint[]>(() => {
    const closes = absoluteCloses;
    return closes.map((close, index) => {
      const open = index > 0 ? closes[index - 1]! : close;
      const delta = close - open;
      const wick = Math.min(
        10,
        Math.max(2, Math.round(2 + Math.abs(delta) * 0.6))
      );
      const high = Math.min(100, Math.max(open, close) + wick);
      const low = Math.max(0, Math.min(open, close) - wick);

      const base = relativeCandles[index];
      const reason = base?.drivers?.join(" / ") ?? "";

      return {
        age: base?.age ?? index,
        open,
        close,
        high,
        low,
        score: close,
        reason,
        drivers: base?.drivers ?? []
      };
    });
  }, [absoluteCloses, relativeCandles]);

  const candles = yMode === "absolute" ? absoluteCandles : relativeCandles;

  const yDomain = useMemo(() => {
    const closes = candles.map((p) => p.close);
    if (closes.length === 0) return { min: 0, max: 100 };

    if (yMode === "absolute") return { min: 0, max: 100 };

    const minVal = Math.min(...closes);
    const maxVal = Math.max(...closes);
    const span = Math.max(30, maxVal - minVal + 10);
    const center = (minVal + maxVal) / 2;
    const min = clamp(Math.floor(center - span / 2), 0, 90);
    const max = clamp(Math.ceil(center + span / 2), 10, 100);
    return { min, max };
  }, [candles, yMode]);

  useEffect(() => {
    if (!chartRef.current || instanceRef.current) return;

    instanceRef.current = echarts.init(chartRef.current);
    const chart = instanceRef.current;

    const observer = new ResizeObserver(() => {
      chart.resize();
    });
    observer.observe(chartRef.current);

    return () => {
      observer.disconnect();
      chart.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart) return;

    const ages = candles.map((point) => point.age);
    const closes = candles.map((point) => point.close);
    const ohlc = candles.map((point) => [
      point.open,
      point.close,
      point.low,
      point.high
    ]);

    const decadeAreas = Array.from({ length: 10 }, (_, index) => {
      const start = index * 10;
      const end = start + 10;
      const color =
        index % 2 === 0
          ? "rgba(180, 138, 74, 0.06)"
          : "rgba(15, 118, 110, 0.04)";
      return [{ xAxis: start, itemStyle: { color } }, { xAxis: end }];
    });

    chart.setOption({
      backgroundColor: "transparent",
      grid: { left: 74, right: 28, top: 48, bottom: 44, containLabel: true },
      legend: {
        show: false,
        top: 0,
        left: 0,
        textStyle: { color: "#1f2937", fontSize: 11 },
        data: ["运势K线", "收盘趋势"],
        selected: {
          运势K线: showCandles,
          收盘趋势: showTrend
        }
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        formatter: (params: any) => {
          const candle = Array.isArray(params)
            ? params.find((p) => p?.seriesType === "candlestick")
            : null;
          const idx = candle?.dataIndex ?? 0;
          const point = candles[idx];
          if (!point) return "";
          const relative = relativeCandles[idx]?.close;
          return [
            `<div style="font-weight:600;margin-bottom:4px">年龄 ${point.age}</div>`,
            yMode === "absolute"
              ? `<div>成就: ${point.close}${typeof relative === "number" ? `　运势: ${relative}` : ""}</div>`
              : `<div>运势: ${point.close}</div>`,
            `<div>开: ${point.open}　收: ${point.close}</div>`,
            `<div>高: ${point.high}　低: ${point.low}</div>`,
            `<div style="margin-top:6px;opacity:0.75">${point.reason}</div>`
          ].join("");
        }
      },
      xAxis: {
        type: "category",
        data: ages,
        boundaryGap: true,
        name: "年龄",
        nameLocation: "middle",
        nameGap: 28,
        axisLine: { lineStyle: { color: "#1f2937" } },
        axisTick: { alignWithLabel: true, lineStyle: { color: "#1f2937" } },
        splitLine: { show: true, lineStyle: { color: "#efe9dc", type: "dashed" } },
        axisLabel: { color: "#1f2937", interval: 4 }
      },
      yAxis: {
        type: "value",
        min: yDomain.min,
        max: yDomain.max,
        name: yMode === "absolute" ? "成就" : "运势",
        nameLocation: "middle",
        nameGap: 52,
        nameRotate: 90,
        axisLine: { lineStyle: { color: "#1f2937" } },
        axisTick: { lineStyle: { color: "#1f2937" } },
        splitLine: { lineStyle: { color: "#e7e3da" } },
        axisLabel: { color: "#1f2937", formatter: (value: number) => `${value}` }
      },
      series: [
        {
          name: "运势K线",
          type: "candlestick",
          data: ohlc,
          itemStyle: {
            color: "#22c55e",
            color0: "#ef4444",
            borderColor: "#15803d",
            borderColor0: "#b91c1c"
          },
          z: 2,
          markLine: {
            symbol: "none",
            label: { color: "#283046" },
            lineStyle: { color: "#b08a4a", type: "dashed" },
            data: Array.from({ length: 10 }, (_, index) => ({
              xAxis: index * 10
            }))
          },
          markArea: {
            silent: true,
            data: decadeAreas
          }
        },
        {
          name: "收盘趋势",
          type: "line",
          data: closes,
          smooth: 0.35,
          lineStyle: { color: "#0f766e", width: 2.5 },
          symbol: "circle",
          symbolSize: 5,
          itemStyle: { color: "#0f766e", borderColor: "#e9d7b2", borderWidth: 1 },
          markPoint: {
            symbolSize: 46,
            symbol: "pin",
            label: { color: "#0f172a", fontWeight: 700, formatter: "★" },
            itemStyle: { color: "#ef4444" },
            data: [
              { type: "max", name: "最高" },
              { type: "min", name: "最低" }
            ]
          },
          z: 3,
          silent: true
        }
      ]
    });
  }, [candles, relativeCandles, showCandles, showTrend, yDomain, yMode]);

  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart) return;
    chart.setOption(
      {
        legend: {
          selected: {
            运势K线: showCandles,
            收盘趋势: showTrend
          }
        }
      },
      { lazyUpdate: true }
    );
  }, [showCandles, showTrend]);

  const toggleCandles = () => {
    if (showCandles && !showTrend) return;
    setShowCandles((prev) => !prev);
  };

  const toggleTrend = () => {
    if (showTrend && !showCandles) return;
    setShowTrend((prev) => !prev);
  };

  const toggleClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
      active
        ? "border-ink bg-ink text-white shadow-sm"
        : "border-ink/20 bg-white text-ink hover:bg-ink/5"
    }`;

  return (
    <div className="w-full">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold text-ink/80">刻度</div>
          <button
            type="button"
            onClick={() => setYMode("relative")}
            className={toggleClass(yMode === "relative")}
            aria-pressed={yMode === "relative"}
          >
            相对运势
          </button>
          <button
            type="button"
            onClick={() => setYMode("absolute")}
            className={toggleClass(yMode === "absolute")}
            aria-pressed={yMode === "absolute"}
          >
            绝对成就
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold text-ink/80">图层</div>
          <button
            type="button"
            onClick={toggleCandles}
            className={toggleClass(showCandles)}
            aria-pressed={showCandles}
          >
            运势K线
          </button>
          <button
            type="button"
            onClick={toggleTrend}
            className={toggleClass(showTrend)}
            aria-pressed={showTrend}
          >
            收盘趋势
          </button>
        </div>
      </div>
      <div ref={chartRef} className="h-[320px] w-full" />
    </div>
  );
}

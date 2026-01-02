"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { KlinePoint } from "@/lib/types";

export default function LifeKline({ data }: { data: KlinePoint[] }) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<echarts.EChartsType | null>(null);

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

    const ages = data.map((point) => point.age);
    const values = data.map((point) => point.luck);

    const decadeAreas = Array.from({ length: 10 }, (_, index) => {
      const start = index * 10;
      const end = start + 10;
      const color = index % 2 === 0 ? "rgba(180, 138, 74, 0.06)" : "rgba(15, 118, 110, 0.04)";
      return [
        { xAxis: start, itemStyle: { color } },
        { xAxis: end }
      ];
    });

    chart.setOption({
      backgroundColor: "transparent",
      grid: { left: 52, right: 28, top: 32, bottom: 44 },
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const item = params?.[0];
          const point = data[item?.dataIndex ?? 0];
          if (!point) return "";
          return `年龄 ${point.age}<br/>运势 ${point.luck}<br/>${point.drivers.join(" / ")}`;
        }
      },
      xAxis: {
        type: "category",
        data: ages,
        boundaryGap: false,
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
        min: 0,
        max: 100,
        name: "运势",
        nameLocation: "middle",
        nameGap: 46,
        axisLine: { lineStyle: { color: "#1f2937" } },
        axisTick: { lineStyle: { color: "#1f2937" } },
        splitLine: { lineStyle: { color: "#e7e3da" } },
        axisLabel: { color: "#1f2937", formatter: (value: number) => `${value}` }
      },
      series: [
        {
          type: "line",
          data: values,
          smooth: 0.35,
          symbol: "none",
          lineStyle: { color: "rgba(15, 118, 110, 0.15)", width: 10 },
          silent: true,
          z: 1
        },
        {
          type: "line",
          data: values,
          smooth: 0.35,
          lineStyle: { color: "#0f766e", width: 3 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(15, 118, 110, 0.35)" },
              { offset: 1, color: "rgba(15, 118, 110, 0.04)" }
            ])
          },
          symbol: "circle",
          symbolSize: 5,
          itemStyle: { color: "#0f766e", borderColor: "#e9d7b2", borderWidth: 1 },
          markPoint: {
            symbolSize: 46,
            label: { color: "#0f172a", fontWeight: 600 },
            data: [
              { type: "max", name: "峰值" },
              { type: "min", name: "谷值" }
            ]
          },
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
          },
          z: 3
        }
      ]
    });
  }, [data]);

  return <div ref={chartRef} className="h-[320px] w-full" />;
}

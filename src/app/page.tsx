"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import ChartBoard from "@/components/ChartBoard";
import LifeKline from "@/components/LifeKline";
import MasterChat from "@/components/MasterChat";
import type {
  AnalysisTextResponse,
  ChartResponse,
  ChatContext,
  ChatMessage,
  ZiweiInput
} from "@/lib/types";

const defaultForm: ZiweiInput = {
  calendarType: "solar",
  date: "",
  time: "",
  gender: "male"
};

export default function Home() {
  const [form, setForm] = useState<ZiweiInput>(defaultForm);
  const [activeTab, setActiveTab] = useState<"chart" | "kline" | "chat">(
    "chart"
  );
  const [result, setResult] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisText, setAnalysisText] = useState<string>("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const canSubmit = useMemo(() => {
    return form.date.length > 0 && form.time.length > 0;
  }, [form.date, form.time]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setAnalysisText("");
    setAnalysisError(null);

    if (!canSubmit) {
      setError("请填写完整出生日期与时间");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? "生成失败");
        setResult(null);
        return;
      }

      setResult(data as ChartResponse);
      setActiveTab("chart");
    } catch (err) {
      setError("服务不可用，请稍后再试");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysis = async () => {
    if (!result || analysisLoading) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    setAnalysisProgress(0);

    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chart: result.chart,
          kline: result.kline
        })
      });
      const data = (await response.json()) as AnalysisTextResponse;
      if (!response.ok) {
        setAnalysisError((data as any)?.error ?? "AI 生成失败");
        setAnalysisText("");
      } else {
        setAnalysisText(data.analysisText);
      }
    } catch (err) {
      setAnalysisError("AI 服务不可用，请稍后再试");
      setAnalysisText("");
    } finally {
      setAnalysisProgress(100);
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    if (!analysisLoading) return;

    setAnalysisProgress(0);
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setAnalysisProgress((prev) => {
        const elapsed = Date.now() - startedAt;
        const target = Math.min(92, Math.round((elapsed / 60000) * 92));
        const next = Math.max(prev, target);
        return next >= 92 ? 92 : next;
      });
    }, 200);

    return () => clearInterval(timer);
  }, [analysisLoading]);

  const parseAnalysis = (text: string) => {
    if (!text) return [];
    const sectionRegex =
      /(?:^|\n)\s*(?:【\s*\d+\s*([^\]】]+)\s*】|(\d{1,2})[.、]\s*([^\n]+))/g;
    const indices: Array<{ title: string; start: number; end: number }> = [];
    let match: RegExpExecArray | null = null;
    while ((match = sectionRegex.exec(text)) !== null) {
      const title = (match[1] ?? match[3] ?? "").trim();
      if (title.length > 0) {
        indices.push({ title, start: match.index, end: 0 });
      }
    }
    indices.forEach((item, index) => {
      item.end = index + 1 < indices.length ? indices[index + 1].start : text.length;
    });

    return indices.map((item) => {
      const block = text.slice(item.start, item.end);
      const getPart = (label: string, fallbackLabel?: string) => {
        const marker =
          block.includes(label) ? label : fallbackLabel && block.includes(fallbackLabel) ? fallbackLabel : "";
        if (!marker) return [];
        const part = block.split(marker)[1] ?? "";
        const nextLabels = ["【结论】", "【依据】", "【可能的风险】", "【建议】", "[结论]", "[依据]", "[可能的风险]", "[建议]"];
        const next = nextLabels
          .map((l) => part.indexOf(l))
          .filter((i) => i >= 0)
          .sort((a, b) => a - b)[0];
        const content = next !== undefined ? part.slice(0, next) : part;
        return content
          .split("\n")
          .map((line) => line.replace(/^[-•]\\s*/, "").trim())
          .filter((line) => line.length > 0);
      };

      return {
        title: item.title,
        conclusion: getPart("【结论】", "[结论]")[0] ?? "",
        basis: getPart("【依据】", "[依据]"),
        risks: getPart("【可能的风险】", "[可能的风险]"),
        advice: getPart("【建议】", "[建议]")
      };
    });
  };

  const parsedAnalysis = analysisText ? parseAnalysis(analysisText) : [];

  const buildChatContext = (): ChatContext | null => {
    if (!result || !result.scores || !result.klinePhases) return null;
    const palaceFacts = result.chart.palaces.map((palace) => {
      const main =
        palace.mainStars.length > 0 ? palace.mainStars.join(" ") : "?";
      const sub = palace.subStars.length > 0 ? palace.subStars.join(" ") : "?";
      const transforms =
        palace.transforms.length > 0 ? palace.transforms.join(" ") : "?";
      const decade = palace.decadeRange ? `???${palace.decadeRange}` : "";
      return `${palace.name}: ??${main}???${sub}???${transforms}${decade}`;
    });
    const klineSample = result.kline.filter((point) => point.age % 10 === 0);

    return {
      chartSummary: {
        birth: {
          solarDate: result.chart.center.solarDate,
          lunarDate: result.chart.center.lunarDate,
          time: result.chart.center.time,
          gender: result.chart.center.gender
        },
        fatePalace: result.summary.fatePalace,
        bodyPalace: result.summary.bodyPalace,
        careerPalace: "官禄",
        wealthPalace: "财帛",
        marriagePalace: "夫妻",
        healthPalace: "疾厄",
        fourTransforms: result.summary.fourTransforms,
        palaceFacts
      },
      scores: result.scores,
      klinePhases: result.klinePhases,
      kline: klineSample
    };
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#ffffff,_#f7f6f2_45%,_#e7e3da_100%)] px-6 py-10">
      <div className="pointer-events-none absolute -top-48 right-[-220px] h-[520px] w-[520px] rounded-full border border-bronze/40 opacity-50 blur-[0.5px]" />
      <div className="pointer-events-none absolute top-8 left-[-120px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,_rgba(176,138,74,0.24),_transparent_65%)]" />
      <div className="pointer-events-none absolute top-12 right-[10%] h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,_rgba(15,118,110,0.16),_transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,_rgba(176,138,74,0.12),_transparent_55%),radial-gradient(circle_at_80%_20%,_rgba(15,118,110,0.1),_transparent_60%),radial-gradient(circle_at_60%_80%,_rgba(39,64,70,0.08),_transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,_rgba(176,138,74,0.04)_0px,_rgba(176,138,74,0.04)_2px,_transparent_2px,_transparent_12px)] opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(0,0,0,0.06),_transparent_60%)] mix-blend-multiply" />
      <div className="pointer-events-none absolute inset-0 mist-layer bg-[radial-gradient(circle_at_30%_40%,_rgba(120,120,120,0.15),_transparent_55%),radial-gradient(circle_at_70%_60%,_rgba(120,120,120,0.12),_transparent_60%)]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-40px] left-1/2 hidden -translate-x-1/2 select-none text-[320px] text-bronze/10 sm:block"
      >
        ☯
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm tracking-[0.3em] text-bronze">紫微实验室</p>
          <h1 className="text-3xl font-semibold text-slateblue">
            紫微斗数命盘 + 人生K线
          </h1>
          <p className="text-sm text-ink/70">
            输入出生信息，生成专业命盘与人生运势曲线（MVP 原型）。
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-xl border border-mist bg-white/80 p-6 shadow-panel"
          >
            <div className="text-sm font-semibold text-slateblue">出生信息</div>

            <label className="flex flex-col gap-2 text-xs text-ink/70">
              日历类型
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, calendarType: "solar" })}
                  className={`rounded-md border px-3 py-2 text-xs font-medium ${
                    form.calendarType === "solar"
                      ? "border-slateblue bg-slateblue text-white"
                      : "border-mist bg-white"
                  }`}
                >
                  阳历
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, calendarType: "lunar" })}
                  className={`rounded-md border px-3 py-2 text-xs font-medium ${
                    form.calendarType === "lunar"
                      ? "border-slateblue bg-slateblue text-white"
                      : "border-mist bg-white"
                  }`}
                >
                  阴历
                </button>
              </div>
              {form.calendarType === "lunar" ? (
                <span className="text-[11px] text-ink/50">
                  阴历支持依赖 iztro 排盘，如遇失败请改用阳历。
                </span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-xs text-ink/70">
              出生日期
              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm({ ...form, date: event.target.value })
                }
                className="rounded-md border border-mist bg-white px-3 py-2 text-sm"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-xs text-ink/70">
              出生时间 (24h)
              <input
                type="time"
                value={form.time}
                onChange={(event) =>
                  setForm({ ...form, time: event.target.value })
                }
                className="rounded-md border border-mist bg-white px-3 py-2 text-sm"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-xs text-ink/70">
              性别
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, gender: "male" })}
                  className={`rounded-md border px-3 py-2 text-xs font-medium ${
                    form.gender === "male"
                      ? "border-slateblue bg-slateblue text-white"
                      : "border-mist bg-white"
                  }`}
                >
                  男
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, gender: "female" })}
                  className={`rounded-md border px-3 py-2 text-xs font-medium ${
                    form.gender === "female"
                      ? "border-slateblue bg-slateblue text-white"
                      : "border-mist bg-white"
                  }`}
                >
                  女
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="mt-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/60"
            >
              {loading ? "生成中..." : "生成命盘"}
            </button>

            {error ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            ) : null}
          </form>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("chart")}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  activeTab === "chart"
                    ? "bg-slateblue text-white"
                    : "bg-white text-slateblue"
                }`}
              >
                命盘
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("kline")}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  activeTab === "kline"
                    ? "bg-slateblue text-white"
                    : "bg-white text-slateblue"
                }`}
              >
                K线
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("chat")}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  activeTab === "chat"
                    ? "bg-slateblue text-white"
                    : "bg-white text-slateblue"
                }`}
              >
                问答
              </button>
              {result?.warnings?.length ? (
                <span className="text-[11px] text-amber-700">
                  {result.warnings.join(";")}
                </span>
              ) : null}
            </div>

            {!result ? (
              <div className="flex h-[520px] items-center justify-center rounded-xl border border-dashed border-mist bg-white/60 text-sm text-ink/50">
                请先填写出生信息并生成命盘
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="hidden rounded-xl border border-mist bg-white/80 p-4 shadow-panel sm:block">
                  {activeTab === "chart" ? (
                    <ChartBoard chart={result.chart} />
                  ) : activeTab === "kline" ? (
                    <LifeKline data={result.kline} />
                  ) : (
                    <MasterChat
                      context={buildChatContext()}
                      messages={chatMessages}
                      setMessages={setChatMessages}
                    />
                  )}
                </div>

                <div className="flex flex-col gap-4 rounded-xl border border-mist bg-white/80 p-4 shadow-panel sm:hidden">
                  <div className="text-sm font-semibold text-slateblue">
                    {activeTab === "chart"
                      ? "命盘"
                      : activeTab === "kline"
                      ? "人生K线"
                      : "问答"}
                  </div>
                  {activeTab === "chart" ? (
                    <ChartBoard chart={result.chart} />
                  ) : activeTab === "kline" ? (
                    <LifeKline data={result.kline} />
                  ) : (
                    <MasterChat
                      context={buildChatContext()}
                      messages={chatMessages}
                      setMessages={setChatMessages}
                    />
                  )}
                </div>

                <div className="rounded-xl border border-ink/10 bg-white/95 p-4 shadow-panel">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-ink">
                      AI 解读
                    </div>
                    <button
                      type="button"
                      onClick={handleAnalysis}
                      disabled={!result || analysisLoading}
                      className="rounded-full border border-ink/20 bg-white px-3 py-1 text-[11px] font-semibold text-ink transition hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      生成解读
                    </button>
                  </div>

                  {analysisLoading ? (
                    <div className="mt-3 space-y-2 text-[11px] text-ink/60">
                      <div className="flex items-center gap-2">
                        <div className="taiji-spin select-none text-base text-bronze/90">
                          ☯
                        </div>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#b08a4a] via-[#0f172a] to-[#f2d28a] transition-[width] duration-200"
                            style={{ width: `${analysisProgress}%` }}
                          />
                        </div>
                        <div className="w-10 text-right text-[10px] text-ink/60">
                          {analysisProgress}%
                        </div>
                      </div>
                      <div className="font-semibold tracking-[0.12em] text-ink">
                        贫道正为你细看此盘…
                      </div>
                      <div>通常 30–60 秒，稍候片刻。</div>
                    </div>
                  ) : null}

                  {analysisError ? (
                    <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {analysisError}
                    </div>
                  ) : null}

                  {analysisText ? (
                    parsedAnalysis.length > 0 ? (
                      <div className="mt-4 grid gap-4">
                        {parsedAnalysis.map((item) => (
                          <div
                            key={item.title}
                            className="rounded-lg border border-ink/10 bg-white p-4 text-sm shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-ink">
                              {item.title}
                            </span>
                            <span className="text-[11px] text-ink/70">
                              维度分析
                            </span>
                          </div>

                          {item.conclusion ? (
                            <div className="mt-3 text-ink">
                              <span className="font-semibold text-ink">
                                结论：
                              </span>
                              {item.conclusion}
                            </div>
                          ) : null}

                          {item.basis.length > 0 ? (
                            <div className="mt-3 text-ink">
                              <div className="font-semibold text-ink">依据：</div>
                              <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] text-ink/80">
                                {item.basis.map((line, index) => (
                                  <li key={`${item.title}-basis-${index}`}>
                                    {line}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {item.risks.length > 0 ? (
                            <div className="mt-3 text-ink">
                              <div className="font-semibold text-ink">
                                可能的风险：
                              </div>
                              <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] text-ink/80">
                                {item.risks.map((line, index) => (
                                  <li key={`${item.title}-risk-${index}`}>
                                    {line}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {item.advice.length > 0 ? (
                            <div className="mt-3 text-ink">
                              <div className="font-semibold text-ink">建议：</div>
                              <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] text-ink/80">
                                {item.advice.map((line, index) => (
                                  <li key={`${item.title}-advice-${index}`}>
                                    {line}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                        ))}
                      </div>
                    ) : (
                      <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-mist/80 bg-white/90 p-4 text-sm text-ink/80">
                        {analysisText}
                      </pre>
                    )
                  ) : (
                    <div className="mt-3 text-xs text-ink/60">
                      点击“生成解读”获取分析内容。
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

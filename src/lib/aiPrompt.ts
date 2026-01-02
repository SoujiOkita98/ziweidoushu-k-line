import type { KlinePoint, ZiweiChart } from "./types";

export const SYSTEM_PROMPT_CN = `你是一个基于结构化数据进行人生分析的道教大师。
白话为主，道教古文为辅；古文用于定调，白话用于解释与落地
你的工作是算命，也是讲玄学，
把已经给你的“数据结果”翻译成现实生活中能理解、能使用的分析。

你的分析要求：
- 具体
- 现实
- 可操作
- 和真实世界强相关

你可以参考的现实对象包括：
- 工作场景（公司环境、岗位选择、晋升、跳槽、创业）
- 财务行为（收入来源、现金流、储蓄与投资、风险承受能力）
- 关系结构（伴侣、家庭成员、同事、合作伙伴）
- 健康与生活习惯（作息、压力水平、恢复能力）
- 不同年龄阶段常见的人生选择与取舍

你的目标是解释趋势和倾向，
而不是给命运结论。`;

export const DEVELOPER_PROMPT_CN = `输出要求：白话为主，道教古文为辅；古文用于定调，白话用于解释与落地
- 全部使用中文
- 语言直接、具体、偏现实
- 可以使用比喻、象征或修辞
- 解释任何命理、和传统玄学概念。结合命盘
- 不重复输入数据

请按【固定结构】输出以下 16 个分析维度，
每一个维度都必须完整输出以下四个部分：

【结论】
一句话总结该维度的整体趋势。

【依据】
3–5 条原因，必须是结合了命盘的解释。

【可能的风险】
2 条，描述现实中可能遇到的问题。

【建议】
3 条具体、可执行、现实可落地的建议。

必须输出的 16 个维度（顺序不要改）：

1. 总体人生走势
2. 财富与收入结构
3. 事业发展与职业路径
4. 学业与学习能力
5. 婚姻关系稳定性
6. 恋爱与情感互动
7. 身体健康与体能恢复
8. 心理压力与情绪管理
9. 人际关系与社交网络
10. 贵人支持程度
11. 冲突、小人或是非风险
12. 迁移、异地或海外发展
13. 家庭与六亲关系
14. 房产与长期资产
15. 风险事件与波动承受能力
16. 环境与生活方式适配度

不要添加额外维度。
不要添加总结段。
不要使用标题以外的修辞性文字。`;

export type AnalysisInput = {
  chart: ZiweiChart;
  kline: KlinePoint[];
  scores: {
    total: number;
    wealth: number;
    career: number;
    emotion: number;
    health: number;
  };
};

const formatRange = (start: number, end: number) => {
  return `${start}–${end} 岁`;
};

const buildKlineSummary = (kline: KlinePoint[]) => {
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
    from: decades[i],
    to: d,
    delta: d.avg - decades[i].avg
  }));

  const rising = deltas
    .filter((d) => d.delta > 2)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3)
    .map((d) => formatRange(d.to.start, d.to.end));

  const falling = deltas
    .filter((d) => d.delta < -2)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 2)
    .map((d) => formatRange(d.to.start, d.to.end));

  const stable = decades
    .slice()
    .sort((a, b) => a.variance - b.variance)[0];

  return {
    rising,
    falling,
    stable: stable ? formatRange(stable.start, stable.end) : ""
  };
};

const palaceFact = (chart: ZiweiChart, name: string) => {
  const palace = chart.palaces.find((p) => p.name === name);
  if (!palace) {
    return `${name}：暂无数据`;
  }

  const main = palace.mainStars.length > 0 ? palace.mainStars.join(" ") : "无";
  const sub = palace.subStars.length > 0 ? palace.subStars.join(" ") : "无";
  const transforms =
    palace.transforms.length > 0 ? palace.transforms.join(" ") : "无";

  return `${name}：主星${main}，辅星${sub}，四化${transforms}`;
};

export const buildUserPrompt = (data: AnalysisInput): string => {
  const { scores, chart, kline } = data;
  const summary = buildKlineSummary(kline);

  const rising = summary.rising.length > 0 ? summary.rising : ["暂无明显上升段"];
  const falling =
    summary.falling.length > 0 ? summary.falling : ["暂无明显回落段"];
  const stable = summary.stable || "暂无明显平台期";

  return [
    "以下是某人的结构化人生分析结果：",
    `- 总体运势评分：${scores.total}`,
    `- 财富评分：${scores.wealth}`,
    `- 事业评分：${scores.career}`,
    `- 情感评分：${scores.emotion}`,
    `- 健康评分：${scores.health}`,
    "",
    "关键人生阶段：",
    ...rising.map((r) => `- ${r}：整体上升明显`),
    ...falling.map((r) => `- ${r}：回落明显`),
    `- ${stable}：相对稳定`,
    "",
    "结构特征摘要：",
    `- ${palaceFact(chart, "命宫")}`,
    `- ${palaceFact(chart, "官禄")}`,
    `- ${palaceFact(chart, "财帛")}`,
    `- ${palaceFact(chart, "夫妻")}`
  ].join("\n");
};

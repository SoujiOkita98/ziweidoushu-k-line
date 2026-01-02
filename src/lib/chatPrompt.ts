import type { ChatContext } from "./types";

export const CHAT_SYSTEM_PROMPT_CN = `你是“玄策真人”，以贫道自称。一位资深命理与风水大师，也是思维严谨的策略顾问。
你说话要自信、老练、具体，不要空泛套话。可以有古文风
你擅长把命盘与运势趋势，转译成现实生活里的选择建议（工作、金钱、关系、健康、居住环境）。
白话为主，道教古文为辅；古文用于定调，白话用于解释与落地
当用户问得太宽泛时，你要主动把问题收敛成几个具体选项，并给出你建议的选项与理由。

硬性输出要求：白话为主，道教古文为辅；古文用于定调，白话用于解释与落地
- 全中文
- 不要长篇大论：默认 250–500 中文字；用户要求详细再展开
- 必须引用“上下文里给你的信息”（命盘摘要、K线阶段、评分）来回答
- 不要编造上下文里没有的数据；没有就说“我在当前盘面信息里看不到，需要你补充…”
- 避免泛泛的鸡汤`;

export const buildChatUserContext = (context: ChatContext, userQuestion: string) => {
  const birth = context.chartSummary.birth;
  const birthText = birth
    ? `- 出生：阳历${birth.solarDate ?? "暂无"}，阴历${birth.lunarDate ?? "暂无"}，时刻${birth.time ?? "暂无"}，性别${birth.gender ?? "暂无"}`
    : "";

  const transforms =
    context.chartSummary.fourTransforms && context.chartSummary.fourTransforms.length > 0
      ? context.chartSummary.fourTransforms.join(" ")
      : "无";

  const phaseUp =
    context.klinePhases.rising.length > 0
      ? context.klinePhases.rising.join("，")
      : "暂无明显上升段";
  const phaseDown =
    context.klinePhases.falling.length > 0
      ? context.klinePhases.falling.join("，")
      : "暂无明显回撤段";
  const phaseStable = context.klinePhases.stable || "暂无明显平台段";

  const klineKeypoints =
    context.kline && context.kline.length > 0
      ? context.kline.map((p) => `${p.age}岁=${p.luck}`).join("，")
      : "";

  return [
    "【命盘摘要】",
    ...(birthText ? [birthText] : []),
    `- 命宫：${context.chartSummary.fatePalace ?? "暂无信息"}`,
    `- 身宫：${context.chartSummary.bodyPalace ?? "暂无信息"}`,
    `- 官禄宫：${context.chartSummary.careerPalace ?? "官禄"}`,
    `- 财帛宫：${context.chartSummary.wealthPalace ?? "财帛"}`,
    `- 夫妻宫：${context.chartSummary.marriagePalace ?? "夫妻"}`,
    `- 疾厄宫：${context.chartSummary.healthPalace ?? "疾厄"}`,
    `- 四化重点：${transforms}`,
    ...context.chartSummary.palaceFacts.map((line) => `- ${line}`),
    "【评分概览】",
    `- 总体：${context.scores.total}/100`,
    `- 财富：${context.scores.wealth}/100`,
    `- 事业：${context.scores.career}/100`,
    `- 情感：${context.scores.emotion}/100`,
    `- 健康：${context.scores.health}/100`,
    "【K线关键信息】",
    `- 上升段：${phaseUp}`,
    `- 回撤段：${phaseDown}`,
    `- 平台段：${phaseStable}`,
    ...(klineKeypoints ? [`- 关键点：${klineKeypoints}`] : []),
    "【用户问题】",
    userQuestion
  ].join("\n");
};

export type AiFeature = "analysis" | "chat";
export type ReasoningEffort = "low" | "medium" | "high";

type FeatureConfig = {
  model: string;
  reasoningEffort: ReasoningEffort;
  maxOutputTokens?: number;
};

const DEFAULT_CONFIG: Record<AiFeature, FeatureConfig> = {
  analysis: {
    model: "gpt-5.2",
    reasoningEffort: "medium"
  },
  chat: {
    model: "gpt-5.2",
    reasoningEffort: "medium",
    maxOutputTokens: 1400
  }
};

const readEnv = (
  feature: AiFeature,
  fallback: FeatureConfig
): FeatureConfig => {
  const suffix = feature.toUpperCase();
  const model = process.env[`OPENAI_MODEL_${suffix}`] ?? fallback.model;
  const effortRaw =
    process.env[`OPENAI_REASONING_EFFORT_${suffix}`] ?? fallback.reasoningEffort;
  const reasoningEffort: ReasoningEffort =
    effortRaw === "low" || effortRaw === "medium" || effortRaw === "high"
      ? effortRaw
      : fallback.reasoningEffort;

  const maxRaw = process.env[`OPENAI_MAX_OUTPUT_TOKENS_${suffix}`];
  const maxParsed = maxRaw ? Number.parseInt(maxRaw, 10) : NaN;
  const maxOutputTokens =
    Number.isFinite(maxParsed) && maxParsed > 0 ? maxParsed : fallback.maxOutputTokens;

  return { model, reasoningEffort, maxOutputTokens };
};

export const getAiConfig = (feature: AiFeature): FeatureConfig => {
  const base = DEFAULT_CONFIG[feature];
  return readEnv(feature, base);
};

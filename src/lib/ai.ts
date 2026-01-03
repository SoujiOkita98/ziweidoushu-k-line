import OpenAI from "openai";
import type { AnalysisInput } from "./aiPrompt";
import type { ChatContext, ChatMessage } from "./types";
import { buildUserPrompt, DEVELOPER_PROMPT_CN, SYSTEM_PROMPT_CN } from "./aiPrompt";
import { buildChatUserContext, CHAT_SYSTEM_PROMPT_CN } from "./chatPrompt";
import { getAiConfig } from "./aiConfig";
import { buildPersonaPrompt } from "./aiPersona";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const FALLBACK_MODEL = process.env.OPENAI_FALLBACK_MODEL ?? "gpt-5-nano";

function extractAnyText(response: any): string {
  const direct =
    typeof response?.output_text === "string" ? response.output_text.trim() : "";
  if (direct) return direct;

  const output = Array.isArray(response?.output) ? response.output : [];
  const contents = output.flatMap((item: any) => {
    if (Array.isArray(item?.content)) return item.content;
    if (item?.type === "message" && Array.isArray(item?.content)) return item.content;
    return [];
  });

  const texts = contents
    .map((c: any) =>
      typeof c?.text === "string"
        ? c.text
        : typeof c?.output_text === "string"
          ? c.output_text
          : ""
    )
    .filter((t: string) => t.trim().length > 0);

  if (texts.length > 0) {
    return texts.join("\n").trim();
  }

  const refusal =
    contents.find((c: any) => typeof c?.refusal === "string")?.refusal ??
    contents.find(
      (c: any) => c?.type === "refusal" && typeof c?.text === "string"
    )?.text;

  if (typeof refusal === "string" && refusal.trim().length > 0) {
    return refusal.trim();
  }

  return "";
}

const buildVisibilityNudge = () => {
  return {
    role: "system" as const,
    content:
      "请务必输出给用户可见的最终回答文本（自然语言），不要只产生推理过程或空输出。"
  };
};

const looksLikeModelError = (error: any) => {
  const raw = error?.error ?? error;
  const message = typeof raw?.message === "string" ? raw.message : "";
  const code = typeof raw?.code === "string" ? raw.code : "";
  const param = typeof raw?.param === "string" ? raw.param : "";

  if (param === "model") return true;
  if (code === "model_not_found") return true;
  if (code === "invalid_model") return true;
  if (message.toLowerCase().includes("model")) return true;

  return false;
};

const responseWithRetry = async (
  createArgs: Parameters<typeof client.responses.create>[0],
  opts: {
    feature: "analysis" | "chat";
    model: string;
    effort: string;
  }
) => {
  let first: any;
  try {
    first = await client.responses.create(createArgs);
  } catch (error: any) {
    if (looksLikeModelError(error) && opts.model !== FALLBACK_MODEL) {
      console.warn(`[${opts.feature}] model error, falling back`, {
        model: opts.model,
        fallback: FALLBACK_MODEL
      });
      const fallback = await client.responses.create({
        ...createArgs,
        model: FALLBACK_MODEL
      });
      const fallbackText = extractAnyText(fallback);
      return { response: fallback, text: fallbackText, retried: true };
    }
    throw error;
  }
  const firstText = extractAnyText(first);
  if (firstText) return { response: first, text: firstText, retried: false };

  console.warn(`[${opts.feature}] empty text from model`, {
    responseId: first.id,
    outputTypes: first.output?.map((o: any) => o?.type),
    model: opts.model,
    effort: opts.effort
  });

  const secondArgs = {
    ...createArgs,
    reasoning: { effort: "low" as const },
    input: [buildVisibilityNudge(), ...(createArgs as any).input]
  };
  const second = await client.responses.create(secondArgs);
  const secondText = extractAnyText(second);
  return { response: second, text: secondText, retried: true };
};

export const generateAnalysisText = async (
  data: AnalysisInput
): Promise<string> => {
  const config = getAiConfig("analysis");
  const userPrompt = buildUserPrompt(data);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  const { response, text: outputText } = await responseWithRetry(
    {
      model: config.model,
      reasoning: { effort: config.reasoningEffort },
      text: {
        format: {
          type: "text"
        }
      },
      input: [
        {
          role: "system",
          content: SYSTEM_PROMPT_CN
        },
        {
          role: "system",
          content: buildPersonaPrompt("analysis")
        },
        {
          role: "developer",
          content: DEVELOPER_PROMPT_CN
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    },
    { feature: "analysis", model: config.model, effort: config.reasoningEffort }
  );
  clearTimeout(timeout);

  if (!outputText) {
    console.warn("[analysis] empty text from model", {
      responseId: response.id,
      outputTypes: response.output?.map((o: any) => o?.type)
    });

    return "本次 AI 解读没有生成出可展示的文本（模型可能只产生了推理内容）。你可以稍后重试，或让我换一种角度来解读。";
  }

  return outputText;
};

export const chatWithMaster = async (
  messages: ChatMessage[],
  context: ChatContext
): Promise<string> => {
  const config = getAiConfig("chat");
  const contextText = buildChatUserContext(context, "");

  const { response, text: outputText } = await responseWithRetry(
    {
      model: config.model,
      reasoning: { effort: config.reasoningEffort },
      text: {
        format: {
          type: "text"
        }
      },
      input: [
        {
          role: "system",
          content: CHAT_SYSTEM_PROMPT_CN
        },
        {
          role: "system",
          content: buildPersonaPrompt("chat")
        },
        {
          role: "system",
          content: contextText
        },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      ],
      ...(typeof config.maxOutputTokens === "number"
        ? { max_output_tokens: config.maxOutputTokens }
        : {})
    },
    { feature: "chat", model: config.model, effort: config.reasoningEffort }
  );

  if (!outputText) {
    console.warn("[chat] empty text from model", {
      responseId: response.id,
      outputTypes: response.output?.map((o: any) => o?.type)
    });

    return "我这次没有生成出可展示的文本（模型可能只产生了推理内容）。你可以换个问法，或让我重新占断一次。";
  }

  return outputText;
};

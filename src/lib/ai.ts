import OpenAI from "openai";
import type { AnalysisInput } from "./aiPrompt";
import type { ChatContext, ChatMessage } from "./types";
import { buildUserPrompt, DEVELOPER_PROMPT_CN, SYSTEM_PROMPT_CN } from "./aiPrompt";
import { buildChatUserContext, CHAT_SYSTEM_PROMPT_CN } from "./chatPrompt";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = "gpt-5-nano";
const REASONING_EFFORT = "low" as const;

function extractAnyText(response: any): string {
  const direct =
    typeof response?.output_text === "string" ? response.output_text.trim() : "";
  if (direct) return direct;

  const output = Array.isArray(response?.output) ? response.output : [];
  const contents = output.flatMap((item: any) =>
    Array.isArray(item?.content) ? item.content : []
  );

  const texts = contents
    .map((c: any) => (typeof c?.text === "string" ? c.text : ""))
    .filter((t: string) => t.trim().length > 0);

  if (texts.length > 0) {
    return texts.join("\n").trim();
  }

  const refusal =
    contents.find((c: any) => typeof c?.refusal === "string")?.refusal ??
    contents.find(
      (c: any) => c?.type === "refusal" && typeof c?.text === "string"
    )?.text;

  return typeof refusal === "string" ? refusal.trim() : "";
}

export const generateAnalysisText = async (
  data: AnalysisInput
): Promise<string> => {
  const userPrompt = buildUserPrompt(data);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  const response = await client.responses.create(
    {
      model: MODEL,
      reasoning: { effort: REASONING_EFFORT },
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
          role: "developer",
          content: DEVELOPER_PROMPT_CN
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    },
    { signal: controller.signal }
  );
  clearTimeout(timeout);

  const outputText = extractAnyText(response);

  if (!outputText) {
    console.warn("[analysis] empty text from gpt-5-nano", {
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
  const lastUserMessage =
    [...messages].reverse().find((item) => item.role === "user")?.content ?? "";
  const contextText = buildChatUserContext(context, lastUserMessage);
  const messagesForModel =
    messages.length > 0 && messages[messages.length - 1]?.role === "user"
      ? messages.slice(0, -1)
      : messages;

  const response = await client.responses.create({
    model: MODEL,
    reasoning: { effort: REASONING_EFFORT },
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
        role: "user",
        content: contextText
      },
      ...messagesForModel.map((message) => ({
        role: message.role,
        content: message.content
      }))
    ],
    max_output_tokens: 1400
  });

  const outputText = extractAnyText(response);

  if (!outputText) {
    console.warn("[chat] empty text from gpt-5-nano", {
      responseId: response.id,
      outputTypes: response.output?.map((o: any) => o?.type)
    });

    return "我这次没有生成出可展示的文本（模型可能只产生了推理内容）。你可以换个问法，或让我重新占断一次。";
  }

  return outputText;
};

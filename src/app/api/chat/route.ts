import { NextResponse } from "next/server";
import { z } from "zod";
import { chatWithMaster } from "@/lib/ai";
import type { ChatContext } from "@/lib/types";

const schema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1)
    })
  ),
  context: z.object({
    chartSummary: z.object({
      birth: z
        .object({
          solarDate: z.string().optional(),
          lunarDate: z.string().optional(),
          time: z.string().optional(),
          gender: z.string().optional()
        })
        .optional(),
      fatePalace: z.string().optional(),
      bodyPalace: z.string().optional(),
      careerPalace: z.string().optional(),
      wealthPalace: z.string().optional(),
      marriagePalace: z.string().optional(),
      healthPalace: z.string().optional(),
      fourTransforms: z.array(z.string()).optional(),
      palaceFacts: z.array(z.string())
    }),
    scores: z.object({
      total: z.number(),
      wealth: z.number(),
      career: z.number(),
      emotion: z.number(),
      health: z.number()
    }),
    klinePhases: z.object({
      rising: z.array(z.string()),
      falling: z.array(z.string()),
      stable: z.string()
    }),
    kline: z
      .array(
        z.object({
          age: z.number(),
          luck: z.number(),
          confidence: z.number(),
          drivers: z.array(z.string())
        })
      )
      .optional()
  })
});

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const context = parsed.data.context as ChatContext;
    const messages = parsed.data.messages.slice(-12);
    const reply = await chatWithMaster(messages, context);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("[api/chat] error", error);
    return NextResponse.json({ error: "AI 生成失败" }, { status: 500 });
  }
}

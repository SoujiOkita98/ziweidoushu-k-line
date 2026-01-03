"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatContext, ChatMessage } from "@/lib/types";

const INITIAL_GREETING =
  "贫道循宫位而察其变，循岁运而观其应。\n此命非无可为，亦非可恣行。\n汝当择一事而问，贫道方可据盘而断。";

export default function MasterChat({
  context,
  initialGreeting = INITIAL_GREETING,
  messages: externalMessages,
  setMessages: externalSetMessages
}: {
  context: ChatContext | null;
  initialGreeting?: string;
  messages?: ChatMessage[];
  setMessages?: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}) {
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);
  const messages = externalMessages ?? internalMessages;
  const setMessages = externalSetMessages ?? setInternalMessages;
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("占卜中…");
  const listRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: "assistant", content: initialGreeting }]);
    }
  }, [initialGreeting, messages.length, setMessages]);

  useEffect(() => {
    if (!loading) {
      setProgress(0);
      setProgressLabel("占卜中…");
      return;
    }

    setProgress(6);
    setProgressLabel("占卜中…");
    const startedAt = Date.now();

    const timer = setInterval(() => {
      setProgress((prev) => {
        const elapsed = Date.now() - startedAt;
        const target = Math.min(92, Math.round((elapsed / 25000) * 92) + 6);
        const next = Math.max(prev, target);
        return next >= 92 ? 92 : next;
      });

      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      if (elapsedSeconds >= 18) setProgressLabel("推演中…");
      if (elapsedSeconds >= 28) setProgressLabel("快出结果了…");
    }, 180);

    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const canSend = useMemo(() => {
    return input.trim().length > 0 && !loading && !!context;
  }, [context, input, loading]);

  const handleSend = async () => {
    if (!canSend || !context) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const payloadMessages = [...messages, userMessage]
      .filter(
        (msg, index) =>
          !(
            index === 0 &&
            msg.role === "assistant" &&
            msg.content === initialGreeting
          )
      )
      .slice(-12);

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setProgress(8);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          context
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data?.error ?? "AI 生成失败，请稍后重试。" }
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "网络或服务异常，请稍后重试。" }
      ]);
    } finally {
      setProgress(100);
      setTimeout(() => setLoading(false), 250);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[520px] flex-col rounded-xl border border-ink/10 bg-white/90 p-4 shadow-panel">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-ink">玄策真人 · 问答</div>
        {loading ? (
          <span className="rounded-full border border-bronze/40 bg-ink px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-bronze shadow-sm">
            贫道正为你细看此盘
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-3 rounded-lg border border-ink/10 bg-white px-3 py-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold tracking-[0.12em] text-ink">
              {progressLabel}
            </div>
            <div className="text-[10px] text-ink/60">{progress}%</div>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-mist/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#b08a4a] via-[#0f172a] to-[#f2d28a] transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      <div
        ref={listRef}
        className="mt-3 flex-1 space-y-3 overflow-auto pr-1 text-sm"
      >
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={`${msg.role}-${index}`}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] whitespace-pre-line rounded-lg px-3 py-2 text-sm ${
                  isUser
                    ? "bg-ink text-white"
                    : "border border-ink/10 bg-white text-ink"
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        {loading ? (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm text-ink shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold tracking-[0.12em] text-ink">
                  {progressLabel}
                </div>
                <div className="text-[10px] text-ink/60">{progress}%</div>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#b08a4a] via-[#0f172a] to-[#f2d28a] transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            context ? "请输入你的问题（尽量具体）。" : "请先生成命盘与K线后再提问。"
          }
          rows={2}
          className="flex-1 resize-none rounded-md border border-mist bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink/40"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/50"
        >
          发送
        </button>
      </div>
    </div>
  );
}

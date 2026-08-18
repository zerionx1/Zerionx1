"use client";

import { FormEvent, useRef, useState } from "react";
import {
  Bot,
  FileUp,
  Mic,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function ZerionAIWorkspace() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Tell me what you want to do. I can help build a strategy, explain a chart, prepare a backtest or create a trade proposal for your review.",
    },
  ]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = value.trim();
    if (!message || busy) return;

    setValue("");
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: message },
    ]);
    setBusy(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId, message }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error?.message ?? "AI request failed");
      }

      setThreadId(json.data?.threadId);
      const text =
        json.data?.result?.message ??
        "PowerX is not connected yet. Zerion's non-AI tools can still be used.";

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: String(text),
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error instanceof Error ? error.message : "Something went wrong.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="zx-ai-shell">
      <header className="zx-ai-header">
        <div>
          <p className="eyebrow">Zerion intelligence</p>
          <h1>Ask Zerion to do the hard part.</h1>
          <p>
            Simple instructions in. Strategy, research, risk checks and
            trade proposals out.
          </p>
        </div>
        <div className="zx-ai-status">
          <span />
          PowerX-ready architecture
        </div>
      </header>

      <div className="zx-ai-layout">
        <aside className="zx-ai-quick-actions">
          <p className="eyebrow">Quick actions</p>
          {[
            "Build a NIFTY strategy",
            "Explain my open positions",
            "Backtest this strategy",
            "Find a Forex setup",
            "Check my risk",
          ].map((prompt) => (
            <button key={prompt} type="button" onClick={() => setValue(prompt)}>
              <Sparkles />
              {prompt}
            </button>
          ))}

          <div className="zx-ai-safety">
            <ShieldCheck />
            <p>
              Live orders stay behind final user confirmation even when AI
              prepares the full trade.
            </p>
          </div>
        </aside>

        <div className="zx-chat-panel">
          <div className="zx-chat-stream">
            {messages.map((message) => (
              <article
                className={`zx-chat-message zx-chat-message--${message.role}`}
                key={message.id}
              >
                <span>
                  {message.role === "assistant" ? <Bot /> : "You"}
                </span>
                <p>{message.content}</p>
              </article>
            ))}
            {busy ? (
              <article className="zx-chat-message zx-chat-message--assistant">
                <span><Bot /></span>
                <p>Working on it…</p>
              </article>
            ) : null}
          </div>

          <form className="zx-chat-composer" onSubmit={submit}>
            <textarea
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Example: Build a 15 minute EUR/USD strategy with max 0.5% risk per trade…"
              rows={3}
            />

            <div className="zx-chat-tools">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.csv,.txt"
              />
              <button
                type="button"
                title="Attach chart or file"
                onClick={() => fileRef.current?.click()}
              >
                <FileUp />
              </button>
              <button type="button" title="Voice input architecture ready">
                <Mic />
              </button>
              <button className="zx-send-button" type="submit" disabled={busy}>
                <Send />
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

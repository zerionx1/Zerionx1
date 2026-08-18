import { askPowerX } from "@/lib/ai/powerx-client";
import { ok, fail } from "@/lib/security/api-response";
import { currentUser, insert } from "@/lib/supabase/rest";

export async function POST(request: Request) {
  const user = await currentUser();
  const body = (await request.json().catch(() => null)) as
    | {
        threadId?: string;
        message?: string;
        context?: Record<string, unknown>;
      }
    | null;

  if (!body?.message?.trim()) {
    return fail("VALIDATION_ERROR", "Message is required", 400);
  }

  const threadId = body.threadId ?? crypto.randomUUID();
  const now = new Date().toISOString();

  await insert("ai_messages", {
    owner_id: user.id,
    thread_id: threadId,
    role: "user",
    content: body.message.trim(),
    payload: {},
    created_at: now,
  });

  const result = await askPowerX({
    messages: [
      {
        role: "system",
        content:
          "You are the Zerion X1 trading copilot. Explain things simply. Use Zerion tools for actions. Never invent live data. Never execute a live trade without explicit final user confirmation.",
      },
      { role: "user", content: body.message.trim() },
    ],
    context: body.context,
  });

  const assistantText =
    typeof result.message === "string"
      ? result.message
      : "I processed your request. Review the proposed Zerion action before continuing.";

  await insert("ai_messages", {
    owner_id: user.id,
    thread_id: threadId,
    role: "assistant",
    content: assistantText,
    payload: result,
    created_at: new Date().toISOString(),
  });

  return ok({ threadId, result });
}

import "server-only";

const DEFAULT_INTERVAL_MS = 30_000;
const MIN_INTERVAL_MS = 30_000;
let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    const secret = process.env.CRON_SECRET;
    if (!appUrl || !secret) return;
    await fetch(`${appUrl}/api/automation/market-scan`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    }).catch(() => null);
  } finally {
    running = false;
  }
}

export function startBackgroundAiLoop() {
  if (timer) return;
  const configured = Number(process.env.ZERION_AI_SCAN_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
  const intervalMs = Math.max(
    MIN_INTERVAL_MS,
    Number.isFinite(configured) ? configured : DEFAULT_INTERVAL_MS,
  );
  void tick();
  timer = setInterval(() => void tick(), intervalMs);
}

export function stopBackgroundAiLoop() {
  if (timer) clearInterval(timer);
  timer = null;
}

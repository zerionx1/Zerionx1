export function startBackgroundAiLoop() {
  const secret = process.env.CRON_SECRET;
  const base =
    process.env.ZERION_APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://zerionx1.vercel.app";
  const intervalMs = Math.max(
    30_000,
    Number(process.env.ZERION_BACKGROUND_SCAN_MS ?? 60_000),
  );

  if (!secret) {
    console.warn("Background AI loop disabled: CRON_SECRET is not configured on Render.");
    return () => {};
  }

  let stopped = false;
  let running = false;

  async function tick() {
    if (stopped || running) return;
    running = true;
    try {
      const response = await fetch(
        `${base.replace(/\/$/, "")}/api/automation/market-scan`,
        {
          headers: { authorization: `Bearer ${secret}` },
          signal: AbortSignal.timeout(55_000),
          cache: "no-store",
        },
      );
      if (!response.ok) {
        const body = await response.text();
        console.error(`Background Zerion scan failed (${response.status}): ${body.slice(0, 300)}`);
      }
    } catch (error) {
      console.error(
        "Background Zerion scan failed:",
        error instanceof Error ? error.message : error,
      );
    } finally {
      running = false;
    }
  }

  void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  console.log(`Zerion background AI scan loop active every ${Math.round(intervalMs / 1000)}s`);

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

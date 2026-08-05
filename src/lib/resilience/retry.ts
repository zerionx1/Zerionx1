export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 150): Promise<T> {
  let last: unknown;
  for (let i=0;i<attempts;i++) { try { return await fn(); } catch (e) { last=e; if (i<attempts-1) await new Promise(r=>setTimeout(r, baseDelayMs * 2 ** i)); } }
  throw last;
}

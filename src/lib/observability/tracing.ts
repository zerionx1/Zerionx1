export interface TraceContext { traceId: string; spanId: string; operation: string; startedAt: number }
export function startTrace(operation: string): TraceContext {
  return { traceId: crypto.randomUUID(), spanId: crypto.randomUUID(), operation, startedAt: Date.now() };
}
export function finishTrace(trace: TraceContext) { return { ...trace, durationMs: Date.now() - trace.startedAt }; }

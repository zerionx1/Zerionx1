export type RealtimeTopic = `quote:${string}` | `signal:${string}` | `paper:${string}` | `alert:${string}`;
export interface RealtimeEnvelope<T> { topic: RealtimeTopic; sequence: number; emittedAt: string; payload: T; }
export interface RealtimeConnectionState { status: "idle"|"connecting"|"connected"|"reconnecting"|"offline"; lastMessageAt?: string; retryCount: number; }

export type ActivityKind = 'navigation'|'preference'|'strategy'|'paper-order'|'live-order-intent'|'admin-change'|'security'|'system';
export interface ActivityEvent { id: string; userId?: string; sessionId: string; kind: ActivityKind; action: string; route?: string; entityId?: string; occurredAt: string; requestId?: string; metadata: Record<string, string|number|boolean|null>; }
export interface ActivityPage { items: ActivityEvent[]; nextCursor?: string; }

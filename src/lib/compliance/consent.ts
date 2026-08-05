export interface ExecutionConsentRecord { userId: string; orderIntentId: string; textVersion: string; acceptedAt: string; ipHash?: string; userAgentHash?: string }
export function isConsentFresh(record: ExecutionConsentRecord, maxAgeMs = 5 * 60_000) { return Date.now() - new Date(record.acceptedAt).getTime() <= maxAgeMs; }

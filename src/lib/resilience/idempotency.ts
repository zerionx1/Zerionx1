export interface IdempotencyRecord<T> { key: string; result: T; createdAt: string; expiresAt: string }
export function isIdempotencyRecordActive<T>(record: IdempotencyRecord<T>, now = new Date()): boolean { return new Date(record.expiresAt) > now; }

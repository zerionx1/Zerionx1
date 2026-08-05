const BLOCKED_KEYS = [/secret/i,/token/i,/password/i,/credential/i,/api[-_]?key/i,/approval/i,/broker.*auth/i];
export function assertSafeStorageKey(key: string): void { if (BLOCKED_KEYS.some((p)=>p.test(key))) throw new Error(`Unsafe persistence key: ${key}`); }
export function storageAvailable(): boolean { try { const k='__zx1_probe__'; localStorage.setItem(k,'1'); localStorage.removeItem(k); return true; } catch { return false; } }

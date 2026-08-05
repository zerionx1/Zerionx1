export type PersistedScope = 'device' | 'account' | 'session';
export interface PersistedEnvelope<T> { version: number; updatedAt: string; scope: PersistedScope; checksum: string; value: T; }
export interface UserPreferences { theme: 'dark'|'system'; density: 'comfortable'|'compact'; defaultMarket: 'india'|'crypto'|'forex'; timezone: string; reduceMotion: boolean; }
export interface WorkspaceState { route: string; selectedSymbol?: string; selectedTimeframe?: string; panelLayout: Record<string, number>; filters: Record<string, string | number | boolean>; }

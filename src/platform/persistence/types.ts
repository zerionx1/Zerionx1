export type EntityId = string;
export type IsoDate = string;
export interface PersistedRecord { id: EntityId; createdAt: IsoDate; updatedAt: IsoDate; version: number }
export interface PageRequest { cursor?: string; limit: number }
export interface PageResult<T> { items: T[]; nextCursor?: string }

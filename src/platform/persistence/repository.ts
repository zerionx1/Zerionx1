import type { PageRequest, PageResult, PersistedRecord } from './types';
export interface Repository<T extends PersistedRecord> { get(id:string):Promise<T|null>; list(page:PageRequest):Promise<PageResult<T>>; create(value:T):Promise<T>; update(value:T):Promise<T>; delete(id:string):Promise<void> }

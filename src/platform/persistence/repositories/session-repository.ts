import type { PageRequest, PageResult, PersistedRecord } from '../types';
export interface SessionRecord extends PersistedRecord { tenantId:string; status:string; payload:Readonly<Record<string,unknown>> }
export interface SessionRepository { get(id:string):Promise<SessionRecord|null>; list(tenantId:string,page:PageRequest):Promise<PageResult<SessionRecord>>; save(record:SessionRecord):Promise<SessionRecord>; }

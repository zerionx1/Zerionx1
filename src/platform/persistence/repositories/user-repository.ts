import type { PageRequest, PageResult, PersistedRecord } from '../types';
export interface UserRecord extends PersistedRecord { tenantId:string; status:string; payload:Readonly<Record<string,unknown>> }
export interface UserRepository { get(id:string):Promise<UserRecord|null>; list(tenantId:string,page:PageRequest):Promise<PageResult<UserRecord>>; save(record:UserRecord):Promise<UserRecord>; }

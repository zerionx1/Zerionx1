import type { PageRequest, PageResult, PersistedRecord } from '../types';
export interface SignalRecord extends PersistedRecord { tenantId:string; status:string; payload:Readonly<Record<string,unknown>> }
export interface SignalRepository { get(id:string):Promise<SignalRecord|null>; list(tenantId:string,page:PageRequest):Promise<PageResult<SignalRecord>>; save(record:SignalRecord):Promise<SignalRecord>; }

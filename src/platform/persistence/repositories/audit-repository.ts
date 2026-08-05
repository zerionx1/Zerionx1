import type { PageRequest, PageResult, PersistedRecord } from '../types';
export interface AuditRecord extends PersistedRecord { tenantId:string; status:string; payload:Readonly<Record<string,unknown>> }
export interface AuditRepository { get(id:string):Promise<AuditRecord|null>; list(tenantId:string,page:PageRequest):Promise<PageResult<AuditRecord>>; save(record:AuditRecord):Promise<AuditRecord>; }

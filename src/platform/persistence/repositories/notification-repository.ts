import type { PageRequest, PageResult, PersistedRecord } from '../types';
export interface NotificationRecord extends PersistedRecord { tenantId:string; status:string; payload:Readonly<Record<string,unknown>> }
export interface NotificationRepository { get(id:string):Promise<NotificationRecord|null>; list(tenantId:string,page:PageRequest):Promise<PageResult<NotificationRecord>>; save(record:NotificationRecord):Promise<NotificationRecord>; }

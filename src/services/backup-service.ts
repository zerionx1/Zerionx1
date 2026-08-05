import type { BackupRecord } from "@/types/backup";
export function scheduleBackup(scope:string,retentionDays=30):BackupRecord { const d=new Date(); d.setDate(d.getDate()+retentionDays); return { id:crypto.randomUUID(),scope,startedAt:new Date().toISOString(),status:"running",retentionUntil:d.toISOString() }; }

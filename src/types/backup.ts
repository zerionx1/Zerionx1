export interface BackupRecord { id:string; scope:string; startedAt:string; completedAt?:string; status:"running"|"verified"|"failed"; checksum?:string; retentionUntil:string }

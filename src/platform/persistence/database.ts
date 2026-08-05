export interface DatabaseTransaction { commit(): Promise<void>; rollback(): Promise<void> }
export interface DatabaseClient { health(): Promise<boolean>; transaction(): Promise<DatabaseTransaction>; close(): Promise<void> }

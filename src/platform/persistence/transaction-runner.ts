import type { DatabaseClient } from './database';
export async function runInTransaction<T>(db: DatabaseClient, task: (tx: Awaited<ReturnType<DatabaseClient['transaction']>>) => Promise<T>): Promise<T> { const tx=await db.transaction(); try { const out=await task(tx); await tx.commit(); return out; } catch(error){ await tx.rollback(); throw error; } }

export interface Migration{ id:string; up:readonly string[]; down:readonly string[] }
export interface MigrationExecutor{execute(sql:string):Promise<void>;applied():Promise<readonly string[]>;mark(id:string):Promise<void>}
export async function runMigrations(executor:MigrationExecutor,migrations:readonly Migration[]):Promise<void>{const applied=new Set(await executor.applied());for(const m of migrations){if(applied.has(m.id))continue;for(const sql of m.up)await executor.execute(sql);await executor.mark(m.id)}}

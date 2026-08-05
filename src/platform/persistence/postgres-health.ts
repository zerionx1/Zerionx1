export interface SqlExecutor { query<T=unknown>(sql:string, params?:readonly unknown[]):Promise<{rows:T[]}> }
export async function postgresHealth(executor:SqlExecutor):Promise<boolean>{ try { const result=await executor.query<{ok:number}>('select 1 as ok'); return result.rows[0]?.ok===1; } catch { return false; } }

import type { StrategyDefinition, StrategyVersion } from "@/types/strategy";
import { currentUser, insert, select, update } from "@/lib/supabase/rest";
import { strategyChecksum } from "@/lib/strategy/checksum";
type Row=Record<string,unknown>;
function fromRow(r:Row):StrategyDefinition{return {...(r.definition as StrategyDefinition),id:String(r.id),ownerId:String(r.owner_id),name:String(r.name),status:r.status as StrategyDefinition["status"],version:Number(r.version),createdAt:String(r.created_at),updatedAt:String(r.updated_at)};}
export async function listUserStrategies(){const u=await currentUser();return (await select("strategies",`owner_id=eq.${u.id}&order=updated_at.desc`)).map(fromRow);}
export async function getUserStrategy(id:string){const u=await currentUser();const row=(await select("strategies",`id=eq.${id}&owner_id=eq.${u.id}&limit=1`))[0];return row?fromRow(row):undefined;}
export async function saveUserStrategy(input:StrategyDefinition){const u=await currentUser();const now=new Date().toISOString();const definition={...input,ownerId:u.id,updatedAt:now};const existing=(await select("strategies",`id=eq.${input.id}&owner_id=eq.${u.id}&limit=1`))[0];let row:Row;
 if(existing){row=(await update<Row>("strategies",`id=eq.${input.id}&owner_id=eq.${u.id}`,{name:input.name,status:input.status,version:input.version,definition,updated_at:now}))[0]!;}
 else{row=(await insert<Row>("strategies",{id:input.id,owner_id:u.id,name:input.name,status:input.status,version:input.version,definition,created_at:input.createdAt||now,updated_at:now}))[0]!;}
 return fromRow(row);
}
export async function createUserStrategyVersion(strategy:StrategyDefinition,note:string){const u=await currentUser();const nextVersion=Math.max(strategy.version,1);const payload={...strategy,ownerId:u.id};const row=(await insert<Row>("strategy_versions",{owner_id:u.id,strategy_id:strategy.id,version:nextVersion,definition:payload,note,checksum:strategyChecksum(payload)}))[0]!;return {id:String(row.id),strategyId:String(row.strategy_id),version:Number(row.version),definition:row.definition as StrategyDefinition,note:String(row.note),createdBy:u.id,createdAt:String(row.created_at),checksum:String(row.checksum)} satisfies StrategyVersion;}
export async function listUserStrategyVersions(strategyId:string){const u=await currentUser();return (await select("strategy_versions",`strategy_id=eq.${strategyId}&owner_id=eq.${u.id}&order=version.desc`)).map(r=>({id:String(r.id),strategyId:String(r.strategy_id),version:Number(r.version),definition:r.definition as StrategyDefinition,note:String(r.note),createdBy:u.id,createdAt:String(r.created_at),checksum:String(r.checksum)}));}

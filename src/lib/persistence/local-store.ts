import type { PersistedEnvelope } from '@/types/persistence';
import { checksum } from './checksum';
import { assertSafeStorageKey, storageAvailable } from './safe-storage';
export async function saveLocal<T>(key:string,value:T,version=1):Promise<void>{ assertSafeStorageKey(key); if(!storageAvailable())return; const envelope:PersistedEnvelope<T>={version,updatedAt:new Date().toISOString(),scope:'device',checksum:await checksum(value),value}; localStorage.setItem(`zx1:${key}`,JSON.stringify(envelope)); }
export async function loadLocal<T>(key:string,version=1):Promise<T|null>{ assertSafeStorageKey(key); if(!storageAvailable())return null; const raw=localStorage.getItem(`zx1:${key}`); if(!raw)return null; try{const parsed=JSON.parse(raw) as PersistedEnvelope<T>; if(parsed.version!==version||parsed.checksum!==await checksum(parsed.value)){localStorage.removeItem(`zx1:${key}`);return null;} return parsed.value;}catch{localStorage.removeItem(`zx1:${key}`);return null;} }
export function removeLocal(key:string):void{assertSafeStorageKey(key); if(storageAvailable())localStorage.removeItem(`zx1:${key}`);}

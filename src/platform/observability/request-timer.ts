import type { Metrics } from './metrics';
export async function measure<T>(metrics:Metrics,name:string,task:()=>Promise<T>):Promise<T>{const start=performance.now();try{return await task()}finally{metrics.timing(name,performance.now()-start)}}

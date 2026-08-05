import type { Job } from './job';
export interface QueueAdapter { enqueue<T>(job:Job<T>):Promise<void>; reserve(types:readonly string[],limit:number):Promise<readonly Job[]>; acknowledge(id:string):Promise<void>; retry(id:string,runAfter:string):Promise<void>; deadLetter(id:string,reason:string):Promise<void> }

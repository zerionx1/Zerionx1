import type { Job, JobResult } from './job';
export interface JobHandler<T=unknown>{type:string;handle(job:Job<T>):Promise<JobResult>}

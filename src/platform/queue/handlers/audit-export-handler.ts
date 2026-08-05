import type { JobHandler } from '../job-handler'; import type { Job, JobResult } from '../job';
export class AuditExportHandler implements JobHandler<Record<string,unknown>> { readonly type='audit-export'; async handle(job:Job<Record<string,unknown>>):Promise<JobResult>{return {jobId:job.id,status:'completed'}} }

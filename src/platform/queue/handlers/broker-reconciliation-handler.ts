import type { JobHandler } from '../job-handler'; import type { Job, JobResult } from '../job';
export class BrokerReconciliationHandler implements JobHandler<Record<string,unknown>> { readonly type='broker-reconciliation'; async handle(job:Job<Record<string,unknown>>):Promise<JobResult>{return {jobId:job.id,status:'completed'}} }

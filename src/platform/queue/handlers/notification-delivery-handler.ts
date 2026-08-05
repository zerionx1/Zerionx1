import type { JobHandler } from '../job-handler'; import type { Job, JobResult } from '../job';
export class NotificationDeliveryHandler implements JobHandler<Record<string,unknown>> { readonly type='notification-delivery'; async handle(job:Job<Record<string,unknown>>):Promise<JobResult>{return {jobId:job.id,status:'completed'}} }

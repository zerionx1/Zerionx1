import type { Job } from '../job'; import type { QueueAdapter } from '../queue-adapter';
export interface SqsClient { publish(topic:string,payload:unknown):Promise<void> }
export class SqsAdapter implements QueueAdapter { constructor(private client:SqsClient){} async enqueue<T>(job:Job<T>){await this.client.publish(job.type,job)} async reserve(){return []} async acknowledge(){} async retry(){} async deadLetter(){} }

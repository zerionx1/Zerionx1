import type { Job } from '../job'; import type { QueueAdapter } from '../queue-adapter';
export interface UpstashQstashClient { publish(topic:string,payload:unknown):Promise<void> }
export class UpstashQstashAdapter implements QueueAdapter { constructor(private client:UpstashQstashClient){} async enqueue<T>(job:Job<T>){await this.client.publish(job.type,job)} async reserve(){return []} async acknowledge(){} async retry(){} async deadLetter(){} }

import type { Logger,LogContext } from '../logger';
export interface SentryClient { capture(level:string,message:string,data?:unknown):void }
export class SentryLoggerAdapter implements Logger {constructor(private client:SentryClient){}debug(m:string,c?:LogContext){this.client.capture('debug',m,c)}info(m:string,c?:LogContext){this.client.capture('info',m,c)}warn(m:string,c?:LogContext){this.client.capture('warn',m,c)}error(m:string,e?:unknown,c?:LogContext){this.client.capture('error',m,{e,c})}}

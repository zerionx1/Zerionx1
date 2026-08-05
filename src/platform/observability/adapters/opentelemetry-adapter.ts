import type { Logger,LogContext } from '../logger';
export interface OpentelemetryClient { capture(level:string,message:string,data?:unknown):void }
export class OpentelemetryLoggerAdapter implements Logger {constructor(private client:OpentelemetryClient){}debug(m:string,c?:LogContext){this.client.capture('debug',m,c)}info(m:string,c?:LogContext){this.client.capture('info',m,c)}warn(m:string,c?:LogContext){this.client.capture('warn',m,c)}error(m:string,e?:unknown,c?:LogContext){this.client.capture('error',m,{e,c})}}

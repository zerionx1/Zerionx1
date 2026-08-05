import { createHmac } from 'node:crypto'; export function hashIp(ip:string,salt:string):string{return createHmac('sha256',salt).update(ip).digest('hex')}

import { randomBytes, timingSafeEqual } from 'node:crypto';
export function createCsrfToken():string{return randomBytes(32).toString('base64url')}
export function verifyCsrfToken(a:string,b:string):boolean{const x=Buffer.from(a);const y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}

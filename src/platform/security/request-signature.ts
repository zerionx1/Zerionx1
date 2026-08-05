import { createHmac,timingSafeEqual } from 'node:crypto';
export function signRequest(body:string,timestamp:string,secret:string):string{return createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('base64url')}
export function verifyRequestSignature(body:string,timestamp:string,signature:string,secret:string,maxAgeMs=300000):boolean{if(Math.abs(Date.now()-Number(timestamp))>maxAgeMs)return false;const expected=Buffer.from(signRequest(body,timestamp,secret));const actual=Buffer.from(signature);return expected.length===actual.length&&timingSafeEqual(expected,actual)}

import { verifyRequestSignature } from '../request-signature';
export function validateBrokerWebhook(body:string,timestamp:string,signature:string,secret:string):boolean{return verifyRequestSignature(body,timestamp,signature,secret)}

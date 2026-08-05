export interface NonceStore{consume(nonce:string,expiresAt:number):Promise<boolean>}
export async function assertFreshNonce(store:NonceStore,nonce:string,expiresAt:number):Promise<void>{if(expiresAt<Date.now()||!(await store.consume(nonce,expiresAt)))throw new Error('Replay blocked')}

export function shouldRotateSession(issuedAt:number,expiresAt:number,now=Date.now()):boolean{return now-issuedAt>(expiresAt-issuedAt)/2}

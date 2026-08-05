export function createClientOrderId(now=Date.now()){ return `ZX1-P-${now}-${crypto.randomUUID().slice(0,8)}`; }

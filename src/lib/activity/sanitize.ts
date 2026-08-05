const REDACT=/token|secret|password|credential|authorization|cookie|api[-_]?key/i;
export function sanitizeMetadata(input:Record<string,unknown>):Record<string,string|number|boolean|null>{return Object.fromEntries(Object.entries(input).filter(([k])=>!REDACT.test(k)).map(([k,v])=>[k,typeof v==='string'||typeof v==='number'||typeof v==='boolean'||v===null?v:String(v)]));}

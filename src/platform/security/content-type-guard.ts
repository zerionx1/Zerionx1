export function assertJsonContentType(value:string|null):void{if(!value?.toLowerCase().startsWith('application/json'))throw new Error('application/json required')}

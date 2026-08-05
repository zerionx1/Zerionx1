export interface Span{setAttribute(name:string,value:string|number|boolean):void;recordException(error:unknown):void;end():void}
export interface Tracer{startSpan(name:string,attributes?:Readonly<Record<string,string|number|boolean>>):Span}

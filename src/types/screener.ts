export interface ScreenerCandidate { symbol:string; market:string; metrics:Record<string,number>; dataAgeMs:number; }
export interface ScreenerMatch extends ScreenerCandidate { score:number; reasons:string[]; warnings:string[]; }
export interface ScreenerRule { id:string; label:string; evaluate(candidate:ScreenerCandidate):ScreenerMatch|null; }

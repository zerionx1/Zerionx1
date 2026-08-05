import { saveLocal, loadLocal } from '@/lib/persistence/local-store';
export interface RouteSnapshot{pathname:string;search:string;scrollY:number;capturedAt:string;}
export const saveRouteSnapshot=(value:RouteSnapshot)=>saveLocal('last-route',value,1);
export const loadRouteSnapshot=()=>loadLocal<RouteSnapshot>('last-route',1);

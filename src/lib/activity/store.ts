import type { ActivityEvent, ActivityPage } from '@/types/activity';
const memory:ActivityEvent[]=[];
export async function appendActivity(event:ActivityEvent):Promise<void>{memory.unshift(event);if(memory.length>1000)memory.length=1000;}
export async function listActivity(limit=50):Promise<ActivityPage>{return{items:memory.slice(0,Math.min(limit,100))};}

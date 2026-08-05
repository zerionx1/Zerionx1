import type { ActivityEvent, ActivityKind } from '@/types/activity';
import { getSessionId } from '@/lib/session/session-id';
import { sanitizeMetadata } from './sanitize';
export async function recordActivity(kind:ActivityKind,action:string,metadata:Record<string,unknown>={},route?:string):Promise<void>{const event:ActivityEvent={id:crypto.randomUUID(),sessionId:getSessionId(),kind,action,route,occurredAt:new Date().toISOString(),metadata:sanitizeMetadata(metadata)}; try{await fetch('/api/activity',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(event),keepalive:true});}catch{/* telemetry must never block user actions */}}

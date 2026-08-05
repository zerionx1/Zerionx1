import type { Incident, IncidentSeverity } from "@/types/incident";
export function createIncident(title:string,severity:IncidentSeverity,affectedSystems:string[]):Incident { return { id:crypto.randomUUID(),title,severity,status:"investigating",startedAt:new Date().toISOString(),affectedSystems }; }

export type IncidentSeverity = "sev1"|"sev2"|"sev3"|"sev4";
export interface Incident { id:string; title:string; severity:IncidentSeverity; status:"investigating"|"identified"|"monitoring"|"resolved"; startedAt:string; resolvedAt?:string; affectedSystems:string[] }

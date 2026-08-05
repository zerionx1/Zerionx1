import type { ReportArtifact, ReportRequest } from "@/types/reports";
export async function exportPdfExporter(request:ReportRequest,payload:unknown):Promise<ReportArtifact>{void payload;return {id:crypto.randomUUID(),requestId:request.id,status:"queued"};}

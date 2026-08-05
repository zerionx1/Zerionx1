import type { ReportRequest } from "@/types/reports";
export function buildRiskExposureReport(request:ReportRequest,rows:Array<Record<string,unknown>>){return {title:"Risk Exposure",requestId:request.id,generatedAt:new Date().toISOString(),period:{from:request.from,to:request.to},rowCount:rows.length,rows};}

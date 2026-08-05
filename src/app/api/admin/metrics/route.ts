import{getPlatformMetrics}from"@/lib/admin/metrics";export async function GET(){return Response.json({data:getPlatformMetrics()})}

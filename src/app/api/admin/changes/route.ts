import{listChangeRequests}from"@/lib/admin/change-control";export async function GET(){return Response.json({data:listChangeRequests()})}

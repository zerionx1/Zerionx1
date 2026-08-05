import{adminStore}from"@/lib/admin/admin-store";export async function GET(){return Response.json({data:adminStore.listTickets()})}

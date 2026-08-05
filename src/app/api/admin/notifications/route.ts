import{notificationTemplateStore}from"@/lib/notifications/template-store";export async function GET(){return Response.json({data:notificationTemplateStore.list()})}

import{cmsPageStore}from"@/lib/cms/page-store";export async function GET(){return Response.json({data:cmsPageStore.list()})}

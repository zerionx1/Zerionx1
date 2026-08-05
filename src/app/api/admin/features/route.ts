import{featureFlagStore}from"@/lib/admin/feature-flags";export async function GET(){return Response.json({data:featureFlagStore.list()})}

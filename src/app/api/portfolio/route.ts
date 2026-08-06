import { fail,ok } from "@/lib/security/api-response";import { portfolioStore } from "@/lib/portfolio/portfolio-store";import type { PortfolioSnapshot } from "@/types/portfolio";
export async function GET(){return ok((await portfolioStore.get())??null)}
export async function POST(request:Request){const body=await request.json().catch(()=>null) as PortfolioSnapshot|null;if(!body||!Array.isArray(body.accounts)||!Array.isArray(body.positions))return fail("VALIDATION_ERROR","Invalid portfolio snapshot",400);return ok(await portfolioStore.save(body),201)}

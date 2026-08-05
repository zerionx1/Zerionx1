import { NextRequest } from "next/server"; import { apiSuccess } from "@/lib/security/api-response"; import { getKillSwitch, setKillSwitch } from "@/lib/risk/kill-switch-store";
export async function GET(){return apiSuccess({killSwitch:getKillSwitch()})}
export async function POST(req:NextRequest){const body=await req.json();return apiSuccess({killSwitch:setKillSwitch({enabled:Boolean(body.enabled),scope:body.scope??"account",reason:String(body.reason??"Manual risk control"),enabledBy:"demo-user"})})}

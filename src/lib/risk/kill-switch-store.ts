import type { KillSwitchState } from "@/types/risk";
let state:KillSwitchState={enabled:false,scope:"account",reason:""};
export function getKillSwitch(){return structuredClone(state)}
export function setKillSwitch(next:KillSwitchState){state={...next,enabledAt:next.enabled?new Date().toISOString():undefined};return getKillSwitch()}

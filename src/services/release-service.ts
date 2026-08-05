import type { DeploymentRecord } from "@/types/release";
export function queueDeployment(version:string,commitSha:string,environment:DeploymentRecord["environment"]):DeploymentRecord { return { id:crypto.randomUUID(),version,commitSha,environment,status:"queued",createdAt:new Date().toISOString() }; }

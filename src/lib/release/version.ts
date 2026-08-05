export interface ReleaseVersion { version: string; commitSha: string; builtAt: string; environment: string }
export function createReleaseVersion(version: string, commitSha = "unknown"): ReleaseVersion { return { version, commitSha, builtAt: new Date().toISOString(), environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown" }; }

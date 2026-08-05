import type{AdminRole}from"@/types/admin-os";
const permissions:Record<AdminRole,string[]>={founder:["*"],super_admin:["users:*","platform:*","billing:*","content:*"],risk_admin:["risk:*","signals:review","execution:stop"],support_admin:["support:*","users:read"],finance_admin:["billing:*","users:read"],content_admin:["content:*"],analyst:["analytics:read","signals:read"]};
export function canAdmin(role:AdminRole,permission:string){const p=permissions[role];return p.includes("*")||p.includes(permission)||p.some(v=>v.endsWith(":*")&&permission.startsWith(v.slice(0,-1)));}

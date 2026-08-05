import type { Permission } from './permission';
export const ROLE_PERMISSIONS:Readonly<Record<string,readonly Permission[]>>={user:['portfolio:read','strategy:write'],founder:['platform:admin'],risk_admin:['risk:approve'],support:['support:write']};

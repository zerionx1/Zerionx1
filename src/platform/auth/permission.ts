export type Permission = `${string}:${'read'|'write'|'approve'|'execute'|'admin'}`;
export function hasPermission(granted:readonly Permission[], required:Permission):boolean{return granted.includes(required)||granted.includes(`${required.split(':')[0]}:admin` as Permission)}

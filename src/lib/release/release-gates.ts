export interface ReleaseGate { id: string; passed: boolean; required: boolean; detail: string }
export function releaseAllowed(gates: ReleaseGate[]) { return gates.filter(g=>g.required).every(g=>g.passed); }

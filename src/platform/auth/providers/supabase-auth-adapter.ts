import type { AuthContext } from '../auth-context';
export interface SupabaseTokenVerifier { verify(token:string):Promise<AuthContext> }
export class SupabaseAuthAdapter { constructor(private readonly verifier:SupabaseTokenVerifier){} verify(token:string){return this.verifier.verify(token)} }

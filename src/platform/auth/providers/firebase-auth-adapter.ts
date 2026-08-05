import type { AuthContext } from '../auth-context';
export interface FirebaseTokenVerifier { verify(token:string):Promise<AuthContext> }
export class FirebaseAuthAdapter { constructor(private readonly verifier:FirebaseTokenVerifier){} verify(token:string){return this.verifier.verify(token)} }

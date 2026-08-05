export interface LoginAttempt { failures:number; blockedUntil?:number }
export function nextLoginAttempt(previous:LoginAttempt,now=Date.now()):LoginAttempt{const failures=previous.failures+1;return failures<5?{failures}:{failures,blockedUntil:now+Math.min(30*60_000,2**(failures-5)*60_000)}}

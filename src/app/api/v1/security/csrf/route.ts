import { createCsrfToken } from '@/platform/auth/csrf'; export async function GET(){return Response.json({token:createCsrfToken()},{headers:{'Cache-Control':'no-store'}})}

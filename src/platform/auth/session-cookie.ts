export const SESSION_COOKIE='zerion_session';
export const sessionCookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:60*60*8};

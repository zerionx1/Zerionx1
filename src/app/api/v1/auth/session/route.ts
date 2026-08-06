import { getServerSession } from "@/lib/supabase/server-auth";
export async function GET(){const session=await getServerSession();return session?Response.json({authenticated:true,user:session.user}):Response.json({authenticated:false},{status:401})}

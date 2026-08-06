import type {PortfolioSnapshot} from "@/types/portfolio";
import { currentUser, insert, select } from "@/lib/supabase/rest";
export const portfolioStore={async get(){const u=await currentUser();const rows=await select("portfolio_snapshots",`owner_id=eq.${u.id}&order=captured_at.desc&limit=1`);return rows[0]?.snapshot as PortfolioSnapshot|undefined;},async save(x:PortfolioSnapshot){const u=await currentUser();await insert("portfolio_snapshots",{owner_id:u.id,snapshot:x,captured_at:x.capturedAt});return x;}};

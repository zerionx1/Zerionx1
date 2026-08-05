import { describe,it,expect } from "vitest"; import { releaseAllowed } from "@/lib/release/release-gates";
describe("release gates",()=>{it("blocks failed required gate",()=>expect(releaseAllowed([{id:"build",passed:false,required:true,detail:""}])).toBe(false));});

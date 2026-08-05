import type { PriceAlert } from "@/types/alert";
const alerts:PriceAlert[]=[{id:"alert-1",userId:"demo-user",symbol:"NIFTY 50",operator:"above",threshold:24900,status:"active",channels:["in-app"],createdAt:"2026-08-05T06:00:00.000Z"}];
export const alertStore={async list(){return structuredClone(alerts)}};

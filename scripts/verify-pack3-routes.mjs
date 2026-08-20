import fs from "node:fs";

const required = [
  "src/app/dashboard/charts/page.tsx",
  "src/app/dashboard/paper/overview/page.tsx",
  "src/app/dashboard/paper/order/page.tsx",
  "src/app/dashboard/paper/positions/page.tsx",
  "src/app/dashboard/paper/pnl/page.tsx",
  "src/app/dashboard/paper/history/page.tsx",
  "src/app/dashboard/paper/account/page.tsx",
  "src/app/dashboard/live-trading/overview/page.tsx",
  "src/app/dashboard/live-trading/order/page.tsx",
  "src/app/dashboard/live-trading/positions/page.tsx",
  "src/app/dashboard/live-trading/pnl/page.tsx",
  "src/app/dashboard/live-trading/history/page.tsx",
  "src/app/dashboard/live-trading/broker-account/page.tsx",
  "src/app/api/notifications/events/route.ts",
  "src/app/api/risk/controls/route.ts",
];

const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error("Missing required Zerion routes/files:\n" + missing.join("\n"));
  process.exit(1);
}
console.log("Pack 1–3 required route surface is present.");

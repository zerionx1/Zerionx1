# Zerion X1 Runtime + Notifications + Plan Enforcement Audit

Confirmed current-repo gaps:
- Browser notification settings exist, but the existing push channel only returns `queued`; it does not perform Web Push delivery.
- No PushSubscription persistence table or service worker exists.
- Agent opportunities become in-app notifications only when the inbox route is opened.
- Six-stage Zerion agent orchestration exists, but the Render realtime worker does not continuously invoke the market-scan endpoint.
- Two PowerX environment naming schemes exist.
- Strategy install persists a strategy, but deployment creation defaults to `paused`.
- No deployment PATCH/DELETE endpoint exists.
- No chart-wide strategy enable/disable/delete control exists.
- AI and backtest quota helpers exist, but current AI chat and backtest endpoints do not consume those quotas.

This patch adds:
- Real browser Web Push with VAPID.
- Push subscription storage and RLS.
- User-facing consent banner; browser permission is requested only after user presses Enable.
- Background opportunity push delivery.
- Plan-market filtering before notifications are delivered.
- Persistent Render loop calling the protected Zerion market scanner every 60 seconds by default.
- PowerX environment aliases.
- Auto-active paper strategy deployment after ready-strategy installation.
- Enable / Disable / Delete controls on chart workspaces.
- Concurrent strategy plan limit enforcement.
- AI chat quota consumption.
- Backtest quota consumption.

PowerX behavior:
The existing orchestrator stages are:
market-monitor -> research -> deep-analysis -> technical -> opportunity -> decision-support.
When PowerX is configured, those stages call PowerX. Without PowerX, the existing deterministic fallback remains active.
This patch does not permit automatic live order execution; explicit final user confirmation remains required.

Required production environment:
Vercel:
- CRON_SECRET
- NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY
- WEB_PUSH_VAPID_PRIVATE_KEY
- WEB_PUSH_VAPID_SUBJECT=https://zerionx1.vercel.app
- POWERX_API_BASE_URL or POWERX_BASE_URL (when PowerX is ready)
- POWERX_API_TOKEN or POWERX_API_KEY (when PowerX is ready)

Render:
- CRON_SECRET (same value as Vercel)
- ZERION_APP_BASE_URL=https://zerionx1.vercel.app
- ZERION_BACKGROUND_SCAN_MS=60000

Browser Web Push does not require Gmail or a phone number.

Important plan audit conclusion:
Plan definitions, subscription persistence and usage counters are real, but the repository was not enforcing every quota on every path. This patch wires AI and backtest quotas plus concurrent strategy limits. Live-execution quota enforcement should be verified at the actual broker execution-completion path before claiming 100% plan enforcement for live orders.

Apply order:
1. Zerion_X1_CoinDCX_Crypto_Launch.zip
2. Zerion_X1_Market_Search_Charts_Fix.zip
3. Zerion_X1_System_UX_Real_Data_Fix.zip
4. Zerion_X1_Notifications_Strategy_AI_Runtime.zip

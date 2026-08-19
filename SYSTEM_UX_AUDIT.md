# Zerion X1 System / UX Cleanup

This patch is designed to be applied after:
1. CoinDCX launch ZIP
2. Market Explorer/Search/Chart fix ZIP

Fixes:
- Mobile More/sidebar locks background scrolling and scrolls only inside the menu.
- Paper Trading now has an inline Exit button for every open position.
- Paper analytics no longer uses hard-coded fake P&L or illustrative candles.
- Analytics reads the user's persisted paper account, orders and positions.
- Optimization is removed from visible navigation until it is wired to an actual historical execution loop; no decorative feature should pretend to be production-ready.
- Strategy marketplace wording is changed from templates/customization to ready strategies.
- Ready strategies are added with a paper-ready status instead of being presented as an install/customize demo.

Notifications:
Current repo has notification preferences, but the push delivery channel is only returning `queued`; it is not a complete browser Web Push sender yet.
Real background browser push requires:
- browser permission,
- service worker,
- PushSubscription storage,
- VAPID public/private keys,
- server-side Web Push delivery triggered by real alert/strategy events.
It does NOT require Gmail or a phone number for browser push.
A dedicated Web Push production patch should be applied after the market + crypto deployment is stable.

Plans:
The repository currently defines Free, Starter ₹1,200, Pro ₹3,499, Elite ₹5,499, Ultra ₹7,499, Prime ₹12,499 and Enterprise.
The subscription service creates a real Free subscription automatically and persists approved upgrades.
Feature-by-feature quota enforcement still needs to be audited separately before claiming every limit is enforced everywhere.

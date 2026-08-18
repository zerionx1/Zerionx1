# Zerion X1 Phase 15 — AI + Deterministic Algo Control Layer

Included:
- Dedicated full-size Zerion AI workspace.
- PowerX API client boundary.
- Natural-language strategy/research/action architecture.
- Zerion tool registry.
- Deterministic fallback assessment engine so core logic does not disappear if AI is offline.
- AI threads/messages persistence.
- Explicit policy: never invent live data, stale-data rejection, and final user confirmation for live orders.
- Voice/file controls designed into the workspace UI.
- AI-native UI inspired by the useful patterns in UI/UX Pro Max.

PowerX variables (add later when PowerX runtime is ready):
- POWERX_BASE_URL
- POWERX_API_KEY (optional if your PowerX gateway uses another auth scheme)

The Zerion side is prepared so PowerX can be connected later without redesigning broker execution, risk or strategy persistence.

import { currentUser, select, update } from "@/lib/supabase/rest";
import { ok, fail } from "@/lib/security/api-response";
import { quoteStore } from "@/lib/market/quote-store";
import { emitUserNotification } from "@/lib/notifications/notification-events";
import { getConnectedMt5Credentials } from "@/lib/brokers/connection-store";
import { mt5BridgeClient } from "@/lib/brokers/mt5-bridge-client";

type Row = Record<string, unknown>;
const rec = (v: unknown) =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Row) : {};
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export async function GET() {
  try {
    const user = await currentUser();
    const proposals = await select(
      "trade_proposals",
      `owner_id=eq.${user.id}&status=eq.executed&order=created_at.desc&limit=30`,
    );
    const items = proposals
      .map((proposal) => {
        const order = rec(proposal.order_payload);
        const trailing = rec(order.trailing);
        return {
          proposalId: proposal.id,
          symbol: String(order.symbol ?? proposal.symbol ?? ""),
          instrumentId: String(order.instrumentId ?? ""),
          enabled: Boolean(trailing.enabled),
          autoTrailing: order.autoTrailing === true,
        };
      })
      .filter((item) => item.symbol && item.enabled);
    return ok({ items });
  } catch (error) {
    return fail(
      "TRAILING_WATCH_FAILED",
      error instanceof Error ? error.message : "Unable to load trailing watches",
      400,
    );
  }
}

export async function POST() {
  try {
    const user = await currentUser();
    const proposals = await select(
      "trade_proposals",
      `owner_id=eq.${user.id}&status=eq.executed&order=created_at.desc&limit=30`,
    );
    const actions: Row[] = [];

    for (const proposal of proposals) {
      const order = rec(proposal.order_payload);
      const trailing = rec(order.trailing);
      const symbol = String(order.symbol ?? proposal.symbol ?? "");
      const side = String(order.side ?? "").toLowerCase();
      const entry = num(order.entry);
      const initialStop = num(order.stopLoss);
      const target = num(order.takeProfit);
      const lastStop = num(order.trailingLastStop) || initialStop;
      const trigger = num(trailing.trigger);
      const distance = num(trailing.distance);
      if (!symbol || !entry || !initialStop || !target || !trailing.enabled || !distance) continue;

      const quote =
        (await quoteStore.get(String(order.instrumentId || symbol)).catch(() => null)) ??
        (await quoteStore.get(symbol).catch(() => null));
      const currentFromQuote = num(quote?.price);
      let current = currentFromQuote;
      let ticket = 0;
      const broker = String(proposal.broker_key ?? "");

      if (broker === "exness-mt5") {
        try {
          const creds = await getConnectedMt5Credentials();
          const envelope = (await mt5BridgeClient.positions(creds)) as Row;
          const rows = Array.isArray(envelope.positions) ? (envelope.positions as Row[]) : [];
          const executionSymbol = String(order.executionSymbol ?? symbol).toUpperCase();
          const hit = rows.find((r) => String(r.symbol ?? "").toUpperCase() === executionSymbol);
          if (hit) {
            current = num(hit.price_current) || current;
            ticket = num(hit.ticket);
          }
        } catch {}
      }

      if (!current) continue;
      const risk = Math.abs(entry - initialStop);
      if (!risk) continue;
      const behaviourTrigger = trigger || (side === "buy" ? entry + risk * 1.25 : entry - risk * 1.25);
      const triggered =
        side === "buy"
          ? current >= behaviourTrigger
          : side === "sell"
            ? current <= behaviourTrigger
            : false;
      if (!triggered) continue;

      const candidate = side === "buy" ? current - distance : current + distance;
      const improves = side === "buy" ? candidate > lastStop : candidate < lastStop;
      if (!improves) continue;
      const nextStop = Number(candidate.toFixed(current < 100 ? 4 : 2));
      const auto = order.autoTrailing === true;
      let modified = false;

      if (auto && broker === "exness-mt5" && ticket) {
        const creds = await getConnectedMt5Credentials();
        await mt5BridgeClient.orderModify(creds, {
          ticket,
          stop_loss: nextStop,
          take_profit: target,
        });
        modified = true;
      }

      if (auto && String(proposal.mode) === "paper") {
        const positions = await select(
          "paper_positions",
          `owner_id=eq.${user.id}&symbol=eq.${encodeURIComponent(symbol)}&quantity=neq.0&limit=1`,
        );
        const pos = positions[0];
        if (pos) {
          await update(
            "paper_positions",
            `owner_id=eq.${user.id}&id=eq.${String(pos.id)}`,
            { stop_loss: nextStop, updated_at: new Date().toISOString() },
          );
          modified = true;
        }
      }

      // Upstox and CoinDCX auto trailing are attached at order placement using
      // provider-native trailing. The UI runtime therefore only needs to notify
      // when auto trailing was NOT approved.
      if (!auto) {
        await emitUserNotification({
          kind: "trailing-stop-suggestion",
          title: `${symbol} trailing SL ready`,
          body: `Market behaviour moved in favour. Suggested SL: ${nextStop}. Approve the move from Positions.`,
          priority: "high",
          eventKey: `trailing-${proposal.id}-${nextStop}`,
          actionUrl: "/dashboard/positions",
          data: { proposalId: proposal.id, symbol, side, current, nextStop, autoTrailing: false },
        });
      }

      await update(
        "trade_proposals",
        `owner_id=eq.${user.id}&id=eq.${String(proposal.id)}`,
        {
          order_payload: { ...order, trailingLastStop: nextStop },
          updated_at: new Date().toISOString(),
        },
      );
      actions.push({ proposalId: proposal.id, symbol, current, nextStop, modified, broker, auto });
    }

    return ok({ checked: proposals.length, actions });
  } catch (error) {
    return fail(
      "TRAILING_EVALUATION_FAILED",
      error instanceof Error ? error.message : "Unable to evaluate trailing stops",
      400,
    );
  }
}

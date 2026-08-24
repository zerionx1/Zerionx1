import { currentUser, insert, select, update } from "@/lib/supabase/rest";
import { fail, ok } from "@/lib/security/api-response";
import {
  executeApprovedOpportunity,
  RiskConfirmationRequiredError,
} from "@/lib/execution/opportunity-executor";

function record(v: unknown) {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}
function brokerFor(market: string) {
  return market === "crypto" ? "coindcx" : market === "forex" ? "exness-mt5" : "upstox";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ opportunityId: string }> },
) {
  try {
    const user = await currentUser();
    const { opportunityId } = await context.params;
    const body = (await request.json().catch(() => null)) as
      | {
          confirmed?: boolean;
          mode?: "paper" | "live";
          autoTrailing?: boolean;
          riskOverrideConfirmed?: boolean;
        }
      | null;

    if (body?.confirmed !== true || !body.mode) {
      return fail("CONFIRMATION_REQUIRED", "Explicit Paper or Real confirmation is required", 400);
    }

    const opportunity = (
      await select(
        "agent_opportunities",
        `id=eq.${encodeURIComponent(opportunityId)}&status=eq.active&limit=1`,
      )
    )[0];
    if (!opportunity) {
      return fail("OPPORTUNITY_NOT_FOUND", "Opportunity not found or no longer active", 404);
    }

    const expiresAt = Date.parse(String(opportunity.expires_at ?? ""));
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return fail("OPPORTUNITY_EXPIRED", "This setup is no longer current. Zerion is already scanning for the next qualified setup.", 410);
    }

    const analysis = record(opportunity.analysis);
    const plan = record(analysis.tradePlan);
    const targets = Array.isArray(plan.targets) ? plan.targets : [];
    const side = String(plan.side ?? "").toLowerCase();
    const entry = Number(plan.entry);
    const stopLoss = Number(plan.stopLoss);
    const takeProfit = Number(targets[0]);
    const riskReward = Number(plan.riskReward);
    const qualityScore = Number(plan.qualityScore ?? 0);

    if (
      Number(opportunity.confidence) < 70 ||
      qualityScore < 74 ||
      riskReward < 3 ||
      !["buy", "sell"].includes(side) ||
      !Number.isFinite(entry) ||
      !Number.isFinite(stopLoss) ||
      !Number.isFinite(takeProfit)
    ) {
      return fail(
        "SETUP_NOT_QUALIFIED",
        "Trade no longer meets Zerion's quality, confidence and minimum 1:3 risk/reward gate",
        422,
      );
    }

    const market = String(opportunity.market ?? "india");
    const broker = body.mode === "paper" ? "paper" : brokerFor(market);
    const now = new Date().toISOString();
    const orderPayload = {
      opportunityId,
      symbol: String(opportunity.symbol),
      market,
      side,
      entry,
      stopLoss,
      takeProfit,
      riskReward,
      qualityScore,
      support: plan.support ?? null,
      resistance: plan.resistance ?? null,
      instrumentId: plan.instrumentId ?? null,
      executionSymbol: plan.executionSymbol ?? null,
      trailing: plan.trailing ?? null,
      autoTrailing: body.autoTrailing === true,
      riskOverrideConfirmed: body.riskOverrideConfirmed === true,
      trailingLastStop: stopLoss,
    };

    const proposals = await insert<Record<string, unknown>>("trade_proposals", {
      owner_id: user.id,
      broker_key: broker,
      strategy_id: null,
      mode: body.mode,
      status: "executing",
      symbol: opportunity.symbol,
      order_payload: orderPayload,
      rationale: [String(opportunity.reason)],
      confidence: opportunity.confidence,
      confirmed_at: now,
      expires_at: opportunity.expires_at,
      created_at: now,
      updated_at: now,
    });
    const proposal = proposals[0];
    if (!proposal?.id) return fail("PROPOSAL_CREATE_FAILED", "Unable to create the approved trade record", 500);

    try {
      const execution = await executeApprovedOpportunity(body.mode, {
        opportunityId,
        symbol: String(opportunity.symbol),
        market,
        side: side as "buy" | "sell",
        entry,
        stopLoss,
        takeProfit,
        riskReward,
        support: Number.isFinite(Number(plan.support)) ? Number(plan.support) : null,
        resistance: Number.isFinite(Number(plan.resistance)) ? Number(plan.resistance) : null,
        instrumentId: plan.instrumentId ? String(plan.instrumentId) : null,
        executionSymbol: plan.executionSymbol ? String(plan.executionSymbol) : null,
        autoTrailing: body.autoTrailing === true,
        riskOverrideConfirmed: body.riskOverrideConfirmed === true,
        trailing: (() => {
          const t = record(plan.trailing);
          return {
            enabled: Boolean(t.enabled),
            trigger: Number.isFinite(Number(t.trigger)) ? Number(t.trigger) : null,
            distance: Number.isFinite(Number(t.distance)) ? Number(t.distance) : null,
          };
        })(),
      });

      await update(
        "trade_proposals",
        `owner_id=eq.${user.id}&id=eq.${encodeURIComponent(String(proposal.id))}`,
        {
          status: "executed",
          execution_result: execution,
          order_payload: { ...orderPayload, execution },
          updated_at: new Date().toISOString(),
        },
      );

      return ok(
        {
          proposal: { ...proposal, status: "executed" },
          executionStarted: true,
          execution,
          nextAction: { url: "/dashboard/positions", mode: body.mode, broker },
          message: `${body.mode === "paper" ? "Paper" : "Real"} trade executed. Entry, protective stop and 1:3 target were sent without a deployment selector.`,
        },
        201,
      );
    } catch (executionError) {
      if (executionError instanceof RiskConfirmationRequiredError) {
        await update(
          "trade_proposals",
          `owner_id=eq.${user.id}&id=eq.${encodeURIComponent(String(proposal.id))}`,
          {
            status: "awaiting-risk-confirmation",
            execution_result: { ok: false, code: executionError.code, ...executionError.details },
            updated_at: new Date().toISOString(),
          },
        ).catch(() => {});
        return fail(executionError.code, executionError.message, 409, executionError.details);
      }

      const message = executionError instanceof Error ? executionError.message : "Trade execution failed";
      await update(
        "trade_proposals",
        `owner_id=eq.${user.id}&id=eq.${encodeURIComponent(String(proposal.id))}`,
        {
          status: "execution-failed",
          execution_result: { ok: false, error: message },
          updated_at: new Date().toISOString(),
        },
      ).catch(() => {});
      return fail("APPROVED_TRADE_EXECUTION_FAILED", message, 502);
    }
  } catch (error) {
    return fail(
      "OPPORTUNITY_APPROVAL_FAILED",
      error instanceof Error ? error.message : "Unable to approve opportunity",
      400,
    );
  }
}

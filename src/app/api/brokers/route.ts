import { brokerCatalog } from "@/config/brokers";
import {
  authorizationUrl,
  brokerConfigured,
  type OAuthBrokerKey,
} from "@/lib/brokers/oauth-config";
import {
  coinDcxServerCredentials,
  verifyCoinDcxCredentials,
} from "@/lib/brokers/coindcx-core";
import { sealBrokerSecret } from "@/lib/brokers/token-vault";
import { fail, ok } from "@/lib/security/api-response";
import {
  currentUser,
  insert,
  remove,
  select,
  update,
} from "@/lib/supabase/rest";

function isOAuthBroker(key: string): key is OAuthBrokerKey {
  return key === "upstox" || key === "ctrader";
}

function configured(key: string) {
  if (key === "coindcx") return Boolean(coinDcxServerCredentials());
  return isOAuthBroker(key) ? brokerConfigured(key) : false;
}

export async function GET() {
  const user = await currentUser();
  const connections = await select(
    "broker_connections",
    `owner_id=eq.${user.id}&order=updated_at.desc`,
  );

  const catalog = brokerCatalog.map((broker) => ({
    ...broker,
    configured:
      broker.availability !== "coming-soon" ? configured(broker.key) : false,
  }));

  return ok({ catalog, connections });
}

async function connectCoinDcx(userId: string) {
  const credentials = coinDcxServerCredentials();
  if (!credentials) {
    return fail(
      "BROKER_NOT_CONFIGURED",
      "CoinDCX API key and secret are not configured on the server.",
      503,
    );
  }

  const info = await verifyCoinDcxCredentials(credentials);
  const existing = (
    await select(
      "broker_connections",
      `owner_id=eq.${userId}&broker_key=eq.coindcx&limit=1`,
    )
  )[0];

  const metadata = {
    provider: "coindcx",
    token_envelope: sealBrokerSecret({
      api_key: credentials.apiKey,
      api_secret: credentials.apiSecret,
    }),
    verified_at: new Date().toISOString(),
    account_info_present: Array.isArray(info) && info.length > 0,
  };

  if (existing) {
    await update(
      "broker_connections",
      `id=eq.${String(existing.id)}&owner_id=eq.${userId}`,
      {
        status: "connected",
        metadata,
        updated_at: new Date().toISOString(),
      },
    );
  } else {
    await insert("broker_connections", {
      owner_id: userId,
      broker_key: "coindcx",
      display_name: "CoinDCX",
      status: "connected",
      metadata,
    });
  }

  return ok({ connected: true, brokerKey: "coindcx" });
}

export async function POST(request: Request) {
  const user = await currentUser();
  const body = (await request.json().catch(() => null)) as {
    brokerKey?: string;
  } | null;

  const broker = brokerCatalog.find((item) => item.key === body?.brokerKey);
  if (!broker) {
    return fail("VALIDATION_ERROR", "Unsupported broker", 400);
  }

  if (broker.availability === "coming-soon") {
    return fail(
      "BROKER_COMING_SOON",
      `${broker.name} is not enabled for live account connection yet.`,
      409,
    );
  }

  if (broker.key === "coindcx") {
    try {
      return await connectCoinDcx(user.id);
    } catch (error) {
      return fail(
        "BROKER_AUTH_FAILED",
        error instanceof Error
          ? error.message
          : "CoinDCX credential verification failed.",
        401,
      );
    }
  }

  if (!isOAuthBroker(broker.key)) {
    return fail(
      "BROKER_NOT_CONFIGURED",
      `${broker.name} is not enabled in this release.`,
      503,
    );
  }

  if (!brokerConfigured(broker.key)) {
    return fail(
      "BROKER_NOT_CONFIGURED",
      `${broker.name} app credentials are not configured on the server.`,
      503,
    );
  }

  const state = crypto.randomUUID();
  const existing = (
    await select(
      "broker_connections",
      `owner_id=eq.${user.id}&broker_key=eq.${broker.key}&limit=1`,
    )
  )[0];

  const metadata = {
    oauth_state: state,
    oauth_started_at: new Date().toISOString(),
    provider: broker.key,
  };

  if (existing) {
    await update(
      "broker_connections",
      `id=eq.${String(existing.id)}&owner_id=eq.${user.id}`,
      {
        status: "authorizing",
        metadata,
        updated_at: new Date().toISOString(),
      },
    );
  } else {
    await insert("broker_connections", {
      owner_id: user.id,
      broker_key: broker.key,
      display_name: broker.name,
      status: "authorizing",
      metadata,
    });
  }

  const response = ok({
    authorizationUrl: authorizationUrl(request, broker.key, state),
  });

  response.cookies.set("zx_broker_oauth", `${broker.key}:${state}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return response;
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  const id = new URL(request.url).searchParams.get("id");

  if (!id) return fail("VALIDATION_ERROR", "id is required", 400);

  await remove(
    "broker_connections",
    `id=eq.${id}&owner_id=eq.${user.id}`,
  );

  return ok({ deleted: true });
}

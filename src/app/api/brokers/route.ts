import { brokerCatalog } from "@/config/brokers";
import {
  authorizationUrl,
  brokerConfigured,
  type OAuthBrokerKey,
} from "@/lib/brokers/oauth-config";
import {
  type CoinDcxCredentials,
  verifyCoinDcxCredentials,
} from "@/lib/brokers/coindcx-core";
import { sealBrokerSecret } from "@/lib/brokers/token-vault";
import { mt5BridgeClient, mt5BridgeConfigured } from "@/lib/brokers/mt5-bridge-client";
import { normalizeCoinDcxUserCredentials } from "@/lib/brokers/coindcx-user-credentials";
import { fail, ok } from "@/lib/security/api-response";
import {
  currentUser,
  insert,
  remove,
  select,
  update,
} from "@/lib/supabase/rest";

function isOAuthBroker(key: string): key is OAuthBrokerKey {
  return key === "upstox";
}

function configured(key: string) {
  if (key === "coindcx") {
    return Boolean(process.env.BROKER_TOKEN_ENCRYPTION_KEY);
  }
  if (key === "exness-mt5") {
    return mt5BridgeConfigured();
  }
  return isOAuthBroker(key) ? brokerConfigured(key) : false;
}

export async function GET() {
  const user = await currentUser();
  const connections = await select(
    "broker_connections",
    `owner_id=eq.${user.id}&order=updated_at.desc`,
  );

  const safeConnections = connections.map((row) => {
    const metadata = row.metadata as Record<string, unknown> | undefined;
    return {
      ...row,
      metadata: metadata
        ? {
            provider: metadata.provider,
            verified_at: metadata.verified_at,
            account_info_present: metadata.account_info_present,
            auth_mode: metadata.auth_mode,
          }
        : undefined,
    };
  });

  const catalog = brokerCatalog.map((broker) => ({
    ...broker,
    configured:
      broker.availability !== "coming-soon"
        ? configured(broker.key)
        : false,
  }));

  return ok({ catalog, connections: safeConnections });
}

async function connectCoinDcx(
  userId: string,
  credentials: CoinDcxCredentials,
) {
  if (!process.env.BROKER_TOKEN_ENCRYPTION_KEY) {
    return fail(
      "BROKER_NOT_CONFIGURED",
      "BROKER_TOKEN_ENCRYPTION_KEY is not configured on the deployed server.",
      503,
    );
  }

  const { apiKey, apiSecret } =
    normalizeCoinDcxUserCredentials(
      credentials.apiKey,
      credentials.apiSecret,
    );

  const info = await verifyCoinDcxCredentials({ apiKey, apiSecret });
  const existing = (
    await select(
      "broker_connections",
      `owner_id=eq.${userId}&broker_key=eq.coindcx&limit=1`,
    )
  )[0];

  const metadata = {
    provider: "coindcx",
    auth_mode: "user-api-credentials",
    token_envelope: sealBrokerSecret({
      api_key: apiKey,
      api_secret: apiSecret,
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

  return ok({
    connected: true,
    brokerKey: "coindcx",
    authMode: "user-api-credentials",
  });
}

export async function POST(request: Request) {
  const user = await currentUser();
  const body = (await request.json().catch(() => null)) as
    | {
        brokerKey?: string;
        apiKey?: string;
        apiSecret?: string;
        mt5Login?: string;
        mt5Password?: string;
        mt5Server?: string;
        mt5Environment?: "demo" | "real";
      }
    | null;

  const broker = brokerCatalog.find(
    (item) => item.key === body?.brokerKey,
  );

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
      return await connectCoinDcx(user.id, {
        apiKey: body?.apiKey ?? "",
        apiSecret: body?.apiSecret ?? "",
      });
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

  if (broker.key === "exness-mt5") {
    if (!mt5BridgeConfigured()) {
      return fail(
        "BROKER_NOT_CONFIGURED",
        "MT5_BRIDGE_URL, MT5_BRIDGE_TOKEN and BROKER_TOKEN_ENCRYPTION_KEY are required.",
        503,
      );
    }

    const login = body?.mt5Login?.trim() ?? "";
    const password = body?.mt5Password ?? "";
    const server = body?.mt5Server?.trim() ?? "";
    const environment: "demo" | "real" =
      body?.mt5Environment === "real" ? "real" : "demo";

    if (!login || !password || !server) {
      return fail(
        "VALIDATION_ERROR",
        "MT5 login, trading password and server are required.",
        400,
      );
    }

    const credentials = { login, password, server, environment };

    try {
      const verified = await mt5BridgeClient.verify(credentials);
      const existing = (
        await select(
          "broker_connections",
          `owner_id=eq.${user.id}&broker_key=eq.exness-mt5&limit=1`,
        )
      )[0];

      const metadata = {
        provider: "exness-mt5",
        auth_mode: "user-mt5-credentials",
        token_envelope: sealBrokerSecret(credentials),
        verified_at: new Date().toISOString(),
        account_info_present: true,
        environment,
        verification: verified,
      };

      if (existing) {
        await update(
          "broker_connections",
          `id=eq.${String(existing.id)}&owner_id=eq.${user.id}`,
          { status: "connected", metadata, updated_at: new Date().toISOString() },
        );
      } else {
        await insert("broker_connections", {
          owner_id: user.id,
          broker_key: "exness-mt5",
          display_name: "Exness MT5",
          status: "connected",
          metadata,
        });
      }

      return ok({
        connected: true,
        brokerKey: "exness-mt5",
        authMode: "user-mt5-credentials",
        environment,
      });
    } catch (error) {
      return fail(
        "BROKER_AUTH_FAILED",
        error instanceof Error ? error.message : "Exness MT5 verification failed.",
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
    auth_mode: "oauth",
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
    authorizationUrl: authorizationUrl(
      request,
      broker.key,
      state,
    ),
  });

  response.cookies.set(
    "zx_broker_oauth",
    `${broker.key}:${state}`,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    },
  );

  return response;
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return fail("VALIDATION_ERROR", "id is required", 400);
  }

  await remove(
    "broker_connections",
    `id=eq.${id}&owner_id=eq.${user.id}`,
  );

  return ok({ deleted: true });
}

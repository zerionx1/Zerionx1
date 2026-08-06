import "server-only";

import { cookies } from "next/headers";
import type { AppSession } from "@/types/session";
import type { Role } from "@/types/roles";

const COOKIE_NAME = "zerion_access_token";
const VALID_ROLES = new Set<Role>([
  "visitor",
  "free_user",
  "indian_pro",
  "multi_market_pro",
  "global_elite",
  "creator",
  "support",
  "compliance",
  "operations",
  "founder",
]);

type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase public configuration is missing");
  return { url, key };
}

function roleFrom(user: SupabaseUser): Role {
  const candidate = user.app_metadata?.role ?? user.user_metadata?.role;
  return typeof candidate === "string" && VALID_ROLES.has(candidate as Role)
    ? (candidate as Role)
    : "free_user";
}

export async function verifySupabaseToken(token: string): Promise<AppSession | null> {
  const { url, key } = env();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const user = (await response.json()) as SupabaseUser;
  const metadata = user.user_metadata ?? {};
  const name =
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    user.email?.split("@")[0] ||
    "Zerion User";
  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      name,
      role: roleFrom(user),
      mfaVerified: false,
    },
    expiresAt: new Date(Date.now() + 55 * 60_000).toISOString(),
  };
}

export async function getServerSession(): Promise<AppSession | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySupabaseToken(token);
}

export const authCookieName = COOKIE_NAME;

import { ok } from "@/lib/security/api-response";
export async function GET() {
  return ok({
    enabled: Boolean(
      process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY &&
      process.env.WEB_PUSH_VAPID_PRIVATE_KEY
    ),
    publicKey: process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY ?? null,
  });
}

export function buildContentSecurityPolicy(nonce?: string): string {
  const scriptSrc = ["'self'", nonce ? `'nonce-${nonce}'` : "'strict-dynamic'"];
  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https: wss:",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

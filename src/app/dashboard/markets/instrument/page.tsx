import { redirect } from "next/navigation";

export default async function InstrumentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const one = (k: string) => {
    const v = q[k];
    return Array.isArray(v) ? v[0] ?? "" : v ?? "";
  };
  const params = new URLSearchParams({
    instrument: one("id"),
    symbol: one("symbol"),
    tf: one("tf") || "15m",
  });
  redirect(`/dashboard/charts?${params.toString()}`);
}

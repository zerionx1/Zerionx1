import { InstrumentWorkspace } from "@/components/markets/instrument-workspace";

export default async function InstrumentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const value = (key: string) => {
    const item = query[key];
    return Array.isArray(item) ? item[0] ?? "" : item ?? "";
  };

  return (
    <main className="dashboard-page">
      <InstrumentWorkspace
        initialId={value("id")}
        symbol={value("symbol")}
        name={value("name")}
        market={value("market")}
        exchange={value("exchange")}
      />
    </main>
  );
}

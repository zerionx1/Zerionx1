import "server-only";

import { currentUser, insert, select, update } from "@/lib/supabase/rest";

type Row = Record<string, unknown>;

export async function getChartDrawings(instrumentId: string, timeframe: string) {
  const user = await currentUser();
  const rows = await select(
    "chart_drawings",
    `owner_id=eq.${user.id}&instrument_id=eq.${encodeURIComponent(instrumentId)}&timeframe=eq.${encodeURIComponent(timeframe)}&limit=1`,
  );
  const drawings = rows[0]?.drawings;
  return Array.isArray(drawings) ? drawings : [];
}

export async function saveChartDrawings(
  instrumentId: string,
  timeframe: string,
  drawings: unknown[],
) {
  const user = await currentUser();
  const query =
    `owner_id=eq.${user.id}&instrument_id=eq.${encodeURIComponent(instrumentId)}` +
    `&timeframe=eq.${encodeURIComponent(timeframe)}`;
  const rows = await select("chart_drawings", `${query}&limit=1`);
  const payload = {
    owner_id: user.id,
    instrument_id: instrumentId,
    timeframe,
    drawings,
    updated_at: new Date().toISOString(),
  };

  if (rows[0]) await update<Row>("chart_drawings", query, payload);
  else await insert<Row>("chart_drawings", payload);

  return drawings;
}

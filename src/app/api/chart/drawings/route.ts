import { fail, ok } from "@/lib/security/api-response";
import {
  getChartDrawings,
  saveChartDrawings,
} from "@/lib/charts/chart-drawing-store";

function params(request: Request) {
  const url = new URL(request.url);
  return {
    instrument: url.searchParams.get("instrument")?.trim() ?? "",
    timeframe: url.searchParams.get("timeframe")?.trim() ?? "",
  };
}

export async function GET(request: Request) {
  const { instrument, timeframe } = params(request);
  if (!instrument || !timeframe) {
    return fail("VALIDATION_ERROR", "instrument and timeframe are required", 400);
  }
  return ok(await getChartDrawings(instrument, timeframe));
}

export async function PUT(request: Request) {
  const { instrument, timeframe } = params(request);
  if (!instrument || !timeframe) {
    return fail("VALIDATION_ERROR", "instrument and timeframe are required", 400);
  }
  const body = (await request.json().catch(() => null)) as { drawings?: unknown } | null;
  if (!body || !Array.isArray(body.drawings) || body.drawings.length > 500) {
    return fail("VALIDATION_ERROR", "drawings must be an array of at most 500 items", 400);
  }
  return ok(await saveChartDrawings(instrument, timeframe, body.drawings));
}

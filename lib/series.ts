// Derivatives-market series for the fragility panes, normalised to
// `{ time, value }[]` with `time` in UNIX seconds = when the value was known.
//
//   - funding: Binance USDⓈ-M perpetual funding rate (raw rate per funding
//     period, e.g. 0.0001 = 0.01% per 8h). History from 2019-09-10.
//   - dvol: Deribit DVOL, the 30-day implied-vol index (annualised %). Daily
//     closes from 2021-03-24. A daily close is only known at the end of that
//     day, so each point is stamped at day open + 24h.
//
// Note: Binance futures (fapi) geo-blocks some regions, including US cloud
// IPs; on Vercel pin the function region to the EU (e.g. fra1).

import { fetchJson } from "./sources";
import { getInstrument } from "./instruments";
import { DAY } from "./time";
import type { Point } from "./indicators/align";

export type SeriesId = "funding" | "dvol";
export const SERIES_IDS: SeriesId[] = ["funding", "dvol"];

export function isValidSeriesId(id: string): id is SeriesId {
  return SERIES_IDS.includes(id as SeriesId);
}

export class SeriesUnavailable extends Error {}

const FAPI = "https://fapi.binance.com";
const DERIBIT = "https://www.deribit.com/api/v2";
const FUNDING_START_MS = Date.UTC(2019, 8, 1);
const DVOL_START_MS = Date.UTC(2021, 2, 1);
const PAGE = 1000;
const MAX_PAGES = 30; // safety stop

const TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; data: Point[] }>();

async function fetchFunding(binanceSymbol: string): Promise<Point[]> {
  const out: Point[] = [];
  let start = FUNDING_START_MS;
  for (let page = 0; page < MAX_PAGES; page++) {
    const rows = (await fetchJson(
      `${FAPI}/fapi/v1/fundingRate?symbol=${binanceSymbol}&startTime=${start}&limit=${PAGE}`
    )) as { fundingTime: number; fundingRate: string }[];
    if (!rows?.length) break;
    for (const r of rows) {
      out.push({
        time: Math.floor(Number(r.fundingTime) / 1000),
        value: Number(r.fundingRate),
      });
    }
    if (rows.length < PAGE) break;
    start = Number(rows[rows.length - 1].fundingTime) + 1;
  }
  return out;
}

// Deribit returns the newest page first, with a `continuation` timestamp to
// page backwards.
async function fetchDvol(currency: string): Promise<Point[]> {
  const byTime = new Map<number, number>();
  let end = Date.now();
  for (let page = 0; page < MAX_PAGES; page++) {
    const json = await fetchJson(
      `${DERIBIT}/public/get_volatility_index_data?currency=${currency}` +
        `&start_timestamp=${DVOL_START_MS}&end_timestamp=${end}&resolution=1D`
    );
    const rows = json?.result?.data as number[][] | undefined;
    if (!rows?.length) break;
    for (const [ts, , , , close] of rows) {
      byTime.set(Math.floor(ts / 1000) + DAY, close);
    }
    const next = json.result.continuation as number | null;
    if (!next || next >= end) break;
    end = next;
  }
  return [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([time, value]) => ({ time, value }));
}

export async function getSeries(id: SeriesId, symbol: string): Promise<Point[]> {
  const inst = getInstrument(symbol);
  const key = `${id}:${inst.id}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  let data: Point[];
  if (id === "funding") {
    data = await fetchFunding(inst.binance);
  } else {
    if (!inst.deribit) {
      throw new SeriesUnavailable(`DVOL is not published for ${inst.label}`);
    }
    data = await fetchDvol(inst.deribit);
  }
  cache.set(key, { at: Date.now(), data });
  return data;
}

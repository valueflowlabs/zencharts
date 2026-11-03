// Derivatives-market and mining series for the panes, normalised to
// `{ time, value }[]` with `time` in UNIX seconds = when the value was known.
//
//   - funding: Binance USDⓈ-M perpetual funding rate (raw rate per funding
//     period, e.g. 0.0001 = 0.01% per 8h). History from 2019-09-10.
//   - dvol: Deribit DVOL, the 30-day implied-vol index (annualised %). Daily
//     closes from 2021-03-24. A daily close is only known at the end of that
//     day, so each point is stamped at day open + 24h.
//   - hashrate / revenue / hashprice / feeshare (BTC only): miner economics
//     from mempool.space's daily mining history (2009 →), stamped like DVOL:
//       hashrate  network hashrate, EH/s
//       revenue   miner revenue (subsidy + fees), USD per day
//       hashprice revenue per unit of hashrate, USD per PH/s per day
//       feeshare  fees as % of miner revenue
//     Revenue uses blocks found per day = hashrate · 86400 / (difficulty · 2³²),
//     so hashprice = reward per block · 86400 / (difficulty · 2³²) needs no
//     noisy hashrate estimate at all.
//
// Note: Binance futures (fapi) geo-blocks some regions, including US cloud
// IPs; on Vercel pin the function region to the EU (e.g. fra1).

import { fetchJson } from "./sources";
import { getInstrument } from "./instruments";
import { DAY } from "./time";
import type { Point } from "./indicators/align";

export type SeriesId = "funding" | "dvol" | MiningId;
export type MiningId = "hashrate" | "revenue" | "hashprice" | "feeshare";
const MINING_IDS: MiningId[] = ["hashrate", "revenue", "hashprice", "feeshare"];
export const SERIES_IDS: SeriesId[] = ["funding", "dvol", ...MINING_IDS];

export function isValidSeriesId(id: string): id is SeriesId {
  return SERIES_IDS.includes(id as SeriesId);
}

export class SeriesUnavailable extends Error {}

const FAPI = "https://fapi.binance.com";
const MEMPOOL = "https://mempool.space/api/v1/mining";
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

// One pass over mempool.space's daily history builds all four mining series.
async function fetchMining(): Promise<Record<MiningId, Point[]>> {
  const [hash, rewards, fees] = await Promise.all([
    fetchJson(`${MEMPOOL}/hashrate/all`),
    fetchJson(`${MEMPOOL}/blocks/rewards/all`),
    fetchJson(`${MEMPOOL}/blocks/fees/all`),
  ]);
  const day = (t: number) => Math.floor(t / DAY) * DAY;
  const hashByDay = new Map<number, number>();
  for (const h of hash?.hashrates ?? []) hashByDay.set(day(h.timestamp), Number(h.avgHashrate));
  const feesByDay = new Map<number, number>();
  for (const f of fees ?? []) feesByDay.set(day(f.timestamp), Number(f.avgFees));
  // Difficulty is a step function: the value in force at a time.
  const diffs = ((hash?.difficulty ?? []) as { time: number; difficulty: number }[])
    .map((d) => ({ time: Number(d.time), d: Number(d.difficulty) }))
    .sort((a, b) => a.time - b.time);
  let di = 0;

  const out: Record<MiningId, Point[]> = { hashrate: [], revenue: [], hashprice: [], feeshare: [] };
  const rows = ((rewards ?? []) as { timestamp: number; avgRewards: number; USD: number }[])
    .map((r) => ({ t: day(Number(r.timestamp)), sats: Number(r.avgRewards), usd: Number(r.USD) }))
    .sort((a, b) => a.t - b.t);
  for (const r of rows) {
    while (di + 1 < diffs.length && diffs[di + 1].time <= r.t + DAY) di++;
    const difficulty = diffs[di]?.d;
    const hashrate = hashByDay.get(r.t);
    if (!difficulty || !hashrate || !(r.usd > 0) || !(r.sats > 0)) continue;
    const rewardUsd = (r.sats / 1e8) * r.usd; // per block
    const hashprice = (rewardUsd * DAY * 1e15) / (difficulty * 2 ** 32);
    const known = r.t + DAY;
    out.hashrate.push({ time: known, value: hashrate / 1e18 });
    out.hashprice.push({ time: known, value: hashprice });
    out.revenue.push({ time: known, value: (hashprice * hashrate) / 1e15 });
    const f = feesByDay.get(r.t);
    if (f !== undefined) out.feeshare.push({ time: known, value: (f / r.sats) * 100 });
  }
  return out;
}

export async function getSeries(id: SeriesId, symbol: string): Promise<Point[]> {
  const inst = getInstrument(symbol);
  const key = `${id}:${inst.id}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  let data: Point[];
  if (MINING_IDS.includes(id as MiningId)) {
    if (inst.id !== "btc") throw new SeriesUnavailable("mining data is Bitcoin only");
    const all = await fetchMining();
    for (const m of MINING_IDS) cache.set(`${m}:${inst.id}`, { at: Date.now(), data: all[m] });
    return all[id as MiningId];
  }
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

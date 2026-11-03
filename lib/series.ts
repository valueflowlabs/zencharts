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
//   - m2yoy / netliq / netliqyoy (macro, any symbol): US liquidity from FRED's
//     public CSV download (fredgraph.csv, no key):
//       m2        US M2 (M2SL, monthly, SA), $bn. A month is published ~4
//                 weeks after it ends: stamped month start + 8 weeks.
//       m2yoy     m2, % change over 12 months.
//       netliq    Fed net liquidity, $bn: balance sheet (WALCL) − Treasury
//                 General Account (WTREGEN) − overnight reverse repo
//                 (RRPONTSYD). Weekly (Wednesday), published Thursday: + 1 day.
//       netliqyoy netliq, % change over 52 weeks.
//   - global liquidity (macro): G4 broad money and G3 central-bank assets in
//     USD, monthly, each month stamped when its last component is published
//     (month start + 9 weeks):
//       gm2       US M2 (FRED) + euro-area M2 (ECB data API) + Japan M2 (BoJ
//                 stat-search API) + UK M4 (BoE database), $bn at month-end FX
//       gm2yoy    gm2, % over 12 months
//       gm2fx     gm2 at today's exchange rates: money without the dollar's swings
//       gm2yoyfx  gm2fx, % over 12 months
//       gm2us / gm2ez / gm2jp / gm2uk  the components, $bn
//       gcb       Fed + ECB + BoJ total assets, $bn at month-end FX
//       gcbyoy    gcb, % over 12 months
//     China is not included: no keyless source has its M2 history (FRED's
//     ends 2019, DBnomics' NBS copy holds 13 stale months).
//
// Note: Binance futures (fapi) geo-blocks some regions, including US cloud
// IPs; on Vercel pin the function region to the EU (e.g. fra1).

import { fetchJson, fetchText } from "./sources";
import { getInstrument } from "./instruments";
import { DAY } from "./time";
import type { Point } from "./indicators/align";

export type SeriesId = "funding" | "dvol" | MiningId | MacroId;
export type MacroId = "m2" | "m2yoy" | "netliq" | "netliqyoy" | GlobalId;
export type GlobalId =
  | "gm2" | "gm2fx" | "gm2yoy" | "gm2yoyfx" | "gm2us" | "gm2ez" | "gm2jp" | "gm2uk" | "gcb" | "gcbyoy";
const GLOBAL_IDS: GlobalId[] = [
  "gm2", "gm2fx", "gm2yoy", "gm2yoyfx", "gm2us", "gm2ez", "gm2jp", "gm2uk", "gcb", "gcbyoy",
];
const MACRO_IDS: MacroId[] = ["m2", "m2yoy", "netliq", "netliqyoy", ...GLOBAL_IDS];
export type MiningId = "hashrate" | "revenue" | "hashprice" | "feeshare";
const MINING_IDS: MiningId[] = ["hashrate", "revenue", "hashprice", "feeshare"];
export const SERIES_IDS: SeriesId[] = ["funding", "dvol", ...MINING_IDS, ...MACRO_IDS];

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

// FRED's chart CSV: "observation_date,ID" then "YYYY-MM-DD,value" rows; "."
// marks a missing value.
async function fred(id: string): Promise<{ time: number; value: number }[]> {
  const csv = await fetchText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`);
  return csv
    .trim()
    .split("\n")
    .slice(1)
    .flatMap((line) => {
      const [date, v] = line.split(",");
      const value = Number(v);
      const time = Date.parse(`${date}T00:00:00Z`) / 1000;
      return Number.isFinite(value) && Number.isFinite(time) && v !== "." ? [{ time, value }] : [];
    });
}

// % change against the observation `lag` steps earlier.
const pctChange = (pts: Point[], lag: number): Point[] =>
  pts.slice(lag).map((p, i) => ({ time: p.time, value: (p.value / pts[i].value - 1) * 100 }));

async function fetchMacro(): Promise<Record<"m2" | "m2yoy" | "netliq" | "netliqyoy", Point[]>> {
  const [m2, walcl, tga, rrp] = await Promise.all([
    fred("M2SL"),
    fred("WALCL"),
    fred("WTREGEN"),
    fred("RRPONTSYD"),
  ]);
  const known = (pts: Point[]) => pts.map((p) => ({ time: p.time + 56 * DAY, value: p.value }));
  const m2yoy = known(pctChange(m2, 12));
  // WALCL and WTREGEN share Wednesdays ($ millions); RRP is daily ($ billions),
  // taken as the last value on or before that Wednesday (0 before it existed).
  const tgaAt = new Map(tga.map((p) => [p.time, p.value]));
  let ri = -1;
  const netliq: Point[] = [];
  for (const w of walcl) {
    const t = tgaAt.get(w.time);
    if (t === undefined) continue;
    while (ri + 1 < rrp.length && rrp[ri + 1].time <= w.time) ri++;
    const r = ri >= 0 ? rrp[ri].value : 0;
    netliq.push({ time: w.time + DAY, value: w.value / 1000 - t / 1000 - r });
  }
  return { m2: known(m2), m2yoy, netliq, netliqyoy: pctChange(netliq, 52) };
}

// ---- global liquidity ------------------------------------------------------------

const monthKey = (t: number) => {
  const d = new Date(t * 1000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000;
};
const ym = (y: number, m: number) => Date.UTC(y, m - 1, 1) / 1000;

// ECB data API, SDMX CSV: TIME_PERIOD "YYYY-MM", OBS_VALUE.
async function ecbMonthly(key: string): Promise<Map<number, number>> {
  const csv = await fetchText(`https://data-api.ecb.europa.eu/service/data/${key}?format=csvdata`);
  const [head, ...rows] = csv.trim().split("\n");
  const cols = head.split(",");
  const ti = cols.indexOf("TIME_PERIOD");
  const vi = cols.indexOf("OBS_VALUE");
  const out = new Map<number, number>();
  for (const r of rows) {
    const c = r.split(",");
    const [y, m] = c[ti].split("-").map(Number);
    const v = Number(c[vi]);
    if (y && m && Number.isFinite(v)) out.set(ym(y, m), v);
  }
  return out;
}

// BoJ stat-search API: parallel SURVEY_DATES (YYYYMM) and VALUES arrays.
async function bojMonthly(db: string, code: string): Promise<Map<number, number>> {
  const json = await fetchJson(
    `https://www.stat-search.boj.or.jp/api/v1/getDataCode?format=json&lang=en&db=${db}&code=${code}`
  );
  const v = json?.RESULTSET?.[0]?.VALUES;
  const out = new Map<number, number>();
  (v?.SURVEY_DATES ?? []).forEach((d: number, i: number) => {
    const x = Number(v.VALUES[i]);
    if (Number.isFinite(x) && v.VALUES[i] !== null) out.set(ym(Math.floor(d / 100), d % 100), x);
  });
  return out;
}

// BoE database CSV: "DATE,CODE" then "31 Jan 2024,3001413".
async function boeMonthly(code: string): Promise<Map<number, number>> {
  const csv = await fetchText(
    `https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/Jan/1990&Dateto=now&SeriesCodes=${code}&CSVF=TN&UsingCodes=Y`
  );
  const out = new Map<number, number>();
  for (const line of csv.trim().split("\n").slice(1)) {
    const [date, v] = line.split(",");
    const t = Date.parse(`${date} UTC`) / 1000;
    if (Number.isFinite(t) && Number.isFinite(Number(v))) out.set(monthKey(t), Number(v));
  }
  return out;
}

// Last value in each calendar month (month-end FX, end-of-month balances).
function monthEnd(pts: { time: number; value: number }[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const p of pts) out.set(monthKey(p.time), p.value);
  return out;
}

async function fetchGlobal(): Promise<Record<GlobalId, Point[]>> {
  const [usM2, ezM2, jpM2, ukM4, eurusd, usdjpy, gbpusd, fed, ecbA, bojA] = await Promise.all([
    fred("M2SL"), // $bn
    ecbMonthly("BSI/M.U2.Y.V.M20.X.1.U2.2300.Z01.E"), // € millions, SA
    bojMonthly("MD02", "MAM1NAM2M2MO"), // ¥100 million, average outstanding
    boeMonthly("LPMAUYN"), // £ millions, SA
    fred("DEXUSEU"), // $ per €
    fred("DEXJPUS"), // ¥ per $
    fred("DEXUSUK"), // $ per £
    fred("WALCL"), // $ millions, weekly
    fred("ECBASSETSW"), // € millions, weekly
    fred("JPNASSETS"), // ¥100 million, monthly
  ]);
  const us = new Map(usM2.map((p) => [monthKey(p.time), p.value]));
  const eur = monthEnd(eurusd);
  const jpy = monthEnd(usdjpy);
  const gbp = monthEnd(gbpusd);
  const fedM = monthEnd(fed);
  const ecbM = monthEnd(ecbA);
  const bojM = monthEnd(bojA);
  const last = <T,>(m: Map<number, T>) => [...m.values()].at(-1)!;
  const fxNow = { eur: last(eur), jpy: last(jpy), gbp: last(gbp) };

  const known = (t: number) => t + 63 * DAY; // month start + 9 weeks
  const out = Object.fromEntries(GLOBAL_IDS.map((g) => [g, [] as Point[]])) as Record<GlobalId, Point[]>;
  for (const [t, u] of [...us.entries()].sort((a, b) => a[0] - b[0])) {
    const e = ezM2.get(t);
    const j = jpM2.get(t);
    const k = ukM4.get(t);
    const fx = { eur: eur.get(t), jpy: jpy.get(t), gbp: gbp.get(t) };
    if (e === undefined || j === undefined || k === undefined || !fx.eur || !fx.jpy || !fx.gbp) continue;
    const parts = { us: u, ez: (e / 1000) * fx.eur, jp: (j / 10) / fx.jpy, uk: (k / 1000) * fx.gbp };
    const time = known(t);
    out.gm2us.push({ time, value: parts.us });
    out.gm2ez.push({ time, value: parts.ez });
    out.gm2jp.push({ time, value: parts.jp });
    out.gm2uk.push({ time, value: parts.uk });
    out.gm2.push({ time, value: parts.us + parts.ez + parts.jp + parts.uk });
    out.gm2fx.push({ time, value: u + (e / 1000) * fxNow.eur + (j / 10) / fxNow.jpy + (k / 1000) * fxNow.gbp });
  }
  for (const [t, f] of [...fedM.entries()].sort((a, b) => a[0] - b[0])) {
    const e = ecbM.get(t);
    const j = bojM.get(t);
    const fx = { eur: eur.get(t), jpy: jpy.get(t) };
    if (e === undefined || j === undefined || !fx.eur || !fx.jpy) continue;
    out.gcb.push({ time: known(t), value: f / 1000 + (e / 1000) * fx.eur + (j / 10) / fx.jpy });
  }
  out.gm2yoy = pctChange(out.gm2, 12);
  out.gm2yoyfx = pctChange(out.gm2fx, 12);
  out.gcbyoy = pctChange(out.gcb, 12);
  return out;
}

export async function getSeries(id: SeriesId, symbol: string): Promise<Point[]> {
  if (MACRO_IDS.includes(id as MacroId)) {
    const hit = cache.get(`${id}:macro`);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
    const isGlobal = GLOBAL_IDS.includes(id as GlobalId);
    const all: Partial<Record<MacroId, Point[]>> = isGlobal ? await fetchGlobal() : await fetchMacro();
    for (const [m, data] of Object.entries(all)) cache.set(`${m}:macro`, { at: Date.now(), data: data! });
    return all[id as MacroId]!;
  }
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

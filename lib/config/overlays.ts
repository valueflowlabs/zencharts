// Forecasting overlays and panes, kept as one record so adding a setting is a
// one-line change here rather than a new state hook in the provider.

import {
  DEFAULT_CONE_HORIZON,
  isValidConeHorizon,
  isValidConeModel,
  type ConeModel,
} from "../indicators/cone";
import { ALIGNS, type Align } from "../indicators/cycles";

// us: US M2 + Fed net liquidity · global: G5 broad money + G3 central banks
// · china: China M2 (in yuan) + PBoC assets.
export const LIQUIDITY_SCOPES = ["us", "global", "china"] as const;
export type LiquidityScope = (typeof LIQUIDITY_SCOPES)[number];

export interface Overlays {
  cone: boolean; // volatility cone after the last bar
  coneModel: ConeModel;
  coneHorizon: number; // bars
  powerlaw: boolean; // power-law corridor (BTC, 1D/1W)
  cycles: boolean; // halving-cycle markers and phase shading (BTC, 1D/1W)
  cyclesAlign: Align | "off"; // earlier cycles laid over the live one
  miners: boolean; // miner revenue multiple pane with capitulations (BTC)
  liquidity: boolean; // liquidity growth pane
  liquidityScope: LiquidityScope; // which liquidity the pane shows
  funding: boolean; // funding-rate pane
  dvol: boolean; // DVOL vs realised-vol pane (BTC)
}

export const DEFAULT_OVERLAYS: Overlays = {
  cone: false,
  coneModel: "ewma",
  coneHorizon: DEFAULT_CONE_HORIZON,
  powerlaw: false,
  cycles: false,
  cyclesAlign: "off",
  miners: false,
  liquidity: false,
  liquidityScope: "us",
  funding: false,
  dvol: false,
};

// Apply a patch, or return null if any field is invalid.
export function patchOverlays(
  base: Overlays,
  patch: Partial<Overlays>
): Overlays | null {
  const next = { ...base, ...patch };
  const valid =
    typeof next.cone === "boolean" &&
    isValidConeModel(next.coneModel) &&
    isValidConeHorizon(next.coneHorizon) &&
    typeof next.powerlaw === "boolean" &&
    typeof next.cycles === "boolean" &&
    (next.cyclesAlign === "off" || ALIGNS.includes(next.cyclesAlign)) &&
    typeof next.miners === "boolean" &&
    typeof next.liquidity === "boolean" &&
    LIQUIDITY_SCOPES.includes(next.liquidityScope) &&
    typeof next.funding === "boolean" &&
    typeof next.dvol === "boolean";
  return valid ? next : null;
}

// Read saved overlays field by field, so one bad value doesn't reset the rest.
export function readOverlays(saved: unknown): Overlays {
  const out = { ...DEFAULT_OVERLAYS };
  if (!saved || typeof saved !== "object") return out;
  for (const key of Object.keys(DEFAULT_OVERLAYS) as (keyof Overlays)[]) {
    const value = (saved as Record<string, unknown>)[key];
    if (value !== undefined && patchOverlays(out, { [key]: value })) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

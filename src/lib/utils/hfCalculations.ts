// ─── Aave V3 Mainnet Liquidation Thresholds ────────────────────────────────────
// These are the Aave V3 mainnet risk parameters for the two supported assets.
// Source: aave.com/risk-parameters — update if governance changes them.
export const AAVE_LIQ_THRESHOLD = {
  WETH: 0.825,   // 82.5% — used for LONG positions (WETH is collateral)
  USDC: 0.770,   // 77.0% — used for SHORT positions (USDC is collateral)
} as const;

// ─── HF Zone Boundaries (from contract constants, converted to number) ─────────
export const HF_ZONES = {
  LIQUIDATABLE_MAX: 1.000,  // HF < 1.00  → LIQUIDATABLE (Aave bots active)
  CRITICAL_MAX:     1.250,  // HF < 1.25  → CRITICAL     (emergencyClose gate)
  WARNING_MAX:      1.500,  // HF < 1.50  → WARNING
  SAFE_MIN:         1.500,  // HF ≥ 1.50  → SAFE
} as const;

// ─── 1. Predicted HF after opening ────────────────────────────────────────────
// Derivation: collateral = (capital + borrow) USD, debt = borrow USD
// HF = (collateral × liqThreshold) / debt
//    = (leverage × capital × lt) / ((leverage-1) × capital)
//    = leverage × lt / (leverage-1)
// Works for both LONG and SHORT — only liqThreshold differs.
export function predictOpenHF(leverage: number, isLong: boolean): number {
  if (leverage <= 1) return Infinity;
  const lt = isLong ? AAVE_LIQ_THRESHOLD.WETH : AAVE_LIQ_THRESHOLD.USDC;
  return (leverage * lt) / (leverage - 1);
}

// ─── 2. Classify predicted HF into risk zone ───────────────────────────────────
export function classifyHF(hf: number): "SAFE" | "WARNING" | "CRITICAL" | "LIQUIDATABLE" | "BLOCKED" {
  if (hf < 1.000) return "LIQUIDATABLE";
  if (hf < 1.250) return "BLOCKED";      // contract rejects: below HF_MINIMUM_POST_OPEN
  if (hf < 1.500) return "WARNING";
  return "SAFE";
}

// ─── 3. Liquidation price ──────────────────────────────────────────────────────
// LONG:  ETH price must FALL below liqPrice → HF = ethPrice_new / ethPrice_old × currentHF
// SHORT: ETH price must RISE above liqPrice → HF inversely proportional to ethPrice
// Simplified derivation: at liquidation HF = 1.0
//   LONG:  collateral = wethAmt × price, debt = usdcDebt (fixed)
//          1.0 = wethAmt × liqPrice × lt / usdcDebt
//          Since currentHF = wethAmt × currentPrice × lt / usdcDebt
//          → liqPrice = currentPrice / currentHF
//   SHORT: collateral = usdcAmt (fixed), debt = wethDebt × price
//          → liqPrice = currentPrice × currentHF
export function calcLiquidationPrice(
  currentEthPrice: number,
  currentHF: number,
  isLong: boolean,
): number {
  if (currentHF <= 0) return 0;
  return isLong
    ? currentEthPrice / currentHF      // liqPrice < currentPrice (price must fall)
    : currentEthPrice * currentHF;     // liqPrice > currentPrice (price must rise)
}

// ─── 4. Distance to liquidation ────────────────────────────────────────────────
export function liqPriceDistance(currentPrice: number, liqPrice: number): {
  distanceUsd:  number;   // absolute USD difference
  distancePct:  number;   // percentage from current price
  isAbove:      boolean;  // true for SHORT (liqPrice > currentPrice)
} {
  const distanceUsd = Math.abs(currentPrice - liqPrice);
  const distancePct = (distanceUsd / currentPrice) * 100;
  const isAbove     = liqPrice > currentPrice;
  return { distanceUsd, distancePct, isAbove };
}

// ─── 5. Collateral top-up to reach a target HF ────────────────────────────────
// targetHF × totalDebt = (collateral + extraCollateral) × liqThreshold
// extraCollateral = (targetHF × totalDebt / liqThreshold) - collateral
// All values in USD (Aave base units / 1e8)
export function calcCollateralTopUp(
  currentCollateralUsd: number,
  totalDebtUsd:         number,
  targetHF:             number,
  isLong:               boolean,
): {
  extraUsd:  number;   // extra collateral needed in USD
  extraWeth: number;   // in WETH (only meaningful for LONG)
  currentEthPrice: number;  // pass in for WETH conversion
} {
  const lt = isLong ? AAVE_LIQ_THRESHOLD.WETH : AAVE_LIQ_THRESHOLD.USDC;
  const requiredCollateralUsd = (targetHF * totalDebtUsd) / lt;
  const extraUsd = Math.max(0, requiredCollateralUsd - currentCollateralUsd);
  return { extraUsd, extraWeth: 0, currentEthPrice: 0 };  // caller fills extraWeth
}

// ─── Overload: pass ethPrice to get extraWeth ──────────────────────────────────
export function calcCollateralTopUpFull(
  currentCollateralUsd: number,
  totalDebtUsd:         number,
  targetHF:             number,
  isLong:               boolean,
  currentEthPrice:      number,
): { extraUsd: number; extraWeth: number } {
  const lt = isLong ? AAVE_LIQ_THRESHOLD.WETH : AAVE_LIQ_THRESHOLD.USDC;
  const requiredCollateralUsd = (targetHF * totalDebtUsd) / lt;
  const extraUsd  = Math.max(0, requiredCollateralUsd - currentCollateralUsd);
  const extraWeth = isLong && currentEthPrice > 0 ? extraUsd / currentEthPrice : 0;
  return { extraUsd, extraWeth };
}

// ─── 6. Break-even price (fee-adjusted) ────────────────────────────────────────
// At break-even: netEquity = initialCapital
// LONG: collateral_USD = debt_USD + initialCapital_USD (+ 2% open fee)
// breakEvenPrice = entryPrice × (1 + openFeeRate / leverage)
export function calcBreakEvenPrice(
  entryPrice:    number,
  leverage:      number,
  openFeeBps:    number = 200,   // 2% open fee from contract
): number {
  const feeRate = openFeeBps / 10_000;
  return entryPrice * (1 + feeRate / leverage);
}

// ─── 7. Max leverage before hitting HF_MINIMUM_POST_OPEN (1.25) ───────────────
// leverage × lt / (leverage - 1) >= 1.25
// lt × leverage >= 1.25 × leverage - 1.25
// 1.25 >= leverage × (1.25 - lt)
// leverage <= 1.25 / (1.25 - lt)
export function maxSafeLeverage(isLong: boolean): number {
  const lt  = isLong ? AAVE_LIQ_THRESHOLD.WETH : AAVE_LIQ_THRESHOLD.USDC;
  const min = HF_ZONES.CRITICAL_MAX;  // 1.25
  return min / (min - lt);
}

// ─── 8. HF colour (for inline styles) ─────────────────────────────────────────
export function hfColor(hf: number): string {
  if (hf <  1.000) return "#FF2E2E";  // neo-red — LIQUIDATABLE
  if (hf <  1.250) return "#FF6B00";  // orange  — CRITICAL
  if (hf <  1.500) return "#FFB800";  // amber   — WARNING
  return "#00C853";                    // neo-green — SAFE
}

// ─── 9. HF gauge angle (0°–180° semicircle, 0.5 at 0°, 3.0 at 180°) ──────────
// Maps HF value to a rotation angle for the SVG needle
export function hfToAngle(hf: number): number {
  const MIN = 0.5, MAX = 3.0;
  const clamped = Math.min(Math.max(hf, MIN), MAX);
  return ((clamped - MIN) / (MAX - MIN)) * 180;   // 0° → 180°
}

// ─── 10. Percentage through a zone ────────────────────────────────────────────
// e.g. HF=1.35 is (1.35-1.25)/(1.50-1.25) = 40% through the CRITICAL zone
export function zoneProgress(hf: number): { zone: string; pct: number } {
  if (hf >= 1.500) return { zone: "SAFE",        pct: Math.min(100, ((hf-1.5)/1.5)*100) };
  if (hf >= 1.250) return { zone: "WARNING",     pct: ((hf-1.25)/0.25)*100 };
  if (hf >= 1.000) return { zone: "CRITICAL",    pct: ((hf-1.0)/0.25)*100 };
  return                   { zone: "LIQUIDATABLE", pct: 0 };
}

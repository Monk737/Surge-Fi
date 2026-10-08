import { decodeBytes32String, encodeBytes32String, formatUnits, parseUnits } from "ethers"; // Ethers v6
import type { RiskLevelValue, PositionStatusValue } from "../constants";

// ─── Health Factor (1e18 scale) ────────────────────────────────────────────────
export const formatHF        = (hf: bigint): string  => (Number(hf) / 1e18).toFixed(3);
export const formatHFNumber  = (hf: bigint): number  => Number(hf) / 1e18;

// ─── Risk Level ────────────────────────────────────────────────────────────────
export const riskLabel      = (r: RiskLevelValue) =>
  (["SAFE","WARNING","CRITICAL","LIQUIDATABLE"] as const)[r] ?? "UNKNOWN";
export const riskColorClass = (r: RiskLevelValue) =>
  (["text-green-600","text-amber-500","text-orange-600","text-red-600 animate-pulse"] as const)[r] ?? "";
export const riskBorderClass = (r: RiskLevelValue) =>
  (["border-green-500","border-amber-400","border-orange-500","border-red-500 animate-pulse"] as const)[r] ?? "";

// ─── Position Status ───────────────────────────────────────────────────────────
export const statusLabel     = (s: PositionStatusValue) =>
  (["EMPTY","ACTIVE","IDLE"] as const)[s] ?? "?";
export const statusBadgeClass = (s: PositionStatusValue) =>
  (["bg-gray-100 text-gray-600 border border-gray-400",
    "bg-green-100 text-green-700 border border-green-500",
    "bg-blue-100 text-blue-700 border border-blue-500"] as const)[s] ?? "";

// ─── Leverage (1e18-scaled bigint → "2.98x") ───────────────────────────────────
export const formatLeverage       = (lev: bigint): string => `${(Number(lev)/1e18).toFixed(2)}x`;
export const formatLeverageNumber = (lev: bigint): number => Number(lev) / 1e18;

// ─── Aave USD Values (8 decimal base units) ────────────────────────────────────
export const formatUsdAave  = (base: bigint): string =>
  `$${(Number(base)/1e8).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const usdAaveToNumber = (base: bigint): number => Number(base) / 1e8;

// ─── USDC & WETH ───────────────────────────────────────────────────────────────
export const formatUsdc     = (a: bigint): string =>
  `$${parseFloat(formatUnits(a,6)).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const usdcToNumber   = (a: bigint): number => parseFloat(formatUnits(a, 6));
export const formatWeth     = (a: bigint): string => `${parseFloat(formatUnits(a,18)).toFixed(4)} WETH`;
export const wethToNumber   = (a: bigint): number => parseFloat(formatUnits(a, 18));

// Number → token base units. toFixed() avoids exponent notation ("1e-7"), which
// parseUnits rejects, and trims float noise beyond the token's precision.
export const toUnits = (value: number, decimals: number): bigint =>
  Number.isFinite(value) && value > 0 ? parseUnits(value.toFixed(decimals), decimals) : 0n;

// ─── Chainlink ──────────────────────────────────────────────────────
export const chainlinkToUsd = (answer: bigint): number => Number(answer) / 1e8;
export const wethToUsd      = (weth: bigint, clAnswer: bigint): number =>
  wethToNumber(weth) * chainlinkToUsd(clAnswer);
export const usdcToUsd      = (usdc: bigint): number => usdcToNumber(usdc);

// ─── Bytes32 Label ─────────────────────────────────────────────────────────────
export const decodeLabel = (bytes32: string): string => {
  try { return decodeBytes32String(bytes32 as `0x${string}`).trim() || "Unnamed"; }
  catch { return "Unnamed"; }
};
export const encodeLabel = (text: string): `0x${string}` =>
  encodeBytes32String(text.slice(0, 31)) as `0x${string}`;

// ─── PnL ───────────────────────────────────────────────────────────────────────
export const formatPnl     = (pnl: number): string => {
  const abs = Math.abs(pnl).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
  return pnl >= 0 ? `+$${abs}` : `-$${abs}`;
};
export const pnlColorClass = (pnl: number): string =>
  pnl > 0 ? "text-green-600" : pnl < 0 ? "text-red-600" : "text-gray-500";

export const calcNetEquity = (collateralBase: bigint, debtBase: bigint): number =>
  usdAaveToNumber(collateralBase) - usdAaveToNumber(debtBase);

export const calcTruePnl = (
  netEquityUsd:    number,
  initialCapital:  bigint,
  isLong:          boolean, 
  chainlinkAnswer: bigint,
): number => {
  const initialUsd = isLong ? usdcToUsd(initialCapital) : wethToUsd(initialCapital, chainlinkAnswer);
  return netEquityUsd - initialUsd;
};

export const defaultMinProfit = (debtAmount: bigint, percentBps = 100n): bigint =>
  (debtAmount * percentBps) / 10_000n;

// ─── Misc ──────────────────────────────────────────────────────────────────────
export const truncateAddress = (addr: string): string => `${addr.slice(0,6)}...${addr.slice(-4)}`;
export const formatVolume    = (usd: number): string =>
  usd >= 1_000_000 ? `$${(usd/1_000_000).toFixed(2)}M`
  : usd >= 1_000   ? `$${(usd/1_000).toFixed(2)}K`
  : `$${usd.toFixed(2)}`;
export const formatPercent   = (v: number, d = 1): string => `${v.toFixed(d)}%`;

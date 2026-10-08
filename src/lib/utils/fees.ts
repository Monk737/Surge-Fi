import { FEES } from "../constants";

// Agent mode requires at least $200 of capital (AGENT_MIN_USD_CENTS in Position.sol).
export const AGENT_MIN_CAPITAL_USD = 200;

// Mirrors Position._getAgentFeeTier(): open-fee BPS by USD capital in Agent mode.
// Returns null below the Agent minimum, where the contract reverts with
// PositionCapitalBelowAgentMinimum.
export function agentOpenFeeBps(capitalUsd: number): number | null {
  const cents = Math.floor(capitalUsd * 100);
  if (cents <  20_000)  return null;
  if (cents <= 30_000)  return 1_500;  // $200–$300
  if (cents <= 40_000)  return 1_400;  // $301–$400
  if (cents <= 49_999)  return 1_300;  // $401–$499
  if (cents <= 199_999) return 1_100;  // $500–$1,999
  if (cents <= 499_999) return 900;    // $2,000–$4,999
  if (cents <= 999_999) return 700;    // $5,000–$9,999
  return 600;                          // $10,000+
}

// Display-only estimate of the open fee. The amount actually approved and charged
// always comes from the contract's getRequiredApproval() at execution time.
export function estimateOpenFeeBps(
  agentMode:   boolean,
  capitalUsd:  number,
  standardBps: number = FEES.OPEN_BPS,
): number | null {
  return agentMode ? agentOpenFeeBps(capitalUsd) : standardBps;
}

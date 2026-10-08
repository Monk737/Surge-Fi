import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";
import { formatHF } from "./formatters";

const REVERT_MESSAGES: Record<string, string> = {
  PositionFlashLoanFailed:
    "The flash-loan step reverted. Usually the price moved past your slippage tolerance or the resulting health factor was too low. Try lower leverage or a higher slippage tolerance.",
  PositionAlreadyActive:                   "This account already has an open position. Pick another account or create a new one.",
  PositionNotActive:                       "Position is not active.",
  PositionNoDebtToClose:                   "No debt found. Position may already be closed.",
  PositionIdleHasOpenDebt:                 "This account still has Aave debt. Repay it before opening a new position.",
  PositionInvalidPoolFee:                  "Invalid pool fee. Use 100, 500, 3000, or 10000.",
  PositionInvalidAddress:                  "Invalid address provided.",
  PositionZeroAmount:                      "Amount cannot be zero.",
  PositionCapitalTooSmall:                 "Capital is too small to open a position.",
  PositionCapitalBelowAgentMinimum:        "Agent-managed accounts need at least $200 of capital.",
  PositionFeeModeAgentRequiresKeeper:      "Fee mode does not match this account's keeper. Refresh the page and try again.",
  PositionFeeModeStandardRequiresNoKeeper: "Fee mode does not match this account's keeper. Refresh the page and try again.",
  PositionFactoryPaused:                   "The protocol is paused. Opening positions is temporarily disabled.",
  EnforcedPause:                           "The protocol is paused. New accounts cannot be created right now.",
  PositionNotOwner:                        "This wallet does not own this position.",
  PositionNotAuthorized:                   "This wallet is not authorized to manage this position.",
  PositionCannotWithdrawAToken:            "Aave collateral cannot be withdrawn this way. Use Withdraw from Aave.",
  PositionKeeperLockedWhileActive:         "The keeper cannot be changed while a position is open.",
  PositionCannotChangeTierWhileActive:     "The tier cannot be changed while a position is open.",
  PositionFactoryMaxPositionsReached:      "You have reached the maximum number of position accounts.",
  PositionFactoryGlobalMaxPositionsReached: "The protocol has reached its maximum number of position accounts.",
};

export const parseContractError = (error: unknown): string => {
  try {
    if (!(error instanceof BaseError)) {
      const msg = String((error as any)?.shortMessage ?? (error as any)?.message ?? "");
      if (msg.toLowerCase().includes("user rejected")) return "Transaction rejected in wallet.";
      return msg || "Transaction failed. Please try again.";
    }

    if (error.walk(e => e instanceof UserRejectedRequestError) instanceof UserRejectedRequestError)
      return "Transaction rejected in wallet.";

    const revert = error.walk(e => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      const args = revert.data?.args;
      if (name === "PositionHealthFactorTooLow" && args) {
        const [current, minimum] = args as [bigint, bigint];
        return `Health factor too low: ${formatHF(current)} (minimum ${formatHF(minimum)}). Reduce leverage or add collateral.`;
      }
      if (name === "PositionInsufficientToRepay")
        return "Closing would not recover enough to repay the flash loan. Lower the minimum profit, or use Emergency Close.";
      if (name) return REVERT_MESSAGES[name] ?? `Contract error: ${name}`;
      if (revert.reason) return `Transaction reverted: ${revert.reason}`;
    }

    const msg = error.shortMessage || error.message;
    if (msg.toLowerCase().includes("user rejected")) return "Transaction rejected in wallet.";
    if (msg.toLowerCase().includes("insufficient funds")) return "Not enough ETH to pay for gas.";
    return error.shortMessage || "Transaction failed. Please try again.";
  } catch { return "Transaction failed. Check browser console."; }
};

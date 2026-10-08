import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { usePosition } from '../hooks/usePosition';
import { 
  formatUsdAave, formatHF, riskLabel, riskColorClass, riskBorderClass, 
  statusLabel, statusBadgeClass, formatPnl, truncateAddress, 
  defaultMinProfit, formatWeth, formatUsdc
} from '../lib/utils/formatters';
import { POOL_FEE_LABELS, type PoolFeeValue, CONTRACTS } from '../lib/constants';
import type { Address } from 'viem';
import { parseUnits } from 'viem';
import toast from 'react-hot-toast';
import { HFGauge } from "./hf/HFGauge";
import { HFBar } from "./hf/HFBar";
import { HFChart } from "./hf/HFChart";
import { HFAlertBanner } from "./hf/HFAlertBanner";
import { LiquidationMetrics } from "./hf/LiquidationMetrics";
import { CollateralTopUpSuggestion } from "./hf/CollateralTopUpSuggestion";
import { useApproval } from "../hooks/useApproval";
import { parseContractError } from "../lib/utils/errors";
import { chainlinkToUsd, usdAaveToNumber, formatHFNumber } from "../lib/utils/formatters";
import { zoneProgress, hfColor } from "../lib/utils/hfCalculations";
import { useAccount, useReadContract } from 'wagmi';
import { CHAINLINK_ABI } from '../lib/constants';
import { RiskBadge } from "./hf/RiskBadge";
import { ChevronDown, ChevronUp, Info } from "lucide-react";


interface RealPositionViewProps {
  proxyAddress: Address;
}


const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative flex items-center ml-1 inline-flex">
    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-black transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black text-white text-[10px] font-mono leading-tight rounded-md border border-gray-700 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100] text-center normal-case">
      {text}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-b border-r border-gray-700 rotate-45"></div>
    </div>
  </div>
);

export const RealPositionView: React.FC<RealPositionViewProps> = ({ proxyAddress }) => {
  const { data: clData } = useReadContract({
    address: CONTRACTS.CHAINLINK_ETH_USD,
    abi: CHAINLINK_ABI,
    functionName: "latestRoundData",
    query: { refetchInterval: 60_000, staleTime: 30_000 }
  });
  const chainlinkAnswer = (clData as any)?.[1] ?? 0n;
  const [showHFHistory, setShowHFHistory] = useState(false);
  const [showEmergencyClose, setShowEmergencyClose] = useState(false);

  const position = usePosition(proxyAddress);
  const { address: owner } = useAccount();
  const { isApproved, approveToken } = useApproval();
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelText, setLabelText] = useState("");
  const [minProfit, setMinProfit] = useState<string>("");
  const [poolFee, setPoolFee] = useState<PoolFeeValue>(500);

  if (!position.fullData) {
    return (
      <Card className="mt-4 border-2 border-gray-300">
        <div className="text-center py-8 text-gray-500 font-bold">Loading Position Data...</div>
      </Card>
    );
  }

  const { 
    fullData, healthFactor, riskLevel, status, 
    positionDirection, labelString, netEquityUsd, truePnlUsd,
    usdcDebt, wethDebt, usdcBalance, wethBalance,
    closePosition, emergencyClose, setLabel,
    supplyToAave, withdrawFromAave, withdrawTokens, withdrawETH, isWriting
  } = position;

  // Runs a wallet action and reports the outcome; a rejection in the wallet is not an unhandled error.
  const run = async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      await action();
      toast.success(successMessage);
    } catch (e: any) {
      toast.error(parseContractError(e));
    }
  };

  const handleLabelSave = async () => {
    // Each save is an on-chain transaction, so skip it when nothing changed.
    const next = labelText.trim();
    setEditingLabel(false);
    if (!next || next === labelString) return;
    await run(() => setLabel(next), "Label updated");
  };

  // supplyToAave pulls tokens from the wallet, so the proxy needs an allowance first.
  const handleSupply = (amount: bigint, asset: Address) => run(async () => {
    if (!owner) throw new Error("Wallet not connected");
    if (!(await isApproved(asset, owner, proxyAddress, amount))) await approveToken(asset, proxyAddress, amount);
    await supplyToAave(asset, amount);
  }, "Collateral supplied");

  const handleClose = async () => {
    try {
      const assetToRepay = positionDirection === "LONG" ? CONTRACTS.USDC : CONTRACTS.WETH;
      const assetToWithdraw = positionDirection === "LONG" ? CONTRACTS.WETH : CONTRACTS.USDC;
      const debtAmount = positionDirection === "LONG" ? usdcDebt : wethDebt;
      
      // minProfit is denominated in the repaid asset: USDC (6 decimals) for a long, WETH (18) for a short.
      const parsedMinProfit = minProfit ? parseUnits(minProfit, positionDirection === "LONG" ? 6 : 18) : defaultMinProfit(debtAmount, 100n);
      
      await closePosition({
        assetToWithdraw,
        assetToRepay,
        minProfit: parsedMinProfit,
        poolFee
      });
      toast.success("Position closed successfully");
    } catch (e: any) {
      toast.error(parseContractError(e));
    }
  };

  const handleEmergencyClose = async () => {
    if (confirm("Are you sure? Emergency close accepts infinite slippage and could result in significant losses.")) {
      try {
        const assetToRepay = positionDirection === "LONG" ? CONTRACTS.USDC : CONTRACTS.WETH;
        const assetToWithdraw = positionDirection === "LONG" ? CONTRACTS.WETH : CONTRACTS.USDC;
        // minOut = 1 accepts any swap price, as the confirmation above warns.
        await emergencyClose(assetToWithdraw, assetToRepay, poolFee, 1n);
        toast.success("Emergency Close completed");
      } catch (e: any) {
        toast.error(parseContractError(e));
      }
    }
  };

  const isCritical = riskLevel >= 2;

  const ethPrice = chainlinkToUsd(chainlinkAnswer);
  const collateralUsd = usdAaveToNumber(fullData?.totalCollateralBase ?? 0n);
  const debtUsd = usdAaveToNumber(fullData?.totalDebtBase ?? 0n);
  const hfNumber = formatHFNumber(healthFactor);
  const maxLiquidatablePercent = fullData?.maxLiquidatablePercent ?? 0n;
  
  // auto-expand history if warning
  if (riskLevel >= 1 && !showHFHistory) {
    // only doing this once might require a useEffect, but for simplicity let's initialize or conditionally render.
    // React allows calling set state in render if condition matches, but let's avoid it and just use the state or fallback.
  }

  return (
    <Card className={`mt-4 border-4 shadow-neo transition-colors duration-300 ${isCritical && status === 1 ? riskBorderClass(riskLevel) : 'border-black'}`}>
      {/* 1. HF ALERT BANNER */}
      {riskLevel >= 1 && (
        <div className="mb-4">
          <HFAlertBanner
            riskLevel={riskLevel}
            hf={healthFactor}
            onAction={() => setShowEmergencyClose(true)}
            actionLabel="Emergency Close"
          />
        </div>
      )}

      
      {/* 1. HEADER ROW */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-black">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 font-bold text-xs rounded uppercase ${statusBadgeClass(status)}`}>
            {statusLabel(status)}
          </div>
          <div className={`px-2 py-1 font-black text-xs rounded border border-black bg-white ${positionDirection === "LONG" ? 'text-emerald-600' : positionDirection === "SHORT" ? 'text-rose-600' : 'text-gray-500'}`}>
            {positionDirection} {positionDirection === "LONG" ? "↑" : positionDirection === "SHORT" ? "↓" : "-"}
          </div>
          <div className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {truncateAddress(proxyAddress)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editingLabel ? (
            <div className="flex gap-2">
              <input 
                type="text" autoFocus
                className="border-2 border-black rounded px-2 py-1 text-sm font-bold" 
                defaultValue={labelString} 
                onChange={(e) => setLabelText(e.target.value)} 
                onBlur={handleLabelSave}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
            </div>
          ) : (
            <button onClick={() => { setEditingLabel(true); setLabelText(labelString); }} className="text-lg font-black hover:underline cursor-pointer">
              {labelString} ✎
            </button>
          )}
        </div>
      </div>

      {/* 2. STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg border-2 border-black">
          <div className="text-xs font-bold text-gray-500 uppercase mb-1 flex items-center">Collateral <InfoTooltip text="Total USD value of collateral supplied to Aave for this proxy." /></div>
          <div className="text-xl font-mono font-black">{formatUsdAave(fullData.totalCollateralBase)}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border-2 border-black">
          <div className="text-xs font-bold text-gray-500 uppercase mb-1 flex items-center">Debt <InfoTooltip text="Total USD value of assets borrowed from Aave for this proxy." /></div>
          <div className="text-xl font-mono font-black text-rose-600">{formatUsdAave(fullData.totalDebtBase)}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border-2 border-black">
          <div className="text-xs font-bold text-gray-500 uppercase mb-1 flex items-center">Net Equity <InfoTooltip text="Your effectively owned value (Collateral minus Debt)." /></div>
          <div className="text-xl font-mono font-black">{formatPnl(netEquityUsd).replace('+','').replace('-','')} USD</div>
          {truePnlUsd !== null && (
            <div className={`text-xs font-bold mt-1 ${truePnlUsd >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              PnL: {formatPnl(truePnlUsd)}
            </div>
          )}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border-2 border-black">
          <div className="text-xs font-bold text-gray-500 uppercase mb-1 flex items-center">Health Factor <InfoTooltip text="Real-time Aave safety metric. Keep above 1.50." /></div>
          <div className={`text-2xl font-mono font-black ${riskColorClass(riskLevel)}`}>
            {healthFactor > 10000000000000000000n ? '∞' : formatHF(healthFactor)}
          </div>
        </div>
      </div>

      {/* 2. HF OVERVIEW PANEL */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        <div className="lg:w-[40%] flex justify-center border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <HFGauge hf={healthFactor} size="md" showLabel={true} />
        </div>
        <div className="lg:w-[20%] flex flex-col items-center justify-center border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-gray-50">
          <RiskBadge riskLevel={riskLevel} size="md" pulse={riskLevel >= 2} />
          <div className="mt-4 text-3xl font-bold font-mono">{formatHF(healthFactor)}</div>
          <div className="mt-2 text-xs text-gray-500 font-bold">Updated just now</div>
        </div>
        <div className="lg:w-[40%] flex flex-col border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white font-mono text-sm justify-center">
          <div className="font-bold border-b-2 border-black pb-2 mb-2">HF THRESHOLDS</div>
          <div className={`flex justify-between p-1 border-l-4 border-transparent ${riskLevel === 0 ? 'bg-emerald-200 border-emerald-500 font-bold' : ''}`}>
            <span>HF ≥ 1.50</span><span>✓ SAFE</span><span>{riskLevel === 0 ? '(current)' : ''}</span>
          </div>
          <div className={`flex justify-between p-1 border-l-4 border-transparent ${riskLevel === 1 ? 'bg-[#ffe500] border-black font-bold' : ''}`}>
            <span>HF ≥ 1.25</span><span>⚠ WARNING</span><span>{riskLevel === 1 ? '(current)' : ''}</span>
          </div>
          <div className={`flex justify-between p-1 border-l-4 border-transparent ${riskLevel === 2 ? 'bg-[#FF6B00] border-black font-bold text-white' : ''}`}>
            <span>HF ≥ 1.00</span><span>⚡ CRITICAL</span><span>{riskLevel === 2 ? '(current)' : ''}</span>
          </div>
          <div className={`flex justify-between p-1 border-l-4 border-transparent ${riskLevel === 3 ? 'bg-red-600 border-black font-bold text-white' : ''}`}>
            <span>HF &lt; 1.00</span><span>🔴 LIQ.</span><span>{riskLevel === 3 ? '(current)' : ''}</span>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <HFBar hf={healthFactor} showTicks={true} height={24} />
        <div className="mt-2 text-xs font-bold font-mono">
          {(() => {
            const { zone, pct } = zoneProgress(hfNumber);
            return <div style={{ color: hfColor(hfNumber) }}>{pct.toFixed(0)}% through the {zone} zone</div>;
          })()}
        </div>
      </div>

      {/* 3. LIQUIDATION METRICS */}
      {status === 1 && debtUsd > 0 && (
        <div className="mb-6">
          <LiquidationMetrics
            healthFactor={healthFactor}
            currentEthPrice={ethPrice}
            isLong={positionDirection === "LONG"}
            maxLiqPct={maxLiquidatablePercent}
          />
        </div>
      )}

      {/* 4. COLLATERAL TOP-UP SUGGESTION */}
      {riskLevel >= 1 && status === 1 && (
        <div className="mb-6">
          <CollateralTopUpSuggestion
            totalCollateralUsd={collateralUsd}
            totalDebtUsd={debtUsd}
            currentHF={hfNumber}
            currentEthPrice={ethPrice}
            isLong={positionDirection === "LONG"}
            onSupply={handleSupply}
          />
        </div>
      )}

      {/* 5. HF HISTORICAL CHART */}
      <div className="mb-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <button 
          onClick={() => setShowHFHistory(!showHFHistory)}
          className="w-full flex justify-between items-center bg-gray-100 p-3 font-bold font-mono hover:bg-gray-200 transition-colors"
        >
          <span>📊 Health Factor History</span>
          {showHFHistory || riskLevel >= 1 ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {(showHFHistory || riskLevel >= 1) && (
          <div className="border-t-2 border-black">
            <HFChart proxyAddress={proxyAddress} height={200} />
          </div>
        )}
      </div>

      {/* 4. ACTIONS */}
      <div className="flex flex-wrap items-center gap-3 pt-4 border-t-2 border-gray-200">
        
        {status === 1 && (
          <>
            <div className="flex items-center gap-2 mr-auto">
              <input 
                type="number" 
                placeholder={positionDirection === "LONG" ? "Min USDC profit" : "Min WETH profit"}
                value={minProfit}
                onChange={(e) => setMinProfit(e.target.value)}
                className="w-36 text-sm border-2 border-black rounded px-3 py-2 font-mono outline-none focus:border-accent"
              />
              <select 
                value={poolFee} 
                onChange={(e) => setPoolFee(Number(e.target.value) as PoolFeeValue)}
                className="text-sm border-2 border-black rounded px-3 py-2 font-bold outline-none cursor-pointer"
              >
                {Object.entries(POOL_FEE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <Button onClick={handleClose} disabled={isWriting}>Close Position</Button>
            </div>
            
            {/* 6. EMERGENCY CLOSE */}
            {status === 1 && (riskLevel === 2 || riskLevel === 3 || showEmergencyClose) && (
              <div className="w-full mt-4 p-4 border-2 border-red-500 bg-red-50">
                <div className="font-bold text-red-600 mb-2">⚡ Emergency Close Available</div>
                <div className="text-sm text-red-800 mb-2 font-mono">
                  Current HF: {formatHF(healthFactor)} — Below the 1.25 minimum threshold.
                </div>
                <div className="text-sm text-red-800 mb-4">
                  Warning: This bypasses MEV protection (minProfit = 1). Normal close is preferred if not liquidatable.
                </div>
                {riskLevel === 3 && (
                  <div className="font-bold text-red-600 mb-4 animate-pulse">
                    🔴 HF &lt; 1.0. Aave bots may liquidate before your tx confirms. Emergency close as fast as possible.
                  </div>
                )}
                <Button variant="danger" onClick={handleEmergencyClose} disabled={isWriting} className="w-full animate-pulse shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] transition-all">
                  ⚠ EMERGENCY CLOSE NOW
                </Button>
              </div>
            )}
          </>
        )}

        {status === 2 && (
          <div className="flex gap-2">
            {usdcBalance > 0n && <Button variant="secondary" onClick={() => run(() => withdrawTokens(CONTRACTS.USDC, usdcBalance), "USDC withdrawn")} disabled={isWriting}>Withdraw {formatUsdc(usdcBalance)}</Button>}
            {wethBalance > 0n && <Button variant="secondary" onClick={() => run(() => withdrawTokens(CONTRACTS.WETH, wethBalance), "WETH withdrawn")} disabled={isWriting}>Withdraw {formatWeth(wethBalance)}</Button>}
            <Button variant="secondary" onClick={() => run(() => withdrawETH(), "ETH withdrawn")} disabled={isWriting}>Withdraw ETH</Button>
            <Button variant="secondary" onClick={() => run(() => withdrawFromAave(CONTRACTS.USDC), "USDC withdrawn from Aave")} disabled={isWriting}>Withdraw Aave USDC</Button>
            <Button variant="secondary" onClick={() => run(() => withdrawFromAave(CONTRACTS.WETH), "WETH withdrawn from Aave")} disabled={isWriting}>Withdraw Aave WETH</Button>
          </div>
        )}

      </div>
    </Card>
  );
};

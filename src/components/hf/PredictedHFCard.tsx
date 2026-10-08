import React from "react";
import { predictOpenHF, classifyHF, calcLiquidationPrice, liqPriceDistance, calcBreakEvenPrice, maxSafeLeverage } from "../../lib/utils/hfCalculations";
import { formatPercent } from "../../lib/utils/formatters";
import { HFGauge } from "./HFGauge";
import { RiskBadge } from "./RiskBadge";
import { InfoTooltip } from "../ui/InfoTooltip";
import { HFBar } from "./HFBar";
import { RiskLevelValue } from "../../lib/constants";

interface PredictedHFCardProps {
  leverage: number;
  isLong: boolean;
  currentEthPrice: number;
  openFeeBps?: number;
}

export function PredictedHFCard({ leverage, isLong, currentEthPrice, openFeeBps = 200 }: PredictedHFCardProps) {
  if (leverage <= 1) return null;

  const predictedHF = predictOpenHF(leverage, isLong);
  const hfClassified = classifyHF(predictedHF);
  const liqPrice = calcLiquidationPrice(currentEthPrice, predictedHF, isLong);
  const { distancePct } = liqPriceDistance(currentEthPrice, liqPrice);
  const breakEven = calcBreakEvenPrice(currentEthPrice, leverage, openFeeBps);
  const maxSafeLev = maxSafeLeverage(isLong);

  const riskLevelMap: Record<string, RiskLevelValue> = {
    SAFE: 0, WARNING: 1, CRITICAL: 2, LIQUIDATABLE: 3, BLOCKED: 3
  };
  const riskLevelValue = riskLevelMap[hfClassified] ?? 0;

  // Convert number to 1e18 bigint for HFGauge component
  const hfBigint = BigInt(Math.floor(predictedHF * 1e18));

  return (
    <div className="border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white font-mono flex flex-col mt-4">
      <h3 className="font-bold text-lg mb-4 uppercase border-b-2 border-black pb-2 flex items-center justify-between">
        <span className="flex items-center gap-2">Risk Preview <InfoTooltip text="Calculated projection of your position's safety before execution." /></span>
        <RiskBadge riskLevel={riskLevelValue} size="sm" pulse={hfClassified === "BLOCKED" || hfClassified === "LIQUIDATABLE"} />
      </h3>
      
      <div className="mb-6 w-full">
        <HFBar hf={hfBigint} height={16} showTicks={true} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
        <div className="flex flex-col p-2 border-2 border-black bg-blue-50 shadow-sm rounded">
          <span className="text-[9px] text-gray-600 font-bold uppercase mb-0.5 flex justify-between items-center w-full">Predicted HF <InfoTooltip text="Expected Health Factor immediately after opening." /></span>
          <span className="font-black text-sm">{predictedHF.toFixed(3)}</span>
        </div>
        <div className="flex flex-col p-2 border-2 border-black bg-rose-50 shadow-sm rounded">
          <span className="text-[9px] text-gray-600 font-bold uppercase mb-0.5 flex justify-between items-center w-full">Liq. Price <InfoTooltip text="Exact price of ETH that triggers Aave liquidation." /></span>
          <span className="font-black text-sm text-rose-600">${liqPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        </div>
        <div className="flex flex-col p-2 border-2 border-black bg-amber-50 shadow-sm rounded">
          <span className="text-[9px] text-gray-600 font-bold uppercase mb-0.5 flex justify-between items-center w-full">Dist. to Liq. <InfoTooltip text="Percentage move required to hit liquidation." /></span>
          <span className="font-black text-sm text-amber-700">{formatPercent(distancePct, 1)}</span>
        </div>
        <div className="flex flex-col p-2 border-2 border-black bg-emerald-50 shadow-sm rounded">
          <span className="text-[9px] text-gray-600 font-bold uppercase mb-0.5 flex justify-between items-center w-full">Break-even <InfoTooltip text="Price needed to recover entry fees." /></span>
          <span className="font-black text-sm text-emerald-700">${breakEven.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        </div>
      </div>

      {hfClassified === "BLOCKED" && (
        <div className="bg-red-100 border-2 border-red-500 p-3 mb-4 text-xs text-red-800 font-bold">
          ⛔ Leverage too high — HF would be {predictedHF.toFixed(3)} &lt; 1.25.
          <br/>Max safe leverage for this direction: {maxSafeLev.toFixed(2)}×
        </div>
      )}

      {hfClassified === "CRITICAL" && (
        <div className="bg-orange-100 border-2 border-orange-500 p-3 mb-4 text-xs text-orange-800 font-bold">
          ⚠ Very tight HF. Your position could be emergency-closed quickly.
        </div>
      )}

      <div className="mt-auto pt-4 text-[10px] text-gray-500 border-t border-dashed border-gray-300">
        Predicted HF uses Aave V3 liquidation threshold ({isLong ? '82.5%' : '77.0%'}). Actual HF may vary slightly.
      </div>    </div>
  );
}

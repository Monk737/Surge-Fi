import React from "react";
import { calcLiquidationPrice, liqPriceDistance } from "../../lib/utils/hfCalculations";
import { formatPercent, formatVolume } from "../../lib/utils/formatters";

interface LiquidationMetricsProps {
  healthFactor: bigint;
  currentEthPrice: number;
  isLong: boolean;
  maxLiqPct: bigint;
}

export function LiquidationMetrics({ healthFactor, currentEthPrice, isLong, maxLiqPct }: LiquidationMetricsProps) {
  const hfNumber = Number(healthFactor) / 1e18;
  const liqPrice = calcLiquidationPrice(currentEthPrice, hfNumber, isLong);
  const { distancePct, distanceUsd } = liqPriceDistance(currentEthPrice, liqPrice);
  const maxLiqPctNumber = Number(maxLiqPct); // contract returns integer 0, 50, or 100
  
  const distanceColor = distancePct < 10 ? "text-red-600" : distancePct < 20 ? "text-amber-500" : "text-green-600";
  const maxLiqColor = maxLiqPctNumber > 0 ? "text-red-600" : "text-green-600";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
      {/* Card 1 */}
      <div className="border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">💀</span>
          <h4 className="font-bold text-sm uppercase">Liquidation Price</h4>
        </div>
        <div className="text-2xl font-bold mb-1">${liqPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        <div className="text-xs text-gray-600 mt-auto">{isLong ? "ETH must fall to this price" : "ETH must rise to this price"}</div>
      </div>

      {/* Card 2 */}
      <div className="border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">📏</span>
          <h4 className="font-bold text-sm uppercase">Distance to Liq.</h4>
        </div>
        <div className={`text-2xl font-bold mb-1 ${distanceColor}`}>{formatPercent(distancePct, 1)} away</div>
        <div className="text-xs text-gray-600 mt-auto">{formatVolume(distanceUsd)} price movement</div>
      </div>

      {/* Card 3 */}
      <div className="border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">⚡</span>
          <h4 className="font-bold text-sm uppercase">Max Liquidatable</h4>
        </div>
        <div className={`text-2xl font-bold mb-1 ${maxLiqColor}`}>{formatPercent(maxLiqPctNumber)} of collateral</div>
        <div className="text-xs text-gray-600 mt-auto">{maxLiqPctNumber > 0 ? "Position partially liquidatable NOW" : "Not currently liquidatable"}</div>
      </div>
    </div>
  );
}

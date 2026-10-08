import React from "react";
import { RiskLevelValue } from "../../lib/constants";
import { formatHF } from "../../lib/utils/formatters";

interface HFAlertBannerProps {
  riskLevel: RiskLevelValue;
  hf: bigint;
  onAction?: () => void;
  actionLabel?: string;
}

export function HFAlertBanner({ riskLevel, hf, onAction, actionLabel }: HFAlertBannerProps) {
  if (riskLevel === 0) return null; // SAFE

  const isWarning = riskLevel === 1;
  const isCritical = riskLevel === 2;
  const isLiquidatable = riskLevel === 3;

  const bgClass = isWarning ? "bg-amber-400" : isCritical ? "bg-orange-500" : "bg-red-500 animate-pulse";
  const title = isWarning ? `⚠ Health Factor Warning: ${formatHF(hf)}` : 
                isCritical ? `⚡ Critical Health Factor: ${formatHF(hf)}` : 
                `🔴 POSITION AT RISK OF LIQUIDATION`;
  const message = isWarning ? "Your position is approaching the critical zone. Consider adding collateral." :
                  isCritical ? "HF below 1.25. Emergency Close is now available. Add collateral immediately." :
                  "HF below 1.0. Aave liquidation bots may liquidate your collateral at any time.";
  
  return (
    <div className={`border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono ${bgClass} text-black mb-4`}>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="mb-4">{message}</p>
      
      {isLiquidatable && (
        <p className="font-bold mb-4 uppercase">USE EMERGENCY CLOSE IMMEDIATELY</p>
      )}

      <div className="flex gap-4">
        {isWarning && onAction && (
          <button onClick={onAction} className="bg-white border-2 border-black px-4 py-2 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all">
            {actionLabel || "Add Collateral"}
          </button>
        )}
        
        {isCritical && onAction && (
          <>
            <button onClick={onAction} className="bg-white border-2 border-black px-4 py-2 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all">
              {actionLabel || "Add Collateral"}
            </button>
            <button onClick={onAction} className="bg-red-600 text-white border-2 border-black px-4 py-2 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all">
              Emergency Close
            </button>
          </>
        )}

        {isLiquidatable && onAction && (
          <button onClick={onAction} className="w-full bg-white text-red-600 border-2 border-black px-4 py-3 font-bold text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
            Emergency Close NOW →
          </button>
        )}
      </div>
    </div>
  );
}

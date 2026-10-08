import React from "react";
import { Address, parseUnits } from "viem";
import { calcCollateralTopUpFull } from "../../lib/utils/hfCalculations";
import { CONTRACTS } from "../../lib/constants";

interface CollateralTopUpSuggestionProps {
  totalCollateralUsd: number;
  totalDebtUsd: number;
  currentHF: number;
  currentEthPrice: number;
  isLong: boolean;
  onSupply?: (amount: bigint, asset: Address) => void;
}

export function CollateralTopUpSuggestion({
  totalCollateralUsd,
  totalDebtUsd,
  currentHF,
  currentEthPrice,
  isLong,
  onSupply
}: CollateralTopUpSuggestionProps) {
  if (currentHF >= 1.5) return null;

  const targets = [
    { hf: 1.5, label: "Safe" },
    { hf: 2.0, label: "Healthy" },
    { hf: 2.5, label: "Strong" },
  ];

  return (
    <div className="font-mono border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white mt-4">
      <div className="bg-black text-white p-3 font-bold border-b-2 border-black">
        Suggested Collateral Top-Up
      </div>
      <div className="flex flex-col">
        {targets.map((target, idx) => {
          const { extraUsd, extraWeth } = calcCollateralTopUpFull(
            totalCollateralUsd,
            totalDebtUsd,
            target.hf,
            isLong,
            currentEthPrice
          );
          
          if (extraUsd <= 0) return null;

          const handleSupply = () => {
            if (!onSupply) return;
            if (isLong) {
              onSupply(parseUnits(extraWeth.toFixed(6), 18), CONTRACTS.WETH);
            } else {
              onSupply(parseUnits(extraUsd.toFixed(6), 6), CONTRACTS.USDC);
            }
          };

          return (
            <div key={target.hf} className={`flex items-center justify-between p-4 hover:bg-gray-100 ${idx !== targets.length - 1 ? "border-b-2 border-black" : ""}`}>
              <div className="flex flex-col">
                <span className="font-bold">To reach HF {target.hf.toFixed(2)} ({target.label}):</span>
                <span className="text-sm">
                  supply ${extraUsd.toFixed(2)}
                  {isLong ? ` (≈ ${extraWeth.toFixed(4)} WETH)` : ` (≈ $${extraUsd.toFixed(2)} USDC)`}
                </span>
              </div>
              <button 
                onClick={handleSupply}
                className="bg-black text-white border-2 border-black px-4 py-2 font-bold hover:-translate-y-1 shadow-[2px_2px_0px_0px_rgba(156,163,175,1)] hover:shadow-[4px_4px_0px_0px_rgba(156,163,175,1)] transition-all"
              >
                Supply
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

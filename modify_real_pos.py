import re

with open('src/components/RealPositionView.tsx', 'r') as f:
    content = f.read()

# Add imports
imports_to_add = """import { HFGauge } from "./hf/HFGauge";
import { HFBar } from "./hf/HFBar";
import { HFChart } from "./hf/HFChart";
import { HFAlertBanner } from "./hf/HFAlertBanner";
import { LiquidationMetrics } from "./hf/LiquidationMetrics";
import { CollateralTopUpSuggestion } from "./hf/CollateralTopUpSuggestion";
import { useHFAlerts } from "../hooks/useHFAlerts";
import { chainlinkToUsd, usdAaveToNumber, formatHFNumber } from "../lib/utils/formatters";
import { zoneProgress, hfColor } from "../lib/utils/hfCalculations";
import { useReadContract } from 'wagmi';
import { CHAINLINK_ABI } from '../lib/constants';
import { RiskBadge } from "./hf/RiskBadge";
import { ChevronDown, ChevronUp } from "lucide-react";
"""

last_import_pos = content.rfind("import ")
end_of_last_import = content.find(";", last_import_pos) + 1
if end_of_last_import == 0:
    end_of_last_import = content.find("\n", last_import_pos) + 1

content = content[:end_of_last_import] + "\n" + imports_to_add + content[end_of_last_import:]

# Add computed variables
component_start = content.find("export const RealPositionView: React.FC<RealPositionViewProps> = ({")
component_body_start = content.find("{", content.find("=>", component_start)) + 1

computed_vars = """
  const { data: clData } = useReadContract({
    address: CONTRACTS.CHAINLINK_ETH_USD,
    abi: CHAINLINK_ABI,
    functionName: "latestRoundData",
    query: { refetchInterval: 60_000, staleTime: 30_000 }
  });
  const chainlinkAnswer = (clData as any)?.[1] ?? 0n;
  const [showHFHistory, setShowHFHistory] = useState(false);
  const [showEmergencyClose, setShowEmergencyClose] = useState(false);
"""
content = content[:component_body_start] + computed_vars + content[component_body_start:]

# more computed vars after position hook destructuring
is_critical_pos = content.find("const isCritical = riskLevel >= 2;")
insert_pos = content.find("\n", is_critical_pos) + 1

computed_vars_2 = """
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
"""
content = content[:insert_pos] + computed_vars_2 + content[insert_pos:]

# Replace the Card wrapper contents
card_start = content.find('<Card className={`mt-4 border-4 shadow-neo')
card_body_start = content.find('>', card_start) + 1

section_1 = """
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
"""
content = content[:card_body_start] + section_1 + content[card_body_start:]

# Find the start of `{/* 3. RISK METER */}` and replace it with sections 2, 3, 4, 5, 7
risk_meter_start = content.find("{/* 3. RISK METER */}")
# find the end of the risk meter section
actions_start = content.find("{/* 4. ACTIONS */}")

new_sections = """{/* 2. HF OVERVIEW PANEL */}
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
          <div className={`flex justify-between p-1 ${riskLevel === 0 ? 'bg-emerald-200 font-bold' : ''}`}>
            <span>HF ≥ 1.50</span><span>✓ SAFE</span><span>{riskLevel === 0 ? '(current)' : ''}</span>
          </div>
          <div className={`flex justify-between p-1 ${riskLevel === 1 ? 'bg-amber-200 font-bold' : ''}`}>
            <span>HF ≥ 1.25</span><span>⚠ WARNING</span><span>{riskLevel === 1 ? '(current)' : ''}</span>
          </div>
          <div className={`flex justify-between p-1 ${riskLevel === 2 ? 'bg-orange-200 font-bold' : ''}`}>
            <span>HF ≥ 1.00</span><span>⚡ CRITICAL</span><span>{riskLevel === 2 ? '(current)' : ''}</span>
          </div>
          <div className={`flex justify-between p-1 ${riskLevel === 3 ? 'bg-red-200 font-bold text-red-800' : ''}`}>
            <span>HF < 1.00</span><span>🔴 LIQ.</span><span>{riskLevel === 3 ? '(current)' : ''}</span>
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
            onSupply={(amount, asset) => supplyToAave(asset, amount)}
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

      """

content = content[:risk_meter_start] + new_sections + content[actions_start:]

# Inject Emergency Close logic
# find emergency close button
emergency_button_start = content.find('{isCritical && (')
emergency_button_end = content.find(')}', emergency_button_start) + 2

new_emergency = """{/* 6. EMERGENCY CLOSE */}
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
                    🔴 HF < 1.0. Aave bots may liquidate before your tx confirms. Emergency close as fast as possible.
                  </div>
                )}
                <Button variant="danger" onClick={handleEmergencyClose} disabled={isWriting} className="w-full animate-pulse shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] transition-all">
                  ⚠ EMERGENCY CLOSE NOW
                </Button>
              </div>
            )}"""
            
if emergency_button_start != -1:
    content = content[:emergency_button_start] + new_emergency + content[emergency_button_end:]

with open('src/components/RealPositionView.tsx', 'w') as f:
    f.write(content)

print("Done")
